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
let currentAngle = 0;        // in radiani
let animReq = null;

// daca segmentul nu pica perfect sub ac, ajustezi asta.
// incepe cu 0, apoi +5 / -5 pana e perfect (in grade).
const WHEEL_OFFSET_DEG = 0;

// imaginea rotii fara texte
const wheelImg = new Image();
wheelImg.src = "wheel-base.png";

// setari beculete
const BULB_COUNT = 28;          // cate becuri pe margine
const BULB_SPEED = 2.2;         // viteza pulsului
const BULB_RING = 0.93;         // cat de aproape de margine (0..1)
const BULB_SIZE = 0.028;        // marimea becului raportata la raza
const BULB_GLOW = 0.060;        // glow raportat la raza

function degToRad(d) { return (d * Math.PI) / 180; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function setCanvasHiDPI() {
  // retina safe: canvas ramane 800x800 in HTML, dar randam clar pe orice ecran
  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.getBoundingClientRect();
  const size = Math.min(cssSize.width, cssSize.height);

  // pastreaza un canvas patrat
  const px = Math.floor(size * dpr);
  if (px > 0 && (canvas.width !== px || canvas.height !== px)) {
    canvas.width = px;
    canvas.height = px;
  }
}

function drawShadowDisk(cx, cy, r) {
  // umbra mare sub roata (realistica)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + r*0.02, cy + r*0.05, r*0.98, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();
  ctx.restore();
}

function drawBulbs(r, timeSec) {
  // beculete animate, desenate IN INTERIORUL rotii (deci se rotesc cu ea)
  const bulbR = r * BULB_SIZE;
  const glowR = r * BULB_GLOW;
  const ringR = r * BULB_RING;

  for (let i = 0; i < BULB_COUNT; i++) {
    const a = (i / BULB_COUNT) * Math.PI * 2;

    // alternanta + puls (phase shift)
    const phase = timeSec * BULB_SPEED + i * 0.55;
    const pulse = 0.55 + 0.45 * Math.sin(phase);     // 0..1
    const isAlt = i % 2 === 0 ? 1 : 0;

    // lumina mai puternica pe alternanta, mai soft pe restul
    const intensity = clamp((isAlt ? 0.65 : 0.45) + pulse * 0.45, 0.25, 1.0);

    const x = Math.cos(a) * ringR;
    const y = Math.sin(a) * ringR;

    // glow exterior
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 210, 120, ${0.22 * intensity})`;
    ctx.fill();
    ctx.restore();

    // bec (gradient)
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
  // texte cu umbra/emboss realist
  const slice = (2 * Math.PI) / segments.length;

  for (let i = 0; i < segments.length; i++) {
    const mid = i * slice + slice / 2;

    const text = String(segments[i] ?? "");
    const fontSize = clamp(r * 0.10, 26, 52);

    ctx.save();
    ctx.rotate(mid);

    // pozitie text pe raza (reglezi daca vrei mai spre margine/centru)
    const textY = -r * 0.56;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${fontSize}px Arial`;

    // shadow subtil (realistic)
    ctx.shadowColor = "rgba(0,0,0,0.30)";
    ctx.shadowBlur = r * 0.02;
    ctx.shadowOffsetX = r * 0.01;
    ctx.shadowOffsetY = r * 0.01;

    // culoare text: alb pe segmente rosii, inchis pe segmente albe
    // nu stim segmentul din imagine, asa ca punem alb + contur inchis (merge pe ambele)
    ctx.lineWidth = Math.max(2, r * 0.012);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.strokeText(text, 0, textY);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(text, 0, textY);

    // highlight mic deasupra textului (emboss)
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

  // umbra sub roata
  drawShadowDisk(cx, cy, r);

  // roata (imagine + becuri + texte) se roteste impreuna
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentAngle);

  // desen imagine roata
  ctx.drawImage(wheelImg, -r, -r, r * 2, r * 2);

  // becuri animate (in roata)
  const timeSec = timeMs / 1000;
  drawBulbs(r, timeSec);

  // texte peste roata
  drawTexts(r);

  ctx.restore();

  animReq = requestAnimationFrame(renderFrame);
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

// porneste randarea dupa ce se incarca imaginea
wheelImg.onload = () => {
  if (animReq) cancelAnimationFrame(animReq);
  animReq = requestAnimationFrame(renderFrame);
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

  // pointer e sus, deci tinta este "sus" (0 rad), iar centrul segmentului trebuie sa ajunga sus.
  // unghi centru segment = i*slice + slice/2
  const slice = (2 * Math.PI) / segments.length;
  const offset = degToRad(WHEEL_OFFSET_DEG);
  const target = -(winningIndex * slice + slice / 2) + offset;

  const spins = 6;
  const from = currentAngle;
  const to = from + spins * 2 * Math.PI + (target - (from % (2 * Math.PI)));

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
