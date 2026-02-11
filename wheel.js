const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

// 8 segmente = 8 texte
const CODES = ["OFF20", "MAI INCEARCA", "5%", "APROAPE", "15%OFF", "INCA ODATA", "10% EXTRA", "PREMIU BONUS"];
const segments = CODES;

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const preForm = document.getElementById("preForm");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const noteEl = document.getElementById("note");

let spinning = false;
let currentAngle = 0;
let rafLoop = null;

// daca premiul nu pica perfect sub ac, reglezi cu +/- grade
const WHEEL_OFFSET_DEG = 0;

// imagine roata (fara text) — trebuie sa existe exact cu numele asta
const wheelImg = new Image();
wheelImg.src = "wheel-base.png";

function degToRad(d) { return (d * Math.PI) / 180; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function setCanvasHiDPI() {
  const dpr = window.devicePixelRatio || 1;
  const css = canvas.getBoundingClientRect();
  const size = Math.floor(Math.min(css.width, css.height) * dpr);
  if (size > 0 && (canvas.width !== size || canvas.height !== size)) {
    canvas.width = size;
    canvas.height = size;
  }
}

function drawShadowDisk(cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + r * 0.02, cy + r * 0.05, r * 0.98, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();
  ctx.restore();
}

// TEXT CENTRAT (50% din raza), pe lung (radial)
function drawTexts(r) {
  const slice = (2 * Math.PI) / segments.length;

  for (let i = 0; i < segments.length; i++) {
    const mid = i * slice + slice / 2;
    const text = String(segments[i] ?? "");

    const textRadius = r * 0.50;
    const x = Math.cos(mid) * textRadius;
    const y = Math.sin(mid) * textRadius;

    const fontSize = clamp(r * 0.070, 16, 30);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(mid); // radial

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize}px Arial`;

    // umbra discreta
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = r * 0.012;
    ctx.shadowOffsetX = r * 0.006;
    ctx.shadowOffsetY = r * 0.006;

    // contur discret
    ctx.lineWidth = Math.max(2, r * 0.010);
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.strokeText(text, 0, 0);

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }
}

function renderFrame() {
  setCanvasHiDPI();

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) * 0.98;

  ctx.clearRect(0, 0, w, h);

  drawShadowDisk(cx, cy, r);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentAngle);

  // roata
  ctx.drawImage(wheelImg, -r, -r, r * 2, r * 2);

  // texte peste roata
  drawTexts(r);

  ctx.restore();

  rafLoop = requestAnimationFrame(renderFrame);
}

function updateSpinEnabled() {
  spinBtn.disabled = !preForm.checkValidity();
}
preForm.addEventListener("input", updateSpinEnabled);
updateSpinEnabled();

function resetFormForNextPerson() {
  preForm.reset();
  updateSpinEnabled();
}

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
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }
  if (!r.ok || !data.ok) throw new Error(data.error || "request_failed");
}

wheelImg.onload = () => {
  if (rafLoop) cancelAnimationFrame(rafLoop);
  rafLoop = requestAnimationFrame(renderFrame);
};

wheelImg.onerror = () => {
  resultEl.textContent = "";
  noteEl.textContent = "Nu gasesc wheel-base.png. Verifica numele exact si ca e in acelasi folder cu index.html.";
};

spinBtn.addEventListener("click", async () => {
  if (spinning) return;

  if (!preForm.checkValidity()) {
    noteEl.textContent = "Completeaza corect datele pentru a putea roti.";
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
      : "Nu s-a putut salva. Incearca din nou.";
    updateSpinEnabled();
    return;
  }

  const slice = (2 * Math.PI) / segments.length;
  const offset = degToRad(WHEEL_OFFSET_DEG);

  // acul este sus; aducem segmentul castigator sub ac
  const target = -(winningIndex * slice + slice / 2) + offset;

  const spins = 6;
  const from = currentAngle;
  const full = 2 * Math.PI;

  const fromNorm = ((from % full) + full) % full;
  const deltaToTarget = target - fromNorm;
  const to = from + spins * full + deltaToTarget;

  const start = performance.now();
  const duration = 2500;

  function animate(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    currentAngle = from + (to - from) * eased;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      spinning = false;

      resultEl.textContent = "Codul tau: " + chosenCode;
      noteEl.textContent = "Introdu urmatoarele date pentru urmatorul participant.";

      setTimeout(() => {
        resetFormForNextPerson();
      }, 600);
    }
  }

  requestAnimationFrame(animate);
});
