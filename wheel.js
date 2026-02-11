const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

const CODES = ["OFF20","MAI INCEARCA","5%","APROAPE","15%OFF","INCA ODATA"];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const preForm = document.getElementById("preForm");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const noteEl = document.getElementById("note");

const segments = CODES;
let spinning = false;

function drawWheel(angle = 0) {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 15;

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

    ctx.fillStyle = i % 2 === 0 ? "#C40000" : "#FF4D4D"; // rosu + rosu deschis
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // text
    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(segments[i], radius - 20, 6);
    ctx.restore();
  }

  ctx.restore();

  // cerc central alb
  ctx.beginPath();
  ctx.arc(cx, cy, 35, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function drawPointer() {
  const { width } = canvas;
  const cx = width / 2;

  ctx.beginPath();
  ctx.moveTo(cx, 5);
  ctx.lineTo(cx - 18, 40);
  ctx.lineTo(cx + 18, 40);
  ctx.closePath();
  ctx.fillStyle = "#000000";
  ctx.fill();
}

drawWheel(0);
drawPointer();

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
    noteEl.textContent = "Email deja folosit sau eroare.";
    updateSpinEnabled();
    return;
  }

  const targetAngle =
    (3 * Math.PI / 2) - (winningIndex * slice + slice / 2);

  const start = performance.now();
  const duration = 2500;
  const spins = 6;
  const from = 0;
  const to = spins * 2 * Math.PI + targetAngle;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const angle = from + (to - from) * eased;

    drawWheel(angle);
    drawPointer();

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      spinning = false;

      resultEl.textContent = "Codul tau: " + chosenCode;
      noteEl.textContent = "Introdu datele urmatorului participant.";

      setTimeout(() => {
        resetFormForNextPerson();
      }, 600);
    }
  }

  requestAnimationFrame(tick);
});
