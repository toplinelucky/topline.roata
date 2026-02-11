// wheel.js (PRO - aliniere corecta pe roata PNG) — text centrat in felie + oprire fix pe text
// COPY/PASTE TOT

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

// 8 segmente (in ordinea in care vrei sa apara pe roata)
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

// =============================
// 1) ALINIERE CU IMAGINEA TA
// =============================
// START_ANGLE = unde incepe segmentul 0 pe roata (in coordonate canvas)
// -Math.PI/2 inseamna "sus" (ora 12). De obicei asta vrei cand acul e sus.
const BASE_START_ANGLE = -Math.PI / 2;

// ALIGN_DEG: micro-rotatie pentru a centra textul in feliile PNG-ului tau.
// Daca textul e "dus" spre o muchie, schimbi aici: 0, 2, -2, 5, -5...
const ALIGN_DEG = 0;

// micro-reglaj roata vs ac (daca acul tau vizual nu e perfect pe ora 12)
const POINTER_OFFSET_DEG = 0;

// =============================
// 2) SHIFT TEXT IN PIXELI (optional)
// =============================
// + = spre dreapta pe arc (clockwise), - = spre stanga (counterclockwise)
const TEXT_SHIFT_PX = 0; // pune 0 ca sa fie perfect pe mijloc
const TEXT_RADIUS_FACTOR = -0.58;

const wheelImg = new Image();
wheelImg.src = "wheel-base.png";

function degToRad(d) { return (d * Math.PI) / 180; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function normalizeRad(a) {
  const full = 2 * Math.PI;
  return ((a % full) + full) % full;
}

function setCanvasHiDPI() {
  const dpr = window.devicePixelRatio || 1;
  const css = canvas.getBoundingClientRect();
  const size = Math.floor(Math.min(css.width, css.height) * dpr);
  if (size > 0 && (canvas.width !== size || canvas.height !== size)) {
    canvas.width = size;
    canvas.height = size;
  }
}

// START_ANGLE FINAL folosit peste tot (desen + spin)
function getStartAngle() {
  return BASE_START_ANGLE + degToRad(ALIGN_DEG);
}

// ------------------------------------
// TEXT centrat in felie (corect pe ax)
// ------------------------------------
function drawTexts(r) {
  const slice = (2 * Math.PI) / segments.length;
  const textRadius = r * TEXT_RADIUS_FACTOR;
  const startAngle = getStartAngle();

  for (let i = 0; i < segments.length; i++) {
    // centrul REAL al feliei i (aliniat cu PNG)
    const mid = startAngle + i * slice + slice / 2;
    const text = String(segments[i] ?? "");

    // punct de baza (centrul feliei pe raza)
    const bx = Math.cos(mid) * textRadius;
    const by = Math.sin(mid) * textRadius;

    // shift tangential in pixeli (optional)
    const dx = Math.sin(mid) * TEXT_SHIFT_PX;
    const dy = -Math.cos(mid) * TEXT_SHIFT_PX;

    const x = bx + dx;
    const y = by + dy;

    const fontSize = clamp(r * 0.070, 18, 32);

    ctx.save();
    ctx.translate(x, y);

    // text pe lung (radial)
    ctx.rotate(mid);

    // daca vrei sa NU se intoarca niciodata, comenteaza blocul de mai jos
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
// SPIN: acul pica FIX pe centrul textului (centrul feliei + shift pixeli)
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

  // acul sus (ora 12) + offset daca acul tau nu e perfect centrat
  const pointerAngle = (-Math.PI / 2) + degToRad(POINTER_OFFSET_DEG);

  const startAngle = getStartAngle();

  // centrul REAL al feliei (aliniat cu PNG)
  const segCenter = startAngle + winningIndex * slice + slice / 2;

  // convertim shift pixeli -> shift unghi (radiani) pe raza textului
  const w = canvas.width, h = canvas.height;
  const r = Math.min(w, h) * 0.5 * 0.98;
  const textRadiusPx = r * TEXT_RADIUS_FACTOR;
  const deltaAngle = (TEXT_SHIFT_PX / Math.max(1, textRadiusPx)); // + clockwise

  // tinta: acul sa fie exact pe text (centrul feliei + shift)
  const target = pointerAngle - (segCenter + deltaAngle);

  const spins = 6;
  const from = currentAngle;
  const full = 2 * Math.PI;

  const fromNorm = normalizeRad(from);
  const targetNorm = normalizeRad(target);
  const delta = targetNorm - fromNorm;
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

