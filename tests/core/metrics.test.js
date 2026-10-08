/**
 * Metrics tests — counters, Big-O evaluation, verdicts
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var GROUP = "core/metrics";

  function everyComplexity() {
    var out = [];
    AV.algorithms.all().concat(AV.structures.all()).forEach(function (def) {
      var c = def.complexity || {};
      ["best", "average", "worst", "space"].forEach(function (field) {
        if (c[field]) out.push({ where: def.id + "." + field, expr: c[field] });
      });
    });
    return out;
  }

  AV.test(GROUP, "every complexity string in the catalog parses", function () {
    var rows = everyComplexity();
    AV.assert(rows.length >= 60, "expected a full catalog, saw " + rows.length);
    rows.forEach(function (row) {
      var parsed = AV.metrics.parse(row.expr);
      AV.assertNotEqual(
        parsed.kind,
        "unknown",
        row.where + " (" + row.expr + ") did not parse"
      );
      AV.assert(parsed.raw.indexOf("O(") >= 0, row.where + " should keep its O(...) wrapper");
    });
  });

  AV.test(GROUP, "evaluates the standard shapes", function () {
    AV.assertEqual(AV.metrics.value("O(1)", 1000), 1);
    AV.assertEqual(AV.metrics.value("O(n)", 100), 100);
    AV.assertEqual(AV.metrics.value("O(n log n)", 1024), 10240);
    AV.assertEqual(AV.metrics.value("O(n²)", 10), 100);
    AV.assertEqual(AV.metrics.value("O(n³)", 5), 125);
    AV.assertEqual(AV.metrics.value("O(log n)", 1024), 10);
    AV.assertEqual(AV.metrics.value("O(2^n)", 10), 1024);
    AV.assertEqual(AV.metrics.value("O(V + E)", 100), 200, "V + E doubles as 2n");
  });

  AV.test(GROUP, "gives every shape a human label", function () {
    AV.assertEqual(AV.metrics.parse("O(1)").label, "constant");
    AV.assertEqual(AV.metrics.parse("O(n)").label, "linear");
    AV.metrics.parse("O(n log n)");
    AV.assertEqual(AV.metrics.parse("O(n log n)").label, "linearithmic");
    AV.assertEqual(AV.metrics.parse("O(n²)").label, "quadratic");
    AV.assertEqual(AV.metrics.parse("O(2^n)").label, "exponential");
    AV.assertEqual(AV.metrics.parse("banana").label, "unrecognised");
  });

  AV.test(GROUP, "series walks the requested range", function () {
    var points = AV.metrics.series("O(n²)", { min: 10, max: 100, steps: 5, scale: "linear" });
    AV.assertEqual(points.length, 5);
    AV.assertEqual(points[0].n, 10);
    AV.assertEqual(points[4].n, 100);
    for (var i = 1; i < points.length; i++) {
      AV.assert(points[i].n > points[i - 1].n, "n must strictly increase");
      AV.assert(points[i].ops > points[i - 1].ops, "cost must strictly increase");
    }
  });

  AV.test(GROUP, "series defaults are safe", function () {
    var points = AV.metrics.series("O(n)");
    AV.assert(points.length >= 2, "needs more than one point");
    AV.assert(points[0].n >= 1, "n must stay positive");
    AV.assert(points[points.length - 1].n > points[0].n, "must span a range");
  });

  AV.test(GROUP, "compareExpressions picks the cheaper side", function () {
    var win = AV.metrics.compareExpressions("O(n)", "O(n²)", 1000);
    AV.assertEqual(win.winner, "a");
    var lose = AV.metrics.compareExpressions("O(n²)", "O(n)", 1000);
    AV.assertEqual(lose.winner, "b");
    var tie = AV.metrics.compareExpressions("O(n log n)", "O(n log n)", 512);
    AV.assertEqual(tie.winner, "tie");
    AV.assertEqual(tie.ratio, 1);
  });

  AV.test(GROUP, "estimate reads the worst case by default", function () {
    var bubble = AV.algorithms.get("bubbleSort");
    AV.assertEqual(AV.metrics.estimate(bubble, 100), 10000);
    AV.assertEqual(AV.metrics.estimate(bubble, 100, "best"), 100, "best case is linear");
    var merge = AV.algorithms.get("mergeSort");
    AV.assertEqual(AV.metrics.estimate(merge, 1024), 10240);
  });

  AV.test(GROUP, "rank orders definitions cheapest first", function () {
    var sorted = AV.metrics.rank(AV.algorithms.byCategory("sorting"), 500);
    AV.assertEqual(sorted.length, 6, "six sorting algorithms");
    for (var i = 1; i < sorted.length; i++) {
      AV.assert(sorted[i - 1].ops <= sorted[i].ops, "rank must be ascending at index " + i);
    }
    AV.assertEqual(sorted[0].kind, "nlogn", "the n log n sorts lead on worst case");
    AV.assertEqual(sorted[sorted.length - 1].kind, "n2", "the quadratic sorts trail");
  });

  AV.test(GROUP, "rank attaches a grade", function () {
    var sorted = AV.metrics.rank(AV.algorithms.byCategory("searching"), 1000);
    sorted.forEach(function (row) {
      AV.assert(
        row.grade === "excellent" || row.grade === "good" ||
        row.grade === "moderate" || row.grade === "expensive",
        "grade must be recognised, saw " + row.grade
      );
    });
  });

  AV.test(GROUP, "summarize only shows counters the viz can move", function () {
    var graph = AV.metrics.summarize({ metrics: {} }, AV.algorithms.get("bfs"));
    var graphKeys = graph.map(function (c) { return c.key; });
    AV.assert(graphKeys.indexOf("visited") >= 0, "BFS must show visited");
    AV.assert(graphKeys.indexOf("swaps") < 0, "BFS cannot swap");

    var sort = AV.metrics.summarize({ metrics: {} }, AV.algorithms.get("bubbleSort"));
    var sortKeys = sort.map(function (c) { return c.key; });
    AV.assert(sortKeys.indexOf("comparisons") >= 0);
    AV.assert(sortKeys.indexOf("visited") < 0, "sorting has no frontier");
    AV.assertEqual(sortKeys[0], "steps", "steps leads the panel");
  });

  AV.test(GROUP, "summarize formats live values", function () {
    var chips = AV.metrics.summarize(
      { metrics: { steps: 42, comparisons: 7, swaps: 3 } },
      AV.algorithms.get("bubbleSort")
    );
    var steps = chips[0];
    AV.assertEqual(steps.key, "steps");
    AV.assertEqual(steps.label, "Steps");
    AV.assertEqual(steps.value, 42);
    AV.assert(steps.text.indexOf("42") >= 0, "text should carry the number");
    var comparisons = chips.filter(function (c) { return c.key === "comparisons"; })[0];
    AV.assertEqual(comparisons.value, 7);
    AV.assert(!!comparisons.hint, "every chip explains itself");
  });

  AV.test(GROUP, "missing counters read as zero", function () {
    var chips = AV.metrics.summarize({ metrics: {} }, AV.algorithms.get("mergeSort"));
    chips.forEach(function (c) {
      AV.assertEqual(c.value, 0, c.key + " should default to 0");
      AV.assert(typeof c.text === "string");
    });
  });

  AV.test(GROUP, "verdict rewards the lower counter", function () {
    var out = AV.metrics.verdict({ steps: 10, swaps: 4 }, { steps: 20, swaps: 4 });
    AV.assertEqual(out.winner, "a");
    AV.assertEqual(out.score.a, 1, "only steps differs");
    AV.assertEqual(out.score.b, 0);
    AV.assertEqual(out.differences.length, 1);
    AV.assertEqual(out.differences[0].key, "steps");
    AV.assertEqual(out.differences[0].better, "a");
  });

  AV.test(GROUP, "verdict ties on identical counters", function () {
    var out = AV.metrics.verdict({ steps: 5 }, { steps: 5 });
    AV.assertEqual(out.winner, "tie");
    AV.assertEqual(out.differences.length, 0);
  });

  AV.test(GROUP, "headlineKey skips the step count", function () {
    AV.assertEqual(AV.metrics.headlineKey("graph"), "visited");
    AV.assertEqual(AV.metrics.headlineKey("recursion"), "calls");
    AV.assertEqual(AV.metrics.headlineKey("array"), "comparisons");
  });

  AV.test(GROUP, "counters cover every documented key", function () {
    var keys = AV.metrics.COUNTERS.map(function (c) { return c.key; });
    AV.assert(keys.indexOf("steps") >= 0);
    AV.assert(keys.indexOf("relaxations") >= 0);
    AV.assert(keys.indexOf("maxDepth") >= 0);
    AV.metrics.COUNTERS.forEach(function (c) {
      AV.assert(c.label && c.hint, c.key + " needs a label and a hint");
    });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
