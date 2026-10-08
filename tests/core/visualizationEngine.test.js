/**
 * Visualization engine tests — state, timeline, replay, narration
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var V = AV.viz;
  var GROUP = "core/visualizationEngine";

  function sortDef() { return AV.algorithms.get("bubbleSort"); }
  function graphDef() { return AV.algorithms.get("bfs"); }

  function arrayState(values) {
    var state = V.createState(sortDef(), { array: values.slice() });
    state.definition = sortDef();
    return state;
  }

  function replay(definition, input) {
    var timeline = V.buildTimeline(definition, input);
    var state = V.createState(definition, input);
    state.definition = definition;
    for (var i = 0; i < timeline.events.length; i++) {
      V.applyEvent(state, timeline.events[i]);
    }
    return { timeline: timeline, state: state };
  }

  AV.test(GROUP, "createState starts with a clean state", function () {
    var state = V.createState(sortDef(), { array: [3, 1, 2] });
    AV.assertEqual(state.viz, "array");
    AV.assertDeepEqual(state.array, [3, 1, 2]);
    AV.assertEqual(state.metrics.steps, 0);
    AV.assertEqual(state.metrics.comparisons, 0);
    AV.assertDeepEqual(state.roles, {});
    AV.assertDeepEqual(state.pointers, {});
    AV.assertEqual(state.resultReady, false);
    AV.assertEqual(state.input.array !== state.array, true, "the input is cloned");
  });

  AV.test(GROUP, "createState gives every viz kind a starting shape", function () {
    var graph = V.createState(graphDef(), { graph: { nodes: [], edges: [] }, start: "a" });
    AV.assertEqual(graph.viz, "graph");
    AV.assertEqual(graph.array, null, "graph kind keeps no flat array");
    AV.assert(Array.isArray(graph.queue), "BFS needs a frontier");

    var recursion = V.createState(AV.algorithms.get("factorial"), { value: 5 });
    AV.assertEqual(recursion.viz, "recursion");
    AV.assert(Array.isArray(recursion.frames), "recursion needs live frames");

    var list = V.createState(AV.structures.get("linkedList"), { array: [] });
    AV.assertEqual(list.viz, "linked");
    AV.assert(Array.isArray(list.array));
  });

  AV.test(GROUP, "createState shares no memory with its input", function () {
    var input = { array: [3, 1, 2] };
    var state = V.createState(sortDef(), input);
    V.applyEvent(state, { type: "swap", indices: [0, 2] });
    AV.assertDeepEqual(input.array, [3, 1, 2], "the caller's array is untouched");
  });

  AV.test(GROUP, "cloneInput deep-copies arrays and graphs", function () {
    var input = {
      array: [1, 2],
      graph: { nodes: [{ id: "a", label: "A" }], edges: [{ from: "a", to: "b", weight: 1 }] }
    };
    var copy = V.cloneInput(null, input);
    copy.array.push(3);
    copy.graph.nodes[0].id = "z";
    copy.graph.edges[0].weight = 99;
    AV.assertEqual(input.array.length, 2, "the source array is protected");
    AV.assertEqual(input.graph.nodes[0].id, "a");
    AV.assertEqual(input.graph.edges[0].weight, 1);
    AV.assertEqual(V.cloneInput(null, null), null, "non-objects pass through");
    AV.assertDeepEqual(V.cloneInput(null, [1, 2]), [1, 2]);
  });

  AV.test(GROUP, "buildTimeline refuses a definition without run", function () {
    AV.assertThrows(function () { V.buildTimeline({}, { array: [] }); });
    AV.assertThrows(function () { V.buildTimeline(null, { array: [] }); });
  });

  AV.test(GROUP, "buildTimeline records events and checkpoints", function () {
    var out = replay(sortDef(), { array: [4, 2, 7, 1] });
    var timeline = out.timeline;
    AV.assert(timeline.total > 0, "sorting produces events");
    AV.assertEqual(timeline.total, timeline.events.length, "total matches the event count");
    AV.assertEqual(timeline.checkpoints[0], timeline.initial, "the first checkpoint is the start");
    AV.assertEqual(
      timeline.checkpoints.length,
      Math.floor(timeline.total / V.CHECKPOINT_INTERVAL) + 1,
      "one checkpoint per interval"
    );
    AV.assert(Array.isArray(timeline.events));
    AV.assert(timeline.definition === sortDef());
  });

  AV.test(GROUP, "every event carries a type", function () {
    var timeline = V.buildTimeline(sortDef(), { array: [5, 3, 8, 1] });
    timeline.events.forEach(function (event, i) {
      AV.assert(typeof event.type === "string" && event.type, "event " + i + " needs a type");
    });
  });

  AV.test(GROUP, "applyEvent counts compare, swap and write work", function () {
    var state = arrayState([2, 1]);
    V.applyEvent(state, { type: "compare", indices: [0, 1] });
    AV.assertEqual(state.metrics.steps, 1);
    AV.assertEqual(state.metrics.comparisons, 1);
    AV.assertEqual(state.metrics.accesses, 2);

    V.applyEvent(state, { type: "swap", indices: [0, 1] });
    AV.assertDeepEqual(state.array, [1, 2]);
    AV.assertEqual(state.metrics.swaps, 1);
    AV.assertEqual(state.metrics.accesses, 6, "compare plus swap");

    V.applyEvent(state, { type: "write", index: 0, value: 9 });
    AV.assertDeepEqual(state.array, [9, 2]);
    AV.assertEqual(state.metrics.writes, 1);
  });

  AV.test(GROUP, "transient roles clear on the next event", function () {
    var state = arrayState([1, 2, 3]);
    V.applyEvent(state, { type: "compare", indices: [0] });
    AV.assert(state.roles.compare && state.roles.compare[0], "compare highlights index 0");
    AV.assertEqual(state.mark[0], "compare", "the winning role drives state.mark");

    V.applyEvent(state, { type: "mark", index: 1, role: "sorted" });
    AV.assert(!state.roles.compare, "compare is transient");
    AV.assert(state.roles.sorted && state.roles.sorted[1], "sorted survives");
    AV.assertEqual(state.mark[1], "sorted");
    AV.assertEqual(state.mark[0], undefined, "the stale mark is gone");
  });

  AV.test(GROUP, "role priority decides state.mark", function () {
    var state = arrayState([1, 2, 3]);
    V.applyEvent(state, { type: "mark", index: 0, role: "sorted" });
    V.applyEvent(state, { type: "mark", index: 0, role: "active" });
    AV.assertEqual(state.mark[0], "active", "active outranks sorted");
    V.applyEvent(state, { type: "mark", index: 0, role: "swap" });
    AV.assertEqual(state.mark[0], "swap", "swap outranks active");
    AV.assert(V.ROLE_PRIORITY.swap > V.ROLE_PRIORITY.compare);
    AV.assert(V.ROLE_PRIORITY.compare > V.ROLE_PRIORITY.sorted);
  });

  AV.test(GROUP, "pointers can be placed and removed", function () {
    var state = arrayState([1, 2, 3]);
    V.applyEvent(state, { type: "pointer", name: "j", index: 2 });
    AV.assertEqual(state.pointers.j, 2);
    V.applyEvent(state, { type: "pointer", name: "j", index: null });
    AV.assertEqual(state.pointers.j, undefined);
    V.applyEvent(state, { type: "pointer", name: "i", index: 0 });
    AV.assertEqual(state.pointers.i, 0);
  });

  AV.test(GROUP, "range highlights can be set and cleared", function () {
    var state = arrayState([1, 2, 3]);
    V.applyEvent(state, { type: "range", start: 1, end: 2, label: "Window" });
    AV.assertDeepEqual(state.range, { start: 1, end: 2, label: "Window" });
    V.applyEvent(state, { type: "range", start: null });
    AV.assertEqual(state.range, null);
  });

  AV.test(GROUP, "resize shrinks storage and drops ghost pointers", function () {
    var state = V.createState(AV.structures.get("array"), { array: [1, 2, 3, 4] });
    V.applyEvent(state, { type: "pointer", name: "i", index: 3 });
    V.applyEvent(state, { type: "mark", index: 2, role: "sorted" });
    V.applyEvent(state, { type: "resize", length: 2 });
    AV.assertDeepEqual(state.array, [1, 2]);
    AV.assertEqual(state.pointers.i, undefined, "the out-of-range pointer is dropped");
    AV.assert(!state.roles.sorted || !state.roles.sorted[2],
      "out-of-range roles are dropped");
    AV.assert(state.metrics.writes >= 2, "shrinking counts writes");
  });

  AV.test(GROUP, "resize can grow storage", function () {
    var state = V.createState(AV.structures.get("array"), { array: [1, 2] });
    V.applyEvent(state, { type: "resize", length: 5 });
    AV.assertEqual(state.array.length, 5);
    AV.assertEqual(state.metrics.writes, 3, "three cells were appended");
  });

  AV.test(GROUP, "results and narration land on the state", function () {
    var state = arrayState([1]);
    V.applyEvent(state, { type: "result", value: 42 });
    AV.assertEqual(state.result, 42);
    AV.assert(state.resultReady);
    V.applyEvent(state, { type: "message", text: "all done" });
    AV.assertEqual(state.message, "all done");
    V.applyEvent(state, { type: "found", index: 0 });
    AV.assertEqual(state.hasFound, true);
  });

  AV.test(GROUP, "graph events build the frontier", function () {
    var state = V.createState(graphDef(), { graph: { nodes: [], edges: [] }, start: "a" });
    V.applyEvent(state, { type: "enqueue", node: "a" });
    V.applyEvent(state, { type: "enqueue", node: "b" });
    AV.assertDeepEqual(state.queue, ["a", "b"]);
    V.applyEvent(state, { type: "dequeue" });
    AV.assertDeepEqual(state.queue, ["b"]);
    AV.assertEqual(state.metrics.enqueued, 2);
    AV.assertEqual(state.metrics.dequeued, 1);

    V.applyEvent(state, { type: "visit", node: "a" });
    V.applyEvent(state, { type: "visit", node: "a" });
    AV.assertDeepEqual(state.visitOrder, ["a"], "a node is visited once");
    AV.assertEqual(state.metrics.visited, 1);
  });

  AV.test(GROUP, "advance matches a step-by-step replay", function () {
    var input = { array: [5, 3, 8, 1, 9, 2] };
    var direct = replay(sortDef(), input);
    var seeked = V.createState(sortDef(), input);
    seeked.definition = sortDef();
    V.advance(seeked, direct.timeline, 0, direct.timeline.total);
    AV.assertDeepEqual(seeked.array, direct.state.array, "same sorted output");
    AV.assertDeepEqual(seeked.metrics, direct.state.metrics, "same counters");
  });

  AV.test(GROUP, "rewinding restores the earlier state", function () {
    var input = { array: [5, 3, 8, 1] };
    var timeline = V.buildTimeline(sortDef(), input);
    var state = V.createState(sortDef(), input);
    state.definition = sortDef();

    V.advance(state, timeline, 0, timeline.total);
    var finishedArray = state.array.slice();
    V.advance(state, timeline, timeline.total, 0);

    AV.assertDeepEqual(state.array, input.array, "back to the input");
    AV.assertEqual(state.metrics.steps, 0, "counters rewind with the state");
    AV.assertNotEqual(JSON.stringify(state.array), JSON.stringify(finishedArray),
      "the rewound state really moved");
  });

  AV.test(GROUP, "a far jump restores a checkpoint first", function () {
    var values = [];
    for (var v = 0; v < 25; v++) values.push(25 - v);
    var input = { array: values };
    var timeline = V.buildTimeline(sortDef(), input);
    AV.assert(timeline.total > V.CHECKPOINT_INTERVAL, "long enough to need checkpoints");

    var jump = V.createState(sortDef(), input);
    jump.definition = sortDef();
    V.advance(jump, timeline, 0, timeline.total);

    var stepped = V.createState(sortDef(), input);
    stepped.definition = sortDef();
    for (var i = 0; i < timeline.total; i++) V.applyEvent(stepped, timeline.events[i]);

    AV.assertDeepEqual(jump.array, stepped.array, "checkpoint replay lands in the same place");
    AV.assertDeepEqual(jump.metrics, stepped.metrics);
  });

  AV.test(GROUP, "resetState returns to the initial snapshot", function () {
    var input = { array: [4, 2, 6, 1] };
    var timeline = V.buildTimeline(sortDef(), input);
    var state = V.createState(sortDef(), input);
    state.definition = sortDef();
    V.advance(state, timeline, 0, timeline.total);
    V.resetState(state, timeline);
    AV.assertDeepEqual(state.array, input.array);
    AV.assertEqual(state.metrics.steps, 0);
    AV.assertEqual(state.resultReady, false);
  });

  AV.test(GROUP, "advance clamps out-of-range targets", function () {
    var input = { array: [2, 1] };
    var timeline = V.buildTimeline(sortDef(), input);
    var state = V.createState(sortDef(), input);
    state.definition = sortDef();
    V.advance(state, timeline, 0, 9999);
    AV.assertEqual(state.metrics.steps, timeline.total, "clamped to the timeline end");
    V.advance(state, timeline, timeline.total, -50);
    AV.assertEqual(state.metrics.steps, 0, "clamped to the start");
    AV.assertEqual(V.advance(state, timeline, 0, 0), state, "no-op returns the same state");
  });

  AV.test(GROUP, "formatEvent narrates without pre-written text", function () {
    var state = arrayState([4, 2]);
    AV.assertEqual(V.formatEvent(null, state), "Ready to run");
    var compare = V.formatEvent({ type: "compare", indices: [0, 1] }, state);
    AV.assert(compare.indexOf("Compare") >= 0, compare);
    AV.assert(compare.indexOf("4") >= 0 && compare.indexOf("2") >= 0, "values are inlined");
    var swap = V.formatEvent({ type: "swap", indices: [0, 1] }, state);
    AV.assert(swap.indexOf("Swap") >= 0, swap);
    var pointer = V.formatEvent({ type: "pointer", name: "mid", index: 1 }, state);
    AV.assert(pointer.indexOf("mid") >= 0, pointer);
  });

  AV.test(GROUP, "formatEvent prefers the algorithm's own wording", function () {
    var state = arrayState([1]);
    AV.assertEqual(
      V.formatEvent({ type: "message", text: "Base case reached" }, state),
      "Base case reached"
    );
    AV.assertEqual(
      V.formatEvent({ type: "write", index: 0, value: 7, text: "Store the result" }, state),
      "Store the result",
      "an event with text wins over the default wording"
    );
    AV.assert(V.formatEvent({ type: "result", value: 24 }, state).indexOf("24") >= 0);
    AV.assert(V.formatEvent({ type: "notFound" }, state).indexOf("not found") >= 0);
  });

  AV.test(GROUP, "checkpoint helpers agree with the interval", function () {
    AV.assertEqual(V.checkpointStartIndex(0), 0);
    AV.assertEqual(V.checkpointStartIndex(63), 0);
    AV.assertEqual(V.checkpointStartIndex(64), 64);
    AV.assertEqual(V.checkpointStartIndex(130), 128);

    var timeline = V.buildTimeline(sortDef(), { array: [7, 3, 1, 9, 4, 2] });
    var atStart = V.checkpointFor(timeline, 0);
    AV.assertEqual(atStart, timeline.initial);
    var atEnd = V.checkpointFor(timeline, timeline.total);
    AV.assert(atEnd, "there is always a checkpoint to fall back on");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
