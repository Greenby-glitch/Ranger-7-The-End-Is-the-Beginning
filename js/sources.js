/* A separate reference page. Citations and links are also embedded in the HTML on release. */
(() => {
  "use strict";
  const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
  const primary = new Set(["S1", "S2", "S3", "S4", "S5"]);
  if (!document.getElementById("main-references").children.length) {
    for (const [id, source] of Object.entries(window.EBA_SOURCES)) {
      const item = document.createElement("li");
      item.id = id;
      item.innerHTML =
        `${escape(source.author)}. (${escape(source.year)}). <em>${escape(source.title)}</em>. <a href="${source.url}" target="_blank" rel="noopener">View source</a>.`;
      document.getElementById(primary.has(id) ? "main-references" : "technical-references").append(item);
    }
    for (const image of Object.values(window.EBA_IMAGES)) {
      if (!image.downloaded) continue;
      const item = document.createElement("div");
      item.className = "image-credit";
      item.innerHTML =
        `<a href="${image.src}"><img src="${image.src}" alt="${escape(image.title)}" width="70" height="70" loading="lazy"></a><div><p>${escape(image.title)}</p><p>${escape(image.kind)}.</p><p>${escape(image.credit)}.</p><a href="${image.ref}" target="_blank" rel="noopener">Original source</a></div>`;
      document.getElementById("image-credits").append(item);
    }
  }
  try {
    const scene = localStorage.getItem("eba07-scene");
    if (scene && window.location.search.includes("return=book")) {
      const link = document.getElementById("return-reading");
      link.href = `index.html?scene=${encodeURIComponent(scene)}`;
      link.textContent = "Return to the book";
    }
  } catch (error) {
    /* Static links remain usable when storage is unavailable. */
  }
  if (location.hash) {
    const reference = document.getElementById(location.hash.slice(1));
    const details = reference?.closest("details");
    if (details) details.open = true;
  }
})();
