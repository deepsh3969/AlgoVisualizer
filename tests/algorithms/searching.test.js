/**
 * Searching algorithm tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function sorted(arr) {
    return arr.slice().sort(function (a, b) { return a - b; });
  }

  function run(id, input) {
    var def = AV.algorithms.get(id);
    if (!def) throw new Error("Missing algorithm: " + id);
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline };
  }

  function resultOf(id, input) {
    return run(id, input).state.result;
  }

  function indexOf(arr, value) {
    for (var i = 0; i < arr.length; i++) if (arr[i] === value) return i;
    return -1;
  }

  function lastIndexOf(arr, value) {
    for (var i = arr.length - 1; i >= 0; i--) if (arr[i] === value) return i;
    return -1;
  }

  /* ------------------------------------------------------------------ */
  /* Linear search                                                       */
  /* ------------------------------------------------------------------ */

  var LINEAR = "algorithms/searching/linearSearch";

  AV.test(LINEAR, "is registered with metadata", function () {
    var def = AV.algorithms.get("linearSearch");
    AV.assert(def, "should exist");
    AV.assert(def.complexity.worst === "O(n)", "worst case should be O(n)");
    AV.assert(def.explanation.useCases.length > 0, "needs use cases");
  });

  AV.test(LINEAR, "finds a value in the middle", function () {
    var arr = [42, 17, 8, 91, 32];
    AV.assertEqual(resultOf("linearSearch", { array: arr, target: 8 }), 2);
  });

  AV.test(LINEAR, "finds the first element", function () {
    var arr = [42, 17, 8, 91];
    AV.assertEqual(resultOf("linearSearch", { array: arr, target: 42 }), 0);
  });

  AV.test(LINEAR, "finds the last element", function () {
    var arr = [42, 17, 8, 91];
    AV.assertEqual(resultOf("linearSearch", { array: arr, target: 91 }), 3);
  });

  AV.test(LINEAR, "returns -1 when the target is absent", function () {
    var arr = [42, 17, 8, 91];
    AV.assertEqual(resultOf("linearSearch", { array: arr, target: 999 }), -1);
  });

  AV.test(LINEAR, "returns the first of several duplicates", function () {
    var arr = [5, 3, 5, 7, 5];
    AV.assertEqual(resultOf("linearSearch", { array: arr, target: 5 }), 0);
  });

  AV.test(LINEAR, "handles an empty array", function () {
    AV.assertEqual(resultOf("linearSearch", { array: [], target: 1 }), -1);
  });

  AV.test(LINEAR, "counts exactly n comparisons when absent", function () {
    var arr = [3, 1, 4, 1, 5, 9, 2, 6];
    var out = run("linearSearch", { array: arr, target: 100 });
    AV.assertEqual(out.state.metrics.comparisons, arr.length);
    AV.assert(out.state.hasFound, "found flag should be set");
    AV.assertEqual(out.state.found, null, "found should be null");
  });

  AV.test(LINEAR, "does not mutate the input array", function () {
    var arr = [3, 1, 4, 1, 5];
    var copy = arr.slice();
    run("linearSearch", { array: arr, target: 4 });
    AV.assertDeepEqual(arr, copy, "input preserved");
  });

  /* ------------------------------------------------------------------ */
  /* Binary search                                                       */
  /* ------------------------------------------------------------------ */

  var BINARY = "algorithms/searching/binarySearch";

  AV.test(BINARY, "is registered and declares sorted precondition", function () {
    var def = AV.algorithms.get("binarySearch");
    AV.assert(def, "should exist");
    AV.assertEqual(def.requiresSorted, true, "must declare a sorted precondition");
    AV.assertEqual(def.complexity.worst, "O(log n)");
  });

  AV.test(BINARY, "finds a value in a sorted array", function () {
    var arr = sorted([42, 17, 8, 91, 32, 14, 63]);
    AV.assertEqual(resultOf("binarySearch", { array: arr, target: 63 }), indexOf(arr, 63));
  });

  AV.test(BINARY, "finds the first element", function () {
    var arr = sorted([42, 17, 8, 91, 32]);
    AV.assertEqual(resultOf("binarySearch", { array: arr, target: arr[0] }), 0);
  });

  AV.test(BINARY, "finds the last element", function () {
    var arr = sorted([42, 17, 8, 91, 32]);
    AV.assertEqual(
      resultOf("binarySearch", { array: arr, target: arr[arr.length - 1] }),
      arr.length - 1
    );
  });

  AV.test(BINARY, "returns -1 when the target is absent", function () {
    var arr = sorted([42, 17, 8, 91, 32]);
    AV.assertEqual(resultOf("binarySearch", { array: arr, target: 100 }), -1);
  });

  AV.test(BINARY, "handles a single-element array", function () {
    AV.assertEqual(resultOf("binarySearch", { array: [7], target: 7 }), 0);
    AV.assertEqual(resultOf("binarySearch", { array: [7], target: 3 }), -1);
  });

  AV.test(BINARY, "handles an empty array", function () {
    AV.assertEqual(resultOf("binarySearch", { array: [], target: 3 }), -1);
  });

  AV.test(BINARY, "uses O(log n) comparisons for large arrays", function () {
    var arr = [];
    for (var i = 0; i < 1024; i++) arr.push(i);
    var out = run("binarySearch", { array: arr, target: 1023 });
    AV.assert(
      out.state.metrics.comparisons <= 11,
      "expected at most 11 comparisons, got " + out.state.metrics.comparisons
    );
    AV.assert(out.state.metrics.comparisons < arr.length, "must beat a linear scan");
  });

  AV.test(BINARY, "shrinks the interval on every step", function () {
    var arr = [];
    for (var i = 0; i < 64; i++) arr.push(i * 2);
    var def = AV.algorithms.get("binarySearch");
    var timeline = AV.viz.buildTimeline(def, { array: arr, target: 999999 });
    var state = AV.viz.createState(def, { array: arr, target: 999999 });
    state.definition = def;

    var lastSize = arr.length;
    var shrunk = 0;
    var checked = 0;

    for (var e = 0; e < timeline.events.length; e++) {
      AV.viz.applyEvent(state, timeline.events[e]);
      var ev = timeline.events[e];
      if (ev.type === "range" && ev.start !== null && ev.start !== undefined) {
        var size = ev.end - ev.start + 1;
        checked += 1;
        if (size < lastSize) shrunk += 1;
        lastSize = size;
      }
    }
    AV.assert(checked >= 6, "should record several intervals");
    AV.assert(shrunk >= 5, "interval must shrink almost every time");
  });

  AV.test(BINARY, "reports not-found by leaving the interval empty", function () {
    var arr = sorted([1, 3, 5, 7, 9]);
    var out = run("binarySearch", { array: arr, target: 4 });
    AV.assertEqual(out.state.found, null);
    AV.assert(out.state.hasFound);
    AV.assertEqual(out.state.range, null, "interval should be cleared");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
