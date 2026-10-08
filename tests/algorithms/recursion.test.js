/**
 * Recursion algorithm tests (call tree + frame lifecycle)
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(id, input) {
    var def = AV.algorithms.get(id);
    if (!def) throw new Error("Missing recursion algorithm: " + id);
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline, definition: def };
  }

  var FACT = "algorithms/recursion/factorial";

  AV.test(FACT, "is registered with metadata", function () {
    var def = AV.algorithms.get("factorial");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "recursion");
    AV.assertEqual(def.viz, "recursion");
    AV.assertEqual(def.complexity.space, "O(n)", "one frame per level");
    AV.assert(def.explanation.steps.length >= 4);
  });

  AV.test(FACT, "computes the factorial", function () {
    AV.assertEqual(run("factorial", { value: 0 }).state.result, 1);
    AV.assertEqual(run("factorial", { value: 1 }).state.result, 1);
    AV.assertEqual(run("factorial", { value: 5 }).state.result, 120);
    AV.assertEqual(run("factorial", { value: 10 }).state.result, 3628800);
  });

  AV.test(FACT, "pushes exactly n frames", function () {
    var out = run("factorial", { value: 5 });
    var enters = out.timeline.events.filter(function (e) { return e.type === "enter"; });
    AV.assertEqual(enters.length, 5, "5,4,3,2,1 - 1 is the base case");
    AV.assertEqual(out.state.metrics.calls, 5, "state agrees with the timeline");
    AV.assertEqual(out.state.metrics.maxDepth, 5, "the deepest chain is n frames");
    AV.assertEqual(run("factorial", { value: 0 }).state.metrics.calls, 1,
      "zero still needs one frame");
  });

  AV.test(FACT, "every frame returns before the root", function () {
    var out = run("factorial", { value: 4 });
    var exits = out.timeline.events.filter(function (e) { return e.type === "exit"; });
    AV.assertEqual(exits[0].id, "f.1.1.1", "the deepest frame returns first");
    AV.assertEqual(exits[exits.length - 1].id, "f", "the root returns last");
    AV.assertEqual(out.state.frames.length, 0, "the stack fully unwinds");
    AV.assertEqual(out.state.result, 24);
  });

  AV.test(FACT, "links child frames to their parents", function () {
    var out = run("factorial", { value: 3 });
    AV.assertEqual(out.state.callEdges.length, 2, "three frames, two edges");
    AV.assert(out.state.callNodes["f"], "root present");
    AV.assert(out.state.callNodes["f.1"], "child present");
    AV.assertEqual(
      out.state.callEdges.filter(function (e) { return e.from === "f"; }).length,
      1,
      "the root has one child"
    );
  });

  AV.test(FACT, "records the returned value on each frame", function () {
    var out = run("factorial", { value: 3 });
    AV.assertEqual(out.state.callNodes["f.1.1"].value, 1, "base case returns 1");
    AV.assertEqual(out.state.callNodes["f.1"].value, 2, "2 x 1");
    AV.assertEqual(out.state.callNodes["f"].value, 6, "3 x 2");
  });

  AV.test(FACT, "rejects invalid input", function () {
    AV.assertEqual(run("factorial", { value: -1 }).state.result, "error");
    AV.assertEqual(run("factorial", { value: 2.5 }).state.result, "error");
    AV.assertEqual(run("factorial", { value: "abc" }).state.result, "error");
    AV.assertEqual(run("factorial", { value: 40 }).state.result, "error",
      "beyond safe integer precision");
  });

  AV.test(FACT, "never mutates the caller's input", function () {
    var input = { value: 5 };
    run("factorial", input);
    AV.assertEqual(input.value, 5);
  });

  var FIB = "algorithms/recursion/fibonacci";

  AV.test(FIB, "is registered with metadata", function () {
    var def = AV.algorithms.get("fibonacci");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "recursion");
    AV.assertEqual(def.viz, "recursion");
    AV.assert(def.complexity.worst.indexOf("2^n") >= 0, "honest about the blow-up");
  });

  AV.test(FIB, "computes the sequence", function () {
    AV.assertEqual(run("fibonacci", { value: 0 }).state.result, 0);
    AV.assertEqual(run("fibonacci", { value: 1 }).state.result, 1);
    AV.assertEqual(run("fibonacci", { value: 6 }).state.result, 8);
    AV.assertEqual(run("fibonacci", { value: 10 }).state.result, 55);
  });

  AV.test(FIB, "call count grows much faster than n", function () {
    var small = run("fibonacci", { value: 5 });
    var large = run("fibonacci", { value: 10 });
    AV.assertEqual(small.state.metrics.calls, 15, "C(5) = 15");
    AV.assertEqual(large.state.metrics.calls, 177, "C(10) = 177");
    AV.assert(large.state.metrics.calls > small.state.metrics.calls * 5,
      "the tree more than quintuples for double the input");
  });

  AV.test(FIB, "reports the wasted recomputation", function () {
    var out = run("fibonacci", { value: 8 });
    var last = out.timeline.events[out.timeline.events.length - 2];
    AV.assertEqual(last.type, "message");
    AV.assert(
      String(last.text).indexOf("recomputed") >= 0,
      "the narration calls out the repeats: " + last.text
    );
  });

  AV.test(FIB, "maintains a call tree and unwinds it", function () {
    var out = run("fibonacci", { value: 6 });
    AV.assertEqual(out.state.frames.length, 0, "stack empty at the end");
    AV.assertEqual(out.state.callEdges.length, out.state.metrics.calls - 1,
      "a tree with one edge per non-root frame");
    AV.assertEqual(out.state.result, 8);
  });

  AV.test(FIB, "rejects invalid or absurd input", function () {
    AV.assertEqual(run("fibonacci", { value: -3 }).state.result, "error");
    AV.assertEqual(run("fibonacci", { value: 1.5 }).state.result, "error");
    AV.assertEqual(run("fibonacci", { value: 60 }).state.result, "error",
      "call tree explosion guard");
  });

  AV.test(FIB, "never mutates the caller's input", function () {
    var input = { value: 7 };
    run("fibonacci", input);
    AV.assertEqual(input.value, 7);
  });

  AV.test("algorithms/recursion", "both live under the recursion category", function () {
    var defs = AV.algorithms.byCategory("recursion");
    AV.assertEqual(defs.length, 2, "factorial and fibonacci");
    defs.forEach(function (def) {
      AV.assert(Array.isArray(def.pseudocode) && def.pseudocode.length > 0,
        def.id + " has pseudocode");
      AV.assert(def.readyMessage, def.id + " has a ready message");
    });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
