/* EBA-07 disclosure: portions of code were AI-assisted, then reviewed and integrated by the team. The project builds on Emiliano's earlier working code. */
/* Scene artwork and photo selection. Each visual keeps its source and its kind. */
(() => {
    "use strict";

    const images = window.EBA_IMAGES;
    const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

    const defaults = [
      [20, 79],
      [49, 79],
      [78, 79],
      [76, 25],
      [24, 25]
    ];
    const photograph = (id, caption, pins = defaults) => {
      const image = images[id];
      return {
        html: `<img class="scene-photo" src="${image.src}" alt="${escape(caption)}" width="${image.width}" height="${image.height}" decoding="async">`,
        caption,
        source: image.ref,
        credit: image.credit,
        mediaId: id,
        pins,
        ratio: image.width / image.height
      };
    };

    const defs = `
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#e7d9f6"/><stop offset=".5" stop-color="#9c84b6"/><stop offset="1" stop-color="#49385f"/>
      </linearGradient>
      <radialGradient id="lunar"><stop stop-color="#cabbd6"/><stop offset="1" stop-color="#6d5d80"/></radialGradient>
    </defs>`;

    function stars() {
      return Array.from({
        length: 45
      }, (_, index) => {
        const x = (index * 167 + 33) % 800;
        const y = (index * 97 + 14) % 460;
        return `<circle cx="${x}" cy="${y}" r="${index % 7 ? 1 : 1.8}" fill="#cbb8df" opacity="${.2 + (index % 4) * .15}"/>`;
      }).join("");
    }

    function lunar(x = 650, y = 160, radius = 96) {
      let craters = "";
      for (let index = 0; index < 16; index += 1) {
        const angle = index * 2.4;
        const distance = (index % 5) * radius / 6;
        craters +=
          `<circle cx="${x + Math.cos(angle) * distance}" cy="${y + Math.sin(angle) * distance}" r="${6 + index % 4 * 3}" fill="#30253740" stroke="#dfd0e04d"/>`;
      }
      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="url(#lunar)"/>${craters}`;
    }

    function spacecraft(x = 400, y = 230, scale = 1) {
      return `
      <g transform="translate(${x} ${y}) scale(${scale})">
        <g fill="#342d4f" stroke="#bca4d6" stroke-width="2">
          <rect x="-195" y="-32" width="130" height="65"/>
          <rect x="65" y="-32" width="130" height="65"/>
          <path d="M-170-32V33M-145-32V33M-120-32V33M-95-32V33M90-32V33M115-32V33M140-32V33M165-32V33M-195 0H-65M65 0H195" opacity=".6"/>
        </g>
        <path d="M-64-31L-34-65H34L64-31V32L34 60H-34L-64 32Z" fill="url(#metal)" stroke="#d2bddf" stroke-width="2"/>
        <path d="M-30-64L-19-140H19L30-64Z" fill="url(#metal)" stroke="#d2bddf" stroke-width="2"/>
        <ellipse cx="0" cy="-140" rx="20" ry="7" fill="#ddcbea"/>
        <ellipse cx="0" cy="-101" rx="9" ry="13" fill="#100c18" stroke="#b7d784"/>
        <path d="M-38 55L-65 92M-83 72Q-77 110-43 104" fill="none" stroke="#c8b6dd" stroke-width="3"/>
        <path d="M-10 59L-18 83H18L10 59" fill="#a890c0"/>
      </g>`;
    }

    function groundStation() {
      return `
      <path d="M110 350H700" stroke="#5a446e" stroke-width="2"/>
      <g stroke="#ba9cd4" stroke-width="4" fill="none">
        <path d="M310 280L270 352M310 280L356 352M244 170Q330 306 423 190Z"/>
        <path d="M315 258L369 151M353 157L385 147M385 147L381 171"/>
      </g>
      <path d="M407 145Q470 95 530 120M418 158Q476 122 516 137" stroke="#c6ff34" stroke-width="2" stroke-dasharray="6 10" fill="none" class="signal-path"/>
      ${spacecraft(610, 110, .42)}
      <text x="310" y="396" text-anchor="middle" fill="#bba8ce" font-size="18">Goldstone, California</text>`;
    }

    function trajectory() {
      return `
      <circle cx="125" cy="300" r="53" fill="#322d55" stroke="#a793be" stroke-width="2"/>
      <ellipse cx="125" cy="300" rx="89" ry="65" fill="none" stroke="#9b7cb14d" stroke-width="2"/>
      ${lunar(655, 130, 83)}
      <path d="M157 254Q360 75 592 137" stroke="#7d668e" stroke-dasharray="7 9" stroke-width="2" fill="none"/>
      <path id="correction-path" d="M157 254Q355 175 592 137" stroke="#c6ff34" stroke-width="3" fill="none"/>
      ${spacecraft(375, 165, .43)}
      <text x="127" y="398" text-anchor="middle" fill="#c2b1d2" font-size="17">Earth</text>
      <text x="655" y="270" text-anchor="middle" fill="#c2b1d2" font-size="17">Moon</text>`;
    }

    function monitor(silent = true) {
      const image = images.r7_b001_primera;
      const controls = Array.from({ length: 11 }, (_, i) => {
        const x = 113 + i * 51;
        const color = i === 8 ? "#c6ff34" : "#786188";
        return `<rect x="${x}" y="385" width="28" height="9" rx="2" fill="${color}"/>`;
      }).join("");
      return `
        <rect x="110" y="75" width="580" height="288" rx="12" fill="#2c2139" stroke="#8e729d" stroke-width="3"/>
        <rect x="140" y="100" width="520" height="234" rx="6" fill="#030305"/>
        ${silent ? '<path d="M170 218H625" stroke="#675078" stroke-width="1"/>' : `<image href="${image.src}" x="140" y="100" width="520" height="234" preserveAspectRatio="xMidYMid meet"/>`}
        <path d="M85 370H715L765 418H35Z" fill="#30223f" stroke="#876b99" stroke-width="2"/>
        ${controls}
        <text x="400" y="61" text-anchor="middle" fill="#bba6ce" font-size="17">${silent ? "Waiting for pictures" : "The pictures are arriving"}</text>`;
    }

    function mystery() {
      return `
      <path d="M100 278H700" stroke="#795c93" stroke-width="2"/>
      <circle cx="230" cy="278" r="7" fill="#b79ed0"/>
      <circle cx="560" cy="278" r="7" fill="#c6ff34"/>
      <path d="M230 278V174M560 278V174" stroke="#745a8c" stroke-dasharray="4 7"/>
      <path d="M230 155H560M230 145V165M560 145V165" stroke="#c6ff34" stroke-width="2"/>
      <text x="395" y="125" text-anchor="middle" fill="#eee3f6" font-size="36">0.490 seconds</text>
      <text x="230" y="325" text-anchor="middle" fill="#d2c1e0" font-size="22">140.008 s</text>
      <text x="560" y="325" text-anchor="middle" fill="#d2c1e0" font-size="22">140.498 s</text>
      <text x="230" y="365" text-anchor="middle" fill="#aa91c1" font-size="15">Atlas separation</text>
      <text x="560" y="365" text-anchor="middle" fill="#aa91c1" font-size="15">TV activation anomaly</text>`;
    }

    function screws() {
      const looseScrews = Array.from({ length: 14 }, (_, i) => {
        const x = 230 + (i % 5) * 69;
        const y = 155 + Math.floor(i / 5) * 77;
        return `<g transform="translate(${x} ${y}) rotate(${i * 31})">
          <path d="M0-12V25M-9-7H9M-8 3H8M-8 11H8M-8 19H8" stroke="#bfaece" stroke-width="5"/>
          <ellipse rx="14" ry="5" fill="#d4c3e4"/>
        </g>`;
      }).join("");
      return `
        <path d="M185 75H615L642 367Q640 391 614 391H186Q160 390 158 366Z" fill="#d6b9ed0e" stroke="#c9afd9" stroke-width="2"/>
        <path d="M185 93H614" stroke="#c9afd9" stroke-width="5" opacity=".5"/>
        ${looseScrews}
        <circle cx="515" cy="318" r="20" fill="none" stroke="#c6ff34" stroke-width="8"/>
        <text x="400" y="432" text-anchor="middle" fill="#cdbbda" font-size="19">Fourteen screws. One washer. One difficult decision.</text>`;
    }

function timeline() {
  const dates = ["1964", "1965", "1966", "1969", "1972", "2010"];
  return `
      <path d="M70 260H730" stroke="#8b6da6" stroke-width="2"/>
      ${dates.map((date, i) => `
        <circle cx="${85 + i * 124}" cy="260" r="8" fill="${i === 0 ? '#c6ff34' : '#a58bbd'}"/>
        <path d="M${85 + i * 124} 250V${i % 2 ? 157 : 195}" stroke="#856399"/>
        <text x="${85 + i * 124}" y="${i % 2 ? 135 : 175}" text-anchor="middle" fill="#e5d7ee" font-size="22">${date}</text>
      `).join("")}
      <text x="400" y="370" text-anchor="middle" fill="#b5a1c5" font-size="20">One ending. Decades of discovery.</text>`;
}

function tests() {
  return `
      <rect x="145" y="90" width="470" height="293" rx="18" fill="#20192d" stroke="#baa6cc" stroke-width="3"/>
      <circle cx="381" cy="235" r="120" fill="#0e0b15" stroke="#70577f" stroke-width="8"/>
      ${spacecraft(381, 240, .6)}
      <path d="M185 125H230M185 144H220M525 320H570M525 338H570" stroke="#c6ff34" stroke-width="3"/>
      <text x="383" y="432" text-anchor="middle" fill="#b9a5c9" font-size="18">Test on Earth. Learn before launch.</text>`;
}

function schedule() {
  return `
      <path d="M90 240H710" stroke="#8b6da6" stroke-width="2"/>
      ${[["MAY 11", "More time requested"], ["JUN 15–16", "Acceptance review"], ["JUL 28", "Launch"]].map(([a, b], i) => `
        <circle cx="${140 + i * 255}" cy="240" r="9" fill="#c6ff34"/>
        <text x="${140 + i * 255}" y="185" text-anchor="middle" fill="#e4d8ef" font-size="24">${a}</text>
        <text x="${140 + i * 255}" y="305" text-anchor="middle" fill="#ae96c5" font-size="15">${b}</text>
      `).join("")}`;
}

const configs = {
  "1.2": ["ranger-7-1-ranger-1-in-assembly-at-jpl", "Ranger 1 during assembly at JPL. Historical photograph.", [
    [48, 42],
    [77, 78],
    [24, 78]
  ]],
  "2.1": ["ranger_block_ii_modelo",
    "An official Block II model. This generation was used by Rangers 3, 4 and 5.", [
      [27, 76],
      [48, 43],
      [49, 69]
    ]
  ],
  "2.2": ["ranger-7-2-ranger-4-during-assembly-at-jpl-2",
    "A Block II spacecraft during assembly. This is the shared generation, not a photograph in flight."
  ],
  "2.3": ["ranger_block_ii_modelo",
    "The Block II design used for Rangers 3, 4 and 5. Official model photograph."
  ],
  "2.4": ["ranger_block_iii_modelo",
    "An official Block III model, the generation used by Ranger 6 and Ranger 7.", [
      [49, 33],
      [23, 78],
      [77, 78]
    ]
  ],
  "3.1": ["ranger7_ensamblaje_1963", "Ranger 7 during assembly on December 10, 1963. Historical photograph.", [
    [49, 56],
    [75, 77]
  ]],
  "3.2": ["ranger-7-4-block-iii-schematic",
    "Official Block III component diagram. The design is shared by Rangers 6 through 9.", [
      [77, 80],
      [46, 58],
      [30, 62],
      [77, 29]
    ]
  ],
  "3.3": ["ranger-7-4-block-iii-schematic", "Power and communications on the official Block III diagram.", [
    [23, 50],
    [36, 25],
    [51, 57]
  ]],
  "3.4": ["ranger-7-4-block-iii-schematic", "Control equipment and timers on the official Block III diagram.", [
    [56, 64],
    [48, 56],
    [48, 64],
    [48, 77]
  ]],
  "3.5": ["ranger-7-5-camera-system-nasm",
    "Block III six-camera assembly shown in NASA's retrospective. Museum hardware example, not a photograph taken in flight.",
    [
      [47, 61],
      [22, 61],
      [48, 31],
      [78, 61]
    ]
  ],
  "5.3": ["ranger-7-10-ranger-impact-sites",
    "NASA map of Ranger 7, 8 and 9 impact sites. The earlier Ranger 6 target is discussed in the notes."
  ],
  "6.2": ["ranger-7-6-launch", "Ranger 7 launches from Cape Canaveral on July 28, 1964.", [
    [49, 58],
    [50, 29],
    [52, 82]
  ]],
  "7.2": ["r7_b001_primera",
    "B001, Ranger 7's first photograph, July 31, 1964. The later impact site is outside this field.", [
      [22, 82],
      [68, 57],
      [79, 28]
    ]
  ],
  "7.3": ["r7_b100_guericke",
    "B100, Guericke crater, about 8.5 minutes before impact. Select the image sequence below to move closer."
  ],
  "7.4": ["r7_p200_ultimos_frag",
    "P200, the last partial P-camera frames. The dark areas contain no received image data.", [
      [49, 23]
    ]
  ],
  "8.1": ["nara_imagen_historica", "Historic Ranger VII image preserved by the U.S. National Archives."],
  "8.3": ["ranger-7-11-impact-crater-from-apollo-16",
    "Ranger 7's impact crater photographed by Apollo 16 in 1972."
  ],
  "8.4": ["ranger-7-12-impact-crater-from-lroc-low-sun-angle",
    "Ranger 7's impact crater seen by LRO in 2010. A later spacecraft, looking back at the legacy."
  ]
};

function build(scene) {
  if (configs[scene.id]) return photograph(...configs[scene.id]);
  let drawing = "";
  let pins = defaults;
  if (scene.id === "1.1") {
    return {
      html: '<canvas id="scene-moon" class="scene-moon" aria-label="Illustrative 3D Moon from modern NASA LRO data. Drag to turn it."></canvas><svg class="foreground-telescope" viewBox="0 0 180 200" aria-hidden="true"><g stroke="#a88cbe" stroke-width="3" fill="none"><path d="M85 112L42 188M85 112L126 188M85 112V189"/><path d="M45 107L100 45L125 67L70 131Z" fill="#2d213c"/><ellipse cx="113" cy="55" rx="15" ry="7" transform="rotate(43 113 55)" fill="#0a0710" stroke="#c6ff34"/></g></svg>',
      caption: "A 3D view using a modern LRO lunar mosaic. Drag to rotate. This is an illustration, not a Ranger 7 photograph.",
      source: images.moon_lro_texture.ref,
      credit: images.moon_lro_texture.credit,
      pins: [
        [20, 74],
        [77, 32],
        [48, 51]
      ],
      ratio: 800 / 460,
      moon: true
    };
  }
  if (["4.1", "7.1", "7.5"].includes(scene.id)) {
    drawing = monitor(scene.id === "4.1");
    pins = [
      [48, 44],
      [75, 80],
      [27, 80]
    ];
  } else if (scene.id === "4.2") {
    drawing = mystery();
    pins = [
      [29, 60],
      [50, 34],
      [70, 60]
    ];
  } else if (scene.id === "4.3") {
    drawing = tests();
    pins = [
      [49, 54],
      [23, 29],
      [70, 72],
      [70, 28]
    ];
  } else if (scene.id === "5.1") {
    drawing = screws();
    pins = [
      [48, 43],
      [75, 71],
      [64, 69]
    ];
  } else if (scene.id === "5.2") {
    drawing = schedule();
    pins = [
      [17, 52],
      [49, 52],
      [81, 52]
    ];
  } else if (scene.id === "6.1") {
    drawing =
      `<text x="400" y="115" fill="#e2d4ed" text-anchor="middle" font-size="33">JULY 27, 1964</text><text x="400" y="245" fill="#c6ff34" text-anchor="middle" font-size="60">HOLD</text><path d="M145 310H655" stroke="#7c5c95" stroke-width="2"/><text x="400" y="370" fill="#b5a0c8" text-anchor="middle" font-size="19">The clock can wait. The checks cannot.</text>`;
    pins = [
      [23, 67],
      [50, 67],
      [77, 67]
    ];
  } else if (["6.3", "6.4"].includes(scene.id)) {
    drawing = trajectory();
    pins = [
      [16, 65],
      [41, 40],
      [49, 36],
      [78, 67]
    ];
  } else if (scene.id === "3.6") {
    drawing = groundStation();
    pins = [
      [56, 27],
      [39, 54],
      [76, 25],
      [25, 75]
    ];
  } else if (scene.id === "8.2") {
    drawing = timeline();
    pins = [
      [26, 56],
      [32, 43],
      [42, 56],
      [57, 56]
    ];
  } else {
    drawing = spacecraft();
  }
  return {
    html: `<svg viewBox="0 0 800 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escape(scene.title + ", illustrated scene")}">${defs}<rect width="800" height="460" fill="#100c19"/>${stars()}${drawing}</svg>`,
    caption: scene.id === "7.1" || scene.id === "7.5" ?
      "An illustrated receiving station with a historic Ranger 7 photograph on its screen." :
      "An EBA-07 illustration based on the mission record. Select an object to explore.",
    source: null,
    credit: "EBA-07",
    pins,
    ratio: 800 / 460,
    aiAssisted: ["3.6", "6.3", "6.4"].includes(scene.id)
  };
}

window.EBA_VISUALS = {
build,
photograph
};
})();
