/**
 * Selection Sort
 * Selects the minimum of the unsorted region and swaps it into place.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "selectionSort",
    name: "Selection Sort",
    category: "sorting",
    viz: "array",
    tagline: "Find the smallest remaining value and lock it into its final slot.",
    keywords: ["selection", "minimum", "in-place", "swap"],

    complexity: {
      best: "O(n\u00B2)",
      average: "O(n\u00B2)",
      worst: "O(n\u00B2)",
      space: "O(1)"
    },
    stable: false,
    inPlace: true,
    adaptive: false,

    explanation: {
      what:
        "Selection Sort divides the array into a sorted left region and an unsorted right region. On every pass it scans the unsorted region, finds the smallest value and swaps it to the boundary.",
      how:
        "One scan of the remaining elements per pass always costs n - i comparisons, so the total work is quadratic regardless of the input - but it performs at most n - 1 swaps.",
      steps: [
        "Assume the current index holds the minimum.",
        "Scan every remaining element and update the minimum index whenever a smaller value appears.",
        "Swap the confirmed minimum into the current index.",
        "Move the boundary one position right and repeat.",
        "The left region is fully sorted once the boundary reaches the end."
      ],
      useCases: [
        "Minimising writes when memory writes are expensive.",
        "Small fixed-size arrays embedded in firmware.",
        "A clear demonstration of in-place, non-adaptive sorting."
      ]
    },

    example:
      "Start [42, 17, 8] \u2192 smallest is 8 at index 2 \u2192 swap with index 0 \u2192 [8, 17, 42] \u2192 remaining [17, 42] already ordered \u2192 sorted.",

    pseudocode: [
      "procedure selectionSort(A):",
      "    n \u2190 length(A)",
      "    for i \u2190 0 to n \u2212 1:",
      "        min \u2190 i",
      "        for j \u2190 i + 1 to n \u2212 1:",
      "            if A[j] < A[min]:",
      "                min \u2190 j",
      "        if min \u2260 i:",
      "            swap(A[i], A[min])"
    ],

    readyMessage: "Press Play to watch the minimum of each region get locked into place.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var i;
      var j;

      if (n <= 1) {
        if (n === 1) emit && emit({ type: "mark", role: "sorted", index: 0, line: 8 });
        emit && emit({ type: "result", value: "already sorted", line: 8 });
        return;
      }

      for (i = 0; i < n - 1; i++) {
        var min = i;
        emit && emit({ type: "mark", role: "candidate", index: min, line: 3 });
        emit && emit({ type: "mark", role: "active", index: i, line: 2 });

        for (j = i + 1; j < n; j++) {
          emit && emit({ type: "compare", indices: [j, min], line: 5 });
          if (a[j] < a[min]) {
            var previous = min;
            min = j;
            emit && emit({ type: "unmark", role: "candidate", index: previous, line: 6 });
            emit && emit({ type: "mark", role: "candidate", index: min, line: 6 });
            emit && emit({ type: "message", text: "A smaller value was found, so the minimum moves", line: 6 });
          }
        }

        emit && emit({ type: "unmark", role: "active", index: i, line: 7 });

        if (min !== i) {
          emit && emit({ type: "compare", indices: [i, min], line: 7 });
          emit && emit({ type: "swap", indices: [i, min], line: 8 });
          var t = a[i];
          a[i] = a[min];
          a[min] = t;
        } else {
          emit && emit({ type: "message", text: "The minimum is already in place, no swap needed", line: 7 });
        }

        emit && emit({ type: "unmark", role: "candidate", index: min, line: 8 });
        emit && emit({ type: "mark", role: "sorted", index: i, line: 8 });
      }

      emit && emit({ type: "mark", role: "sorted", index: n - 1, line: 8 });
      emit && emit({ type: "result", value: "sorted", line: 8 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
