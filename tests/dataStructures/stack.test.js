/**
 * Stack structure tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(input) {
    var def = AV.structures.get("stack");
    if (!def) throw new Error("Missing structure: stack");
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline, definition: def };
  }

  var GROUP = "dataStructures/stack";

  AV.test(GROUP, "registers with metadata and LIFO operations", function () {
    var def = AV.structures.get("stack");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "structures");
    AV.assertEqual(def.viz, "stack");
    AV.assert(def.complexity.worst.indexOf("O(1)") >= 0, "push/pop are constant time");
    var ids = def.operations.map(function (op) { return op.id; }).join(",");
    AV.assertEqual(ids, "push,pop,peek,search,isEmpty");
  });

  AV.test(GROUP, "push writes on top and moves the top pointer", function () {
    var out = run({ operation: "push", array: [4, 8], value: 15 });
    AV.assertEqual(out.state.array.join(","), "4,8,15");
    AV.assertEqual(out.state.result, 3, "returns the new size");
    AV.assertEqual(out.state.pointers.top, 2);
    AV.assertEqual(out.state.metrics.writes, 1);
  });

  AV.test(GROUP, "push rejects a missing value", function () {
    var out = run({ operation: "push", array: [1], value: "" });
    AV.assertEqual(out.state.result, "error");
    AV.assertEqual(out.state.array.length, 1);
  });

  AV.test(GROUP, "pop removes the newest value", function () {
    var out = run({ operation: "pop", array: [4, 8, 15] });
    AV.assertEqual(out.state.array.join(","), "4,8");
    AV.assertEqual(out.state.result, 15, "last in, first out");
    AV.assertEqual(out.state.metrics.writes, 1, "pop touches one cell");
  });

  AV.test(GROUP, "popping the last value clears the top pointer", function () {
    var out = run({ operation: "pop", array: [7] });
    AV.assertEqual(out.state.array.length, 0);
    AV.assertEqual(out.state.result, 7);
    AV.assert(
      out.state.pointers.top === undefined || out.state.pointers.top === null,
      "no cell is the top any more"
    );
  });

  AV.test(GROUP, "pop on an empty stack underflows", function () {
    var out = run({ operation: "pop", array: [] });
    AV.assertEqual(out.state.result, "error");
    AV.assert(String(out.state.message).indexOf("underflow") >= 0, "names the failure");
  });

  AV.test(GROUP, "peek reads the top without removing it", function () {
    var out = run({ operation: "peek", array: [4, 8, 15] });
    AV.assertEqual(out.state.result, 15);
    AV.assertEqual(out.state.array.join(","), "4,8,15", "nothing changed");
    AV.assertEqual(out.state.pointers.top, 2);
  });

  AV.test(GROUP, "peek on an empty stack errors", function () {
    var out = run({ operation: "peek", array: [] });
    AV.assertEqual(out.state.result, "error");
  });

  AV.test(GROUP, "search scans from the top down", function () {
    var out = run({ operation: "search", array: [4, 8, 15], value: 4 });
    AV.assertEqual(out.state.result, 0, "found at the bottom");
    var order = out.timeline.events
      .filter(function (e) { return e.type === "compare"; })
      .map(function (e) { return e.indices[0]; });
    AV.assertEqual(order.join(","), "2,1,0", "newest entry inspected first");
    AV.assert(out.state.hasFound);
  });

  AV.test(GROUP, "search finds the top immediately", function () {
    var out = run({ operation: "search", array: [4, 8, 15], value: 15 });
    AV.assertEqual(out.state.result, 2);
    var order = out.timeline.events
      .filter(function (e) { return e.type === "compare"; })
      .map(function (e) { return e.indices[0]; });
    AV.assertEqual(order.join(","), "2", "one comparison and done");
  });

  AV.test(GROUP, "search misses report -1", function () {
    var out = run({ operation: "search", array: [4, 8, 15], value: 99 });
    AV.assertEqual(out.state.result, -1);
    AV.assertEqual(out.state.found, null);
    AV.assertEqual(
      out.timeline.events.filter(function (e) { return e.type === "compare"; }).length,
      3,
      "the whole stack was inspected"
    );
  });

  AV.test(GROUP, "isEmpty reports both branches", function () {
    AV.assertEqual(run({ operation: "isEmpty", array: [] }).state.result, true);
    AV.assertEqual(run({ operation: "isEmpty", array: [1] }).state.result, false);
  });

  AV.test(GROUP, "never mutates the caller's input", function () {
    var original = [4, 8, 15];
    run({ operation: "push", array: original, value: 99 });
    run({ operation: "pop", array: original });
    AV.assertEqual(original.join(","), "4,8,15");
  });

  AV.test(GROUP, "rejects unknown operations", function () {
    var out = run({ operation: "juggle", array: [1] });
    AV.assertEqual(out.state.result, "error");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
