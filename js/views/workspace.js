/**
 * AlgoVisualizer - workspace view
 *
 * The interactive stage shared by every algorithm and data structure. It owns
 * a private event bus and execution engine so that two workspaces (for
 * example in compare mode) never talk over each other, wires the renderer,
 * the playback controls, the input builder and the information panel, and
 * converts the app's generic input object into the concrete input the
 * definition expects.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  /* ------------------------------------------------------------------------
   * Input resolution
   *
   * The app store holds a single generic input object. Depending on what is
   * being visualized we turn it into a real array, a graph, a linked list or
   * a bare { value } for recursion.
   * ---------------------------------------------------------------------- */

  function valuesFor(input) {
    if (input.mode === "custom") {
      var parsed = AV.validate.parseArrayLiteral(input.custom || "");
      if (parsed.ok && parsed.value.length) return parsed.value;
    }
    var shape = input.mode || "random";
    var opts = { size: input.size, seed: input.seed };
    if (shape === "sorted") opts.sorted = true;
    else if (shape === "reversed") opts.reversed = true;
    else if (shape === "nearly") opts.distribution = "nearly-sorted";
    else if (shape === "fewUnique") opts.distribution = "few-unique";
    return AV.random.generateArray(opts);
  }

  /** Sorted copy for binary search, which requires ordered input. */
  function sortedValuesFor(input) {
    return valuesFor(input).slice().sort(function (a, b) { return a - b; });
  }

  function graphFor(input) {
    var seed = input.graphSeed === undefined ? input.seed : input.graphSeed;
    return AV.graphModel.randomGraph({
      count: input.graphSize,
      seed: seed,
      weighted: true,
      directed: true
    });
  }

  function structureValues(input) {
    return valuesFor(input).slice(0, 24);
  }

  /**
   * Build the concrete input for a definition from the app's generic input.
   * Returns a fresh object each call so the engine can clone it safely.
   */
  function resolveInput(definition, input) {
    var inp = input || {};
    if (!definition) return {};

    if (definition.category === "structures") {
      var values = structureValues(inp);
      var operation = inp.operation || definition.defaultOperation ||
        (definition.operations && definition.operations[0] ? definition.operations[0].id : null);

      if (definition.viz === "linked") {
        var list = AV.linkedListInput(values);
        list.operation = operation;
        if (inp.value !== undefined && inp.value !== "") list.value = inp.value;
        return list;
      }
      if (definition.viz === "tree") {
        var tree = AV.binarySearchTreeInput(values);
        tree.operation = operation;
        if (inp.value !== undefined && inp.value !== "") tree.value = inp.value;
        return tree;
      }
      return {
        array: values,
        operation: operation,
        value: inp.value,
        index: inp.index || 0
      };
    }

    if (definition.category === "graphs") {
      var graph = graphFor(inp);
      var startId = inp.startId || (graph.nodes.length ? graph.nodes[0].id : null);
      var targetId = inp.targetId || (graph.nodes.length ? graph.nodes[graph.nodes.length - 1].id : null);
      return { graph: graph, start: startId, target: targetId };
    }

    if (definition.category === "recursion") {
      var n = inp.recursionValue === undefined ? 6 : inp.recursionValue;
      return { n: n, value: n };
    }

    // Array-backed categories: sorting, searching, patterns.
    var array = definition.id === "binarySearch" ? sortedValuesFor(inp) : valuesFor(inp);
    var resolved = { array: array };

    if (definition.category === "searching") {
      resolved.target = inp.target === "" || inp.target === undefined || inp.target === null
        ? array.length ? array[array.length - 1] : 0
        : inp.target;
    } else if (definition.id === "slidingWindow") {
      resolved.window = Math.max(1, inp.windowSize || 4);
    } else if (definition.id === "prefixSum") {
      resolved.queryStart = Math.max(0, inp.queryStart || 0);
      resolved.queryEnd = Math.max(resolved.queryStart,
        inp.queryEnd === undefined || inp.queryEnd === null || inp.queryEnd === 0
          ? array.length - 1 : inp.queryEnd);
    } else if (definition.id === "twoPointer") {
      resolved.target = inp.target === "" || inp.target === undefined || inp.target === null
        ? (array.length > 1 ? array[0] + array[array.length - 1] : 0)
        : inp.target;
    }

    return resolved;
  }

  /* ------------------------------------------------------------------------
   * View
   * ---------------------------------------------------------------------- */

  function create(opts) {
    var o = opts || {};
    var definition = o.definition || null;
    var input = o.input || AV.defaultInput();
    var speed = o.speed || 1;
    var onInput = o.onInput || function () {};

    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, { name: "workspace" });
    engine.speed = speed;

    var renderer = null;
    var panel = null;
    var controls = null;
    var inputs = null;
    var offFns = [];
    var resizeObserver = null;

    /* -- DOM --------------------------------------------------------------- */

    var stageHost = dom.el("div", { class: "viz-canvas" });
    var toolbarHost = dom.el("div", { class: "viz-toolbar" });
    var auxHost = dom.el("div", { class: "aux-slot" });
    var vizStage = dom.el("div", { class: "viz-stage" }, [toolbarHost, stageHost]);
    var panelHost = dom.el("div", { class: "workspace-panel" });
    var workspaceEl = dom.el("div", { class: "workspace" }, [
      dom.el("div", { class: "workspace-viz" }, [
        dom.el("div", { class: "row grow", style: { alignItems: "stretch", minHeight: "0" } }, [vizStage, auxHost])
      ]),
      panelHost
    ]);

    /* -- Painting ---------------------------------------------------------- */

    function paint() {
      if (!renderer || !engine.state) return;
      renderer.render(engine.state, { event: engine.timeline && engine.step > 0 ? engine.timeline.events[engine.step - 1] : null });
      if (panel) panel.update(engine.state, {
        event: engine.timeline && engine.step > 0 ? engine.timeline.events[engine.step - 1] : null
      });
    }

    function paintOnStep(payload) {
      if (!renderer || !engine.state) return;
      renderer.render(engine.state, { event: payload ? payload.event : null });
      if (panel) panel.update(engine.state, { event: payload ? payload.event : null });
    }

    function setStatusDot() {
      var dot = dom.qs(".status-dot", vizStage);
      if (!dot) return;
      dot.classList.remove("is-playing", "is-paused", "is-done");
      if (engine.finished) dot.classList.add("is-done");
      else if (engine.playing) dot.classList.add("is-playing");
      else dot.classList.add("is-paused");
    }

    function setStatusText(payload) {
      var text = dom.qs(".status-text", vizStage);
      if (!text) return;
      if (engine.finished) dom.setText(text, "Finished - " + engine.total + " steps");
      else if (engine.playing) dom.setText(text, "Playing at " + engine.speed + "\u00D7");
      else dom.setText(text, payload && payload.message ? payload.message : "Paused");
    }

    /* -- Rebuild ----------------------------------------------------------- */

    function teardownRenderer() {
      if (renderer) { renderer.destroy(); renderer = null; }
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      dom.clear(stageHost);
      dom.clear(auxHost);
    }

    function rebuild(reload) {
      teardownRenderer();

      if (definition) {
        renderer = AV.renderers.mount(stageHost, definition, auxHost);
      }

      if (reload && definition) {
        try {
          engine.load(definition, resolveInput(definition, input));
        } catch (err) {
          AV.ui.toast({ title: "Cannot visualize", message: String(err && err.message || err), kind: "error" });
        }
      }

      // Watch the canvas so bar widths and SVG viewBoxes stay correct.
      if (typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(function () {
          if (renderer && renderer.relayout) renderer.relayout();
        });
        resizeObserver.observe(stageHost);
      }

      paint();
      setStatusDot();
    }

    function setDefinition(next, nextInput) {
      definition = next || null;
      if (nextInput) input = nextInput;
      if (inputs) inputs.setDefinition(definition, input);
      if (panel) panel.setDefinition(definition);
      rebuild(true);
    }

    function setInput(next, reload) {
      input = next || input;
      if (inputs) inputs.setInput(input);
      if (reload !== false) {
        rebuild(true);
        onInput(input);
      }
    }

    /* -- Controls & panel wiring ------------------------------------------- */

    function mountChrome() {
      controls = AV.ui.controls.create(bus, {
        engine: engine,
        onSpeed: function (value) { engine.setSpeed(value); }
      });
      vizStage.appendChild(controls.el);
      controls.setSpeed(engine.speed);

      var status = dom.el("div", {
        class: "status-bar",
        attrs: { role: "status", "aria-live": "polite" }
      }, [
        dom.el("span", { class: "status-dot", attrs: { "aria-hidden": "true" } }),
        dom.el("span", { class: "status-text", text: "Paused" })
      ]);
      vizStage.appendChild(status);

      inputs = AV.ui.inputs.create({
        definition: definition,
        input: input,
        onChange: function (next) { setInput(next, true); }
      });
      toolbarHost.appendChild(inputs.el);

      panel = AV.ui.panel.create({ definition: definition });
      panelHost.appendChild(panel.el);
    }

    offFns.push(bus.on("engine:step", function (payload) {
      paintOnStep(payload);
      setStatusText(payload);
      setStatusDot();
    }));
    offFns.push(bus.on("engine:status", function (payload) {
      setStatusText(payload);
      setStatusDot();
    }));
    offFns.push(bus.on("engine:load", function () {
      paint();
      setStatusText(null);
      setStatusDot();
    }));

    mountChrome();
    rebuild(true);

    return {
      el: workspaceEl,
      engine: engine,
      getDefinition: function () { return definition; },
      getInput: function () { return input; },
      setDefinition: setDefinition,
      setInput: function (next) { setInput(next, true); },
      relayout: function () { if (renderer && renderer.relayout) renderer.relayout(); },
      setSpeed: function (value) {
        engine.setSpeed(value);
        if (controls) controls.setSpeed(value);
      },
      destroy: function () {
        engine.destroy();
        offFns.forEach(function (off) { off(); });
        offFns = [];
        teardownRenderer();
        if (controls) controls.destroy();
        if (inputs) inputs.destroy();
        if (panel) panel.destroy();
        if (workspaceEl.parentNode) workspaceEl.parentNode.removeChild(workspaceEl);
      }
    };
  }

  AV.views = AV.views || {};
  AV.views.workspace = {
    create: create,
    resolveInput: resolveInput,
    valuesFor: valuesFor,
    sortedValuesFor: sortedValuesFor,
    graphFor: graphFor
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
