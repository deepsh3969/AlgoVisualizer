/**
 * Linear Search
 * Checks every element in order until the target is found or the list ends.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "linearSearch",
    name: "Linear Search",
    category: "searching",
    viz: "search",
    tagline: "Check each element in order until the target shows up.",
    keywords: ["linear", "sequential", "scan", "unsorted", "brute force"],
    requiresSorted: false,

    complexity: {
      best: "O(1)",
      average: "O(n)",
      worst: "O(n)",
      space: "O(1)"
    },
    stable: false,
    inPlace: true,

    explanation: {
      what:
        "Linear Search walks the array from left to right, comparing each value with the target. It stops the moment it finds a match or runs out of elements.",
      how:
        "Because the values are never inspected in any particular order, no pre-processing is required - but in the worst case every single element has to be checked.",
      steps: [
        "Start at index 0.",
        "Compare the current value with the target.",
        "If they match, return the current index.",
        "Otherwise move one index to the right and repeat.",
        "If the end of the array is reached, the target is not present."
      ],
      useCases: [
        "Searching unsorted or very small collections.",
        "Looking up a value in a linked list, where random access is impossible.",
        "A first pass before deciding whether sorting is worth it."
      ]
    },

    example:
      "Array [42, 17, 8, 91], target 91 \u2192 check 42 (no), 17 (no), 8 (no), 91 (match at index 3).",

    pseudocode: [
      "procedure linearSearch(A, target):",
      "    for i \u2190 0 to length(A) \u2212 1:",
      "        if A[i] = target:",
      "            return i",
      "    return \u22121"
    ],

    readyMessage: "Set a target and press Play to scan the array from left to right.",

    run: function (input, emit) {
      var a = input.array;
      var target = input.target;
      var n = a.length;
      var i;

      if (n === 0) {
        emit && emit({ type: "notFound", line: 4 });
        emit && emit({ type: "result", value: -1, line: 4 });
        return;
      }

      for (i = 0; i < n; i++) {
        emit && emit({ type: "compare", indices: [i], key: target, line: 2 });

        if (a[i] === target) {
          emit && emit({
            type: "found",
            index: i,
            line: 3,
            text: "Match found: a[" + i + "] = " + a[i] + " equals the target " + target
          });
          emit && emit({ type: "result", value: i, line: 3 });
          return;
        }

        emit && emit({ type: "mark", role: "muted", index: i, line: 2 });
        emit && emit({
          type: "message",
          text: a[i] + " is not " + target + ", move to index " + (i + 1),
          line: 2
        });
      }

      emit && emit({
        type: "notFound",
        line: 4,
        text: "Every element was checked and " + target + " is not in the array"
      });
      emit && emit({ type: "result", value: -1, line: 4 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
