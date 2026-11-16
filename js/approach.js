/* A user-controlled photographic approach with a short illustrative 3D opening. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const dialog = $("approach");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stages = [{
    start: 0,
    end: 5200,
    time: "A journey of three days",
    title: "The Moon fills the window.",
    description: "Ranger 7 keeps going. It has no landing legs and no plan to slow to a gentle stop.",
    provenance: "Illustrative 3D Moon using modern LRO data. The viewpoint is not a reconstruction of the exact flight path.",
    media: null
  }, {
    start: 5200,
    end: 10500,
    time: "About 17 minutes before impact",
    title: "The first picture arrives.",
    description: "From more than 2,000 kilometres away, the camera records a wide landscape of craters.",
    provenance: "Ranger 7, camera B, frame B001. NASA/NSSDC. Historic still photograph.",
    media: "r7_b001_primera"
  }, {
    start: 10500,
    end: 15100,
    time: "About 8.5 minutes before impact",
    title: "The marks become landscapes.",
    description: "Guericke crater comes into view. Each photograph covers a smaller patch of the Moon.",
    provenance: "Ranger 7, camera B, frame B100. NASA/NSSDC. The sequence compresses time.",
    media: "r7_b100_guericke"
  }, {
    start: 15100,
    end: 19600,
    time: "A photograph from about 566 km altitude",
    title: "Closer. And still closer.",
    description: "The surface grows across the frame. Details too small to distinguish before are now visible.",
    provenance: "NASA historical Ranger 7 image. Animated enlargement of a still photograph, not recovered video.",
    media: "ranger-7-8-image-from-566-km"
  }, {
    start: 19600,
    end: 24000,
    time: "About 2.5 seconds before impact",
    title: "A final complete view.",
    description: "Frame A199 shows a small area from about 6.5 km away. This was not the last transmission from every camera.",
    provenance: "Ranger 7, camera A, frame A199. NASA/NSSDC. Camera times and fields of view differ.",
    media: "r7_a199_2_5s"
  }, {
    start: 24000,
    end: 28000,
    time: "Partial frames about 0.39 and 0.19 seconds before impact",
    title: "The last picture is unfinished.",
    description: "The camera starts sending the next views. Their dark areas contain image data that never arrived.",
    provenance: "P200, partial P-camera frames. NASA/NSSDC. Both historic frames are kept intact.",
    media: "r7_p200_ultimos_frag"
  }, {
    start: 28000,
    end: 30400,
    time: "31 July 1964",
    title: "Signal ended.",
    description: "",
    provenance: "",
    media: null,
    black: true
  }, {
    start: 30400,
    end: Infinity,
    time: "The flight ends. The knowledge remains.",
    title: "The end was the beginning.",
    description: "The signal stopped because Ranger 7 hit the Moon, as planned. More than 4,300 photographs had already reached Earth. Its scientific mission had succeeded.",
    provenance: "NASA sources publish totals of 4,308 and 4,316 images. Complete frames and partial final transmissions are distinguished in the research archive.",
    media: null,
    black: true,
    outcome: true
  }];

  let frame = null;
  let elapsed = 0;
  let previousTime = 0;
  let paused = false;
  let activeIndex = -1;
  let globe = null;
  let onComplete = null;
  let lastFocus = null;
  let complete = false;

  function showStage(index) {
    activeIndex = index;
    const stage = stages[index];
    $("approach-time").textContent = stage.time;
    $("approach-heading").textContent = stage.title;
    $("approach-description").textContent = stage.description;
    $("approach-provenance").textContent = stage.provenance;
    dialog.classList.toggle("is-black", Boolean(stage.black));
    $("moon-canvas").style.opacity = index === 0 ? "1" : "0";
    $("moon-canvas").setAttribute("aria-hidden", String(index !== 0));
    for (const element of $("approach-photos").children) {
      const active = element.dataset.media === stage.media;
      element.classList.toggle("active", active);
      element.setAttribute("aria-hidden", String(!active));
    }
    $("approach-mode").textContent = stage.outcome ? "Mission accomplished" : "Final approach";
    if (stage.outcome) {
      complete = true;
      $("pause-approach").hidden = true;
      $("skip-approach").hidden = true;
      $("continue-approach").hidden = false;
      $("continue-approach").focus({
        preventScroll: true
      });
      dialog.scrollTop = 0;
      cancelAnimationFrame(frame);
    }
  }

  function tick(now) {
    if (!dialog.open || paused) return;
    if (previousTime) elapsed += now - previousTime;
    previousTime = now;
    const index = stages.findIndex((stage) => elapsed >= stage.start && elapsed < stage.end);
    if (index !== activeIndex) showStage(index);
    const stage = stages[index];
    const fraction = Math.max(0, Math.min(1, (elapsed - stage.start) / (stage.end - stage.start)));
    if (index === 0 && globe) globe.render(3.4 - fraction * 2.05);
    if (stage.media) {
      const image = $("approach-photos").querySelector(`[data-media="${stage.media}"] img`);
      // The incomplete final frames stay unzoomed so that their missing data remain visible.
      const scale = index === 5 ? 1 : 1.015 + fraction * .22;
      image.style.transform =
        `perspective(1400px) scale(${scale}) rotateX(${index === 5 ? 0 : (1 - fraction) * 1.2}deg)`;
    }
    if (!complete) frame = requestAnimationFrame(tick);
  }

  function start(callback) {
    if (dialog.open) return;
    window.EBA_GUIDE?.silence();
    lastFocus = document.activeElement;
    onComplete = callback;
    elapsed = 0;
    previousTime = 0;
    paused = false;
    complete = false;
    activeIndex = -1;
    $("pause-approach").hidden = false;
    $("pause-approach").textContent = reducedMotion.matches ? "Next photograph" : "Pause";
    $("skip-approach").hidden = false;
    $("continue-approach").hidden = true;
    $("approach-photos").replaceChildren();
    for (const stage of stages.filter((item) => item.media)) {
      const container = document.createElement("div");
      container.className = "approach-frame";
      container.dataset.media = stage.media;
      const image = document.createElement("img");
      const resource = window.EBA_IMAGES[stage.media];
      image.src = resource.src;
      image.alt = resource.title;
      container.append(image);
      $("approach-photos").append(container);
    }
    const oldCanvas = $("moon-canvas");
    oldCanvas.replaceWith(oldCanvas.cloneNode(false));
    dialog.showModal();
    document.body.style.overflow = "hidden";
    globe = window.EBA_MOON.create($("moon-canvas"), {
      distance: 3.4
    });
    showStage(0);
    if (!reducedMotion.matches) frame = requestAnimationFrame(tick);
    $("close-approach").focus({
      preventScroll: true
    });
    dialog.scrollTop = 0;
  }

  function togglePause() {
    if (reducedMotion.matches) {
      const next = Math.min(activeIndex + 1, stages.length - 1);
      elapsed = stages[next].start;
      showStage(next);
      return;
    }
    paused = !paused;
    $("pause-approach").textContent = paused ? "Resume" : "Pause";
    if (paused) cancelAnimationFrame(frame);
    else {
      previousTime = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function outcome() {
    cancelAnimationFrame(frame);
    elapsed = stages.at(-1).start;
    showStage(stages.length - 1);
  }

  function close(continueReading = false) {
    cancelAnimationFrame(frame);
    globe?.destroy();
    globe = null;
    dialog.close();
    document.body.style.overflow = "";
    if (continueReading) onComplete?.();
    else lastFocus?.focus();
  }

  $("close-approach").addEventListener("click", () => close());
  $("pause-approach").addEventListener("click", togglePause);
  $("skip-approach").addEventListener("click", outcome);
  $("continue-approach").addEventListener("click", () => close(true));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && dialog.open && !paused && !complete && !reducedMotion.matches) togglePause();
  });

  window.EBA_APPROACH = {
    start,
    close,
    isOpen: () => dialog.open
  };
})();
