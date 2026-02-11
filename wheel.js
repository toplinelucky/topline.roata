// wheel.js (PRO - pixel shift) — textul se muta in PIXELI stanga/dreapta
// si roata se opreste exact cu acul deasupra textului

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

// micro-reglaj roata vs ac (daca roata ta grafica e rotita din fabrica)
const WHEEL_OFFSET_DEG = 0;

// AICI muti textul stanga/dreapta IN PIXELI
// + = spre dreapta (clockwise, pe arc), - = spre stanga (counterclockwise)
const TEXT_SHIFT_PX = 32;

// pozitia pe raza unde sta textul (centrul vizual al segmentului)
const TEXT_RADIUS_FACTOR = 0.58;

const wheelImg = new Image();
wheelImg.src = "wheel-base.png";

function degToRad(d) { return (d * Math.PI) / 180; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function normalizeRad(a) {
  const full = 2 * Math.PI;
  return ((a % full) + full) % full;
}

// daca vrei calitate mai buna pe ecrane retina
function setCanvasHiDPI() {
  const dpr = window.devicePixelRatio || 1;
  const css = canvas.getBoundingClientRect();
  const size = Math.floor(Math.min(css.width, css.height) * dpr);
  if (size > 0 && (canvas.width !== size || canvas.height !== size)) {
    canvas.width = size;
    canvas.height = size;
  }
}

// ------------------------------------
// TEXT (PIXEL SHIFT) + perfect centrat pe segment
// ------------------------------------
function drawTexts(r) {
  const slice = (2 * Math.PI) / segments.length;
  const textRadius = r * TEXT_RADIUS_FACTOR;

  for (let i = 0; i < segments.length; i++) {
    const mid = i * slice + slice / 2;
    const text = String(segments[i] ?? "");

    // punctul de baza (centrul segmentului)
    const bx = Math.cos(mid) * textRadius;
    const by = Math.sin(mid) * textRadius;

    // shift tangential in pixeli (stanga/dreapta pe arc)
    // vector tangential (clockwise) in coordonate canvas:
    // dx = sin(mid), dy = -cos(mid)
    const dx = Math.sin(mid) * TEXT_SHIFT_PX;
    const dy = -Math.cos(mid) * TEXT_SHIFT_PX;

    const x = bx + dx;
    const y = by + dy;

    const fontSize = clamp(r * 0.070, 18, 32);

    ctx.save();
    ctx.translate(x, y);

    // orientare radial (pe lung) raportat la segment (NU la shift)
    ctx.rotate(mid);

    // citibil pe partea stanga
    const a = normalizeRad(mid);
    if (a > Math.PI / 2 && a < (3 * Math.PI) / 2) ctx.rotate(Math.PI);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px Arial`;

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

// ------------------------------------
// RENDER
// ------------------------------------
function renderFrame() {
  setCanvasHiDPI();

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

// ------------------------------------
// FORM
// ------------------------------------
function updateSpinEnabled() {
  spinBtn.disabled = !preForm.checkValidity();
}
preForm.addEventListener("input", updateSpinEnabled);
updateSpinEnabled();

function resetFormForNextPerson() {
  preForm.reset();
  updateSpinEnabled();
}

// ------------------------------------
// SAVE
// ------------------------------------
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

// ------------------------------------
// SPIN PRO: acul pica fix pe TEXT (cu pixel shift sincronizat)
// ------------------------------------
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

  // acul este sus (ora 12)
  const pointerAngle = -Math.PI / 2;

  // alegem exact centrul segmentului (ca sa fie mereu perfect)
  const segCenter = winningIndex * slice + slice / 2;

  // convertim shift-ul in pixeli intr-un shift unghiular (radiani)
  // deltaAngle ≈ shiftPx / textRadiusPx
  // textRadiusPx = r * TEXT_RADIUS_FACTOR (dar r e in render; aici folosim aproximare stabila)
  // ca sa fie exact, calculam cu raza reala a canvas-ului (care e patrat)
  const w = canvas.width;
  const h = canvas.height;
  const r = Math.min(w, h) * 0.5 * 0.98; // acelasi ca in renderFrame
  const textRadiusPx = r * TEXT_RADIUS_FACTOR;

  const deltaAngle = (TEXT_SHIFT_PX / Math.max(1, textRadiusPx)); // + clockwise

  // tinta: acul sa cada fix pe pozitia textului (segment center + deltaAngle)
  const target = pointerAngle - (segCenter + deltaAngle) + offset;

  const spins = 6;
  const from = currentAngle;
  const full = 2 * Math.PI;

  const fromNorm = normalizeRad(from);
  const delta = target - fromNorm;
  const to = from + spins * full + delta;

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
      noteEl.textContent = "Urmatorul participant.";
      setTimeout(resetFormForNextPerson, 600);
    }
  }

  requestAnimationFrame(animate);
});

