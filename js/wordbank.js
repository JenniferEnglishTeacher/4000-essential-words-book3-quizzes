// ============================================================
// Part 1 "Word Bank" renderer: shows all 20 unit words with
// part of speech, an original sample sentence (target word in
// bold), and a text-to-speech "Listen" button (American English
// female voice when the browser/OS provides one).
// ============================================================
(function () {
  "use strict";

  let cachedVoices = [];

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    cachedVoices = window.speechSynthesis.getVoices();
  }

  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  }

  function pickAmericanFemaleVoice() {
    if (!cachedVoices || cachedVoices.length === 0) loadVoices();
    const voices = cachedVoices || [];

    // Common American female voice names across Chrome / Edge / Safari / Windows.
    const preferredNamePattern = /samantha|zira|jenny|aria|ava|susan|allison|female/i;

    let voice = voices.find((v) => v.lang === "en-US" && preferredNamePattern.test(v.name));
    if (!voice) voice = voices.find((v) => v.lang === "en-US");
    if (!voice) voice = voices.find((v) => /^en/i.test(v.lang));
    if (!voice) voice = voices[0];
    return voice;
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      alert("Sorry, your browser does not support text-to-speech.");
      return;
    }
    window.speechSynthesis.cancel(); // stop anything currently playing
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    const voice = pickAmericanFemaleVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  function boldTargetWord(sentence, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("\\b(" + escaped + ")\\b", "i");
    if (re.test(sentence)) {
      return sentence.replace(re, "<strong>$1</strong>");
    }
    return sentence; // fallback, should not happen with well-formed data
  }

  function render(unitData) {
    const container = document.getElementById("wordbank-container");
    if (!container) return;

    unitData.words.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "word-card";

      const head = document.createElement("div");
      head.className = "word-card-head";
      head.innerHTML =
        '<span class="wc-word">' + entry.word + "</span>" +
        '<span class="wc-pos">' + (entry.pos || "") + "</span>" +
        '<span class="wc-zh">' + (entry.zh || "") + "</span>";
      row.appendChild(head);

      const sentenceEl = document.createElement("p");
      sentenceEl.className = "wc-sentence";
      sentenceEl.innerHTML = boldTargetWord(entry.sentence, entry.word);
      row.appendChild(sentenceEl);

      const listenBtn = document.createElement("button");
      listenBtn.type = "button";
      listenBtn.className = "tts-btn";
      listenBtn.innerHTML = "&#128266; Listen";
      listenBtn.addEventListener("click", () => speak(entry.sentence));
      row.appendChild(listenBtn);

      container.appendChild(row);
    });
  }

  window.WordBank = { render: render };
})();
