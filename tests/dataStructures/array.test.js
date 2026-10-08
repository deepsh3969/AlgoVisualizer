/**
 * Dynamic Array structure tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(input) {
    var def = AV.structures.get("array");
    if (!def) throw new Error("Missing structure: array");
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline, definition: def };
  }

  var GROUP = "dataStructures/array";

  AV.test(GROUP, "registers with metadata and operations", function () {
    var def = AV.structures.get("array");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "structures");
    AV.assertEqual(def.viz, "array");
    AV.assert(def.operations.length >= 6, "six operations");
    AV.assert(def.explanation.steps.length >= 4);
    AV.assert(Array.isArray(def.defaultInput.array));
    def.operations.forEach(function (op) {
      AV.assert(op.id && op.label && op.signature, "operation " + op.id + " is complete");
    });
  });

  AV.test(GROUP, "append writes one cell after the tail", function () {
    var out = run({ operation: "append", array: [4, 8, 15], value: 23 });
    AV.assertEqual(out.state.array.join(","), "4,8,15,23");
    AV.assertEqual(out.state.result, 4, "returns the new length");
    AV.assertEqual(out.state.pointers.tail, 3, "tail follows the new cell");
    AV.assertEqual(out.state.metrics.writes, 1, "one write");
  });

  AV.test(GROUP, "append rejects a missing value", function () {
    var out = run({ operation: "append", array: [1], value: undefined });
    AV.assertEqual(out.state.result, "error");
    AV.assertEqual(out.state.array.length, 1, "storage unchanged");
  });

  AV.test(GROUP, "insert shifts the tail right", function () {
    var out = run({ operation: "insert", array: [4, 8, 15, 16], index: 1, value: 99 });
    AV.assertEqual(out.state.array.join(","), "4,99,8,15,16");
    AV.assertEqual(out.state.result, 5);
    AV.assertEqual(out.state.metrics.writes, 4, "3 shifts + 1 placement");
    AV.assert(
      out.timeline.events.some(function (e) { return e.type === "write" && e.index === 4; }),
      "the tail grows by one cell"
    );
  });

  AV.test(GROUP, "insert rejects an out of range index", function () {
    var tooFar = run({ operation: "insert", array: [1, 2], index: 5, value: 9 });
    AV.assertEqual(tooFar.state.result, "error");
    AV.assertEqual(tooFar.state.array.join(","), "1,2", "nothing moved");

    var negative = run({ operation: "insert", array: [1, 2], index: -1, value: 9 });
    AV.assertEqual(negative.state.result, "error");
  });

  AV.test(GROUP, "removeAt shifts left then shrinks", function () {
    var out = run({ operation: "removeAt", array: [4, 8, 15, 16], index: 1 });
    AV.assertEqual(out.state.array.join(","), "4,15,16");
    AV.assertEqual(out.state.result, 8, "returns the removed value");
    var resized = out.timeline.events.filter(function (e) { return e.type === "resize"; });
    AV.assertEqual(resized.length, 1, "one resize");
    AV.assertEqual(resized[0].length, 3);
  });

  AV.test(GROUP, "removeAt rejects an out of range index", function () {
    var out = run({ operation: "removeAt", array: [1, 2], index: 2 });
    AV.assertEqual(out.state.result, "error");
    AV.assertEqual(out.state.array.length, 2);
  });

  AV.test(GROUP, "pop drops the tail", function () {
    var out = run({ operation: "pop", array: [4, 8, 15] });
    AV.assertEqual(out.state.array.join(","), "4,8");
    AV.assertEqual(out.state.result, 15);
    AV.assertEqual(out.state.metrics.writes, 1, "removal is O(1)");
    AV.assert(out.state.pointers.tail === 1 || out.state.pointers.tail === undefined,
      "tail left pointing at the new last cell");
  });

  AV.test(GROUP, "pop on an empty array is an error", function () {
    var out = run({ operation: "pop", array: [] });
    AV.assertEqual(out.state.result, "error");
    AV.assert(String(out.state.message).indexOf("empty") >= 0, "explains why");
  });

  AV.test(GROUP, "indexOf scans left to right and stops on a hit", function () {
    var hit = run({ operation: "indexOf", array: [4, 8, 15, 8], value: 8 });
    AV.assertEqual(hit.state.result, 1, "first match wins");
    AV.assert(hit.state.hasFound);

    var compares = hit.timeline.events
      .filter(function (e) { return e.type === "compare"; })
      .map(function (e) { return e.indices[0]; });
    AV.assertEqual(compares.join(","), "0,1", "stops as soon as index 1 matches");
  });

  AV.test(GROUP, "indexOf misses report -1", function () {
    var out = run({ operation: "indexOf", array: [4, 8, 15], value: 99 });
    AV.assertEqual(out.state.result, -1);
    AV.assertEqual(out.state.found, null, "notFound clears the match");
    AV.assertEqual(
      out.timeline.events.filter(function (e) { return e.type === "compare"; }).length,
      3,
      "the whole array was inspected"
    );
  });

  AV.test(GROUP, "read fetches one cell with a single access", function () {
    var out = run({ operation: "read", array: [4, 8, 15], index: 2 });
    AV.assertEqual(out.state.result, 15);
    AV.assertEqual(out.state.metrics.comparisons, 1);

    var bad = run({ operation: "read", array: [4, 8], index: 9 });
    AV.assertEqual(bad.state.result, "error");
  });

  AV.test(GROUP, "never mutates the caller's input", function () {
    var original = [4, 8, 15];
    var snapshot = original.slice();
    run({ operation: "insert", array: original, index: 0, value: 1 });
    run({ operation: "removeAt", array: original, index: 0 });
    run({ operation: "pop", array: original });
    AV.assertEqual(original.join(","), snapshot.join(","), "input untouched");
  });

  AV.test(GROUP, "rejects unknown operations", function () {
    var out = run({ operation: "teleport", array: [1] });
    AV.assertEqual(out.state.result, "error");
  });

  AV.test(GROUP, "storage kind paints from state.array", function () {
    var out = run({ operation: "append", array: [1], value: 2 });
    AV.assertEqual(out.state.viz, "array");
    AV.assert(Array.isArray(out.state.array), "array state populated");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
