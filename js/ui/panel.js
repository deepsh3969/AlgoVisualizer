/**
 * AlgoVisualizer - information panel
 *
 * The right-hand column of the workspace: live metrics, the complexity story,
 * the pseudocode with the active line highlighted and the written explanation.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var COMPLEXITY_ROWS = [
    { key: "best", label: "Best" },
    { key: "average", label: "Average" },
    { key: "worst", label: "Worst" },
    { key: "space", label: "Space" }
  ];

  function section(title, extra, body) {
    var head = dom.el("div", { class: "panel-section-title" }, [
      dom.el("span", { text: title }),
      extra || null
    ]);
    return dom.el("div", { class: "panel-section" }, [head, body]);
  }

  function gradeChip(expr) {
    var grade = AV.format.complexityGrade(expr);
    return dom.el("span", { class: "grade grade-" + grade, text: AV.format.gradeLabel(grade) });
  }

  function create(opts) {
    var o = opts || {};
    var definition = o.definition || null;
    var metricEls = {};
    var metricsBody = dom.el("div", { class: "metrics-grid" });
    var complexityBody = dom.el("div");
    var pseudoBody = dom.el("div", { class: "pseudocode" });
    var explainBody = dom.el("div");
    var lastValues = {};

    var rootEl = dom.el("div", {}, [
      section("Metrics", null, metricsBody),
      section("Complexity", null, complexityBody),
      section("Pseudocode", dom.el("span", { class: "count-badge", text: "lines" }), pseudoBody),
      section("Explanation", null, explainBody)
    ]);

    function setDefinition(def) {
      definition = def || null;
      metricEls = {};
      lastValues = {};
      dom.fill(metricsBody, []);
      renderComplexity();
      renderPseudocode();
      renderExplanation();
    }

    function renderComplexity() {
      dom.clear(complexityBody);
      if (!definition || !definition.complexity) {
        complexityBody.appendChild(dom.el("div", { class: "aux-empty", text: "No complexity data" }));
        return;
      }
      var c = definition.complexity;
      var worst = c.worst || "";
      complexityBody.appendChild(dom.el("div", { class: "complexity-summary" }, [
        dom.el("span", { class: "big-o" }, [document.createTextNode(worst + " "), gradeChip(worst)])
      ]));

      var bars = dom.el("div", { class: "complexity-bars" });
      COMPLEXITY_ROWS.forEach(function (row) {
        var expr = c[row.key];
        if (!expr) return;
        var grade = AV.format.complexityGrade(expr);
        bars.appendChild(dom.el("div", { class: "cbar-row" }, [
          dom.el("div", { class: "cbar-head" }, [
            dom.el("span", { text: row.label }),
            dom.el("span", { class: "mono", text: expr })
          ]),
          dom.el("div", { class: "cbar-track" }, [
            dom.el("div", {
              class: "cbar-fill" + (grade !== "unknown" ? " g-" + grade : ""),
              style: { width: AV.format.gradeWeight(grade) + "%" }
            })
          ])
        ]));
      });
      complexityBody.appendChild(bars);

      var table = dom.el("table", { class: "complexity-table" }, [dom.el("tbody", {}, [
        dom.el("tr", {}, [dom.el("th", { text: "Time (avg)" }), dom.el("td", { text: c.average || "-" })]),
        dom.el("tr", {}, [dom.el("th", { text: "Time (worst)" }), dom.el("td", { text: c.worst || "-" })]),
        dom.el("tr", {}, [dom.el("th", { text: "Space" }), dom.el("td", { text: c.space || "-" })]),
        dom.el("tr", {}, [dom.el("th", { text: "Stable" }), dom.el("td", { text: definition.stable === undefined ? "-" : definition.stable ? "Yes" : "No" })]),
        dom.el("tr", {}, [dom.el("th", { text: "In-place" }), dom.el("td", { text: definition.inPlace === undefined ? "-" : definition.inPlace ? "Yes" : "No" })])
      ])]);
      complexityBody.appendChild(table);

      var props = [];
      if (definition.stable) props.push("Stable");
      if (definition.inPlace) props.push("In-place");
      if (definition.adaptive) props.push("Adaptive");
      if (props.length) {
        complexityBody.appendChild(dom.el("div", { class: "prop-row" }, props.map(function (p) {
          return dom.el("span", { class: "badge", text: p });
        })));
      }
    }

    function renderPseudocode() {
      dom.clear(pseudoBody);
      if (!definition || !Array.isArray(definition.pseudocode)) {
        pseudoBody.appendChild(dom.el("div", { class: "aux-empty", text: "No pseudocode" }));
        return;
      }
      definition.pseudocode.forEach(function (line, i) {
        var indent = 0;
        var text = String(line);
        var leading = text.match(/^( {2,})/);
        if (leading) indent = Math.min(3, Math.floor(leading[1].length / 4));
        pseudoBody.appendChild(dom.el("div", { class: "pc-line" + (indent ? " pc-indent-" + indent : "") }, [
          dom.el("span", { class: "pc-num", text: i + 1 }),
          dom.el("span", { class: "pc-code", text: text.replace(/^\s+/, "") || " " })
        ]));
      });
    }

    function renderExplanation() {
      dom.clear(explainBody);
      if (!definition) return;
      var ex = definition.explanation || {};

      if (ex.what) {
        explainBody.appendChild(dom.el("div", { class: "prose" }, [
          dom.el("p", { text: ex.what })
        ]));
      }
      if (ex.how) {
        explainBody.appendChild(dom.el("div", { class: "note", text: ex.how }));
      }
      if (Array.isArray(ex.steps) && ex.steps.length) {
        explainBody.appendChild(dom.el("h2", { class: "setting-name", text: "Steps", style: { margin: "14px 0 6px" } }));
        explainBody.appendChild(dom.el("ol", { class: "step-list" }, ex.steps.map(function (s) {
          return dom.el("li", { text: s });
        })));
      }
      if (Array.isArray(ex.useCases) && ex.useCases.length) {
        explainBody.appendChild(dom.el("h2", { class: "setting-name", text: "Use it for", style: { margin: "14px 0 6px" } }));
        explainBody.appendChild(dom.el("ul", { class: "step-list" }, ex.useCases.map(function (s) {
          return dom.el("li", { text: s });
        })));
      }
      if (definition.example) {
        explainBody.appendChild(dom.el("h2", { class: "setting-name", text: "Example", style: { margin: "14px 0 6px" } }));
        explainBody.appendChild(dom.el("div", { class: "note", text: definition.example }));
      }
      if (Array.isArray(definition.keywords) && definition.keywords.length) {
        explainBody.appendChild(dom.el("div", { class: "tag-list", style: { marginTop: "14px" } },
          definition.keywords.map(function (k) { return dom.el("span", { class: "chip", text: k }); })));
      }
    }

    function renderMetrics(state) {
      var def = state && state.definition ? state.definition : definition;
      var chips = AV.metrics.summarize(state, def);
      if (!chips.length) {
        dom.fill(metricsBody, []);
        return;
      }
      if (metricsBody.childElementCount !== chips.length) {
        dom.fill(metricsBody, chips.map(function (chip) {
          var value = dom.el("div", { class: "metric-value", text: chip.text });
          metricEls[chip.key] = value;
          return dom.el("div", { class: "metric", attrs: { title: chip.hint } }, [
            dom.el("div", { class: "metric-label", text: chip.label }),
            value
          ]);
        }));
        lastValues = {};
      }
      chips.forEach(function (chip) {
        var el = metricEls[chip.key];
        if (!el) return;
        if (lastValues[chip.key] !== chip.value) {
          lastValues[chip.key] = chip.value;
          dom.setText(el, chip.text);
          el.classList.remove("is-bumped");
          // force a reflow so the bump animation restarts
          void el.offsetWidth;
          el.classList.add("is-bumped");
        }
      });
    }

    function highlightLine(line) {
      var lines = dom.qsa(".pc-line", pseudoBody);
      var index = typeof line === "number" ? line - 1 : -1;
      lines.forEach(function (el, i) {
        if (i === index) el.classList.add("is-active");
        else el.classList.remove("is-active");
      });
    }

    function update(state, ctx) {
      if (!state) return;
      renderMetrics(state);
      var event = ctx && ctx.event ? ctx.event : null;
      highlightLine(event && typeof event.line === "number" ? event.line : null);
    }

    setDefinition(definition);

    return {
      el: rootEl,
      setDefinition: setDefinition,
      update: update,
      destroy: function () {
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      }
    };
  }

  AV.ui = AV.ui || {};
  AV.ui.panel = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
