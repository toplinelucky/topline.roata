const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtA4rO_ukz6v51ArwoVOXpw-nZCu4x3zDDWT6zCN7CGsFxYKEpNHXoY7imkgJOOJfZ/exec";

const CODES = ["OFF20","MAI INCEARCA","5%","APROAPE","15%OFF","INCA ODATA"];
const segments = CODES;

const preForm = document.getElementById("preForm");
const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const noteEl = document.getElementById("note");
const wheelImg = document.getElementById("wheelImg");

let spinning = false;

// IMPORTANT: daca premiul nu pica exact sub ac, ajustezi asta.
// Exemplu: +30, -15 etc. (in grade)
const WHEEL_OFFSET_DEG = 0;

// la 6 segmente: fiecare segment are 60 grade
const SEG_DEG = 360 / segments.length;

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

// easing
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function setWheelRotation(deg) {
  wheelImg.style.transform = `rotate(${deg}deg)`;
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

  // alege segment castigator
  const winningIndex = Math.floor(Math.random() * segments.length);
  const chosenCode = segments[winningIndex];

  // salveaza in sheet (email unic = blocare in Apps Script)
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

  // tinta: vrem ca centrul segmentului castigator sa ajunga sub ac (sus).
  // acul este sus, deci “punctul tinta” este 0 grade (sus).
  // centrul segmentului i este: i*SEG_DEG + SEG_DEG/2
  // ca sa ajunga sus, roata trebuie rotita cu minus acel unghi.
  const targetDeg =
    -(winningIndex * SEG_DEG + SEG_DEG / 2) + WHEEL_OFFSET_DEG;

  // animatie cu mai multe ture
  const spins = 6; // ture complete
  const fromDeg = 0;
  const toDeg = spins * 360 + targetDeg;

  const start = performance.now();
  const duration = 2400;

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const deg = fromDeg + (toDeg - fromDeg) * eased;

    setWheelRotation(deg);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      spinning = false;

      resultEl.textContent = "Codul tau: " + chosenCode;
      noteEl.textContent = "Introdu urmatoarele date pentru urmatorul participant.";

      setTimeout(() => {
        // resetam pentru urmatorul participant
        resetFormForNextPerson();
        // optional: nu resetam roata la 0 (ramane unde a picat)
        // daca vrei sa revina la 0, decomentezi:
        // setWheelRotation(0);
      }, 600);
    }
  }

  requestAnimationFrame(tick);
});
