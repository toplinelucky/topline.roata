const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

// aici setezi cele 6 coduri standard cum vrei tu
const CODES = ["OFF20","MAI INCEARCA","5%","APROAPE","15%OFF","INCA ODATA"];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const preForm = document.getElementById("preForm");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const noteEl = document.getElementById("note");

const segments = CODES;

let spinning = false;
let lockedDevice = false;

function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}
function getCookie(name) {
  return document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1] || null;
}

function drawWheel(angle = 0) {
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;
  const radius = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, width, height);

  const slice = (2 * Math.PI) / segments.length;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  for (let i = 0; i < segments.length; i++) {
    const start = i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "#e9ecf7" : "#dfe5ff";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#111";
    ctx.font = "14px Arial";
    ctx.fillText(segments[i], radius - 14, 5);
    ctx.restore();
  }

  ctx.restore();

  // pointer
  ctx.beginPath();
  ctx.fillStyle = "#111";
  ctx.moveTo(cx, 8);
  ctx.lineTo(cx - 12, 38);
  ctx.lineTo(cx + 12, 38);
  ctx.closePath();
  ctx.fill();
}

drawWheel(0);

// blocare: o singura participare pe dispozitiv
if (getCookie("wheel_done") === "1") {
  lockedDevice = true;
  spinBtn.disabled = true;
  noteEl.textContent = "Ai participat deja pe acest dispozitiv.";
}

function updateSpinEnabled() {
  if (lockedDevice) return;
  spinBtn.disabled = !preForm.checkValidity();
}
preForm.addEventListener("input", updateSpinEnabled);
updateSpinEnabled();

async function saveParticipant(chosenCode) {
  const fd = new FormData(preForm);
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    consent: fd.get("consent") === "on",
    code: chosenCode,
    userAgent: navigator.userAgent
  };

  const r = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // IMPORTANT: evita CORS/preflight
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }

  if (!r.ok || !data.ok) throw new Error(data.error || "request_failed");
}

spinBtn.addEventListener("click", async () => {
  if (spinning || lockedDevice) return;

  if (!preForm.checkValidity()) {
    noteEl.textContent = "Completeaza corect datele pentru a putea roti.";
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  resultEl.textContent = "Se roteste...";
  noteEl.textContent = "";

  const slice = (2 * Math.PI) / segments.length;
  const winningIndex = Math.floor(Math.random() * segments.length);
  const chosenCode = segments[winningIndex];

  try {
    await saveParticipant(chosenCode);
  } catch (e) {
    spinning = false;
    spinBtn.disabled = false;
    resultEl.textContent = "";
    noteEl.textContent = "Nu s-a putut salva. Verifica Apps Script (Deploy: Anyone) sau foloseste alt email.";
    return;
  }

  const targetAngle = (3 * Math.PI / 2) - (winningIndex * slice + slice / 2);

  const start = performance.now();
  const duration = 2200;
  const spins = 5;
  const from = 0;
  const to = spins * 2 * Math.PI + targetAngle;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const angle = from + (to - from) * eased;
    drawWheel(angle);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      spinning = false;
      lockedDevice = true;
      setCookie("wheel_done", "1");

      resultEl.textContent = "Codul tau: " + chosenCode;
      noteEl.textContent = "Salveaza codul pentru utilizare.";
    }
  }

  requestAnimationFrame(tick);
});
