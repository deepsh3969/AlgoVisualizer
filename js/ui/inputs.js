/**
 * AlgoVisualizer - input builder
 *
 * The controls in the workspace toolbar that decide what the algorithm runs
 * on: array shape and size, search keys, window sizes, graph shape and the
 * operation picker for data structures.
 *
 * The module owns no state of its own - it renders whatever input object it is
 * handed and reports edits back through `onChange`.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  function sortAsc(list) { return list.slice().sort(function (a, b) { return a - b; }); }
  function sortDesc(list) { return list.slice().sort(function (a, b) { return b - a; }); }

  function fewUnique(list, buckets) {
    var n = buckets || 4;
    var max = Math.max.apply(null, list.concat([1]));
    return list.map(function (v) {
      var bucket = Math.floor((v / (max + 1)) * n);
      return Math.round((bucket / (n - 1 || 1)) * max);
    });
  }

  function nearlySorted(list) {
    var out = sortAsc(list);
    var swaps = Math.max(1, Math.floor(out.length / 8));
    for (var i = 0; i < swaps; i++) {
      var a = Math.floor(Math.random() * out.length);
      var b = Math.min(out.length - 1, a + 1);
      var tmp = out[a];
      out[a] = out[b];
      out[b] = tmp;
    }
    return out;
  }

  /**
   * Produce the array for a given shape.
   * mode: random | sorted | reversed | nearly | fewUnique | custom
   */
  function buildArray(opts) {
    var size = AV.random.clampInt(opts.size, 2, 500, 25);
    if (opts.mode === "custom") {
      var parsed = AV.validate.parseArrayLiteral(opts.custom || "");
      if (parsed.ok) return parsed.value.slice(0, 500);
      return AV.random.generateArray({ size: size, seed: opts.seed });
    }
    var base = AV.random.generateArray({ size: size, seed: opts.seed });
    switch (opts.mode) {
      case "sorted": return sortAsc(base);
      case "reversed": return sortDesc(base);
      case "nearly": return nearlySorted(base);
      case "fewUnique": return fewUnique(base);
      default: return base;
    }
  }

  var ARRAY_MODES = [
    { id: "random", label: "Random" },
    { id: "sorted", label: "Sorted" },
    { id: "reversed", label: "Reversed" },
    { id: "nearly", label: "Nearly sorted" },
    { id: "fewUnique", label: "Few unique" },
    { id: "custom", label: "Custom" }
  ];

  function create(opts) {
    var o = opts || {};
    var definition = o.definition || null;
    var input = o.input || {};
    var onChange = o.onChange || function () {};
    var rootEl = dom.el("div", { class: "row gap-3", style: { alignItems: "flex-end", flexWrap: "wrap" } });

    function emit(patch) {
      input = Object.assign({}, input, patch);
      onChange(input);
    }

    function arrayControls(opts2) {
      var size = dom.el("input", {
        type: "range", min: 2, max: opts2.maxSize || 120, value: String(input.size || 25),
        attrs: { "aria-label": "Array size" },
        on: { input: function () { emit({ size: Number(size.value) }); } }
      });
      var sizeLabel = dom.el("span", { class: "mono", text: String(input.size || 25) });
      size.addEventListener("input", function () { dom.setText(sizeLabel, size.value); });

      var seed = dom.el("input", {
        class: "input input-sm", type: "number", value: String(input.seed || 1),
        attrs: { "aria-label": "Seed", style: "width:110px" },
        on: { change: function () { emit({ seed: Number(seed.value) || 1 }); } }
      });

      var segmented = dom.el("div", { class: "segmented" }, ARRAY_MODES.map(function (mode) {
        return dom.el("button", {
          type: "button",
          attrs: { "aria-pressed": String(input.mode === mode.id) },
          on: { click: function () { emit({ mode: mode.id }); } }
        }, mode.label);
      }));

      rootEl.appendChild(dom.el("div", { class: "field" }, [
        dom.el("div", { class: "field-label", text: "Shape" }),
        segmented
      ]));
      rootEl.appendChild(dom.el("div", { class: "field" }, [
        dom.el("div", { class: "field-label" }, ["Size ", sizeLabel]),
        size
      ]));
      rootEl.appendChild(dom.el("div", { class: "field" }, [
        dom.el("div", { class: "field-label", text: "Seed" }),
        seed
      ]));
      rootEl.appendChild(dom.el("button", {
        class: "btn btn-sm", type: "button",
        on: { click: function () { emit({ seed: Math.floor(Math.random() * 99999) + 1 }); } }
      }, [dom.icon("shuffle"), "Randomize"]));

      if (input.mode === "custom") {
        var area = dom.el("textarea", {
          class: "textarea", rows: 2, text: input.custom || "",
          attrs: { placeholder: "42, 17, 8, 99, 3", "aria-label": "Custom array" }
        });
        area.addEventListener("change", function () { emit({ custom: area.value }); });
        rootEl.appendChild(dom.el("div", { class: "field", style: { flex: "1 1 260px" } }, [
          dom.el("div", { class: "field-label", text: "Values" }), area
        ]));
      }
    }

    function numberField(labelText, key, min, max, value) {
      var el = dom.el("input", {
        class: "input input-sm", type: "number", value: String(value), min: min, max: max,
        attrs: { "aria-label": labelText, style: "width:104px" }
      });
      el.addEventListener("change", function () {
        var n = Number(el.value);
        if (!isFinite(n)) return;
        emit(key === "target" ? { target: n } : (function () { var p = {}; p[key] = n; return p; })());
      });
      return dom.el("div", { class: "field" }, [
        dom.el("div", { class: "field-label", text: labelText }), el
      ]);
    }

    function renderGraphControls() {
      var size = dom.el("input", {
        type: "range", min: 3, max: 22, value: String(input.graphSize || 7),
        attrs: { "aria-label": "Graph size" }
      });
      var sizeLabel = dom.el("span", { class: "mono", text: String(input.graphSize || 7) });
      size.addEventListener("input", function () {
        dom.setText(sizeLabel, size.value);
        emit({ graphSize: Number(size.value) });
      });
      rootEl.appendChild(dom.el("div", { class: "field" }, [
        dom.el("div", { class: "field-label" }, ["Nodes ", sizeLabel]), size
      ]));
      rootEl.appendChild(dom.el("button", {
        class: "btn btn-sm", type: "button",
        on: { click: function () { emit({ graphSeed: Math.floor(Math.random() * 99999) + 1 }); } }
      }, [dom.icon("shuffle"), "New graph"]));

      var graph = input.graph;
      if (graph && graph.nodes && graph.nodes.length) {
        ["startId", "targetId"].forEach(function (key) {
          var select = dom.el("select", { class: "select", attrs: { "aria-label": key === "startId" ? "Start node" : "Target node" } },
            graph.nodes.map(function (n) {
              return dom.el("option", { value: n.id, text: n.label });
            }));
          select.value = input[key] || graph.nodes[0].id;
          select.addEventListener("change", function () {
            var p = {};
            p[key] = select.value;
            emit(p);
          });
          rootEl.appendChild(dom.el("div", { class: "field" }, [
            dom.el("div", { class: "field-label", text: key === "startId" ? "Start" : "Target" }), select
          ]));
        });
      }
    }

    function renderStructureControls() {
      if (!definition || !definition.operations) return;
      var op = input.operation || definition.defaultOperation || definition.operations[0].id;
      var select = dom.el("select", { class: "select", attrs: { "aria-label": "Operation" } },
        definition.operations.map(function (operation) {
          return dom.el("option", { value: operation.id, text: operation.signature });
        }));
      select.value = op;
      select.addEventListener("change", function () {
        emit({ operation: select.value });
      });
      rootEl.appendChild(dom.el("div", { class: "field" }, [
        dom.el("div", { class: "field-label", text: "Operation" }), select
      ]));

      var descriptor = AV.findOperation(definition, op) || { fields: [] };
      var operationFields = dom.el("div", { class: "row gap-2", style: { alignItems: "flex-end", flexWrap: "wrap" } });
      (descriptor.fields || []).forEach(function (name) {
        if (name === "value") {
          var valueInput = dom.el("input", {
            class: "input input-sm", type: "text", value: String(input.value === undefined || input.value === null ? "" : input.value),
            attrs: { placeholder: "value", "aria-label": "Value", style: "width:110px" }
          });
          valueInput.addEventListener("change", function () {
            var raw = valueInput.value.trim();
            var num = Number(raw);
            emit({ value: raw !== "" && isFinite(num) ? num : raw });
          });
          operationFields.appendChild(dom.el("div", { class: "field" }, [
            dom.el("div", { class: "field-label", text: "Value" }), valueInput
          ]));
        } else if (name === "index") {
          var indexInput = dom.el("input", {
            class: "input input-sm", type: "number", value: String(input.index || 0), min: "0",
            attrs: { "aria-label": "Index", style: "width:100px" }
          });
          indexInput.addEventListener("change", function () {
            emit({ index: Number(indexInput.value) || 0 });
          });
          operationFields.appendChild(dom.el("div", { class: "field" }, [
            dom.el("div", { class: "field-label", text: "Position" }), indexInput
          ]));
        }
      });
      rootEl.appendChild(operationFields);

      rootEl.appendChild(dom.el("button", {
        class: "btn btn-sm", type: "button",
        on: { click: function () { emit({ seed: Math.floor(Math.random() * 99999) + 1 }); } }
      }, [dom.icon("shuffle"), "Reshuffle data"]));
    }

    function render() {
      dom.clear(rootEl);
      if (!definition) return;
      var category = definition.category;

      if (category === "structures") {
        renderStructureControls();
        return;
      }
      if (category === "graphs") {
        renderGraphControls();
        return;
      }
      if (category === "recursion") {
        var n = dom.el("input", {
          type: "range", min: 0, max: 18, value: String(input.recursionValue || 6),
          attrs: { "aria-label": "Input n" }
        });
        var label = dom.el("span", { class: "mono", text: String(input.recursionValue || 6) });
        n.addEventListener("input", function () {
          dom.setText(label, n.value);
          emit({ recursionValue: Number(n.value) });
        });
        rootEl.appendChild(dom.el("div", { class: "field" }, [
          dom.el("div", { class: "field-label" }, ["n = ", label]), n
        ]));
        return;
      }

      arrayControls({ maxSize: category === "sorting" ? 80 : 120 });

      if (category === "searching") {
        var target = dom.el("input", {
          class: "input input-sm", type: "number", value: String(input.target === "" ? "" : input.target),
          attrs: { placeholder: "target", "aria-label": "Target value", style: "width:120px" }
        });
        target.addEventListener("change", function () {
          emit({ target: target.value === "" ? "" : Number(target.value) });
        });
        rootEl.appendChild(dom.el("div", { class: "field" }, [
          dom.el("div", { class: "field-label", text: "Target" }), target
        ]));
      } else if (definition.id === "slidingWindow") {
        rootEl.appendChild(numberField("Window", "windowSize", 1, 50, input.windowSize || 4));
      } else if (definition.id === "prefixSum") {
        rootEl.appendChild(numberField("From", "queryStart", 0, 400, input.queryStart || 0));
        rootEl.appendChild(numberField("To", "queryEnd", 0, 400, input.queryEnd || 0));
      } else if (definition.id === "twoPointer") {
        var pairTarget = dom.el("input", {
          class: "input input-sm", type: "number", value: String(input.target === "" ? "" : input.target),
          attrs: { placeholder: "sum", "aria-label": "Target sum", style: "width:120px" }
        });
        pairTarget.addEventListener("change", function () {
          emit({ target: pairTarget.value === "" ? "" : Number(pairTarget.value) });
        });
        rootEl.appendChild(dom.el("div", { class: "field" }, [
          dom.el("div", { class: "field-label", text: "Target sum" }), pairTarget
        ]));
      }
    }

    function setDefinition(def, nextInput) {
      definition = def || null;
      if (nextInput) input = nextInput;
      render();
    }

    function setInput(nextInput) {
      input = nextInput || {};
      render();
    }

    render();

    return {
      el: rootEl,
      setDefinition: setDefinition,
      setInput: setInput,
      get: function () { return input; },
      destroy: function () {
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      }
    };
  }

  AV.ui = AV.ui || {};
  AV.ui.inputs = { create: create, buildArray: buildArray, ARRAY_MODES: ARRAY_MODES };
})(typeof globalThis !== "undefined" ? globalThis : window);
