const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

// aici setezi cele 6 coduri standard cum vrei tu.
const CODES = ["OFF20","MAI INCEARCA","5%","APROAPE","15%OFF","INCA ODATA"];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const preForm = document.getElementById("preForm");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const noteEl = document.getElementById("note");

const segments = CODES;

let spinning = false;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function drawWheel(angle = 0) {
  const { width, height } = canvas;
  const cx = width / 2, cy = height / 2;

  // setari generale (premium look)
  const radius = Math.min(cx, cy) - 8;
  const rimOuter = radius;
  const rimInner = radius * 0.88;
  const segOuter = radius * 0.86;
  const segInner = radius * 0.26;

  // culori (alb/rosu/rosu sters + auriu)
  const RED = "#cf1c2b";
  const RED_FADED = "#f06b6b";
  const WHITE = "#fff7f2";
  const GOLD_1 = "#f4d27a";
  const GOLD_2 = "#c08b2a";
  const GOLD_3 = "#8a5a12";

  ctx.clearRect(0, 0, width, height);

  // umbra roata
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 6, rimOuter * 0.98, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();
  ctx.restore();

  // margine aurie (rim)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rimOuter, 0, Math.PI * 2);
  const rimGrad = ctx.createRadialGradient(cx, cy, rimInner, cx, cy, rimOuter);
  rimGrad.addColorStop(0, GOLD_1);
  rimGrad.addColorStop(0.55, GOLD_2);
  rimGrad.addColorStop(1, GOLD_3);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // “canal” interior rosu inchis
  ctx.beginPath();
  ctx.arc(cx, cy, rimInner, 0, Math.PI * 2);
  const innerRimGrad = ctx.createRadialGradient(cx, cy, rimInner * 0.55, cx, cy, rimInner);
  innerRimGrad.addColorStop(0, "#b01322");
  innerRimGrad.addColorStop(1, "#7d0b16");
  ctx.fillStyle = innerRimGrad;
  ctx.fill();
  ctx.restore();

  // beculete pe margine (glow)
  const bulbs = 24;
  const bulbR = radius * 0.03;
  const bulbsRingR = radius * 0.94;

  for (let i = 0; i < bulbs; i++) {
    const a = (i / bulbs) * Math.PI * 2;
    const x = cx + Math.cos(a) * bulbsRingR;
    const y = cy + Math.sin(a) * bulbsRingR;

    // glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, bulbR * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 215, 120, 0.35)";
    ctx.fill();
    ctx.restore();

    // bulb
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, bulbR, 0, Math.PI * 2);
    const bGrad = ctx.createRadialGradient(x - bulbR * 0.3, y - bulbR * 0.3, bulbR * 0.2, x, y, bulbR);
    bGrad.addColorStop(0, "#fff8d6");
    bGrad.addColorStop(0.6, "#ffd37a");
    bGrad.addColorStop(1, "#f2a63a");
    ctx.fillStyle = bGrad;
    ctx.fill();
    ctx.restore();
  }

  // segmente (6)
  const slice = (2 * Math.PI) / segments.length;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  for (let i = 0; i < segments.length; i++) {
    const start = i * slice;
    const end = start + slice;

    // alternanta alb / rosu / rosu sters
    const base =
      i % 3 === 0 ? RED :
      i % 3 === 1 ? WHITE :
      RED_FADED;

    // gradient “glossy” pe segment
    const g = ctx.createRadialGradient(
      -segOuter * 0.25, -segOuter * 0.25, segInner * 0.3,
      0, 0, segOuter
    );
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.18, base);
    g.addColorStop(1, "rgba(0,0,0,0.10)");

    // segment
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, segOuter, start, end);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // linii aurii intre segmente
    ctx.lineWidth = Math.max(2, radius * 0.006);
    ctx.strokeStyle = "rgba(245, 210, 122, 0.95)";
    ctx.stroke();

    // text cod (fara bold)
    ctx.save();
    ctx.rotate(start + slice / 2);

    const text = String(segments[i] ?? "");
    const fontSize = clamp(radius * 0.065, 14, 20);
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    // contur text pentru lizibilitate
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.strokeText(text, segOuter - 18, 0);

    ctx.fillStyle = "#111";
    ctx.fillText(text, segOuter - 18, 0);

    ctx.restore();
  }

  ctx.restore();

  // disc central (buton rosu + inel auriu + nituri)
  const hubOuter = radius * 0.19;
  const hubRing = radius * 0.13;
  const hubBtn = radius * 0.09;

  // inel auriu
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, hubOuter, 0, Math.PI * 2);
  const hubGold = ctx.createRadialGradient(cx, cy, hubRing, cx, cy, hubOuter);
  hubGold.addColorStop(0, GOLD_1);
  hubGold.addColorStop(0.6, GOLD_2);
  hubGold.addColorStop(1, GOLD_3);
  ctx.fillStyle = hubGold;
  ctx.fill();
  ctx.restore();

  // nituri pe inel
  const rivets = 10;
  for (let i = 0; i < rivets; i++) {
    const a = (i / rivets) * Math.PI * 2;
    const rr = radius * 0.012;
    const rPos = hubOuter * 0.75;
    const x = cx + Math.cos(a) * rPos;
    const y = cy + Math.sin(a) * rPos;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    const rg = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.2, x, y, rr);
    rg.addColorStop(0, "#fff2c6");
    rg.addColorStop(0.7, "#e7b95b");
    rg.addColorStop(1, "#a86b18");
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();
  }

  // buton rosu
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, hubBtn, 0, Math.PI * 2);
  const btnGrad = ctx.createRadialGradient(cx - hubBtn * 0.3, cy - hubBtn * 0.35, hubBtn * 0.2, cx, cy, hubBtn);
  btnGrad.addColorStop(0, "#ffb3b3");
  btnGrad.addColorStop(0.25, "#ff3a3a");
  btnGrad.addColorStop(1, "#b30f1e");
  ctx.fillStyle = btnGrad;
  ctx.fill();

  // highlight mic
  ctx.beginPath();
  ctx.arc(cx - hubBtn * 0.25, cy - hubBtn * 0.28, hubBtn * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.restore();
}

drawWheel(0);

function updateSpinEnabled() {
  spinBtn.disabled = !preForm.checkValidity();
}
preForm.addEventListener("input", updateSpinEnabled);
updateSpinEnabled();

function resetFormForNextPerson() {
  preForm.reset();       // sterge nume/email/telefon + debifeaza consent
  updateSpinEnabled();   // dezactiveaza butonul pana completeaza din nou
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
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita CORS/preflight
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }

  if (!r.ok || !data.ok) throw new Error(data.error || "request_failed");
}

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

  const slice = (2 * Math.PI) / segments.length;
  const winningIndex = Math.floor(Math.random() * segments.length);
  const chosenCode = segments[winningIndex];

  try {
    await saveParticipant(chosenCode);
  } catch (e) {
    spinning = false;
    resultEl.textContent = "";
    noteEl.textContent = String(e).includes("email_already_used")
      ? "Acest email a participat deja. Foloseste un alt email."
      : "Nu s-a putut salva. Verifica Apps Script (Deploy: Anyone) sau incearca din nou.";
    updateSpinEnabled();
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

      resultEl.textContent = "Codul tau: " + chosenCode;
      noteEl.textContent = "Introdu urmatoarele date pentru urmatorul participant.";

      // elibereaza formularul pentru urmatoarea persoana
      setTimeout(() => {
        resetFormForNextPerson();
      }, 600);
    }
  }

  requestAnimationFrame(tick);
});
