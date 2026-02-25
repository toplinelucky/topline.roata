const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyTyce_GthOl7cbVHCf9tofvcurQUdQwt4GZRyGRNHrYFzCoSKHiA-jycG2qn1SPaKu/exec";

// ====== SETARI ======
const segments = [
  "HAIR MASK",
  "HYDRATING MASK",
  "SMOOTHING MASK",
  "ULTRA MASK",
  "TRATAMENT 50ML",
  "TRATAMENT 100ML",
  "TRATAMENT 25ML",
  "MAI INCEARCA"
];

// ====== STOC PREMII (local, in acest browser) ======
const DEFAULT_STOCK = {
  "HAIR MASK": 15,
  "HYDRATING MASK": 15,
  "SMOOTHING MASK": 15,
  "ULTRA MASK": 15,
  "TRATAMENT 50ML": 15,
  "TRATAMENT 100ML": 15,
  "TRATAMENT 25ML": 15
  // "MAI INCEARCA" este nelimitat
};


// ====== PROCENTE CASTIG in functie de valoarea bonului (suma recomandata = 100 pe fiecare interval) ======
const prizePercentByReceiptValue = [
  {
    min: 0,
    max: 99,
    percent: {
      "HAIR MASK": 3,
      "HYDRATING MASK": 3,
      "SMOOTHING MASK": 3,
      "ULTRA MASK": 1,
      "TRATAMENT 50ML": 8,
      "TRATAMENT 100ML": 4,
      "TRATAMENT 25ML": 8,
      "MAI INCEARCA": 70
    }
  },
  {
    min: 100,
    max: 249,
    percent: {
      "HAIR MASK": 8,
      "HYDRATING MASK": 8,
      "SMOOTHING MASK": 7,
      "ULTRA MASK": 5,
      "TRATAMENT 50ML": 15,
      "TRATAMENT 100ML": 10,
      "TRATAMENT 25ML": 12,
      "MAI INCEARCA": 35
    }
  },
  {
    min: 250,
    max: Infinity,
    percent: {
      "HAIR MASK": 15,
      "HYDRATING MASK": 15,
      "SMOOTHING MASK": 12,
      "ULTRA MASK": 10,
      "TRATAMENT 50ML": 12,
      "TRATAMENT 100ML": 12,
      "TRATAMENT 25ML": 6,
      "MAI INCEARCA": 18
    }
  }
];

function getPrizeByPercent(receiptValue) {
  const rule =
    prizePercentByReceiptValue.find(r => receiptValue >= r.min && receiptValue <= r.max) ||
    prizePercentByReceiptValue[0];

  // premii disponibile (respecta stocul); MAI INCEARCA e mereu disponibil
  const available = segments.filter(prize => {
    if (prize === "MAI INCEARCA") return true;
    return (prizeStock[prize] || 0) > 0;
  });

  // distributie cumulativa pe procente (se normalizeaza automat pe ce e disponibil)
  const dist = [];
  let total = 0;

  for (const prize of available) {
    const p = Number(rule.percent[prize] || 0);
    if (p > 0) {
      total += p;
      dist.push({ prize, cum: total });
    }
  }

  if (dist.length === 0) return "MAI INCEARCA";

  const r = Math.random() * total;
  return dist.find(x => r <= x.cum).prize;
}


const STOCK_STORAGE_KEY = "prizeStock";

function loadStock() {
  try {
    const saved = localStorage.getItem(STOCK_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  try { localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(DEFAULT_STOCK)); } catch (_) {}
  return { ...DEFAULT_STOCK };
}

function saveStock(stock) {
  try { localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stock)); } catch (_) {}
}

let prizeStock = loadStock();

function prizeHasStock(prizeName) {
  if (prizeName === "MAI INCEARCA") return true;
  const v = prizeStock[prizeName];
  return typeof v === "number" && v > 0;
}

function decrementStock(prizeName) {
  if (prizeName === "MAI INCEARCA") return;
  if (typeof prizeStock[prizeName] !== "number") return;
  if (prizeStock[prizeName] <= 0) return;
  prizeStock[prizeName] -= 1;
  saveStock(prizeStock);
}

function getAvailableIndexes() {
  const idxs = [];
  for (let i = 0; i < segments.length; i++) {
    if (prizeHasStock(segments[i])) idxs.push(i);
  }
  // siguranta: daca, dintr-un motiv, nu e nimic disponibil, permitem doar MAI INCEARCA
  if (idxs.length === 0) {
    const mi = segments.indexOf("MAI INCEARCA");
    if (mi >= 0) idxs.push(mi);
  }
  return idxs;
}

