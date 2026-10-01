// ============================================================
// Generic TOEFL-style fill-in-the-blank quiz engine.
// Reused by every unit page (unit1.html, unit2.html, ...).
// Each unit page just needs to load config.js + its own
// unitN-data.js (defining a UNIT_DATA object) before this file.
// ============================================================
(function () {
  "use strict";

  // Keyed by blankId (not word) so a word that appears twice across
  // passages is tracked as two independent attempts.
  // { word, attempts, firstAttemptCorrect: true|false|null, resolved: boolean }
  const state = { results: {} };
  const MAX_ATTEMPTS_BEFORE_REVEAL = 2;

  function makeBlankElement(word, blankId) {
    const wrapper = document.createElement("span");
    wrapper.className = "blank";
    wrapper.dataset.blankId = blankId;
    wrapper.dataset.word = word;

    const prefixSpan = document.createElement("span");
    prefixSpan.className = "prefix";
    prefixSpan.textContent = word.slice(0, 1);
    wrapper.appendChild(prefixSpan);

    const lettersSpan = document.createElement("span");
    lettersSpan.className = "letters";
    const remaining = word.length - 1;
    for (let i = 0; i < remaining; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.className = "letter-input";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.dataset.pos = String(i);
      input.addEventListener("input", () => {
        if (input.value.length >= 1) {
          const next = lettersSpan.children[i + 1];
          if (next) next.focus();
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value) {
          const prev = lettersSpan.children[i - 1];
          if (prev) prev.focus();
        }
      });
      lettersSpan.appendChild(input);
    }
    wrapper.appendChild(lettersSpan);
    return wrapper;
  }

  function renderPassages(unitData) {
    const container = document.getElementById("passages-container");
    let blankCounter = 0;

    unitData.passages.forEach((passage, pIdx) => {
      const card = document.createElement("div");
      card.className = "passage-card";
      card.dataset.passageIndex = String(pIdx);

      const h3 = document.createElement("h3");
      h3.textContent = "Passage " + (pIdx + 1) + ": " + passage.title;
      card.appendChild(h3);

      const p = document.createElement("p");
      p.className = "passage-text";

      const parts = passage.text.split(/\{\{(\w+)\}\}/g);
      parts.forEach((part, i) => {
        if (i % 2 === 0) {
          if (part) p.appendChild(document.createTextNode(part));
        } else {
          const word = part;
          const blankId = "b" + blankCounter++;
          state.results[blankId] = { word: word, attempts: 0, firstAttemptCorrect: null, resolved: false };
          p.appendChild(makeBlankElement(word, blankId));
        }
      });
      card.appendChild(p);

      const checkBtn = document.createElement("button");
      checkBtn.type = "button";
      checkBtn.className = "check-btn";
      checkBtn.textContent = "Check Answers";
      checkBtn.addEventListener("click", () => checkPassage(card));
      card.appendChild(checkBtn);

      const feedback = document.createElement("div");
      feedback.className = "passage-feedback";
      feedback.textContent = 'Fill in every blank, then click "Check Answers".';
      card.appendChild(feedback);

      container.appendChild(card);
    });
  }

  function checkPassage(card) {
    const blanks = card.querySelectorAll(".blank");
    let correctCount = 0;
    let revealedCount = 0;
    let unfilled = 0;

    blanks.forEach((blankEl) => {
      const word = blankEl.dataset.word;
      const blankId = blankEl.dataset.blankId;
      const inputs = blankEl.querySelectorAll(".letter-input");
      const rec = state.results[blankId];

      if (blankEl.classList.contains("locked")) {
        if (blankEl.classList.contains("revealed")) {
          revealedCount++;
        } else {
          correctCount++;
        }
        return;
      }

      const typedRemainder = Array.from(inputs).map((i) => i.value).join("");
      if (typedRemainder.length < inputs.length) unfilled++;

      const typed = blankEl.querySelector(".prefix").textContent + typedRemainder;
      const isCorrect = typed.toLowerCase() === word.toLowerCase();

      if (rec.attempts === 0) {
        rec.firstAttemptCorrect = isCorrect;
      }
      rec.attempts++;

      if (isCorrect) {
        correctCount++;
        rec.resolved = true;
        blankEl.classList.remove("incorrect");
        blankEl.classList.add("correct", "locked");
        const lettersSpan = blankEl.querySelector(".letters");
        lettersSpan.innerHTML = "";
        const filled = document.createElement("span");
        filled.className = "filled-word";
        filled.textContent = word.slice(1);
        lettersSpan.appendChild(filled);
      } else if (rec.attempts >= MAX_ATTEMPTS_BEFORE_REVEAL) {
        // Second (or later) miss: reveal the answer instead of making the
        // student guess indefinitely.
        revealedCount++;
        rec.resolved = true;
        blankEl.classList.remove("incorrect");
        blankEl.classList.add("revealed", "locked");
        const lettersSpan = blankEl.querySelector(".letters");
        lettersSpan.innerHTML = "";
        const filled = document.createElement("span");
        filled.className = "reveal-word";
        filled.textContent = word.slice(1);
        filled.title = "Correct answer shown after a second attempt";
        lettersSpan.appendChild(filled);
      } else {
        blankEl.classList.remove("correct");
        blankEl.classList.add("incorrect");
        inputs.forEach((inp) => { inp.value = ""; inp.disabled = false; });
        if (inputs.length) inputs[0].focus();
      }
    });

    const feedback = card.querySelector(".passage-feedback");
    const total = blanks.length;
    if (unfilled > 0) {
      feedback.textContent = "Please fill in all " + total + " blanks before checking. (" + unfilled + " still empty.)";
      feedback.classList.remove("all-correct");
    } else {
      const resolvedCount = correctCount + revealedCount;
      let msg = correctCount + " / " + total + " correct in this passage.";
      if (revealedCount > 0) {
        msg += " " + revealedCount + " shown after a second try — study those words.";
      } else if (correctCount < total) {
        msg += " Re-read the red words and try again.";
      } else {
        msg += " All correct!";
      }
      feedback.textContent = msg;
      feedback.classList.toggle("all-correct", resolvedCount === total && revealedCount === 0);
    }

    updateSummary();
  }

  function updateSummary() {
    const ids = Object.keys(state.results);
    const total = ids.length;
    const firstAttemptCorrect = ids.filter((id) => state.results[id].firstAttemptCorrect === true).length;
    const resolvedCount = ids.filter((id) => state.results[id].resolved).length;

    const summaryEl = document.getElementById("summary");
    summaryEl.textContent =
      "Score (first attempt): " + firstAttemptCorrect + " / " + total + " correct" +
      " — " + resolvedCount + " / " + total + " blanks resolved so far.";

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) submitBtn.disabled = resolvedCount < total;
  }

  function getIncorrectWords() {
    const ids = Object.keys(state.results);
    const words = ids
      .filter((id) => state.results[id].firstAttemptCorrect === false)
      .map((id) => state.results[id].word);
    return Array.from(new Set(words));
  }

  function getScoreText() {
    const ids = Object.keys(state.results);
    const correct = ids.filter((id) => state.results[id].firstAttemptCorrect === true).length;
    return correct + "/" + ids.length;
  }

  async function submitResults(unitData) {
    const nameInput = document.getElementById("student-name");
    const name = nameInput.value.trim();
    const statusEl = document.getElementById("submit-status");

    if (!name) {
      statusEl.textContent = "Please enter your name above before submitting.";
      statusEl.className = "submit-status warn";
      nameInput.focus();
      return;
    }

    const payload = {
      timeDateOfQuiz: new Date().toISOString(),
      studentName: name,
      unitName: unitData.unitName,
      score: getScoreText(),
      incorrectWords: getIncorrectWords().join(", ")
    };

    if (typeof CONFIG === "undefined" || !CONFIG.GAS_URL || CONFIG.GAS_URL.indexOf("PASTE_") === 0) {
      statusEl.textContent =
        "Setup needed: the Google Sheet logging link hasn't been configured yet, so this result was not sent. " +
        "(See google-apps-script/Code.gs for setup instructions.)";
      statusEl.className = "submit-status warn";
      console.log("Quiz result payload (not sent — CONFIG.GAS_URL not set):", payload);
      return;
    }

    statusEl.textContent = "Submitting...";
    statusEl.className = "submit-status";
    try {
      await fetch(CONFIG.GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      statusEl.textContent = "Submitted! Score: " + payload.score + ". Thank you, " + name + ".";
      statusEl.className = "submit-status ok";
    } catch (err) {
      statusEl.textContent = "Submission failed: " + err.message;
      statusEl.className = "submit-status error";
    }
  }

  window.QuizEngine = {
    init: function (unitData) {
      renderPassages(unitData);
      updateSummary();
      const submitBtn = document.getElementById("submit-btn");
      if (submitBtn) {
        submitBtn.addEventListener("click", () => submitResults(unitData));
      }
    }
  };
})();
