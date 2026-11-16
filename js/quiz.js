/* EBA-07: educational quiz. Selected implementation assisted by AI and reviewed by the team. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const QUESTIONS = [
    {
      question: "Before close-up spacecraft photography, what was one major limitation in studying the Moon?",
      options: ["No one had ever seen the Moon", "Earth-based telescopes could not show very fine surface details", "The Moon had no known craters"],
      correct: 1,
      explanation: "Telescopes revealed major lunar features, but spacecraft cameras could record far finer details from nearby."
    },
    {
      question: "What were Rangers 1 and 2 primarily intended to test?",
      options: ["A human lunar landing", "Technology in highly elliptical Earth orbits", "A rover on the Moon"],
      correct: 1,
      explanation: "Rangers 1 and 2 were Block I engineering tests intended for highly elliptical Earth orbits, not lunar landing attempts."
    },
    {
      question: "Which early American spacecraft reached the Moon in 1962 but returned no useful mission data?",
      options: ["Ranger 4", "Ranger 1", "Ranger 9"],
      correct: 0,
      explanation: "Ranger 4 impacted the Moon, but a computer and control-system failure prevented the planned scientific return."
    },
    {
      question: "Why did Ranger 6 not achieve its primary scientific objective?",
      options: ["Its television cameras failed to return pictures", "It carried no television cameras", "Its destination was Mars"],
      correct: 0,
      explanation: "Ranger 6 reached the Moon in February 1964, but its television system failed to return lunar images."
    },
    {
      question: "When did Ranger 7 successfully photograph the Moon?",
      options: ["July 31, 1964", "July 20, 1969", "January 1, 1960"],
      correct: 0,
      explanation: "Ranger 7 returned its lunar pictures on July 31, 1964, shortly before the planned impact."
    },
    {
      question: "How many television cameras did Ranger 7 carry?",
      options: ["Two", "Six", "Twelve"],
      correct: 1,
      explanation: "The Block III Ranger design used six television cameras to record different fields of view."
    },
    {
      question: "Approximately how many pictures did Ranger 7 send back?",
      options: ["About 40", "About 400", "More than 4,300"],
      correct: 2,
      explanation: "The mission returned more than 4,300 images. Different NASA records give slightly different exact totals."
    },
    {
      question: "Was Ranger 7's collision with the Moon a mission failure?",
      options: ["Yes, any impact means failure", "No, impact was planned after transmitting pictures", "Yes, it was supposed to bring astronauts home"],
      correct: 1,
      explanation: "Ranger 7 was an impact mission. Its job was to photograph the surface and transmit the images before the spacecraft was destroyed."
    },
    {
      question: "Why are Ranger 7's photographs still available today?",
      options: ["The spacecraft returned to Earth", "It transmitted them to Earth before impact", "The cameras were recovered from the crater"],
      correct: 1,
      explanation: "The images had already been transmitted to receiving stations on Earth. The impact ended the spacecraft, not the scientific record."
    },
    {
      question: "What does the animated 3D lunar globe in our story represent?",
      options: ["An original Ranger 7 movie", "A reconstruction based on modern lunar data", "Footage from astronauts aboard Ranger 7"],
      correct: 1,
      explanation: "The globe is an educational reconstruction based on modern LRO data. The black-and-white historical frames are genuine Ranger 7 images."
    }
  ];

  const STATE = {
    index: -1,
    answers: [],
    voiceOn: true,
    finished: false
  };

  function setEba(message, emotion = "normal") {
    $("quiz-eba-dialogue").textContent = message;
    const image = $("quiz-eba-image");
    const names = {
      normal: "assets/bonny_front.png",
      success: "assets/eba-celebrating.gif",
      retry: "assets/eba-sad.gif"
    };
    image.src = names[emotion] || names.normal;
    image.alt = emotion === "success" ? "EBA celebrating a passed quiz, AI-generated animation" :
      emotion === "retry" ? "EBA looking sad after an unsuccessful quiz, AI-generated animation" :
      "EBA, the AI-generated robot guide";
    if (STATE.voiceOn) window.EBA_GUIDE.speak(message);
  }

  function updateMeter() {
    const answered = STATE.answers.length;
    $("quiz-progress-text").textContent = STATE.finished ? "Mission complete" :
      STATE.index < 0 ? "Mission briefing" : `Question ${STATE.index + 1} of ${QUESTIONS.length}`;
    $("quiz-score-label").textContent = STATE.finished ? `${score()} / ${QUESTIONS.length}` :
      `${answered} answered`;
    $("quiz-progress-fill").style.width = `${answered / QUESTIONS.length * 100}%`;
  }

  function score() {
    return STATE.answers.reduce((count, answer, i) => count + (answer === QUESTIONS[i].correct ? 1 : 0), 0);
  }

  function question() {
    const q = QUESTIONS[STATE.index];
    const root = $("quiz-content");
    root.replaceChildren();
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = `Transmission ${String(STATE.index + 1).padStart(2, "0")}`;
    const title = document.createElement("h2");
    title.textContent = q.question;
    const options = document.createElement("div");
    options.className = "quiz-options";
    const explanation = document.createElement("p");
    explanation.className = "quiz-explanation";
    explanation.setAttribute("role", "status");
    explanation.hidden = true;
    const next = document.createElement("button");
    next.className = "btn primary quiz-next";
    next.type = "button";
    next.textContent = STATE.index === QUESTIONS.length - 1 ? "See mission results" : "Next question";
    next.hidden = true;
    q.options.forEach((text, optionIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option";
      button.textContent = `${String.fromCharCode(65 + optionIndex)}. ${text}`;
      button.addEventListener("click", () => {
        if (STATE.answers.length > STATE.index) return;
        STATE.answers.push(optionIndex);
        options.querySelectorAll("button").forEach((option, index) => {
          option.disabled = true;
          if (index === q.correct) option.classList.add("correct");
          if (index === optionIndex && index !== q.correct) option.classList.add("incorrect");
        });
        const accurate = optionIndex === q.correct;
        explanation.hidden = false;
        explanation.textContent = `${accurate ? "Correct!" : "Not quite."} ${q.explanation}`;
        next.hidden = false;
        next.focus();
        updateMeter();
        setEba(`${accurate ? "Excellent work, explorer!" : "Not quite, but we can learn from this."} ${q.explanation}`);
      });
      options.append(button);
    });
    next.addEventListener("click", () => {
      STATE.index += 1;
      if (STATE.index < QUESTIONS.length) {
        updateMeter();
        question();
        setEba(`Question ${STATE.index + 1}. ${QUESTIONS[STATE.index].question}`);
      } else result();
    });
    root.append(eyebrow, title, options, explanation, next);
  }

  function result() {
    STATE.finished = true;
    const resultScore = score();
    const passed = resultScore >= 7;
    const message = passed ?
      `Mission accomplished! You scored ${resultScore} out of ten. You earned the Lunar Explorer badge! Ranger 7 would be proud of your curiosity.` :
      `Mission incomplete. You scored ${resultScore} out of ten. Every explorer gets another chance. Review the story and try again!`;
    const root = $("quiz-content");
    root.replaceChildren();
    const label = document.createElement("p");
    label.className = "eyebrow";
    label.textContent = passed ? "Lunar Explorer / Passed" : "Mission retry / Keep exploring";
    const heading = document.createElement("h2");
    heading.textContent = passed ? "Mission accomplished!" : "Another chance to explore";
    const grade = document.createElement("div");
    grade.className = "quiz-final-score";
    grade.textContent = `${resultScore} / ${QUESTIONS.length}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = passed ?
      "You completed EBA's knowledge test. Your Lunar Explorer badge celebrates what you learned." :
      "You can revisit the story and repeat the test. The real mission is curiosity.";
    const badge = document.createElement("p");
    badge.className = "quiz-badge";
    badge.textContent = passed ? "✦ LUNAR EXPLORER ✦" : "✧ EXPLORER IN TRAINING ✧";
    const retry = document.createElement("button");
    retry.className = "btn primary";
    retry.type = "button";
    retry.textContent = "Try the test again";
    retry.addEventListener("click", start);
    const back = document.createElement("button");
    back.className = "btn quiet";
    back.type = "button";
    back.textContent = "Return to the library";
    back.addEventListener("click", () => window.EBA07?.openLibrary());
    const actions = document.createElement("div");
    actions.className = "quiz-result-actions";
    actions.append(retry, back);
    root.append(label, heading, grade, paragraph, badge, actions);
    updateMeter();
    setEba(message, passed ? "success" : "retry");
  }

  function start() {
    STATE.index = 0;
    STATE.answers = [];
    STATE.finished = false;
    updateMeter();
    question();
    setEba(`Welcome to the lunar knowledge test! Question one. ${QUESTIONS[0].question}`);
  }

  function enter() {
    window.EBA_GUIDE.silence();
    STATE.index = -1;
    STATE.answers = [];
    STATE.finished = false;
    $("quiz-content").innerHTML = '<h2>Ready, explorer?</h2><p>Ten questions. Learn from each answer and score at least 7 of 10 to earn your Lunar Explorer badge.</p><button class="btn primary" id="quiz-start" type="button">Start the mission</button>';
    $("quiz-start").addEventListener("click", start);
    $("quiz-eba-image").src = "assets/bonny_front.png";
    $("quiz-eba-dialogue").textContent = "Ready for your final mission? I have ten questions for you!";
    updateMeter();
  }

  $("quiz-voice").addEventListener("click", () => {
    STATE.voiceOn = !STATE.voiceOn;
    $("quiz-voice").textContent = `EBA voice: ${STATE.voiceOn ? "on" : "off"}`;
    $("quiz-voice").setAttribute("aria-pressed", String(STATE.voiceOn));
    if (!STATE.voiceOn) window.EBA_GUIDE.silence();
    else window.EBA_GUIDE.speak($("quiz-eba-dialogue").textContent);
  });
  if (!window.EBA_GUIDE.supported) {
    STATE.voiceOn = false;
    $("quiz-voice").textContent = "EBA voice unavailable";
    $("quiz-voice").setAttribute("aria-pressed", "false");
    $("quiz-voice").disabled = true;
  }
  $("quiz-start").addEventListener("click", start);

  window.EBA_QUIZ = { enter, QUESTIONS };
})();