// segment 0 pleaca de sus
const BASE_START_ANGLE = -Math.PI / 2;

// daca feliile nu pica perfect pe grafica/acul tau, ajustezi 1-2 grade
const ALIGN_DEG = 0;

// daca acul tau sus nu e perfect la ora 12, ajustezi 1-2 grade
const POINTER_OFFSET_DEG = 0;

// unde sta textul pe raza (0.55–0.62)
const TEXT_RADIUS_FACTOR = 0.58;

// mutare text pe arc (stanga/dreapta) in pixeli
const TEXT_SHIFT_TANGENTIAL_PX = 0;

// mutare text spre exterior/interior in pixeli (+ = spre exterior, - = spre centru)
const TEXT_SHIFT_RADIAL_PX = 0;

// rotatie extra a textului (grade). 0 = drept radial (centru -> exterior)
const TEXT_ROTATE_DEG = -90;

// BUTON TEST: pune false ca sa dispara complet
const ENABLE_TEST_BUTTON = true;

// ====== ELEMENTE ======
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const preForm = document.getElementById("preForm");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const noteEl = document.getElementById("note");

// buton test (trebuie sa existe in HTML)
const testBtn = document.getElementById("testSpinBtn");

let spinning = false;
let currentAngle = 0;

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

function getStartAngle() {
  return BASE_START_ANGLE + degToRad(ALIGN_DEG);
}

function drawWheel() {
  setCanvasHiDPI();

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) * 0.98;

  ctx.clearRect(0, 0, w, h);

  // umbra roata
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + r * 0.02, cy + r * 0.05, r * 0.98, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentAngle);

  const slice = (2 * Math.PI) / segments.length;
  const startAngle = getStartAngle();

  // segmente
  for (let i = 0; i < segments.length; i++) {
    const a0 = startAngle + i * slice;
    const a1 = a0 + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, a0, a1);
    ctx.closePath();

    // alternanta culori (alb/rosu/rosu sters)
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : (i % 4 === 1 ? "#c81f2d" : "#a91522");
    ctx.fill();

    ctx.lineWidth = Math.max(2, r * 0.008);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.stroke();
  }

  // contur exterior
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(3, r * 0.012);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.stroke();

  // TEXT RADIAL DREPT (centru -> exterior)
  drawTexts(r);

  // capac central
  drawCenterCap(r);

  ctx.restore();

  requestAnimationFrame(drawWheel);
}

function drawCenterCap(r) {
  const outer = r * 0.18;
  const inner = r * 0.11;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = r * 0.03;
  ctx.shadowOffsetX = r * 0.01;
  ctx.shadowOffsetY = r * 0.015;

  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, r * 0.008);
  ctx.strokeStyle = "rgba(214,164,74,0.70)";
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, inner, 0, Math.PI * 2);

  const g = ctx.createRadialGradient(-inner*0.3, -inner*0.3, inner*0.2, 0, 0, inner);
  g.addColorStop(0, "rgba(255,255,255,0.18)");
  g.addColorStop(0.35, "rgba(190,35,45,0.95)");
  g.addColorStop(1, "rgba(130,15,25,1)");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}


