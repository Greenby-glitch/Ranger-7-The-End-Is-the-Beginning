/* EBA-07 disclosure: portions of code were AI-assisted, then reviewed and integrated by the team. The project builds on Emiliano's earlier working code. */
/* EBA speaks only after a visitor enables voice. Conversations never auto-loop. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const library = $("library");
  const seen = new Set();
  let voiceEnabled = true;
  let currentMessage = "";
  let currentNode = "intro";
  let cameoTimer = null;
  let lastScene = null;
  let callbacks = {};

  const nodes = {
    intro: {
      text: "Hi, explorer! I'm EBA, your library guide. Do you know Ranger 7?",
      choices: [
        ['YES, I DO', 'knows'],
        ['NOT YET', 'new']
      ]
    },
    knows: {
      text: "Then you already know this is no ordinary mission! Ready to discover why its ending changed lunar exploration? Tap the glowing Ranger 7 book.",
      choices: [
        ['OPEN THE BOOK', 'open'],
        ['TELL ME A FACT', 'success']
      ]
    },
    new: {
      text: "Ranger 7 was a robotic NASA spacecraft launched in 1964. Its mission was to photograph the Moon up close and send those images to Earth before impact. Would you like to know more?",
      choices: [
        ['YES, TELL ME MORE', 'more'],
        ['MAYBE LATER', 'later']
      ]
    },
    more: {
      text: "It sent more than 4,300 lunar images. Its final impact was intentional, not a failed landing. The spacecraft was lost, but the knowledge it sent home changed what scientists knew about the Moon.",
      choices: [
        ['WHY DID IT CRASH?', 'crash'],
        ['OPEN THE STORY', 'open']
      ]
    },
    later: {
      text: "Trust me, you won't regret meeting Ranger 7! Its final moments hold an amazing discovery. When you're ready, that glowing book is waiting for you.",
      choices: [
        ['OPEN THE BOOK', 'open'],
        ['ASK ANOTHER QUESTION', 'questions']
      ]
    },
    what: {
      text: "Ranger 7 was an uncrewed NASA space probe. It carried six television cameras and flew toward the Moon to transmit close-up pictures of its surface.",
      choices: [
        ['WHY DID IT CRASH?', 'crash'],
        ['OPEN THE STORY', 'open']
      ]
    },
    crash: {
      text: "The impact was planned! Ranger 7 was designed to take pictures until the final moments, not to land softly. Its signal ended, but its scientific legacy began.",
      choices: [
        ['WHY WAS IT IMPORTANT?', 'success'],
        ['OPEN THE STORY', 'open']
      ]
    },
    success: {
      text: "On July 31, 1964, Ranger 7 delivered the first successful American close-up photographs of the lunar surface. Those images helped prepare the way for later lunar exploration.",
      choices: [
        ['TELL ME ABOUT THE PROBE', 'what'],
        ['OPEN THE STORY', 'open']
      ]
    },
    book: {
      text: "Look for the glowing book labelled RANGER 7. Select it to open 'The End Is the Beginning' and explore all eight chapters.",
      choices: [
        ['OPEN THE BOOK', 'open'],
        ['BACK TO QUESTIONS', 'questions']
      ]
    }
  };
  const libraryNodes = nodes;

  const cameos = {
    "3.2": {
      text: "Six cameras on Ranger 6. Six on Ranger 7. So what made the second chance different?",
      label: "Compare the missions",
      type: "comparison"
    },
    "3.4": {
      text: "How can a spacecraft know when to act? Its electronic clock counted a steady rhythm instead of moving hands around a dial.",
      label: "Show me how",
      type: "clock"
    },
    "4.2": {
      text: "Less than half a second separated two important events. A clue can suggest an explanation without proving the whole story.",
      label: "Explain the clue",
      hotspot: 1
    },
    "4.3": {
      text: "A better design needed better checks too. Want to see how the team protected its second chance?",
      label: "Compare the missions",
      type: "comparison"
    },
    "5.1": {
      text: "Fourteen screws and one washer sound small. Inside flight electronics, a small mistake can become a very big problem.",
      label: "Why did it matter?",
      hotspot: 2
    },
    "6.4": {
      text: "On a journey this long, even a tiny timing error could matter. That is why a small course correction was so important.",
      label: "Explain the timing",
      hotspot: 2
    },
    "8.1": {
      text: "If the spacecraft is gone, are its pictures gone too? Think about where the signals had already travelled.",
      choices: [
        ["The pictures were lost",
          "The pictures had already reached Earth. The impact ended the flight, but it did not erase the recordings in the archive."
        ],
        ["They were on Earth",
          "Exactly. Ranger 7 sent its knowledge home before its planned impact. Scientists could keep studying those recordings."
        ]
      ]
    }
  };

  function silence() {
    if (supported) window.speechSynthesis.cancel();
  }

  function speak(text, done) {
    if (!supported) return false;
    silence();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = .93;
    const voices = window.speechSynthesis.getVoices();
    const english = voices.find((voice) => voice.lang === "en-US") || voices.find((voice) => voice.lang
      .startsWith("en"));
    if (english) utterance.voice = english;
    utterance.onend = done || null;
    utterance.onerror = done || null;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function label(value) {
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1).replace(/eba/g, "EBA").replace(/\bi\b/g, "I");
  }

  function renderNode(id) {
    if (id === "open") {
      $("open-book")?.click();
      return;
    }
    if (id === "questions") {
      $("eba-menu").open = true;
      $("eba-menu").querySelector("button")?.focus();
      return;
    }
    const node = libraryNodes[id];
    if (!node) return;
    currentNode = id;
    currentMessage = node.text;
    $("eba-dialogue").textContent = currentMessage;
    $("eba-answers").replaceChildren();
    $("eba-menu").open = false;
    for (const [text, target] of node.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label(text);
      button.addEventListener("click", () => renderNode(target));
      $("eba-answers").append(button);
    }
    if (voiceEnabled && library.classList.contains("active")) speak(currentMessage);
  }

  function hideCameo() {
    clearTimeout(cameoTimer);
    $("eba-cameo").hidden = true;
  }

  function showCameo(scene, force = false) {
    hideCameo();
    const configuration = cameos[scene.id];
    if (!configuration || (seen.has(scene.id) && !force)) return;
    seen.add(scene.id);
    const render = () => {
      if (!$("reader").classList.contains("active")) return;
      $("cameo-message").textContent = configuration.text;
      $("cameo-choices").replaceChildren();
      $("eba-cameo").hidden = false;
      if (configuration.choices) {
        for (const [text, explanation] of configuration.choices) {
          addCameoChoice(text, () => {
            $("cameo-message").textContent = explanation;
            $("cameo-choices").replaceChildren();
            addCameoChoice("Keep exploring", hideCameo);
            if (voiceEnabled) speak(explanation);
          });
        }
      } else {
        addCameoChoice(configuration.label, () => {
          const hotspot = configuration.type ? scene.hotspots.find((item) => item.type === configuration
            .type) : scene.hotspots[configuration.hotspot];
          hideCameo();
          if (hotspot) callbacks.openNote?.(hotspot, scene);
        });
        addCameoChoice("I'll explore", hideCameo);
      }
      if (voiceEnabled && !document.querySelector("dialog[open]")) speak(configuration.text);
    };
    cameoTimer = setTimeout(render, force ? 0 : 900);
  }

  function addCameoChoice(text, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", action);
    $("cameo-choices").append(button);
  }

  $("cameo-close").addEventListener("click", hideCameo);
  $("eba-voice").addEventListener("click", () => {
    if (!supported) return;
    voiceEnabled = !voiceEnabled;
    $("eba-voice").setAttribute("aria-pressed", String(voiceEnabled));
    $("eba-voice").textContent = voiceEnabled ? "Voice on" : "Voice off";
    if (voiceEnabled) speak(currentMessage);
    else silence();
  });
  document.querySelectorAll("[data-eba-topic]").forEach((button) => {
    button.addEventListener("click", () => renderNode(button.dataset.ebaTopic));
  });
  if (!supported) {
    $("eba-voice").disabled = true;
    $("eba-voice").title = "Voice is unavailable in this browser. All text remains readable.";
  }
  new MutationObserver(() => {
    if (!library.classList.contains("active")) silence();
  }).observe(library, {
    attributes: true,
    attributeFilter: ["class"]
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) silence();
  });
  renderNode(currentNode);

  window.EBA_GUIDE = {
    speak,
    silence,
    supported,
    hide: hideCameo,
    bind(actions) {
      callbacks = actions;
    },
    enterScene(scene) {
      if (lastScene !== scene.id) {
        silence();
        hideCameo();
        lastScene = scene.id;
        showCameo(scene);
      }
    },
    ask(scene) {
      showCameo(scene, true);
    },
    hasCameo: (id) => Boolean(cameos[id])
  };
})();
