/**
 * Algorithm pattern tests (two pointer, sliding window, prefix sum)
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(id, input) {
    var def = AV.algorithms.get(id);
    if (!def) throw new Error("Missing pattern: " + id);
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

  function brutePair(arr, target) {
    for (var i = 0; i < arr.length; i++) {
      for (var j = i + 1; j < arr.length; j++) {
        if (arr[i] + arr[j] === target) return "(" + i + ", " + j + ")";
      }
    }
    return "no pair";
  }

  /* ------------------------------------------------------------------ */
  /* Two pointer                                                         */
  /* ------------------------------------------------------------------ */

  var TP = "algorithms/patterns/twoPointer";

  AV.test(TP, "is registered as a pattern", function () {
    var def = AV.algorithms.get("twoPointer");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "patterns");
    AV.assertEqual(def.requiresSorted, true, "needs a sorted input");
  });

  AV.test(TP, "finds a matching pair", function () {
    var arr = [2, 7, 11, 15];
    AV.assertEqual(resultOf("twoPointer", { array: arr, target: 18 }), "(1, 2)");
  });

  AV.test(TP, "finds a pair at the outer edges", function () {
    var arr = [1, 2, 3, 4, 5];
    AV.assertEqual(resultOf("twoPointer", { array: arr, target: 6 }), "(0, 4)");
  });

  AV.test(TP, "reports no pair when none exists", function () {
    var arr = [1, 2, 3, 4];
    AV.assertEqual(resultOf("twoPointer", { array: arr, target: 100 }), "no pair");
  });

  AV.test(TP, "handles fewer than two elements", function () {
    AV.assertEqual(resultOf("twoPointer", { array: [], target: 3 }), "no pair");
    AV.assertEqual(resultOf("twoPointer", { array: [5], target: 10 }), "no pair");
  });

  AV.test(TP, "agrees with a brute-force scan on random inputs", function () {
    for (var seed = 1; seed <= 8; seed++) {
      var arr = AV.random
        .generateArray({ size: 14, min: 1, max: 40, seed: seed })
        .sort(function (a, b) { return a - b; });
      var target = 20 + seed * 3;
      AV.assertEqual(
        resultOf("twoPointer", { array: arr, target: target }),
        brutePair(arr, target),
        "seed " + seed
      );
    }
  });

  AV.test(TP, "emits left and right pointer events", function () {
    var def = AV.algorithms.get("twoPointer");
    var timeline = AV.viz.buildTimeline(def, { array: [1, 3, 5, 7, 9], target: 12 });
    var hasLeft = false;
    var hasRight = false;
    timeline.events.forEach(function (e) {
      if (e.type === "pointer" && e.name === "left") hasLeft = true;
      if (e.type === "pointer" && e.name === "right") hasRight = true;
    });
    AV.assert(hasLeft, "left pointer events expected");
    AV.assert(hasRight, "right pointer events expected");
  });

  /* ------------------------------------------------------------------ */
  /* Sliding window                                                      */
  /* ------------------------------------------------------------------ */

  var SW = "algorithms/patterns/slidingWindow";

  function bruteWindow(arr, k) {
    var best = -Infinity;
    for (var i = 0; i + k <= arr.length; i++) {
      var s = 0;
      for (var j = 0; j < k; j++) s += arr[i + j];
      if (s > best) best = s;
    }
    return best;
  }

  AV.test(SW, "is registered as a pattern", function () {
    var def = AV.algorithms.get("slidingWindow");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "patterns");
    AV.assertEqual(def.complexity.worst, "O(n)");
  });

  AV.test(SW, "finds the maximum window sum", function () {
    AV.assertEqual(resultOf("slidingWindow", { array: [1, 4, 2, 10, 3], window: 2 }), 13);
  });

  AV.test(SW, "handles a window the size of the array", function () {
    var arr = [3, -1, 4, 1];
    AV.assertEqual(
      resultOf("slidingWindow", { array: arr, window: arr.length }),
      arr.reduce(function (a, b) { return a + b; }, 0)
    );
  });

  AV.test(SW, "handles a window of one", function () {
    AV.assertEqual(resultOf("slidingWindow", { array: [3, -1, 4, 1], window: 1 }), 4);
  });

  AV.test(SW, "clamps an oversized window", function () {
    var arr = [1, 2, 3];
    AV.assertEqual(
      resultOf("slidingWindow", { array: arr, window: 99 }),
      arr.reduce(function (a, b) { return a + b; }, 0)
    );
  });

  AV.test(SW, "clamps a non-positive window", function () {
    AV.assertEqual(resultOf("slidingWindow", { array: [3, -1, 4, 1], window: 0 }), 4);
  });

  AV.test(SW, "agrees with brute force on random inputs", function () {
    for (var seed = 1; seed <= 10; seed++) {
      var arr = AV.random.generateArray({ size: 25, min: -20, max: 40, seed: seed });
      var k = 1 + (seed % 7);
      AV.assertEqual(
        resultOf("slidingWindow", { array: arr, window: k }),
        bruteWindow(arr, k),
        "seed " + seed + " k " + k
      );
    }
  });

  AV.test(SW, "never re-adds the whole window (O(n) event count)", function () {
    var arr = AV.random.generateArray({ size: 100, seed: 3, min: 0, max: 10 });
    var out = run("slidingWindow", { array: arr, window: 10 });
    AV.assert(
      out.timeline.events.length < arr.length * 12,
      "expected roughly linear events, got " + out.timeline.events.length
    );
  });

  /* ------------------------------------------------------------------ */
  /* Prefix sum                                                          */
  /* ------------------------------------------------------------------ */

  var PS = "algorithms/patterns/prefixSum";

  function bruteSum(arr, l, r) {
    var s = 0;
    for (var i = l; i <= r; i++) s += arr[i];
    return s;
  }

  AV.test(PS, "is registered as a pattern", function () {
    var def = AV.algorithms.get("prefixSum");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "patterns");
    AV.assertEqual(def.complexity.space, "O(n)");
  });

  AV.test(PS, "answers a range query correctly", function () {
    var arr = [3, 1, 4, 2];
    AV.assertEqual(
      resultOf("prefixSum", { array: arr, queryStart: 1, queryEnd: 3 }),
      bruteSum(arr, 1, 3)
    );
  });

  AV.test(PS, "answers a query starting at index 0", function () {
    var arr = [3, 1, 4, 2];
    AV.assertEqual(
      resultOf("prefixSum", { array: arr, queryStart: 0, queryEnd: 2 }),
      bruteSum(arr, 0, 2)
    );
  });

  AV.test(PS, "answers a single-element query", function () {
    var arr = [3, 1, 4, 2];
    AV.assertEqual(
      resultOf("prefixSum", { array: arr, queryStart: 2, queryEnd: 2 }),
      4
    );
  });

  AV.test(PS, "builds the correct prefix row", function () {
    var arr = [3, 1, 4, 2];
    var out = run("prefixSum", { array: arr, queryStart: 0, queryEnd: 0 });
    var prefix = out.state.rows.prefix;
    AV.assert(Array.isArray(prefix), "prefix row expected");
    AV.assertDeepEqual(prefix, [3, 4, 8, 10], "prefix totals");
  });

  AV.test(PS, "matches brute force for random queries", function () {
    for (var seed = 1; seed <= 10; seed++) {
      var arr = AV.random.generateArray({ size: 20, min: -10, max: 30, seed: seed });
      var l = seed % 10;
      var r = l + (seed % 8);
      if (r > arr.length - 1) r = arr.length - 1;
      AV.assertEqual(
        resultOf("prefixSum", { array: arr, queryStart: l, queryEnd: r }),
        bruteSum(arr, l, r),
        "seed " + seed
      );
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
