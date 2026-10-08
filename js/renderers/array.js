/**
 * AlgoVisualizer — bar chart renderer
 *
 * Paints `state.array` as a row of bars with an overlay lane for pointers and
 * the highlighted range. Used by the array, searching and pattern visualizations.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var ROLE_CLASS = {
    compare: "is-compare",
    swap: "is-swap",
    active: "is-active",
    pivot: "is-pivot",
    candidate: "is-candidate",
    found: "is-found",
    sorted: "is-sorted",
    eliminated: "is-eliminated",
    muted: "is-muted",
    "new": "is-active"
  };

  var MARKER_MODIFIER = {
    left: "m-left",
    i: "m-left",
    low: "m-left",
    first: "m-left",
    front: "m-left",
    head: "m-left",
    right: "m-right",
    j: "m-right",
    high: "m-right",
    last: "m-right",
    back: "m-right",
    tail: "m-right",
    key: "m-target",
    target: "m-target",
    mid: "m-mid",
    k: "m-mid",
    cursor: "m-mid",
    current: "m-mid",
    best: "m-mid",
    top: "m-mid",
    root: "m-mid",
    prefix: "m-mid",
    traversal: "m-mid"
  };

  var MARKER_ORDER = ["left", "i", "low", "first", "front", "head", "right", "j", "high",
    "last", "back", "tail", "key", "target", "mid", "cursor", "current", "best",
    "top", "root", "prefix", "traversal"];

  var LEGEND = [
    { role: "", label: "Value" },
    { role: "compare", label: "Comparing" },
    { role: "swap", label: "Swapping" },
    { role: "pivot", label: "Pivot" },
    { role: "candidate", label: "In range" },
    { role: "found", label: "Found" },
    { role: "sorted", label: "Sorted" },
    { role: "eliminated", label: "Eliminated" }
  ];

  function formatValue(v) {
    if (v === null || v === undefined) return "-";
    if (typeof v === "number") return String(Math.round(v * 1000) / 1000);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) return "[" + v.join(", ") + "]";
    return String(v);
  }

  function roleClass(role) {
    return ROLE_CLASS[role] || "";
  }

  function createArrayRenderer() {
    var host = null;
    var stage = null;
    var overlay = null;
    var barsEl = null;
    var strip = null;
    var legend = null;
    var barEls = [];
    var markerEls = {};
    var band = null;
    var bandLabel = null;
    var lastLength = -1;
    var observer = null;
    var resizeTimer = null;

    function build() {
      stage = dom.el("div", { class: "array-stage" });
      overlay = dom.el("div", { class: "viz-overlay" });
      band = dom.el("div", { class: "range-band" }, [
        (bandLabel = dom.el("span", { class: "band-label" }))
      ]);
      band.style.display = "none";
      overlay.appendChild(band);
      barsEl = dom.el("div", { class: "array-bars" });
      strip = dom.el("div", { class: "value-strip" });
      legend = dom.el("div", { class: "legend" });
      stage.appendChild(overlay);
      stage.appendChild(barsEl);
      stage.appendChild(strip);
      stage.appendChild(legend);
      host.appendChild(stage);
      buildLegend();
      layout();
      if (typeof ResizeObserver === "function") {
        observer = new ResizeObserver(function () {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(layout, 60);
        });
        observer.observe(stage);
      }
    }

    function buildLegend() {
      dom.fill(legend, LEGEND.map(function (entry) {
        var swatch = dom.el("span", { class: "legend-swatch" });
        if (!entry.role) swatch.style.background = "var(--av-viz-default)";
        else {
          var probe = document.createElement("div");
          probe.className = "bar " + roleClass(entry.role);
          document.body.appendChild(probe);
          swatch.style.background = getComputedStyle(probe).backgroundColor;
          document.body.removeChild(probe);
        }
        return dom.el("span", { class: "legend-item" }, [swatch, entry.label]);
      }));
    }

    /** Recompute the bar width so `n` bars fill the stage without overflowing. */
    function layout() {
      if (!stage) return;
      var n = barEls.length || 1;
      var width = stage.clientWidth || 640;
      var gap = n > 60 ? 1 : n > 30 ? 2 : 3;
      var available = width - gap * (n - 1);
      var barW = Math.floor(available / n);
      barW = Math.max(4, Math.min(46, barW));
      stage.style.setProperty("--av-bar-w", barW + "px");
      stage.style.setProperty("--av-bar-gap", gap + "px");
      stage.classList.toggle("compact", n > 40);
      positionOverlay();
    }

    function ensureBars(count) {
      if (lastLength === count) return;
      lastLength = count;
      dom.fill(barsEl, []);
      barEls = [];
      for (var i = 0; i < count; i++) {
        var bar = dom.el("div", { class: "bar" }, [
          dom.el("span", { class: "bar-value" }),
          dom.el("span", { class: "bar-index", text: i })
        ]);
        barEls.push(bar);
        barsEl.appendChild(bar);
      }
      layout();
    }

    /** Horizontal centre of bar `i`, in overlay coordinates. */
    function centreOf(i) {
      var bar = barEls[i];
      if (!bar) return 0;
      return bar.offsetLeft + bar.offsetWidth / 2;
    }

    function positionOverlay() {
      if (!barEls.length) return;
      Object.keys(markerEls).forEach(function (name) {
        var marker = markerEls[name];
        var index = marker.__index;
        var bar = barEls[index];
        if (!bar) return;
        marker.style.left = centreOf(index) + "px";
      });
      if (band.__range) {
        var r = band.__range;
        var start = Math.max(0, Math.min(barEls.length - 1, r.start));
        var end = Math.max(0, Math.min(barEls.length - 1, r.end === undefined ? r.start : r.end));
        if (end < start) end = start;
        var left = barEls[start].offsetLeft;
        var right = barEls[end].offsetLeft + barEls[end].offsetWidth;
        band.style.left = left + "px";
        band.style.width = Math.max(4, right - left) + "px";
      }
    }

    function renderMarkers(state) {
      var pointers = state.pointers || {};
      var wanted = Object.keys(pointers);
      wanted.sort(function (a, b) {
        var ia = MARKER_ORDER.indexOf(a);
        var ib = MARKER_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });

      var seen = Object.create(null);
      wanted.forEach(function (name, slot) {
        var index = pointers[name];
        if (index === null || index === undefined) return;
        if (index < 0 || index >= barEls.length) return;
        if (slot > 5) return;
        seen[name] = true;
        var marker = markerEls[name];
        if (!marker) {
          marker = dom.el("div", { class: "overlay-marker" });
          marker.__index = index;
          markerEls[name] = marker;
          overlay.appendChild(marker);
        }
        marker.__index = index;
        marker.className = "overlay-marker " + (MARKER_MODIFIER[name] || "m-mid");
        dom.fill(marker, [name, dom.el("span", { text: "=" + formatValue(state.array ? state.array[index] : null) })]);
        marker.style.left = centreOf(index) + "px";
      });

      Object.keys(markerEls).forEach(function (name) {
        if (!seen[name] && markerEls[name].parentNode) {
          overlay.removeChild(markerEls[name]);
          delete markerEls[name];
        }
      });
    }

    function renderRange(state) {
      if (!state.range) {
        band.style.display = "none";
        band.__range = null;
        return;
      }
      band.__range = state.range;
      band.style.display = "";
      dom.setText(bandLabel, state.range.label || "");
      bandLabel.style.display = state.range.label ? "" : "none";
      positionOverlay();
    }

    function renderStrip(state) {
      var pills = [];
      var input = state.input || {};
      if (input.target !== undefined && input.target !== null && input.target !== "") {
        pills.push({ label: "target", value: input.target });
      }
      if (state.hasFound) {
        pills.push({
          label: state.found === null || state.found === undefined ? "found" : "index",
          value: state.found === null || state.found === undefined ? "not found" : state.found,
          found: state.found !== null && state.found !== undefined
        });
      }
      if (state.resultReady && state.result !== undefined && state.result !== null) {
        var success = state.result !== -1 && state.result !== "error" && state.result !== "not found";
        pills.push({ label: "result", value: formatValue(state.result), found: success });
      }
      dom.fill(strip, pills.map(function (p) {
        return dom.el("span", { class: "value-pill" + (p.found ? " is-found" : "") }, [
          dom.el("span", { class: "muted", text: p.label + ":" }),
          p.value
        ]);
      }));
      strip.style.display = pills.length ? "" : "none";
    }

    function render(state, ctx) {
      if (!stage) build();
      var values = state.array || [];
      ensureBars(values.length);

      var max = -Infinity;
      var min = Infinity;
      var i;
      for (i = 0; i < values.length; i++) {
        var v = Number(values[i]);
        if (!isFinite(v)) v = 0;
        if (v > max) max = v;
        if (v < min) min = v;
      }
      if (!values.length) { max = 1; min = 0; }
      if (max === min) { max = min + 1; }

      for (i = 0; i < barEls.length; i++) {
        var bar = barEls[i];
        var raw = values[i];
        var num = Number(raw);
        if (!isFinite(num)) num = min;
        var pct = 6 + ((num - min) / (max - min)) * 94;
        var nextHeight = Math.max(3, Math.min(100, pct)).toFixed(2) + "%";
        if (bar.style.height !== nextHeight) bar.style.height = nextHeight;

        var text = formatValue(raw);
        var valueEl = bar.firstChild;
        if (valueEl.textContent !== text) valueEl.textContent = text;

        var role = state.mark ? state.mark[i] : null;
        var cls = "bar" + (role ? " " + roleClass(role) : "");
        if (bar.__cls !== cls) {
          bar.className = cls;
          bar.__cls = cls;
        }
      }

      renderMarkers(state);
      renderRange(state);
      renderStrip(state);
    }

    function destroy() {
      if (observer) observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      observer = null;
      resizeTimer = null;
      if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
      host = stage = overlay = barsEl = strip = legend = null;
      barEls = [];
      markerEls = {};
      lastLength = -1;
    }

    return {
      kind: "array",
      mount: function (target) {
        host = target;
        build();
      },
      render: render,
      destroy: destroy,
      relayout: layout
    };
  }

  AV.renderers = AV.renderers || {};
  AV.renderers.factories = AV.renderers.factories || {};
  AV.renderers.factories.array = createArrayRenderer;
  AV.renderers.factories.search = createArrayRenderer;
  AV.renderers.factories.pattern = createArrayRenderer;
  AV.renderers.roleClass = roleClass;
  AV.renderers.formatValue = formatValue;
})(typeof globalThis !== "undefined" ? globalThis : window);
