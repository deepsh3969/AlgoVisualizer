/**
 * Bubble Sort
 * Repeatedly walks the array swapping adjacent out-of-order pairs until a
 * full pass completes with no swaps.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "bubbleSort",
    name: "Bubble Sort",
    category: "sorting",
    viz: "array",
    tagline: "Adjacent swaps bubble the largest value to the end on every pass.",
    keywords: ["bubble", "swap", "adjacent", "pass", "stable", "simple"],

    complexity: {
      best: "O(n)",
      average: "O(n\u00B2)",
      worst: "O(n\u00B2)",
      space: "O(1)"
    },
    stable: true,
    inPlace: true,
    adaptive: true,

    explanation: {
      what:
        "Bubble Sort repeatedly steps through the list, compares each pair of neighbouring values and swaps them when they are in the wrong order. The pass is repeated until no swaps are needed.",
      how:
        "Every full pass guarantees that the largest remaining value has 'bubbled' up to its final position at the end of the unsorted region, so each pass can ignore one more element at the right.",
      steps: [
        "Walk from the start of the unsorted region and compare each adjacent pair.",
        "If the left value is greater than the right value, swap them and remember that a swap occurred.",
        "After a full pass the largest remaining value is in its final position.",
        "Shrink the unsorted region by one and repeat.",
        "Stop early when a complete pass produces no swaps."
      ],
      useCases: [
        "Teaching the fundamentals of comparison-based sorting.",
        "Detecting an already-sorted array in linear time (with the early-exit check).",
        "Tiny datasets where code simplicity beats speed."
      ]
    },

    example:
      "Start [42, 17, 8] \u2192 pass 1: 42 > 17 so swap \u2192 [17, 42, 8] \u2192 42 > 8 so swap \u2192 [17, 8, 42] \u2192 42 is fixed. Pass 2: 17 > 8 so swap \u2192 [8, 17, 42] \u2192 sorted.",

    pseudocode: [
      "procedure bubbleSort(A):",
      "    n \u2190 length(A)",
      "    repeat",
      "        swapped \u2190 false",
      "        for i \u2190 0 to n \u2212 2:",
      "            if A[i] > A[i + 1]:",
      "                swap(A[i], A[i + 1])",
      "                swapped \u2190 true",
      "        n \u2190 n \u2212 1",
      "    until swapped = false"
    ],

    readyMessage: "Press Play to bubble the largest values to the end, one pass at a time.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var i;
      var j;

      if (n <= 1) {
        if (n === 1) {
          emit && emit({ type: "mark", role: "sorted", index: 0, line: 9 });
        }
        emit && emit({ type: "result", value: "already sorted", line: 9 });
        return;
      }

      var end = n;
      var swapped = true;

      while (swapped) {
        swapped = false;
        emit && emit({ type: "message", text: "Start a new pass over the unsorted region", line: 3 });

        for (i = 0; i < end - 1; i++) {
          emit && emit({ type: "compare", indices: [i, i + 1], line: 5 });

          if (a[i] > a[i + 1]) {
            emit && emit({ type: "swap", indices: [i, i + 1], line: 6 });
            var t = a[i];
            a[i] = a[i + 1];
            a[i + 1] = t;
            swapped = true;
            emit && emit({ type: "message", text: "Left value is larger, so the pair is out of order", line: 7 });
          }
        }

        end -= 1;
        emit && emit({ type: "mark", role: "sorted", index: end, line: 8 });

        if (!swapped) {
          var fixed = [];
          for (j = 0; j < end; j++) fixed.push(j);
          emit && emit({ type: "mark", role: "sorted", indices: fixed, line: 9 });
          break;
        }
      }

      var all = [];
      for (i = 0; i < n; i++) all.push(i);
      emit && emit({ type: "mark", role: "sorted", indices: all, line: 9 });
      emit && emit({ type: "result", value: "sorted", line: 9 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
