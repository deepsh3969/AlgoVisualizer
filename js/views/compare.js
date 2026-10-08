/**
 * AlgoVisualizer - compare view
 *
 * Two workspaces side by side, driven by the same input, so a visitor can
 * watch Bubble sort and Quick sort chew through identical data and read both
 * metric columns at once. Below them, a head-to-head summary scores the two
 * runs using the engine's own counters.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  function allDefinitions() {
    return AV.algorithms.all().concat(AV.structures.all());
  }

  function defPicker(id, chosenId, onChange) {
    var select = dom.el("select", { class: "select", attrs: { "aria-label": "Choose a definition" } },
      allDefinitions().map(function (def) {
        return dom.el("option", {
          value: def.id,
          text: def.name + " (" + def.category + ")"
        });
      }));
    select.value = chosenId || "";
    select.addEventListener("change", function () { onChange(select.value); });
    return select;
  }

  function pane(title, side, defId, onChange) {
    return dom.el("div", { class: "compare-pane" }, [
      dom.el("div", { class: "compare-pane-head" }, [
        dom.el("span", { class: "count-badge", text: side }),
        defPicker(side, defId, onChange),
        dom.el("span", { class: "mono", id: "cmp-metrics-" + side, text: "-" })
      ]),
      dom.el("div", { class: "compare-pane-body", attrs: { id: "cmp-body-" + side } })
    ]);
  }

  function create(ctx) {
    var state = ctx.state || {};
    var container = dom.el("div", {});

    var leftId = state.compareIds && state.compareIds[0] ? state.compareIds[0] : "bubbleSort";
    var rightId = state.compareIds && state.compareIds[1] ? state.compareIds[1] : "quickSort";

    var leftWs = null;
    var rightWs = null;

    function defFor(id) {
      return AV.algorithms.get(id) || AV.structures.get(id) || null;
    }

    function mountWorkspaces() {
      var leftHost = dom.qs("#cmp-body-A", container);
      var rightHost = dom.qs("#cmp-body-B", container);
      if (!leftHost || !rightHost) return;

      if (leftWs) leftWs.destroy();
      if (rightWs) rightWs.destroy();
      dom.clear(leftHost);
      dom.clear(rightHost);

      var leftDef = defFor(leftId);
      var rightDef = defFor(rightId);
      var prefs = AV.app ? AV.app.get() : {};
      var sharedInput = prefs.input || AV.defaultInput();

      if (leftDef) {
        leftWs = AV.views.workspace.create({
          definition: leftDef,
          input: sharedInput,
          speed: prefs.speed || 1
        });
        leftHost.appendChild(leftWs.el);
      }
      if (rightDef) {
        rightWs = AV.views.workspace.create({
          definition: rightDef,
          input: sharedInput,
          speed: prefs.speed || 1
        });
        rightHost.appendChild(rightWs.el);
      }

      // Mirror the left workspace's input onto the right one so both see
      // identical data. Guard against feedback loops with a flag.
      var syncing = false;
      if (leftWs) {
        var realSetInput = leftWs.setInput;
        leftWs.setInput = function (next) {
          realSetInput.call(leftWs, next);
          if (!syncing && rightWs) {
            syncing = true;
            rightWs.setInput(next);
            syncing = false;
          }
        };
      }
      if (rightWs) {
        var realRightSetInput = rightWs.setInput;
        rightWs.setInput = function (next) {
          realRightSetInput.call(rightWs, next);
          if (!syncing && leftWs) {
            syncing = true;
            leftWs.setInput(next);
            syncing = false;
          }
        };
      }
    }

    function summary() {
      var leftDef = defFor(leftId);
      var rightDef = defFor(rightId);
      if (!leftDef || !rightDef) return null;

      var rows = [];
      var cA = leftDef.complexity || {};
      var cB = rightDef.complexity || {};

      rows.push(["Worst-case time", cA.worst || "-", cB.worst || "-"]);
      rows.push(["Average time", cA.average || "-", cB.average || "-"]);
      rows.push(["Space", cA.space || "-", cB.space || "-"]);
      rows.push(["Stable", leftDef.stable === undefined ? "-" : leftDef.stable ? "Yes" : "No",
        rightDef.stable === undefined ? "-" : rightDef.stable ? "Yes" : "No"]);
      rows.push(["In-place", leftDef.inPlace === undefined ? "-" : leftDef.inPlace ? "Yes" : "No",
        rightDef.inPlace === undefined ? "-" : rightDef.inPlace ? "Yes" : "No"]);

      var n = 1000;
      var verdict = AV.metrics.compareExpressions(cA.worst, cB.worst, n);
      var verdictText = verdict.winner === "a" ? leftDef.name + " is cheaper at n=" + n
        : verdict.winner === "b" ? rightDef.name + " is cheaper at n=" + n
        : verdict.winner === "tie" ? "Roughly equal at n=" + n
        : "Cannot compare these bounds";

      return dom.el("div", { class: "card card-pad", style: { marginTop: "var(--av-space-6)" } }, [
        dom.el("h2", { class: "card-title", style: { marginBottom: "var(--av-space-3)" }, text: "Head to head" }),
        dom.el("table", { class: "complexity-table", style: { width: "100%" } }, [
          dom.el("thead", {}, dom.el("tr", {}, [
            dom.el("th", { text: "" }),
            dom.el("th", { text: leftDef.name }),
            dom.el("th", { text: rightDef.name })
          ])),
          dom.el("tbody", {}, rows.map(function (r) {
            return dom.el("tr", {}, [
              dom.el("th", { text: r[0] }),
              dom.el("td", { class: "mono", text: r[1] }),
              dom.el("td", { class: "mono", text: r[2] })
            ]);
          }))
        ]),
        dom.el("div", { class: "note", style: { marginTop: "var(--av-space-4)" } }, [
          dom.el("strong", { text: "Prediction: " }),
          verdictText + " (" + (cA.worst || "?") + " vs " + (cB.worst || "?") + ")"
        ])
      ]);
    }

    function render() {
      dom.clear(container);

      container.appendChild(dom.el("section", { class: "section" }, [
        dom.el("div", { class: "page-head" }, [
          dom.el("div", {}, [
            dom.el("h1", { class: "page-title", text: "Compare" }),
            dom.el("p", {
              class: "page-sub",
              text: "Run two implementations over the same input and watch their counters diverge."
            })
          ])
        ]),
        dom.el("div", { class: "compare-grid" }, [
          pane("Left", "A", leftId, function (id) { leftId = id; persist(); render(); }),
          pane("Right", "B", rightId, function (id) { rightId = id; persist(); render(); })
        ]),
        summary()
      ]));

      mountWorkspaces();
    }

    function persist() {
      if (ctx.onCompareIds) ctx.onCompareIds([leftId, rightId]);
    }

    render();

    return {
      title: "Compare",
      el: container,
      wide: true,
      destroy: function () {
        if (leftWs) leftWs.destroy();
        if (rightWs) rightWs.destroy();
        dom.clear(container);
      }
    };
  }

  AV.views = AV.views || {};
  AV.views.compare = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
