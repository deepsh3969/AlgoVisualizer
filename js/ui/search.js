/**
 * AlgoVisualizer - command palette / search
 *
 * A single modal that searches algorithms, data structures and learning
 * modules at once. Keyboard driven: up/down to move, Enter to open, Esc to
 * dismiss. The palette is opened from the header button or with "/".
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var scrim = null;
  var input = null;
  var resultsEl = null;
  var activeIndex = 0;
  var current = [];
  var onSelect = null;
  var restoreFocus = null;
  var offs = [];

  function ensureOverlay() {
    if (scrim && scrim.isConnected) return scrim;
    scrim = dom.el("div", { class: "overlay", hidden: true });
    scrim.addEventListener("mousedown", function (event) {
      if (event.target === scrim) close();
    });
    document.body.appendChild(scrim);
    return scrim;
  }

  function buildIndex() {
    var entries = [];
    AV.algorithms.all().forEach(function (def) {
      entries.push({
        kind: "algorithm", id: def.id, title: def.name,
        sub: categoryLabel(def.category) + " \u00B7 " + (def.tagline || ""),
        keywords: def.keywords || [], category: def.category
      });
    });
    AV.structures.all().forEach(function (def) {
      entries.push({
        kind: "structure", id: def.id, title: def.name,
        sub: "Data structure \u00B7 " + (def.tagline || ""),
        keywords: def.keywords || [], category: "structures"
      });
    });
    (AV.learningModules || []).forEach(function (module) {
      entries.push({
        kind: "lesson", id: module.id, title: module.title,
        sub: "Lesson \u00B7 " + (module.level || ""),
        keywords: (module.keyPoints || []).slice(0, 3), category: "learning"
      });
    });
    return entries;
  }

  function categoryLabel(id) {
    var cat = AV.getCategory ? AV.getCategory(id) : null;
    return cat ? cat.label : id;
  }

  function score(entry, query) {
    var title = entry.title.toLowerCase();
    var q = query.toLowerCase();
    if (title === q) return 1000;
    if (title.indexOf(q) === 0) return 600;
    if (title.indexOf(q) >= 0) return 400;
    var words = q.split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    var hay = (entry.title + " " + entry.sub + " " + entry.keywords.join(" ")).toLowerCase();
    var hits = 0;
    words.forEach(function (w) { if (hay.indexOf(w) >= 0) hits += 1; });
    if (!hits) return 0;
    return hits * 40 + (entry.category === q ? 30 : 0);
  }

  function search(query) {
    var index = buildIndex();
    var trimmed = String(query || "").trim();
    if (!trimmed) {
      return index.slice(0, 12);
    }
    return index
      .map(function (entry) { return { entry: entry, s: score(entry, trimmed) }; })
      .filter(function (row) { return row.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 24)
      .map(function (row) { return row.entry; });
  }

  function kindLabel(kind) {
    return kind === "algorithm" ? "Algorithm" : kind === "structure" ? "Structure" : "Lesson";
  }

  function renderResults(query) {
    current = search(query);
    activeIndex = 0;
    dom.clear(resultsEl);
    if (!current.length) {
      resultsEl.appendChild(dom.el("div", { class: "search-empty", text: "No matches for \u201C" + query + "\u201D" }));
      return;
    }
    var lastCategory = null;
    current.forEach(function (entry, i) {
      if (entry.category !== lastCategory) {
        lastCategory = entry.category;
        resultsEl.appendChild(dom.el("div", { class: "search-group-title", text: categoryLabel(entry.category) }));
      }
      var btn = dom.el("button", {
        class: "search-result" + (i === 0 ? " is-active" : ""),
        type: "button", id: "search-result-" + i,
        on: { click: function () { choose(i); } }
      }, [
        dom.el("span", {}, [
          dom.el("span", { class: "sr-title", text: entry.title }),
          dom.el("span", { class: "sr-sub", text: entry.sub })
        ]),
        dom.el("span", { class: "sr-kind", text: kindLabel(entry.kind) })
      ]);
      resultsEl.appendChild(btn);
    });
    updateActive();
  }

  function updateActive() {
    var buttons = dom.qsa(".search-result", resultsEl);
    buttons.forEach(function (b, i) {
      if (i === activeIndex) {
        b.classList.add("is-active");
        input.setAttribute("aria-activedescendant", b.id);
        if (b.scrollIntoView) b.scrollIntoView({ block: "nearest" });
      } else b.classList.remove("is-active");
    });
    if (!buttons.length) input.removeAttribute("aria-activedescendant");
  }

  function move(delta) {
    if (!current.length) return;
    activeIndex = (activeIndex + delta + current.length) % current.length;
    updateActive();
  }

  function choose(index) {
    var entry = current[index];
    if (!entry) return;
    var handler = onSelect;
    close();
    if (handler) handler(entry);
  }

  function onKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Home" && current.length) {
      event.preventDefault();
      activeIndex = 0;
      updateActive();
    } else if (event.key === "End" && current.length) {
      event.preventDefault();
      activeIndex = current.length - 1;
      updateActive();
    }
  }

  function open(opts) {
    var o = opts || {};
    if (isOpen()) return;
    onSelect = o.onSelect || null;
    restoreFocus = document.activeElement;
    var box = dom.el("div", {
      class: "search-modal", attrs: { role: "dialog", "aria-modal": "true", "aria-label": "Search" }
    });
    input = dom.el("input", {
      class: "search-input", type: "search", placeholder: "Search algorithms, structures, lessons",
      attrs: { "aria-label": "Search", autocomplete: "off", spellcheck: "false" },
      on: { input: function () { renderResults(input.value); } }
    });
    resultsEl = dom.el("div", { class: "search-results", attrs: { role: "listbox" } });

    box.appendChild(dom.el("div", { class: "search-input-row" }, [
      dom.icon("search"),
      input,
      dom.el("kbd", { text: "Esc" })
    ]));
    box.appendChild(resultsEl);
    box.appendChild(dom.el("div", { class: "search-foot" }, [
      dom.el("span", {}, [dom.el("kbd", { text: "\u2191" }), dom.el("kbd", { text: "\u2193" }), " navigate"]),
      dom.el("span", {}, [dom.el("kbd", { text: "\u21B5" }), " open"]),
      dom.el("span", {}, [dom.el("kbd", { text: "Esc" }), " close"])
    ]));

    var scrimEl = ensureOverlay();
    dom.clear(scrimEl);
    scrimEl.appendChild(box);
    scrimEl.hidden = false;
    renderResults("");
    input.focus();
    offs.push(dom.on(document, "keydown", onKey, true));
  }

  function close() {
    if (!isOpen()) return;
    offs.forEach(function (off) { off(); });
    offs = [];
    dom.clear(scrim);
    scrim.hidden = true;
    input = null;
    resultsEl = null;
    current = [];
    if (restoreFocus && restoreFocus.focus) restoreFocus.focus();
    restoreFocus = null;
  }

  function isOpen() {
    return !!(scrim && scrim.isConnected && !scrim.hidden);
  }

  AV.ui = AV.ui || {};
  AV.ui.search = {
    open: open,
    close: close,
    isOpen: isOpen,
    search: search
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
