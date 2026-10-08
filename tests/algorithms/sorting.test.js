/**
 * Sorting algorithm tests
 * Verifies correctness across adversarial inputs plus event integrity.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var SORTING_IDS = [
    "bubbleSort",
    "selectionSort",
    "insertionSort",
    "mergeSort",
    "quickSort",
    "heapSort"
  ];

  function sortedCopy(arr) {
    return arr.slice().sort(function (a, b) { return a - b; });
  }

  function runSort(id, input) {
    var def = AV.algorithms.get(id);
    if (!def) throw new Error("Missing algorithm: " + id);
    var data = { array: input.slice() };
    def.run(data, null);
    return data.array;
  }

  function isSorted(arr) {
    for (var i = 1; i < arr.length; i++) {
      if (arr[i - 1] > arr[i]) return false;
    }
    return true;
  }

  var CASES = [
    { name: "empty array", make: function () { return []; } },
    { name: "single element", make: function () { return [7]; } },
    { name: "two elements", make: function () { return [9, 3]; } },
    { name: "already sorted", make: function () { return [1, 2, 3, 4, 5, 6, 7, 8]; } },
    { name: "reverse sorted", make: function () { return [9, 8, 7, 6, 5, 4, 3, 2, 1]; } },
    { name: "all duplicates", make: function () { return [5, 5, 5, 5, 5, 5]; } },
    { name: "two unique values", make: function () { return [1, 0, 1, 0, 1, 0, 1]; } },
    { name: "negatives and zero", make: function () { return [0, -4, 12, -9, 0, 3]; } },
    { name: "random sample", make: function () { return [42, 17, 8, 91, 32, 14, 63, 5]; } },
    {
      name: "larger randomised input",
      make: function () {
        return AV.random.generateArray({ size: 60, min: 0, max: 200, seed: 4242 });
      }
    }
  ];

  AV.testGroup_sorting = true;

  SORTING_IDS.forEach(function (id) {
    AV.test("algorithms/sorting/" + id, "registered with metadata", function () {
      var def = AV.algorithms.get(id);
      AV.assert(def, "algorithm should be registered");
      AV.assert(typeof def.run === "function", "run should be a function");
      AV.assert(Array.isArray(def.pseudocode), "pseudocode should be an array");
      AV.assert(def.pseudocode.length > 0, "pseudocode should not be empty");
      AV.assert(def.complexity.best, "best-case complexity required");
      AV.assert(def.complexity.average, "average-case complexity required");
      AV.assert(def.complexity.worst, "worst-case complexity required");
      AV.assert(def.complexity.space, "space complexity required");
      AV.assert(typeof def.stable === "boolean", "stable flag required");
      AV.assert(typeof def.inPlace === "boolean", "in-place flag required");
      AV.assert(def.explanation && def.explanation.what, "explanation required");
      AV.assert(def.explanation.how, "how-it-works required");
      AV.assert(Array.isArray(def.explanation.steps), "step list required");
      AV.assert(Array.isArray(def.explanation.useCases), "use cases required");
    });

    CASES.forEach(function (c) {
      AV.test("algorithms/sorting/" + id, "sorts " + c.name, function () {
        var input = c.make();
        var expected = sortedCopy(input);
        var output = runSort(id, input);
        AV.assertDeepEqual(output, expected, id + " on " + c.name);
        AV.assert(isSorted(output), "output must be ascending");
      });
    });

    AV.test("algorithms/sorting/" + id, "does not mutate its source array reference", function () {
      var input = [5, 3, 8, 1];
      var copy = input.slice();
      runSort(id, input);
      AV.assertDeepEqual(input, copy, "input object must be untouched");
    });

    AV.test("algorithms/sorting/" + id, "emits a valid, replayable event timeline", function () {
      var input = [9, 4, 7, 2, 8, 3];
      var def = AV.algorithms.get(id);
      var timeline = AV.viz.buildTimeline(def, { array: input });

      AV.assert(timeline.events.length > 0, "should emit at least one event");
      AV.assert(Array.isArray(timeline.checkpoints), "checkpoints should exist");

      timeline.events.forEach(function (ev, i) {
        AV.assert(typeof ev.type === "string", "event " + i + " needs a type");
        AV.assert(
          typeof ev.line === "number" && ev.line >= 0 && ev.line < def.pseudocode.length,
          "event " + i + " line " + ev.line + " must point into pseudocode"
        );
      });

      // Replaying to the end must reproduce the sorted array.
      var state = AV.viz.createState(def, { array: input });
      state.definition = def;
      for (var i = 0; i < timeline.events.length; i++) {
        AV.viz.applyEvent(state, timeline.events[i]);
      }
      AV.assertDeepEqual(state.array, sortedCopy(input), "final replayed state must be sorted");
      AV.assertEqual(state.metrics.comparisons > 0 || input.length < 2, true, "comparisons counted");
      AV.assertEqual(state.metrics.steps, timeline.events.length, "one step per event");
    });

    AV.test("algorithms/sorting/" + id, "supports rewinding through checkpoints", function () {
      var input = AV.random.generateArray({ size: 30, seed: 99, min: 1, max: 50 });
      var def = AV.algorithms.get(id);
      var timeline = AV.viz.buildTimeline(def, { array: input });
      var state = AV.viz.createState(def, { array: input });
      state.definition = definition(def);
      var total = timeline.events.length;

      AV.viz.advance(state, timeline, 0, total);
      AV.assertDeepEqual(state.array, sortedCopy(input), "forward advance sorts");

      AV.viz.advance(state, timeline, total, 0);
      AV.assertDeepEqual(state.array, input, "rewind restores the original array");
      AV.assertEqual(state.metrics.comparisons, 0, "metrics rewind too");

      AV.viz.advance(state, timeline, 0, Math.floor(total / 2));
      var midMetrics = state.metrics.steps;
      AV.assertEqual(midMetrics, Math.floor(total / 2), "midpoint step count");

      AV.viz.advance(state, timeline, Math.floor(total / 2), total);
      AV.assertDeepEqual(state.array, sortedCopy(input), "resume to completion");
    });
  });

  function definition(def) { return def; }

  AV.test("algorithms/sorting", "all sorting algorithms agree on the same input", function () {
    var input = AV.random.generateArray({ size: 40, seed: 7, min: -50, max: 50 });
    var expected = sortedCopy(input);
    SORTING_IDS.forEach(function (id) {
      AV.assertDeepEqual(runSort(id, input), expected, id + " disagrees");
    });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