function drawTexts(r) {
  const slice = (2 * Math.PI) / segments.length;
  const startAngle = getStartAngle();

  const textRadiusBase = r * TEXT_RADIUS_FACTOR;

  for (let i = 0; i < segments.length; i++) {
    const mid = startAngle + i * slice + slice / 2;
    const text = String(segments[i] ?? "");

    const textRadius = textRadiusBase + TEXT_SHIFT_RADIAL_PX;

    // baza pe raza
    const bx = Math.cos(mid) * textRadius;
    const by = Math.sin(mid) * textRadius;

    // shift tangential in pixeli
    const dx = Math.sin(mid) * TEXT_SHIFT_TANGENTIAL_PX;
    const dy = -Math.cos(mid) * TEXT_SHIFT_TANGENTIAL_PX;

    const x = bx + dx;
    const y = by + dy;

    const fontSize = clamp(r * 0.070, 18, 32);

    ctx.save();
    ctx.translate(x, y);

    // text radial drept: mid + 90 deg
    ctx.rotate(mid + Math.PI / 2 + degToRad(TEXT_ROTATE_DEG));

    // sa fie citibil (fara cap in jos)
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

// unghiul exact unde este ANCORA textului (x,y) pentru segmentul i
// folosim asta ca acul sa pice fix pe text, nu pe segment
function getTextAnchorAngle(i) {
  const w = canvas.width;
  const h = canvas.height;
  const rWheel = Math.min(w, h) * 0.5 * 0.98;

  const slice = (2 * Math.PI) / segments.length;
  const startAngle = getStartAngle();

  const mid = startAngle + i * slice + slice / 2;

  const textRadiusBase = rWheel * TEXT_RADIUS_FACTOR;
  const textRadius = textRadiusBase + TEXT_SHIFT_RADIAL_PX;

  const bx = Math.cos(mid) * textRadius;
  const by = Math.sin(mid) * textRadius;

  const dx = Math.sin(mid) * TEXT_SHIFT_TANGENTIAL_PX;
  const dy = -Math.cos(mid) * TEXT_SHIFT_TANGENTIAL_PX;

  const x = bx + dx;
  const y = by + dy;

  return Math.atan2(y, x);
}

// ===== FORM =====
function updateSpinEnabled() {
  spinBtn.disabled = !preForm.checkValidity();
}
preForm.addEventListener("input", updateSpinEnabled);
updateSpinEnabled();

function resetFormForNextPerson() {
  preForm.reset();
  updateSpinEnabled();
}

// ===== SAVE =====
async function saveParticipant(code) {
  const fd = new FormData(preForm);
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    receiptValue: fd.get("receiptValue"),
    receiptNumber: fd.get("receiptNumber"),
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

// ===== SPIN NORMAL (salveaza) =====
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

  const fd = new FormData(preForm);
  const receiptValue = parseFloat(fd.get("receiptValue")) || 0;

  const chosenCode = getPrizeByPercent(receiptValue);
  const winningIndex = segments.indexOf(chosenCode);

  try {
    await saveParticipant(chosenCode);
    decrementStock(chosenCode);
  } catch (e) {
    spinning = false;
    resultEl.textContent = "";
    noteEl.textContent = String(e).includes("email_already_used")
      ? "Acest email a participat deja. Foloseste un alt email."
      : "Eroare salvare. Incearca din nou.";
    updateSpinEnabled();
    return;
  }

  spinToText(winningIndex, () => {
    resultEl.textContent = "Premiul tau: " + chosenCode;
    noteEl.textContent = "Urmatorul participant.";
    setTimeout(resetFormForNextPerson, 600);
  });
});

// ===== SPIN TEST (NU salveaza) =====
if (testBtn) {
  testBtn.style.display = ENABLE_TEST_BUTTON ? "inline-block" : "none";
  testBtn.addEventListener("click", () => {
    if (!ENABLE_TEST_BUTTON) return;
    if (spinning) return;

    resultEl.textContent = "TEST: se roteste...";
    noteEl.textContent = "";

    const idx = Math.floor(Math.random() * segments.length);
    spinToText(idx, () => {
      resultEl.textContent = "TEST: a picat " + segments[idx];
      noteEl.textContent = "Mod test activ (nu se salveaza).";
    });
  });
}

function spinToText(winningIndex, onDone) {
  // acul sus
  const pointerAngle = (-Math.PI / 2) + degToRad(POINTER_OFFSET_DEG);

  // tinta = unghiul textului (nu segmentul)
  const textAngle = getTextAnchorAngle(winningIndex);

  // vrem: currentAngle_final + textAngle == pointerAngle (mod 2pi)
  const target = pointerAngle - textAngle;

  const spins = 6;
  const from = currentAngle;
  const full = 2 * Math.PI;

  const fromNorm = normalizeRad(from);
  const targetNorm = normalizeRad(target);

  const delta = targetNorm - fromNorm;
  const to = from + spins * full + delta;

  const start = performance.now();
  const duration = 2500;

  spinning = true;
  spinBtn.disabled = true;
  if (testBtn) testBtn.disabled = true;

  function animate(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    currentAngle = from + (to - from) * eased;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      spinning = false;
      if (testBtn) testBtn.disabled = false;
      updateSpinEnabled();
      onDone && onDone();
    }
  }

  requestAnimationFrame(animate);
}

// PORNESTE ANIMATIA
requestAnimationFrame(drawWheel);
