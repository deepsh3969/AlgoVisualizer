/**
 * Benchmark tests — input construction, timing, sweeps, verdicts
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var GROUP = "core/benchmark";

  function defs() {
    return AV.algorithms.all().concat(AV.structures.all());
  }

  AV.test(GROUP, "size ladders ascend and stay inside model limits", function () {
    Object.keys(AV.benchmark.SIZE_LADDERS).forEach(function (category) {
      var ladder = AV.benchmark.sizesFor(category);
      AV.assert(ladder.length >= 3, category + " needs a ladder");
      for (var i = 1; i < ladder.length; i++) {
        AV.assert(ladder[i] > ladder[i - 1], category + " ladder must ascend");
      }
      AV.assert(ladder[ladder.length - 1] <= 5000, category + " ladder stays reasonable");
    });
    AV.assert(
      AV.benchmark.sizesFor("graphs").every(function (n) { return n <= 24; }),
      "the graph model caps at 24 nodes"
    );
  });

  AV.test(GROUP, "builds a sorting input of the requested size", function () {
    var input = AV.benchmark.buildInput(AV.algorithms.get("bubbleSort"), 64, 11);
    AV.assertEqual(input.array.length, 64, "must honour the size exactly");
    var again = AV.benchmark.buildInput(AV.algorithms.get("quickSort"), 64, 11);
    AV.assertDeepEqual(again.array, input.array, "the seed must be deterministic");
  });

  AV.test(GROUP, "builds a sorted search input whose target is absent", function () {
    var input = AV.benchmark.buildInput(AV.algorithms.get("binarySearch"), 50, 3);
    AV.assertEqual(input.array.length, 50);
    for (var i = 1; i < input.array.length; i++) {
      AV.assert(input.array[i - 1] <= input.array[i], "binary search needs sorted data");
    }
    AV.assert(input.array.indexOf(input.target) < 0, "worst case: the target is missing");
  });

  AV.test(GROUP, "builds graph inputs with a reachable start", function () {
    var input = AV.benchmark.buildInput(AV.algorithms.get("bfs"), 12, 5);
    AV.assertEqual(input.graph.nodes.length, 12, "models clamp at 24 nodes");
    AV.assert(input.graph.nodes.length > 0);
    AV.assert(!!input.start, "needs a start node");
    var dijkstra = AV.benchmark.buildInput(AV.algorithms.get("dijkstra"), 12, 5);
    AV.assert(dijkstra.graph.edges.every(function (e) { return typeof e.weight === "number"; }),
      "dijkstra needs weighted edges");
  });

  AV.test(GROUP, "builds pattern inputs matched to the algorithm", function () {
    var window = AV.benchmark.buildInput(AV.algorithms.get("slidingWindow"), 200, 7);
    AV.assert(window.window >= 2, "a window needs at least two cells");
    AV.assert(window.array.length === 200);
    var prefix = AV.benchmark.buildInput(AV.algorithms.get("prefixSum"), 200, 7);
    AV.assertEqual(prefix.queryStart, 0);
    AV.assertEqual(prefix.queryEnd, 199);
    var pair = AV.benchmark.buildInput(AV.algorithms.get("twoPointer"), 200, 7);
    AV.assertEqual(pair.array.length, 200);
    AV.assertNotEqual(pair.target, undefined);
  });

  AV.test(GROUP, "builds structure inputs carrying an operation", function () {
    AV.structures.all().forEach(function (def) {
      var input = AV.benchmark.buildInput(def, 25, 9);
      AV.assert(input, def.id + " needs an input");
      AV.assert(!!input.operation, def.id + " must name an operation");
      AV.assert(Array.isArray(input.array), def.id + " must expose its storage");
      if (def.viz === "linked") AV.assert(!!input.headId, "linked list needs a head");
      if (def.viz === "tree") AV.assert(!!input.rootId, "tree needs a root");
    });
  });

  AV.test(GROUP, "measure reports time, repeats and counters", function () {
    var sample = AV.benchmark.measure(
      AV.algorithms.get("bubbleSort"),
      AV.benchmark.buildInput(AV.algorithms.get("bubbleSort"), 60, 1),
      { minMs: 1, repeats: 3 }
    );
    AV.assert(!sample.skipped, "a sort of 60 numbers must run");
    AV.assert(typeof sample.ms === "number" && sample.ms >= 0, "ms must be a number");
    AV.assert(sample.repeats >= 3, "at least three samples");
    AV.assert(sample.min <= sample.ms && sample.ms <= sample.max, "median must sit in range");
    AV.assert(sample.metrics.comparisons > 0, "sorting compares elements");
    AV.assert(sample.steps > 0, "steps must be counted");
    AV.assert(typeof sample.result !== "undefined" || sample.steps > 0);
  });

  AV.test(GROUP, "measure skips input the algorithm rejects", function () {
    var sample = AV.benchmark.measure(
      AV.algorithms.get("factorial"),
      { value: 99 },
      { minMs: 1, repeats: 3 }
    );
    AV.assert(sample.skipped, "99! is out of range");
    AV.assert(typeof sample.reason === "string" && sample.reason.length > 0,
      "a skip explains itself");
  });

  AV.test(GROUP, "every definition tolerates emit = null", function () {
    defs().forEach(function (def) {
      var input = AV.benchmark.buildInput(def, 10, 4);
      AV.assert(input, def.id + " needs an input");
      AV.assertNoThrow(
        function () { def.run(input, null); },
        def.id + " must guard every emit"
      );
    });
  });

  AV.test(GROUP, "measure never mutates the caller's input", function () {
    var input = { array: [5, 3, 9, 1, 7] };
    var before = input.array.slice();
    AV.benchmark.measure(AV.algorithms.get("bubbleSort"), input, { minMs: 1, repeats: 3 });
    AV.assertDeepEqual(input.array, before, "the benchmark must clone");
  });

  AV.test(GROUP, "run sweeps a ladder for every requested id", function () {
    var result = AV.benchmark.run({
      ids: ["bubbleSort", "mergeSort"],
      sizes: [40, 80],
      minMs: 1,
      repeats: 3
    });
    AV.assertEqual(result.series.length, 2);
    AV.assertEqual(result.options.sizes.length, 2);
    result.series.forEach(function (entry) {
      AV.assertEqual(entry.points.length, 2, entry.id + " needs a point per size");
      entry.points.forEach(function (p) {
        AV.assertEqual(p.n > 0, true, "n must be positive");
        AV.assert(!p.skipped, entry.id + " should not skip size " + p.n);
        AV.assert(typeof p.ms === "number" && p.ms >= 0);
        AV.assert(p.steps > 0, entry.id + " must do work at n = " + p.n);
        AV.assert(p.complexity.indexOf("O(") === 0, "curve label needed for plotting");
        AV.assert(typeof p.predicted === "number", "predicted cost powers the curve overlay");
      });
    });
    AV.assertEqual(result.series[0].id, "bubbleSort");
  });

  AV.test(GROUP, "run reports skipped sizes instead of inventing numbers", function () {
    var result = AV.benchmark.run({
      ids: ["factorial"],
      sizes: [4, 40],
      minMs: 1,
      repeats: 3
    });
    var points = result.series[0].points;
    AV.assertEqual(points[0].skipped, false);
    AV.assertEqual(points[1].skipped, true, "40! exceeds the safe integer limit");
    AV.assertEqual(points[1].ms, null, "a skipped point has no timing");
    AV.assert(!!points[1].reason, "the reason is kept for the UI");
  });

  AV.test(GROUP, "run can sweep a whole category", function () {
    var result = AV.benchmark.run({
      category: "sorting",
      sizes: [30],
      minMs: 1,
      repeats: 3
    });
    AV.assertEqual(result.series.length, 6, "all six sorts register");
  });

  AV.test(GROUP, "compare scores two definitions on one input", function () {
    var input = {
      array: [42, 7, 19, 3, 88, 51, 64, 12, 27, 90, 5, 33, 71, 8, 60]
    };
    var out = AV.benchmark.compare("bubbleSort", "mergeSort", input, { minMs: 1, repeats: 3 });
    AV.assert(!out.error, out.error || "both ids are known");
    AV.assertEqual(out.a.id, "bubbleSort");
    AV.assertEqual(out.b.id, "mergeSort");
    AV.assert(out.a.sample.metrics.comparisons > out.b.sample.metrics.comparisons,
      "merge sort compares less on the same data");
    AV.assert(out.metrics && out.metrics.differences.length > 0, "counters must be scored");
    AV.assert(
      out.timeWinner === "a" || out.timeWinner === "b" || out.timeWinner === "tie"
    );
    AV.assert(
      out.metrics.winner === "a" || out.metrics.winner === "b" || out.metrics.winner === "tie"
    );
  });

  AV.test(GROUP, "compare rejects unknown ids", function () {
    var out = AV.benchmark.compare("bubbleSort", "doesNotExist", { array: [1, 2] });
    AV.assert(!!out.error, "an unknown id is an error");
  });

  AV.test(GROUP, "history keeps only a short run of summaries", function () {
    AV.benchmark.clearHistory();
    AV.assertEqual(AV.benchmark.history().length, 0);

    var result = AV.benchmark.run({
      ids: ["insertionSort"],
      sizes: [30],
      minMs: 1,
      repeats: 3
    });
    var entry = AV.benchmark.save(result);
    AV.assert(!!entry, "save returns the stored summary");
    AV.assertEqual(entry.runs.length, 1);
    AV.assertEqual(entry.runs[0].id, "insertionSort");
    AV.assert(entry.runs[0].largest.n === 30, "the largest size is summarised");

    AV.benchmark.save(result);
    AV.assert(AV.benchmark.history().length <= 8, "history is capped");

    AV.benchmark.clearHistory();
    AV.assertEqual(AV.benchmark.history().length, 0);
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
