// wheel.js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

const CODES = ["OFF20","MAI INCEARCA","5%","APROAPE","15%OFF","INCA ODATA"];
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

// daca nu se aliniaza perfect sub ac, schimba cu +5 / -5 etc (grade)
const WHEEL_OFFSET_DEG = 0;

// imagine roata fara text
const wheelImg = new Image();
wheelImg.src = "wheel-base.png";

// beculete animate
const BULB_COUNT = 28;
const BULB_SPEED = 2.2;
const BULB_RING = 0.93;
const BULB_SIZE = 0.028;
const BULB_GLOW = 0.060;

function degToRad(d) { return (d * Math.PI) / 180; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

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
  ctx.arc(cx + r*0.02, cy + r*0.05, r*0.98, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();
  ctx.restore();
}

function drawBulbs(r, timeSec) {
  const bulbR = r * BULB_SIZE;
  const glowR = r * BULB_GLOW;
  const ringR = r * BULB_RING;

  for (let i = 0; i < BULB_COUNT; i++) {
    const a = (i / BULB_COUNT) * Math.PI * 2;

    const phase = timeSec * BULB_SPEED + i * 0.55;
    const pulse = 0.55 + 0.45 * Math.sin(phase);
    const isAlt = i % 2 === 0 ? 1 : 0;

    const intensity = clamp((isAlt ? 0.65 : 0.45) + pulse * 0.45, 0.25, 1.0);

    const x = Math.cos(a) * ringR;
    const y = Math.sin(a) * ringR;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 210, 120, ${0.22 * intensity})`;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, bulbR, 0, Math.PI * 2);

    const g = ctx.createRadialGradient(
      x - bulbR * 0.35, y - bulbR * 0.35, bulbR * 0.2,
      x, y, bulbR
    );
    g.addColorStop(0, `rgba(255,255,235,${0.95 * intensity})`);
    g.addColorStop(0.55, `rgba(255,210,120,${0.90 * intensity})`);
    g.addColorStop(1, `rgba(210,120,30,${0.95 * intensity})`);

    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}

function drawTexts(r) {
  const slice = (2 * Math.PI) / segments.length;

  for (let i = 0; i < segments.length; i++) {
    const mid = i * slice + slice / 2;
    const text = String(segments[i] ?? "");
    const fontSize = clamp(r * 0.10, 26, 52);

    ctx.save();
    ctx.rotate(mid);

    const textY = -r * 0.56;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${fontSize}px Arial`;

    ctx.shadowColor = "rgba(0,0,0,0.30)";
    ctx.shadowBlur = r * 0.02;
    ctx.shadowOffsetX = r * 0.01;
    ctx.shadowOffsetY = r * 0.01;

    ctx.lineWidth = Math.max(2, r * 0.012);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.strokeText(text, 0, textY);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(text, 0, textY);

    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.lineWidth = Math.max(1, r * 0.006);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.strokeText(text, 0, textY - r * 0.01);

    ctx.restore();
  }
}

function renderFrame(timeMs) {
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

  ctx.drawImage(wheelImg, -r, -r, r * 2, r * 2);

  const timeSec = timeMs / 1000;
  drawBulbs(r, timeSec);
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
  noteEl.textContent = "Nu gasesc imaginea wheel-base.png. Verifica numele si locul fisierului in GitHub.";
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
