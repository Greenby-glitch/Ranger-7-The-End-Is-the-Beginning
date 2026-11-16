/* EBA-07 disclosure: portions of code were AI-assisted, then reviewed and integrated by the team. The project builds on Emiliano's earlier working code. */
/* Navigation, page turning and shared explanations. Content lives in separate files. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const scenes = window.EBA_SCENES;
  const archive = window.EBA_ARCHIVE;
  const glossary = window.EBA_GLOSSARY;
  const sources = window.EBA_SOURCES;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const book = $("book-stage");
  let view = "landing";
  let sceneIndex = 0;
  let returnView = "library";
  let light = false;
  let turning = false;
  let turnAnimation = null;
  let moon = null;
  let currentVisual = null;
  let readActive = false;
  let lastFocus = null;
  let mediaObserver = null;
  let snapshotNumber = 0;

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function clean(value) {
    return String(value ?? "")
      .replace(/[«»“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s*[·|]\s*/g, ", ")
      .replace(/\s*\/\/\s*/g, ". ")
      .replace(/\s+\/\s+/g, ", ")
      .replace(/launch\/cruise/g, "launch and cruise");
  }

  function title(value) {
    let text = clean(value).replace(/`/g, "");
    if (text !== text.toUpperCase()) return text;
    text = text.toLowerCase();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/\b(nasa|jpl|rca|tv|lro|us|cc&s)\b/gi, (match) => match.toUpperCase());
    return text.replace(/\b(ranger|goldstone|moon|atlas|agena|apollo|surveyor|earth|alphonsus)\b/gi, (match) =>
      match.charAt(0).toUpperCase() + match.slice(1));
  }

  function rich(value) {
    return escape(clean(value))
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.*?)`/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function remember() {
    try {
      localStorage.setItem("eba07-scene", scenes[sceneIndex].id);
    } catch (error) {
      /* Storage can be disabled. */
    }
  }

  function definitionsWithin(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement.closest("button,a,summary,script,style") ? NodeFilter.FILTER_REJECT :
          NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.textContent;
      const candidates = [];
      glossary.forEach((definition, index) => {
        for (const term of definition.terms) {
          const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const expression = new RegExp(`\\b${safe}\\b`, "gi");
          let match;
          while ((match = expression.exec(text))) candidates.push({
            start: match.index,
            end: match.index + match[0].length,
            index
          });
        }
      });
      candidates.sort((a, b) => a.start - b.start || b.end - a.end);
      if (!candidates.length) continue;
      const fragment = document.createDocumentFragment();
      let consumed = 0;
      for (const match of candidates) {
        if (match.start < consumed) continue;
        fragment.append(text.slice(consumed, match.start));
        const button = document.createElement("button");
        button.type = "button";
        button.className = "term";
        button.textContent = text.slice(match.start, match.end);
        button.setAttribute("aria-label", `Explain ${button.textContent}`);
        button.addEventListener("click", () => openDefinition(match.index));
        fragment.append(button);
        consumed = match.end;
      }
      fragment.append(text.slice(consumed));
      node.replaceWith(fragment);
    }
  }

  function stopReading() {
    window.EBA_GUIDE.silence();
    readActive = false;
    $("read-aloud").textContent = "Read aloud";
    $("read-aloud").setAttribute("aria-pressed", "false");
  }

  function route(destination) {
    cancelTurn();
    stopReading();
    window.EBA_GUIDE.hide();
    if (destination !== "reader") {
      moon?.destroy();
      moon = null;
    }
    view = destination;
    document.querySelectorAll(".viewport").forEach((section) => {
      const active = section.id === destination;
      section.classList.toggle("active", active);
      section.inert = !active;
    });
    if (destination === "reader") renderScene();
    if (destination === "mission-quiz") window.EBA_QUIZ.enter();
    if (destination === "archive") renderArchive();
    document.title = destination === "reader" ? `Ranger 7: ${title(scenes[sceneIndex].title)}` :
      "Ranger 7: The End Is the Beginning";
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }

  function initShelves() {
    const shelves = $("library-shelves");
    for (let row = 0; row < 3; row += 1) {
      const shelf = document.createElement("div");
      shelf.className = `lib-shelf ${row === 0 ? "upper" : row === 2 ? "lower" : ""}`;
      for (let index = 0; index < 16; index += 1) {
        if (row === 1 && index === 8) {
          const button = document.createElement("button");
          button.type = "button";
          button.id = "open-book";
          button.className = "featured-book";
          button.setAttribute("aria-label", "Open Ranger 7: The End Is the Beginning");
          button.innerHTML =
            '<span>BOOK 01</span><strong>RANGER 7</strong><span class="book-orbit" aria-hidden="true">☾</span><span>OPEN THE STORY</span>';
          button.addEventListener("click", () => {
            sceneIndex = 0;
            route("reader");
          });
          shelf.append(button);
        } else {
          const spine = document.createElement("span");
          spine.className = "spine";
          spine.style.setProperty("--h", `${75 + ((index * 29 + row * 43) % 65)}px`);
          spine.setAttribute("aria-hidden", "true");
          shelf.append(spine);
        }
      }
      shelves.append(shelf);
    }
  }

  function chapterMenu() {
    const holder = $("chapter-list");
    holder.replaceChildren();
    for (let chapter = 1; chapter <= 8; chapter += 1) {
      const records = scenes.filter((scene) => scene.chapter === chapter);
      const section = document.createElement("section");
      section.className = "chapter-group";
      section.innerHTML = `<h3>${chapter}. ${escape(title(records[0].chapterTitle))}</h3>`;
      for (const scene of records) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chapter-btn";
        button.dataset.sceneId = scene.id;
        button.innerHTML = `<small>${scene.id}</small>${escape(title(scene.title))}`;
        button.addEventListener("click", () => {
          $("drawer").close();
          if (view !== "reader") {
            sceneIndex = scenes.indexOf(scene);
            route("reader");
          } else turnTo(scenes.indexOf(scene));
        });
        section.append(button);
      }
      holder.append(section);
    }
  }

  function noteSources(scene, extras = []) {
    const ids = [...new Set([...(scene?.sources?.match(/S\d+/g) || []), ...extras])];
    if (scene && scene.chapter >= 3 && scene.chapter <= 6) ids.push("S10");
    return [...new Set(ids)].filter((id) => sources[id]).map((id) => {
      const source = sources[id];
      return `<a href="${source.url}" target="_blank" rel="noopener">${escape(clean(source.author))}: ${escape(source.title)}</a>`;
    }).join("<br>");
  }

  function showModal(heading, html, referenceHTML = "", scene = scenes[sceneIndex]) {
    stopReading();
    window.EBA_GUIDE.hide();
    lastFocus = document.activeElement;
    $("modal-eyebrow").textContent = scene ? `Scene ${scene.id}` : "A closer look";
    $("modal-title").textContent = title(heading);
    $("modal-body").innerHTML = html;
    $("modal-source").innerHTML = referenceHTML;
    definitionsWithin($("modal-body"));
    if (!$("modal").open) $("modal").showModal();
    document.body.style.overflow = "hidden";
    $("modal-close").focus();
  }

  function closeModal() {
    $("modal").close();
    document.body.style.overflow = "";
    lastFocus?.focus();
  }

  function openDefinition(index) {
    const definition = glossary[index];
    stopReading();
    const dialog = document.createElement("dialog");
    dialog.className = "note-modal definition-modal";
    dialog.setAttribute("aria-labelledby", "definition-title");
    dialog.innerHTML =
      `<div class="modal-top"><span class="eyebrow">Word guide</span><button class="close-icon" type="button" aria-label="Close word guide">×</button></div><h2 id="definition-title">${escape(definition.title)}</h2><p class="simple-explanation">${rich(definition.plain)}</p><details class="modal-technical"><summary>Go a little deeper</summary><p>${rich(definition.detail)}</p></details><div class="modal-source">${noteSources(null, [definition.source])}</div><button class="btn primary" type="button">Back to reading</button>`;
    document.body.append(dialog);
    const close = () => dialog.close();
    dialog.querySelectorAll("button").forEach((button) => button.addEventListener("click", close));
    dialog.addEventListener("close", () => {
      dialog.remove();
    }, {
      once: true
    });
    dialog.showModal();
  }

  function plainFor(spot) {
    const words = `${spot.label} ${spot.title}`.toLowerCase();
    return glossary.find((definition) => definition.terms.some((term) => words.includes(term.toLowerCase())));
  }

  function openNote(spot, scene = scenes[sceneIndex]) {
    const definition = plainFor(spot);
    let html = "";
    if (definition && spot.body.length > 430) {
      html =
        `<p class="simple-explanation">${rich(definition.plain)}</p><details class="modal-technical"><summary>The mission details</summary><p>${rich(spot.body)}</p></details>`;
    } else {
      html = `<p>${rich(spot.body)}</p>`;
    }
    if (spot.type === "comparison") {
      html +=
        `<table class="compare-table"><caption>Two Block III missions, the same scientific goal</caption><thead><tr><th>Question</th><th>Ranger 6</th><th>Ranger 7</th></tr></thead><tbody><tr><th>Six cameras?</th><td>Yes</td><td>Yes</td></tr><tr><th>Reached the Moon?</th><td>2 February 1964</td><td>31 July 1964</td></tr><tr><th>Sent lunar pictures?</th><td>No</td><td>More than 4,300</td></tr><tr><th>What changed?</th><td>TV-system failure investigated</td><td>Activation protection, more testing and inspection</td></tr></tbody></table>`;
    }
    if (spot.type === "clock") {
      html =
        `<p class="simple-explanation">A steady beat. A counter. An instruction at the right moment.</p><div class="clock-demo"><span class="clock-dot" aria-hidden="true"></span><div>Pulse, count, act.<small>Shown slowly to explain the idea, not at the actual frequency.</small></div></div><p>${rich(spot.body)}</p>`;
    }
    showModal(spot.title, html, noteSources(scene, spot.type === "clock" ? ["S9", "S10", "S11"] : []), scene);
  }

  function mountPins(scene) {
    const layer = $("hotspot-layer");
    const list = $("hotspot-list");
    layer.replaceChildren();
    list.replaceChildren();
    scene.hotspots.forEach((spot, index) => {
      const pin = document.createElement("button");
      const coordinates = currentVisual.pins[index] || [20 + index * 15, 82];
      const label = title(spot.label.replace(/`/g, "").replace(/\s*\(accessible.*\)/, ""));
      pin.type = "button";
      pin.className = "hotspot-pin";
      pin.textContent = String(index + 1);
      pin.dataset.label = label;
      pin.dataset.edge = coordinates[0] > 72 ? "right" : coordinates[0] < 25 ? "left" : "center";
      pin.style.setProperty("--x", `${coordinates[0]}%`);
      pin.style.setProperty("--y", `${coordinates[1]}%`);
      pin.setAttribute("aria-label", `Explore ${label}`);
      pin.addEventListener("click", () => openNote(spot, scene));
      layer.append(pin);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "spot-btn";
      button.innerHTML = `<span>${index + 1}</span>${escape(label)}`;
      button.addEventListener("click", () => openNote(spot, scene));
      button.addEventListener("pointerenter", () => pin.classList.add("highlight"));
      button.addEventListener("pointerleave", () => pin.classList.remove("highlight"));
      button.addEventListener("focus", () => pin.classList.add("highlight"));
      button.addEventListener("blur", () => pin.classList.remove("highlight"));
      list.append(button);
    });
  }

  function layoutPins() {
    if (!currentVisual) return;
    const bounds = $("art-image").getBoundingClientRect();
    const ratio = currentVisual.ratio;
    let width = bounds.width;
    let height = width / ratio;
    if (height > bounds.height) {
      height = bounds.height;
      width = height * ratio;
    }
    const layer = $("hotspot-layer");
    Object.assign(layer.style, {
      left: `${(bounds.width - width) / 2}px`,
      top: `${(bounds.height - height) / 2}px`,
      width: `${width}px`,
      height: `${height}px`
    });
  }

  function mountVisual(visual, scene) {
    moon?.destroy();
    moon = null;
    currentVisual = visual;
    $("art-image").innerHTML = visual.html;
    if (visual.aiAssisted === true) {
      const mark = document.createElement("span");
      mark.className = "generated-visual-mark";
      mark.textContent = "AI-ASSISTED SCHEMATIC";
      $("art-image").append(mark);
    }
    $("art-caption").innerHTML =
      `${escape(visual.caption)} ${visual.source ? `<a href="${visual.source}" target="_blank" rel="noopener">${escape(visual.credit.replace(/\s*\/\s*/g, ", "))}</a>` : ""}`;
    mountPins(scene);
    mediaObserver?.disconnect();
    mediaObserver = new ResizeObserver(layoutPins);
    mediaObserver.observe($("art-image"));
    const image = $("art-image").querySelector("img");
    if (image) {
      image.addEventListener("load", layoutPins);
      image.addEventListener("error", () => {
        $("art-caption").textContent =
          "This image could not be loaded. The scene's explanations remain available below.";
        image.alt = "Historical image unavailable";
      }, {
        once: true
      });
    }
    if (visual.moon) moon = window.EBA_MOON.create($("scene-moon"), {
      interactive: true
    });
    requestAnimationFrame(layoutPins);
  }

  function special(scene) {
    const holder = $("scene-special");
    holder.replaceChildren();
    if (scene.id === "7.3") {
      const sequence = [
        ["r7_b100_guericke", "B100: about 8.5 minutes before impact. Guericke crater."],
        ["ranger-7-8-image-from-566-km", "A closer historic image from about 566 km altitude."],
        ["r7_a199_2_5s", "A199: about 2.5 seconds before impact, from about 6.5 km."]
      ];
      holder.innerHTML =
        `
<div class="scene-experiment">
<label for="photo-sequence">Move closer to the surface</label>
<input id="photo-sequence" type="range" min="0" max="2" step="1" value="0" aria-valuetext="B100, about 8.5 minutes before impact">
<p class="experiment-note" id="sequence-description">Different camera fields, shown in time order.</p>
</div>
`;
      $("photo-sequence").addEventListener("input", (event) => {
        const [media, caption] = sequence[Number(event.target.value)];
        event.target.setAttribute("aria-valuetext", caption);
        mountVisual(window.EBA_VISUALS.photograph(media, caption), scene);
        $("sequence-description").textContent = caption;
      });
    }
    if (scene.id === "8.3") {
      holder.innerHTML =
        `
<div class="scene-action">
<button class="btn quiet" id="crater-1972" type="button" aria-pressed="true">Apollo 16, 1972</button>
<button class="btn quiet" id="crater-2010" type="button" aria-pressed="false">LRO, 2010</button>
</div>
`;
      const choose = (year) => {
        $("crater-1972").setAttribute("aria-pressed", String(year === 1972));
        $("crater-2010").setAttribute("aria-pressed", String(year === 2010));
        const media = year === 1972 ? "ranger-7-11-impact-crater-from-apollo-16" :
          "ranger-7-12-impact-crater-from-lroc-low-sun-angle";
        mountVisual(window.EBA_VISUALS.photograph(media,
          `The Ranger 7 impact crater, photographed in ${year} by ${year === 1972 ? "Apollo 16" : "LRO"}.`
        ), scene);
      };
      $("crater-1972").addEventListener("click", () => choose(1972));
      $("crater-2010").addEventListener("click", () => choose(2010));
    }
    if (scene.id === "6.4") {
      holder.innerHTML =
        `
<div class="scene-experiment">
<label for="course-slider">Explore a small change in direction</label>
<input id="course-slider" type="range" min="0" max="100" value="50">
<p class="experiment-note">An illustration of the idea, not a flight calculation.</p>
</div>
`;
      $("course-slider").addEventListener("input", (event) => {
        const bend = 35 + Number(event.target.value) * 2;
        $("correction-path")?.setAttribute("d", `M157 254Q355 ${bend} 592 137`);
      });
    }
    if (scene.id === "7.4") {
      holder.innerHTML =
        `
<div class="scene-action">
<button class="btn primary" id="start-impact" type="button">Enter the final approach</button>
<button class="btn quiet" id="last-frames" type="button">Understand the last frames</button>
</div>
`;
      $("start-impact").addEventListener("click", () => window.EBA_APPROACH.start(() => next(1)));
      $("last-frames").addEventListener("click", () => openNote(scene.hotspots[0], scene));
    }
    if (window.EBA_GUIDE.hasCameo(scene.id)) {
      const ask = document.createElement("button");
      ask.type = "button";
      ask.className = "source-note ask-eba";
      ask.textContent = "Ask EBA";
      ask.addEventListener("click", () => window.EBA_GUIDE.ask(scene));
      holder.append(ask);
    }
    if (scene.id === "8.4") {
      holder.innerHTML = `
        <div class="scene-action mission-test-invite">
          <button class="btn primary" id="launch-final-quiz" type="button">Take EBA's 10-question test</button>
          <button class="btn quiet" id="read-again" type="button">Read again</button>
          <button class="btn quiet" id="finish-library" type="button">Back to the library</button>
          <a class="text-link" href="sources.html?return=book">Sources and credits</a>
        </div>
      `;
      $("launch-final-quiz").addEventListener("click", () => route("mission-quiz"));
      $("read-again").addEventListener("click", () => turnTo(0));
      $("finish-library").addEventListener("click", () => route("library"));
    }
  }
  function renderScene({
    notify = true
  } = {}) {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    stopReading();
    $("chapter-name").textContent = `Chapter ${scene.chapter}: ${title(scene.chapterTitle)}`;
    $("header-scene").textContent = `Scene ${scene.id}`;
    $("folio-left").textContent = `Ranger 7, ${String(sceneIndex + 1).padStart(2, "0")}`;
    $("scene-title").textContent = title(scene.title);
    $("scene-narration").innerHTML = `<p>${rich(scene.visible)}</p>`;
    definitionsWithin($("scene-narration"));
    $("scene-fact").innerHTML = rich(scene.curiosity ||
      "The marked objects open the scientific and historical details behind this scene.");
    definitionsWithin($("scene-fact"));
    $("fact-note").open = false;
    $("fact-note").hidden = !scene.curiosity;
    mountVisual(window.EBA_VISUALS.build(scene), scene);
    special(scene);
    $("scene-pagination").textContent = `${sceneIndex + 1} of ${scenes.length}`;
    $("prev-scene").disabled = sceneIndex === 0 || turning;
    $("next-scene").disabled = turning;
    $("next-scene").textContent = sceneIndex === scenes.length - 1 ? "Take EBA's test" : "Next page";
    $("read-progress-inner").style.width = `${(sceneIndex + 1) / scenes.length * 100}%`;
    document.querySelectorAll(".chapter-btn").forEach((button) => button.classList.toggle("current", button
      .dataset.sceneId === scene.id));
    book.classList.toggle("light-mode", light);
    $("theme-toggle").textContent = light ? "Dark pages" : "Light pages";
    $("theme-toggle").setAttribute("aria-pressed", String(light));
    if (notify) window.EBA_GUIDE.enterScene(scene);
    document.title = `Ranger 7: ${title(scene.title)}`;
    remember();
  }

  function snapshot(element) {
    const clone = element.cloneNode(true);
    const oldCanvases = element.querySelectorAll("canvas");
    clone.querySelectorAll("canvas").forEach((canvas, index) => {
      const image = document.createElement("img");
      image.style.cssText = "width:100%;height:100%;object-fit:contain";
      try {
        image.src = oldCanvases[index].toDataURL();
      } catch (error) {
        image.src = window.EBA_IMAGES.r7_b001_primera.src;
      }
      canvas.replaceWith(image);
    });
    const svgReferences = new Map();
    const prefix = `sheet-${++snapshotNumber}-`;
    [clone, ...clone.querySelectorAll("[id]")].forEach((node) => {
      const oldId = node.getAttribute("id");
      if (oldId && node.namespaceURI === "http://www.w3.org/2000/svg") {
        svgReferences.set(oldId, prefix + oldId);
        node.setAttribute("id", prefix + oldId);
      } else {
        node.removeAttribute("id");
      }
    });
    clone.querySelectorAll("svg,svg *").forEach((node) => {
      for (const attribute of [...node.attributes]) {
        let value = attribute.value;
        for (const [oldId, newId] of svgReferences) {
          value = value.replaceAll(`url(#${oldId})`, `url(#${newId})`);
          if (value === `#${oldId}`) value = `#${newId}`;
        }
        if (value !== attribute.value) node.setAttribute(attribute.name, value);
      }
    });
    clone.querySelectorAll("button,input,a,summary,[tabindex]").forEach((node) => node.setAttribute("tabindex",
      "-1"));
    clone.inert = true;
    clone.setAttribute("aria-hidden", "true");
    return clone;
  }

  function cancelTurn() {
    if (turnAnimation) turnAnimation.cancel();
    turnAnimation = null;
    book.querySelectorAll(".turning-sheet,.stationary-page").forEach((node) => node.remove());
    book.style.minHeight = "";
    book.classList.remove("turning");
    book.setAttribute("aria-busy", "false");
    turning = false;
    $("chapter-menu").disabled = false;
  }

  async function turnTo(index) {
    if (turning || index === sceneIndex || index < 0 || index >= scenes.length) return;
    stopReading();
    window.EBA_GUIDE.hide();
    const forward = index > sceneIndex;
    const compact = window.matchMedia("(max-width: 760px)").matches;
    const oldLeft = snapshot($("paper-left"));
    const oldRight = snapshot($("paper-right"));
    const oldHeight = book.clientHeight;
    sceneIndex = index;
    if (reducedMotion.matches) {
      renderScene();
      $("scene-title").focus({
        preventScroll: true
      });
      book.scrollIntoView({
        block: "start",
        behavior: "instant"
      });
      return;
    }
    turning = true;
    book.setAttribute("aria-busy", "true");
    $("chapter-menu").disabled = true;
    renderScene({
      notify: false
    });
    const height = Math.max(oldHeight, book.clientHeight);
    book.style.minHeight = `${height}px`;
    const sheet = document.createElement("div");
    sheet.className = `turning-sheet ${forward ? "forward" : "backward"}${compact ? " mobile" : ""}`;
    sheet.setAttribute("aria-hidden", "true");
    const front = document.createElement("div");
    front.className = "sheet-face front";
    const back = document.createElement("div");
    back.className = "sheet-face back";
    if (compact) {
      front.append(oldLeft, oldRight);
      back.append(snapshot($("paper-left")), snapshot($("paper-right")));
    } else {
      front.append(forward ? oldRight : oldLeft);
      back.append(snapshot($(forward ? "paper-left" : "paper-right")));
      const stationary = document.createElement("div");
      stationary.className = "stationary-page";
      stationary.style.left = forward ? "0" : "50%";
      stationary.append(forward ? oldLeft : oldRight);
      book.append(stationary);
    }
    sheet.append(front, back);
    book.append(sheet);
    book.classList.add("turning");
    const degrees = compact || forward ? -180 : 180;
    book.scrollIntoView({
      block: "start",
      behavior: "instant"
    });
    turnAnimation = sheet.animate([{
      transform: "rotateY(0deg)",
      filter: "brightness(1)"
    }, {
      transform: `rotateY(${degrees * .45}deg) rotateZ(${forward ? -.4 : .4}deg)`,
      filter: "brightness(.76)",
      offset: .48
    }, {
      transform: `rotateY(${degrees}deg)`,
      filter: "brightness(1)"
    }], {
      duration: compact ? 920 : 1150,
      easing: "cubic-bezier(.33,.08,.2,1)",
      fill: "forwards"
    });
    try {
      await turnAnimation.finished;
    } catch (error) {
      /* A route change may cancel a sheet in motion. */
    }
    const stillReading = view === "reader";
    cancelTurn();
    $("prev-scene").disabled = sceneIndex === 0;
    $("next-scene").disabled = false;
    if (stillReading) {
      window.EBA_GUIDE.enterScene(scenes[sceneIndex]);
      $("scene-title").focus({
        preventScroll: true
      });
    }
  }

  function next(direction) {
    if (turning) return;
    const destination = sceneIndex + direction;
    if (destination >= scenes.length) {
      route("mission-quiz");
      return;
    }
    turnTo(destination);
  }

  function renderArchive() {
    const query = $("archive-search").value.trim().toLowerCase();
    $("archive-panels").replaceChildren();
    archive.forEach((section) => {
      const text = (section.title + " " + section.html).replace(/<[^>]+>/g, " ").toLowerCase();
      if (query && !text.includes(query)) return;
      const panel = document.createElement("details");
      panel.className = "archive-panel";
      panel.open = Boolean(query);
      panel.innerHTML =
        `<summary>${escape(clean(section.title))}</summary><div class="archive-content">${section.html}</div>`;
      // Only text nodes are normalized. Links, tables and units keep their original meaning.
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        node.textContent = clean(node.textContent);
      });
      definitionsWithin(panel.querySelector(".archive-content"));
      $("archive-panels").append(panel);
    });
    if (!$("archive-panels").children.length) $("archive-panels").textContent =
      "No sections match. Try a spacecraft system, date or mission name.";
  }

  $("enter-library").addEventListener("click", () => route("library"));
  document.querySelectorAll('[data-action="home"]').forEach((button) => button.addEventListener("click", () =>
    route("landing")));
  document.querySelectorAll('[data-action="archive"]').forEach((button) => button.addEventListener("click",
    () => {
      returnView = view;
      route("archive");
    }));
  $("reader-back").addEventListener("click", () => route("library"));
  $("quiz-exit").addEventListener("click", () => route("library"));
  $("quiz-return-book").addEventListener("click", () => route("reader"));
  $("archive-return").addEventListener("click", () => route(returnView));
  $("theme-toggle").addEventListener("click", () => {
    if (turning) return;
    light = !light;
    book.classList.toggle("light-mode", light);
    $("theme-toggle").textContent = light ? "Dark pages" : "Light pages";
    $("theme-toggle").setAttribute("aria-pressed", String(light));
  });
  $("read-aloud").addEventListener("click", () => {
    if (readActive) {
      stopReading();
      return;
    }
    window.EBA_GUIDE.hide();
    readActive = window.EBA_GUIDE.speak(
      `${title(scenes[sceneIndex].title)}. ${clean(scenes[sceneIndex].visible).replace(/\*/g, "")}`,
      stopReading);
    $("read-aloud").textContent = readActive ? "Stop reading" : "Voice unavailable";
    $("read-aloud").setAttribute("aria-pressed", String(readActive));
  });
  $("prev-scene").addEventListener("click", () => next(-1));
  $("next-scene").addEventListener("click", () => next(1));
  $("chapter-menu").addEventListener("click", () => {
    if (!turning) $("drawer").showModal();
  });
  $("close-drawer").addEventListener("click", () => $("drawer").close());
  $("modal-close").addEventListener("click", closeModal);
  $("modal-done").addEventListener("click", closeModal);
  $("modal").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModal();
  });
  $("modal").addEventListener("click", (event) => {
    if (event.target === $("modal") && event.clientX < $("modal").getBoundingClientRect().left) closeModal();
  });
  $("scene-source").addEventListener("click", () => showModal("Sources for this scene",
    '<p>These historical and technical details were researched and organized by EBA-07 using published NASA, JPL and museum records. Figures for the related Block III spacecraft design are identified in their explanations.</p><p><a href="sources.html?return=book">Open all references and image credits</a></p>',
    noteSources(scenes[sceneIndex])));
  $("archive-search").addEventListener("input", renderArchive);
  document.addEventListener("keydown", (event) => {
    if (view !== "reader" || document.querySelector("dialog[open]") || event.target.closest(
        "input,textarea,select,[contenteditable]")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      next(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  window.addEventListener("pagehide", stopReading);
  window.EBA_GUIDE.bind({
    openNote
  });
  initShelves();
  chapterMenu();
  document.querySelectorAll(".viewport:not(.active)").forEach((section) => {
    section.inert = true;
  });
  if (!window.EBA_GUIDE.supported) $("read-aloud").disabled = true;
  const query = new URLSearchParams(location.search);
  if (query.has("scene")) {
    const index = scenes.findIndex((scene) => scene.id === query.get("scene"));
    if (index >= 0) {
      sceneIndex = index;
      route("reader");
    }
  } else if (query.get("view") === "library") route("library");

  // Public navigation helpers for deep-linking and accessibility.
  window.EBA07 = {
    getScenes: () => scenes.length,
    getCurrentScene: () => scenes[sceneIndex].id,
    isTurning: () => turning,
    goTo(id) {
      const index = scenes.findIndex((scene) => scene.id === id);
      if (index < 0) return false;
      sceneIndex = index;
      route("reader");
      return true;
    },
    openLibrary() {
      route("library");
    },
    openQuiz() {
      route("mission-quiz");
    },
    openArchive() {
      returnView = view;
      route("archive");
    }
  };
})();
