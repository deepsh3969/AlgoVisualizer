/**
 * Formatting utility tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var F = AV.format;
  var GROUP = "utilities/format";

  AV.test(GROUP, "duration compacts milliseconds", function () {
    AV.assertEqual(F.duration(842), "842ms");
    AV.assertEqual(F.duration(0), "0ms");
    AV.assertEqual(F.duration(999), "999ms");
    AV.assertEqual(F.duration(1420), "1.42s");
    AV.assertEqual(F.duration(59999), "60.00s");
    AV.assertEqual(F.duration(123000), "2m 03s");
    AV.assertEqual(F.duration(-5), "0ms", "negative time is clamped");
    AV.assertEqual(F.duration(Infinity), "0ms", "non-finite time is clamped");
  });

  AV.test(GROUP, "durationPrecise keeps sub-millisecond detail", function () {
    AV.assertEqual(F.durationPrecise(0.25), "0.250 ms");
    AV.assertEqual(F.durationPrecise(12.5), "12.50 ms");
    AV.assertEqual(F.durationPrecise(1500), "1.500 s");
    AV.assertEqual(F.durationPrecise(-1), "0.00 ms");
  });

  AV.test(GROUP, "count rounds to a plain string", function () {
    AV.assertEqual(F.count(42), "42");
    AV.assertEqual(F.count(42.6), "43");
    AV.assertEqual(F.count("17"), "17");
    AV.assertEqual(F.count(NaN), "0");
    AV.assertEqual(F.count(Infinity), "0");
    AV.assertEqual(F.count(undefined), "0");
  });

  AV.test(GROUP, "percent clamps into range", function () {
    AV.assertEqual(F.percent(1, 3), 33.3);
    AV.assertEqual(F.percent(0, 10), 0);
    AV.assertEqual(F.percent(5, 0), 0, "no total means no percentage");
    AV.assertEqual(F.percent(200, 100), 100, "clamped high");
    AV.assertEqual(F.percent(-5, 10), 0, "clamped low");
    AV.assertEqual(F.percent(3, 4), 75);
  });

  AV.test(GROUP, "plural picks the right form", function () {
    AV.assertEqual(F.plural(1, "step"), "step");
    AV.assertEqual(F.plural(0, "step"), "steps");
    AV.assertEqual(F.plural(2, "step"), "steps");
    AV.assertEqual(F.plural(2, "child", "children"), "children");
  });

  AV.test(GROUP, "list joins with a conjunction", function () {
    AV.assertEqual(F.list([]), "");
    AV.assertEqual(F.list(null), "");
    AV.assertEqual(F.list(["a"]), "a");
    AV.assertEqual(F.list(["a", "b"]), "a and b");
    AV.assertEqual(F.list(["a", "b", "c"]), "a, b, and c");
    AV.assertEqual(F.list(["a", "b"], "or"), "a or b");
    AV.assertEqual(F.list([1, 2], "and"), "1 and 2", "items are stringified");
  });

  AV.test(GROUP, "relativeTime lands in the right bucket", function () {
    var now = Date.now();
    AV.assertEqual(F.relativeTime(now - 5000), "just now");
    AV.assertEqual(F.relativeTime(now - 120000), "2m ago");
    AV.assertEqual(F.relativeTime(now - 7200000), "2h ago");
    AV.assertEqual(F.relativeTime(now - 172800000), "2d ago");
    AV.assertEqual(F.relativeTime(now - 86400000 * 100), "3mo ago");
    AV.assertEqual(F.relativeTime(NaN), "", "a bad timestamp reads as empty");
  });

  AV.test(GROUP, "clockTime and dateTime produce display strings", function () {
    var stamp = Date.UTC(2026, 0, 15, 14, 30, 0);
    AV.assert(/^\d{2}:\d{2}$/.test(F.clockTime(stamp)), "HH:MM expected");
    AV.assert(/^[A-Z][a-z]{2} \d{1,2}, \d{4} \d{2}:\d{2}$/.test(F.dateTime(stamp)),
      "MMM D, YYYY HH:MM expected");
    AV.assertEqual(F.clockTime(NaN), "");
    AV.assertEqual(F.dateTime(NaN), "");
  });

  AV.test(GROUP, "complexityGrade grades constant and logarithmic as excellent", function () {
    AV.assertEqual(F.complexityGrade("O(1)"), "excellent");
    AV.assertEqual(F.complexityGrade("O(log n)"), "excellent");
    AV.assertEqual(F.complexityGrade("O(log₂ n)"), "excellent");
    AV.assertEqual(F.complexityGrade("O(1) read"), "excellent", "annotated constant");
  });

  AV.test(GROUP, "complexityGrade grades linear forms as good", function () {
    AV.assertEqual(F.complexityGrade("O(n)"), "good");
    AV.assertEqual(F.complexityGrade("O(n log n)"), "good");
    AV.assertEqual(F.complexityGrade("O(n) read"), "good", "annotated linear");
    AV.assertEqual(F.complexityGrade("O(n) skewed"), "good", "annotated worst case");
    AV.assertEqual(F.complexityGrade("O(V + E)"), "good", "graph linear");
    AV.assertEqual(F.complexityGrade("O(V)"), "good", "graph node count");
    AV.assertEqual(F.complexityGrade("O((V + E) log V)"), "good", "graph linearithmic");
  });

  AV.test(GROUP, "complexityGrade grades superlinear work as expensive", function () {
    AV.assertEqual(F.complexityGrade("O(n²)"), "expensive");
    AV.assertEqual(F.complexityGrade("O(n^2)"), "expensive");
    AV.assertEqual(F.complexityGrade("O(n³)"), "expensive");
    AV.assertEqual(F.complexityGrade("O(2^n)"), "expensive");
    AV.assertEqual(F.complexityGrade("O(n!)"), "expensive");
  });

  AV.test(GROUP, "complexityGrade is total over the catalog", function () {
    var known = ["excellent", "good", "moderate", "expensive"];
    AV.algorithms.all().concat(AV.structures.all()).forEach(function (def) {
      var c = def.complexity || {};
      ["best", "average", "worst", "space"].forEach(function (field) {
        if (!c[field]) return;
        var grade = F.complexityGrade(c[field]);
        AV.assert(
          known.indexOf(grade) >= 0,
          def.id + "." + field + " (" + c[field] + ") graded " + grade
        );
      });
    });
    AV.assertEqual(F.complexityGrade(""), "unknown");
    AV.assertEqual(F.complexityGrade(null), "unknown");
  });

  AV.test(GROUP, "gradeLabel and gradeWeight agree", function () {
    AV.assertEqual(F.gradeLabel("excellent"), "Excellent");
    AV.assertEqual(F.gradeLabel("good"), "Good");
    AV.assertEqual(F.gradeLabel("moderate"), "Moderate");
    AV.assertEqual(F.gradeLabel("expensive"), "Expensive");
    AV.assertEqual(F.gradeLabel("nope"), "Unknown", "unrecognised grades fall back");
    AV.assert(F.gradeWeight("excellent") < F.gradeWeight("good"));
    AV.assert(F.gradeWeight("good") < F.gradeWeight("moderate"));
    AV.assert(F.gradeWeight("moderate") < F.gradeWeight("expensive"));
    AV.assert(F.gradeWeight("nope") > 0, "unknown still has a weight");
  });

  AV.test(GROUP, "arrayPreview truncates long inputs", function () {
    AV.assertEqual(F.arrayPreview([]), "[]");
    AV.assertEqual(F.arrayPreview([42, 17, 8]), "[42, 17, 8]");
    AV.assertEqual(F.arrayPreview("nope"), "[]", "non-arrays read as empty");

    var long = [];
    for (var i = 0; i < 20; i++) long.push(i);
    var preview = F.arrayPreview(long);
    AV.assert(preview.indexOf("\u2026") >= 0, "long input must elide");
    AV.assert(preview.split(",").length <= 14, "preview stays short");
    AV.assertEqual(F.arrayPreview(long, 3), "[0, 1, 2, \u2026]", "custom limit respected");
  });

  AV.test(GROUP, "clamp keeps a value inside bounds", function () {
    AV.assertEqual(F.clamp(5, 1, 3), 3);
    AV.assertEqual(F.clamp(-5, 0, 10), 0);
    AV.assertEqual(F.clamp(7, 0, 10), 7);
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
