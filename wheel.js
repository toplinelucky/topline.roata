const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

// 8 segmente
const segments = [
  "OFF20",
  "MAI INCEARCA",
  "5%",
  "APROAPE",
  "15%OFF",
  "INCA ODATA",
  "10% EXTRA",
  "PREMIU BONUS"
];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const preForm = document.getElementById("preForm");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const noteEl = document.getElementById("note");

let spinning = false;
let currentAngle = 0;

const WHEEL_OFFSET_DEG = 0;

// ✅ AICI muti textele stanga/dreapta
// valori bune: -0.12 .. +0.12
// + = in sensul acelor de ceas, - = invers
const TEXT_OFFSET_RAD = 0.00;

const wheelImg = new Image();
wheelImg.src = "wheel-base.png";

function degToRad(d) { return (d * Math.PI) / 180; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---------------------------
// TEXT CENTRAT + OFFSET STANGA/DREAPTA
// ---------------------------
function drawTexts(r) {
  const slice = (2 * Math.PI) / segments.length;

  // pozitia textului pe raza (centrul vizual al segmentului)
  const textRadius = r * 0.58;

  for (let i = 0; i < segments.length; i++) {
    // ✅ mid este centrul segmentului, TEXT_OFFSET_RAD il muta stanga/dreapta
    const mid = i * slice + slice / 2 + TEXT_OFFSET_RAD;
    const text = String(segments[i] ?? "");

    const x = Math.cos(mid) * textRadius;
    const y = Math.sin(mid) * textRadius;

    const fontSize = clamp(r * 0.070, 18, 32);

    ctx.save();
    ctx.translate(x, y);

    // text radial (pe lung)
    ctx.rotate(mid);

    // daca e pe partea stanga, intoarcem textul sa fie citibil
    const a = ((mid % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (a > Math.PI / 2 && a < (3 * Math.PI) / 2) ctx.rotate(Math.PI);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px Arial`;

    // umbra + contur
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = r * 0.015;
    ctx.shadowOffsetX = r * 0.006;
    ctx.shadowOffsetY = r * 0.006;

    ctx.lineWidth = Math.max(2, r * 0.010);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.strokeText(text, 0, 0);

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }
}

// ---------------------------
// RENDER
// ---------------------------
function renderFrame() {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) * 0.98;

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentAngle);

  ctx.drawImage(wheelImg, -r, -r, r * 2, r * 2);
  drawTexts(r);

  ctx.restore();

  requestAnimationFrame(renderFrame);
}

wheelImg.onload = () => requestAnimationFrame(renderFrame);
wheelImg.onerror = () => {
  resultEl.textContent = "";
  noteEl.textContent = "Nu gasesc wheel-base.png. Verifica numele si locul fisierului.";
};

// ---------------------------
// FORM
// ---------------------------
function updateSpinEnabled() {
  spinBtn.disabled = !preForm.checkValidity();
}
preForm.addEventListener("input", updateSpinEnabled);
updateSpinEnabled();

function resetFormForNextPerson() {
  preForm.reset();
  updateSpinEnabled();
}

// ---------------------------
// SAVE
// ---------------------------
async function saveParticipant(code) {
  const fd = new FormData(preForm);
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    consent: fd.get("consent") === "on",
    code: code,
    userAgent: navigator.userAgent
  };

  const r = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }
  if (!r.ok || !data.ok) throw new Error(data.error || "save_error");
}

// ---------------------------
// SPIN (segmentul ales ajunge fix sub ac)
// ---------------------------
spinBtn.addEventListener("click", async () => {
  if (spinning) return;

  if (!preForm.checkValidity()) {
    noteEl.textContent = "Completeaza corect datele.";
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  resultEl.textContent = "Se roteste...";
  noteEl.textContent = "";

  const winningIndex = Math.floor(Math.random() * segments.length);
  const chosenCode = segments[winningIndex];

  try {
    await saveParticipant(chosenCode);
  } catch (e) {
    spinning = false;
    resultEl.textContent = "";
    noteEl.textContent = String(e).includes("email_already_used")
      ? "Acest email a participat deja. Foloseste un alt email."
      : "Eroare salvare. Incearca din nou.";
    updateSpinEnabled();
    return;
  }

  const slice = (2 * Math.PI) / segments.length;
  const offset = degToRad(WHEEL_OFFSET_DEG);

  const pointerAngle = -Math.PI / 2;

  const segStart = winningIndex * slice;
  const pad = slice * 0.12;
  const pick = segStart + pad + Math.random() * (slice - 2 * pad);

  const target = pointerAngle - pick + offset;

  const spins = 6;
  const from = currentAngle;
  const full = 2 * Math.PI;

  const fromNorm = ((from % full) + full) % full;
  const delta = target - fromNorm;
  const to = from + spins * full + delta;

  const start = performance.now();
  const duration = 2500;

  function animate(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    currentAngle = from + (to - from) * eased;

    if (t < 1) requestAnimationFrame(animate);
    else {
      spinning = false;
      resultEl.textContent = "Codul tau: " + chosenCode;
      noteEl.textContent = "Urmatorul participant.";
      setTimeout(resetFormForNextPerson, 600);
    }
  }

  requestAnimationFrame(animate);
});
