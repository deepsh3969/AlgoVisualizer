/**
 * Queue structure tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(input) {
    var def = AV.structures.get("queue");
    if (!def) throw new Error("Missing structure: queue");
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline, definition: def };
  }

  var GROUP = "dataStructures/queue";

  AV.test(GROUP, "registers with metadata and FIFO operations", function () {
    var def = AV.structures.get("queue");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "structures");
    AV.assertEqual(def.viz, "queue");
    var ids = def.operations.map(function (op) { return op.id; }).join(",");
    AV.assertEqual(ids, "enqueue,dequeue,peek,search,isEmpty");
    AV.assert(def.explanation.useCases.length >= 3);
  });

  AV.test(GROUP, "enqueue writes at the back", function () {
    var out = run({ operation: "enqueue", array: [4, 8], value: 15 });
    AV.assertEqual(out.state.array.join(","), "4,8,15");
    AV.assertEqual(out.state.result, 3);
    AV.assertEqual(out.state.pointers.back, 2, "back follows the new cell");
    AV.assertEqual(out.state.pointers.front, 0, "front stays put");
    AV.assertEqual(out.state.metrics.writes, 1);
  });

  AV.test(GROUP, "the first arrival also becomes the front", function () {
    var out = run({ operation: "enqueue", array: [], value: 4 });
    AV.assertEqual(out.state.array.join(","), "4");
    AV.assertEqual(out.state.pointers.front, 0);
    AV.assertEqual(out.state.pointers.back, 0);
  });

  AV.test(GROUP, "dequeue removes the oldest value", function () {
    var out = run({ operation: "dequeue", array: [4, 8, 15] });
    AV.assertEqual(out.state.array.join(","), "8,15");
    AV.assertEqual(out.state.result, 4, "first in, first out");
    AV.assertEqual(out.state.pointers.front, 0);
    AV.assertEqual(out.state.pointers.back, 1);
  });

  AV.test(GROUP, "dequeue reports the array backed cost", function () {
    var out = run({ operation: "dequeue", array: [4, 8, 15] });
    AV.assert(out.state.metrics.writes >= 3, "slide the rest forward, then shrink");
    AV.assert(
      String(out.state.message).indexOf("O(n)") >= 0,
      "the narration explains why"
    );
    var resized = out.timeline.events.filter(function (e) { return e.type === "resize"; });
    AV.assertEqual(resized.length, 1, "one resize");
    AV.assertEqual(resized[0].length, 2);
  });

  AV.test(GROUP, "emptying the queue clears both pointers", function () {
    var out = run({ operation: "dequeue", array: [4] });
    AV.assertEqual(out.state.array.length, 0);
    AV.assertEqual(out.state.result, 4);
    AV.assert(
      out.state.pointers.front === undefined || out.state.pointers.front === null,
      "no front"
    );
    AV.assert(
      out.state.pointers.back === undefined || out.state.pointers.back === null,
      "no back"
    );
  });

  AV.test(GROUP, "dequeue on an empty queue underflows", function () {
    var out = run({ operation: "dequeue", array: [] });
    AV.assertEqual(out.state.result, "error");
    AV.assert(String(out.state.message).indexOf("underflow") >= 0);
  });

  AV.test(GROUP, "peek reads the front without removing it", function () {
    var out = run({ operation: "peek", array: [4, 8, 15] });
    AV.assertEqual(out.state.result, 4);
    AV.assertEqual(out.state.array.join(","), "4,8,15");
    AV.assertEqual(out.state.pointers.front, 0);
  });

  AV.test(GROUP, "peek on an empty queue errors", function () {
    var out = run({ operation: "peek", array: [] });
    AV.assertEqual(out.state.result, "error");
  });

  AV.test(GROUP, "search scans front to back", function () {
    var out = run({ operation: "search", array: [4, 8, 15], value: 15 });
    AV.assertEqual(out.state.result, 2);
    var order = out.timeline.events
      .filter(function (e) { return e.type === "compare"; })
      .map(function (e) { return e.indices[0]; });
    AV.assertEqual(order.join(","), "0,1,2", "arrival order");
  });

  AV.test(GROUP, "search misses report -1", function () {
    var out = run({ operation: "search", array: [4, 8], value: 99 });
    AV.assertEqual(out.state.result, -1);
    AV.assertEqual(out.state.found, null);
  });

  AV.test(GROUP, "isEmpty reports both branches", function () {
    AV.assertEqual(run({ operation: "isEmpty", array: [] }).state.result, true);
    AV.assertEqual(run({ operation: "isEmpty", array: [1] }).state.result, false);
  });

  AV.test(GROUP, "never mutates the caller's input", function () {
    var original = [4, 8, 15];
    run({ operation: "enqueue", array: original, value: 99 });
    run({ operation: "dequeue", array: original });
    AV.assertEqual(original.join(","), "4,8,15");
  });

  AV.test(GROUP, "rejects unknown operations", function () {
    var out = run({ operation: "shuffle", array: [1] });
    AV.assertEqual(out.state.result, "error");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
