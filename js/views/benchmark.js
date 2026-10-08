/**
 * AlgoVisualizer - benchmark view
 *
 * Runs the real algorithm over a ladder of input sizes, records wall-clock
 * milliseconds and the engine's own counters, then plots measured time against
 * the theoretical Big-O curve so the two can be compared side by side.
 *
 * The view runs one size per animation frame so the page never locks up.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var CATEGORIES = [
    { id: "sorting", label: "Sorting" },
    { id: "searching", label: "Searching" },
    { id: "patterns", label: "Patterns" },
    { id: "graphs", label: "Graphs" },
    { id: "recursion", label: "Recursion" },
    { id: "structures", label: "Structures" }
  ];

  function definitionsFor(category) {
    if (category === "structures") return AV.structures.all();
    return AV.algorithms.byCategory(category);
  }

  function seriesFor(def) {
    return {
      id: def.id,
      name: def.name,
      worst: (def.complexity || {}).worst || "",
      points: []
    };
  }

  function svgEl(tag, attrs, children) {
    return AV.dom.svg(tag, attrs, children);
  }

  function plot(seriesList, sizes) {
    var width = 720;
    var height = 300;
    var padL = 52;
    var padR = 16;
    var padT = 16;
    var padB = 34;
    var innerW = width - padL - padR;
    var innerH = height - padT - padB;

    var maxMs = 0;
    seriesList.forEach(function (s) {
      s.points.forEach(function (p) { if (p.ms && p.ms > maxMs) maxMs = p.ms; });
    });
    if (!maxMs) maxMs = 1;

    var nMin = Math.min.apply(null, sizes);
    var nMax = Math.max.apply(null, sizes);
    if (nMax === nMin) nMax = nMin + 1;

    function x(n) { return padL + ((n - nMin) / (nMax - nMin)) * innerW; }
    function y(ms) { return padT + innerH - (ms / maxMs) * innerH; }

    var grid = [];
    var i;
    for (i = 0; i <= 4; i++) {
      var gy = padT + (innerH / 4) * i;
      var label = (maxMs * (1 - i / 4));
      grid.push(svgEl("line", {
        x1: padL, x2: width - padR, y1: gy, y2: gy,
        stroke: "var(--av-border-subtle)", "stroke-width": 1
      }));
      grid.push(svgEl("text", {
        x: padL - 8, y: gy + 4, "text-anchor": "end",
        fill: "var(--av-text-muted)", "font-size": 11
      }, label < 1 ? label.toFixed(2) : label.toFixed(0)));
    }

    var xAxis = sizes.map(function (n) {
      return svgEl("text", {
        x: x(n), y: height - 10, "text-anchor": "middle",
        fill: "var(--av-text-muted)", "font-size": 11
      }, String(n));
    });

    var palette = ["var(--av-brand)", "var(--av-info)", "var(--av-success)", "var(--av-warning)", "var(--av-danger)"];
    var lines = seriesList.map(function (s, si) {
      var color = palette[si % palette.length];
      var pts = s.points.filter(function (p) { return p.ms !== null && p.ms !== undefined; });
      if (!pts.length) return null;
      var d = pts.map(function (p, pi) {
        return (pi === 0 ? "M" : "L") + x(p.n).toFixed(1) + " " + y(p.ms).toFixed(1);
      }).join(" ");
      var dots = pts.map(function (p) {
        return svgEl("circle", { cx: x(p.n), cy: y(p.ms), r: 3, fill: color });
      });
      return [svgEl("path", { d: d, fill: "none", stroke: color, "stroke-width": 2 })].concat(dots);
    }).filter(Boolean);

    return svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      class: "bench-plot",
      style: { width: "100%", height: "auto", display: "block" },
      attrs: { role: "img", "aria-label": "Benchmark results in milliseconds" }
    }, [svgEl("rect", {
      x: padL, y: padT, width: innerW, height: innerH,
      fill: "var(--av-surface-inset)", rx: 6
    })].concat(grid).concat(xAxis).concat(lines));
  }

  function create(ctx) {
    var state = ctx.state || {};
    var container = dom.el("div", {});
    var category = state.benchmarkCategory || "sorting";
    var selected = {};
    var results = [];
    var running = false;
    var rafId = null;

    function defs() { return definitionsFor(category); }

    function selectedDefs() {
      return defs().filter(function (d) { return selected[d.id]; });
    }

    function stop() {
      running = false;
      if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
      rafId = null;
      render();
    }

    function runBench() {
      var chosen = selectedDefs();
      if (!chosen.length) {
        AV.ui.toast({ title: "Pick at least one", message: "Select a definition to benchmark.", kind: "warning" });
        return;
      }
      var sizes = AV.benchmark.sizesFor(category);
      results = chosen.map(seriesFor);
      running = true;
      render();

      var si = 0;
      var pi = 0;

      function stepFrame() {
        if (!running) return;
        if (si >= results.length) {
          running = false;
          try { AV.benchmark.save({ series: results, options: { sizes: sizes } }); } catch (e) { /* history is optional */ }
          render();
          return;
        }
        var series = results[si];
        var def = AV.algorithms.get(series.id) || AV.structures.get(series.id);
        var size = sizes[pi];

        try {
          var input = AV.benchmark.buildInput(def, size, 20260101);
          var sample = AV.benchmark.measure(def, input, {});
          series.points.push({
            n: size,
            ms: sample.skipped ? null : sample.ms,
            steps: sample.skipped ? null : sample.steps,
            metrics: sample.skipped ? null : sample.metrics,
            skipped: !!sample.skipped,
            reason: sample.reason || null
          });
        } catch (err) {
          series.points.push({ n: size, ms: null, skipped: true, reason: String(err && err.message || err) });
        }

        pi += 1;
        if (pi >= sizes.length) { si += 1; pi = 0; }
        render();
        rafId = requestAnimationFrame(stepFrame);
      }

      rafId = requestAnimationFrame(stepFrame);
    }

    function render() {
      dom.clear(container);

      var sizes = AV.benchmark.sizesFor(category);
      var all = defs();

      var picker = dom.el("div", { class: "row gap-2", style: { flexWrap: "wrap", marginBottom: "var(--av-space-4)" } },
        all.map(function (def) {
          var on = !!selected[def.id];
          return dom.el("button", {
            class: "btn btn-sm" + (on ? " btn-primary" : ""),
            type: "button", disabled: running ? true : false,
            attrs: { "aria-pressed": String(on) },
            on: {
              click: function () {
                selected[def.id] = !selected[def.id];
                render();
              }
            }
          }, def.name);
        }));

      var seg = dom.el("div", { class: "segmented" }, CATEGORIES.map(function (c) {
        return dom.el("button", {
          type: "button", disabled: running ? true : false,
          attrs: { "aria-pressed": String(category === c.id) },
          on: {
            click: function () {
              category = c.id;
              selected = {};
              results = [];
              if (ctx.onBenchmarkCategory) ctx.onBenchmarkCategory(c.id);
              else { state.benchmarkCategory = c.id; render(); }
            }
          }
        }, c.label);
      }));

      var actions = dom.el("div", { class: "row gap-2" }, [
        dom.el("button", {
          class: "btn btn-primary", type: "button", disabled: running ? true : false,
          on: { click: runBench }
        }, [dom.icon("zap", 15), running ? "Running..." : "Run benchmark"]),
        running ? dom.el("button", { class: "btn", type: "button", on: { click: stop } },
          [dom.icon("pause", 15), "Stop"]) : null,
        results.length ? dom.el("button", {
          class: "btn btn-ghost", type: "button", disabled: running ? true : false,
          on: { click: function () { results = []; selected = {}; render(); } }
        }, [dom.icon("trash", 15), "Clear"]) : null
      ]);

      var chart = results.length
        ? dom.el("div", { class: "card card-pad" }, [
            dom.el("div", { class: "card-head", style: { border: 0, padding: 0, marginBottom: "var(--av-space-3)" } }, [
              dom.el("h2", { class: "card-title", text: "Measured wall-clock time" }),
              dom.el("span", { class: "mono", text: "sizes " + sizes.join(", ") })
            ]),
            plot(results, sizes)
          ])
        : dom.el("div", { class: "empty-state" }, [
            dom.icon("chart", 44),
            dom.el("div", { class: "empty-title", text: "No results yet" }),
            dom.el("div", { text: "Pick one or more definitions, then run the benchmark." })
          ]);

      var table = results.length ? dom.el("table", { class: "complexity-table", style: { width: "100%" } }, [
        dom.el("thead", {}, dom.el("tr", {}, [
          dom.el("th", { text: "Algorithm" }),
          dom.el("th", { text: "Big-O (worst)" }),
          dom.el("th", { text: "Largest n" }),
          dom.el("th", { text: "Time (ms)" }),
          dom.el("th", { text: "Steps" })
        ])),
        dom.el("tbody", {}, results.map(function (s) {
          var last = s.points.filter(function (p) { return p.ms !== null && p.ms !== undefined; }).pop();
          var skipped = s.points.filter(function (p) { return p.skipped; });
          return dom.el("tr", {}, [
            dom.el("td", { text: s.name }),
            dom.el("td", { class: "mono", text: s.worst || "-" }),
            dom.el("td", { class: "mono", text: last ? last.n : "-" }),
            dom.el("td", { class: "mono", text: last ? last.ms.toFixed(2) : (skipped.length ? "skipped" : "-") }),
            dom.el("td", { class: "mono", text: last && last.steps !== null && last.steps !== undefined ? last.steps : "-" })
          ]);
        }))
      ]) : null;

      container.appendChild(dom.el("section", { class: "section" }, [
        dom.el("div", { class: "page-head" }, [
          dom.el("div", {}, [
            dom.el("h1", { class: "page-title", text: "Benchmark" }),
            dom.el("p", {
              class: "page-sub",
              text: "Measure how each implementation's real running time grows as the input gets larger, then hold it against the theoretical bound."
            })
          ]),
          actions
        ]),
        seg,
        picker,
        chart,
        table ? dom.el("div", { style: { marginTop: "var(--av-space-6)" } }, table) : null
      ]));
    }

    render();

    return {
      title: "Benchmark",
      el: container,
      wide: true,
      destroy: function () {
        stop();
        dom.clear(container);
      }
    };
  }

  AV.views = AV.views || {};
  AV.views.benchmark = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
