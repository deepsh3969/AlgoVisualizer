/**
 * Quick Sort
 * Lomuto partition scheme: pick a pivot, move everything smaller to the left,
 * drop the pivot into the gap, then recurse on both sides.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "quickSort",
    name: "Quick Sort",
    category: "sorting",
    viz: "array",
    tagline: "Partition around a pivot, then recurse on the two sides.",
    keywords: ["quick", "partition", "pivot", "divide and conquer", "in place"],

    complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n\u00B2)",
      space: "O(log n)"
    },
    stable: false,
    inPlace: true,
    adaptive: false,

    explanation: {
      what:
        "Quick Sort chooses a pivot value, partitions the range so every smaller value sits to the left and every larger value to the right, then repeats on each side of the pivot.",
      how:
        "Each partition places exactly one value in its final position. Balanced partitions halve the problem each time (n log n), while badly chosen pivots can degrade to quadratic time.",
      steps: [
        "Choose the last element of the range as the pivot.",
        "Scan the range, growing a region of values that are smaller than the pivot.",
        "Whenever a value is not smaller than the pivot, swap it out of that region.",
        "Place the pivot just after the small-value region - it is now fixed.",
        "Recurse on the left and right partitions."
      ],
      useCases: [
        "General-purpose in-memory sorting in standard libraries.",
        "Partial selection problems such as finding the k-th smallest value.",
        "Systems where cache locality matters more than stability."
      ]
    },

    example:
      "[42, 17, 8] pivot = 8 \u2192 42 > 8 keep, 17 > 8 keep \u2192 swap pivot with index 0 \u2192 [8, 17, 42] \u2192 8 is fixed, recurse on [17, 42] \u2192 sorted.",

    pseudocode: [
      "procedure quickSort(A, lo, hi):",
      "    if lo \u2265 hi: return",
      "    p \u2190 partition(A, lo, hi)",
      "    quickSort(A, lo, p \u2212 1)",
      "    quickSort(A, p + 1, hi)",
      "",
      "procedure partition(A, lo, hi):",
      "    pivot \u2190 A[hi]",
      "    i \u2190 lo \u2212 1",
      "    for j \u2190 lo to hi \u2212 1:",
      "        if A[j] \u2264 pivot:",
      "            i \u2190 i + 1",
      "            swap(A[i], A[j])",
      "    swap(A[i + 1], A[hi])",
      "    return i + 1"
    ],

    readyMessage: "Press Play to partition around pivots and recurse into each side.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var i;

      if (n <= 1) {
        if (n === 1) emit && emit({ type: "mark", role: "sorted", index: 0, line: 1 });
        emit && emit({ type: "result", value: "already sorted", line: 1 });
        return;
      }

      function partition(lo, hi) {
        var pivot = a[hi];
        var border = lo - 1;

        emit && emit({ type: "mark", role: "pivot", index: hi, line: 7 });
        emit && emit({
          type: "range",
          start: lo,
          end: hi,
          label: "Partition [" + lo + ".." + hi + "]",
          line: 7
        });
        emit && emit({ type: "message", text: "Pivot = " + pivot + " at index " + hi, line: 7 });

        for (var j = lo; j < hi; j++) {
          emit && emit({ type: "compare", indices: [j, hi], line: 10 });

          if (a[j] <= pivot) {
            border += 1;
            if (border !== j) {
              emit && emit({
                type: "swap",
                indices: [border, j],
                line: 12,
                text: a[j] + " \u2264 " + pivot + ", move it into the smaller region"
              });
              var t = a[border];
              a[border] = a[j];
              a[j] = t;
            } else {
              emit && emit({
                type: "message",
                text: a[j] + " \u2264 " + pivot + ", it already belongs in the smaller region",
                line: 11
              });
            }
          } else {
            emit && emit({
              type: "message",
              text: a[j] + " > " + pivot + ", leave it in the larger region",
              line: 10
            });
          }
        }

        var pivotSlot = border + 1;
        if (pivotSlot !== hi) {
          emit && emit({ type: "swap", indices: [pivotSlot, hi], line: 13 });
          var t2 = a[pivotSlot];
          a[pivotSlot] = a[hi];
          a[hi] = t2;
        } else {
          emit && emit({ type: "message", text: "The pivot is already in its final slot", line: 13 });
        }

        emit && emit({ type: "unmark", role: "pivot", index: hi, line: 14 });
        emit && emit({ type: "mark", role: "sorted", index: pivotSlot, line: 14 });
        emit && emit({
          type: "message",
          text: "Pivot " + a[pivotSlot] + " is fixed at index " + pivotSlot,
          line: 14
        });
        return pivotSlot;
      }

      function qs(lo, hi) {
        if (lo > hi) return;
        if (lo === hi) {
          emit && emit({ type: "mark", role: "sorted", index: lo, line: 1 });
          return;
        }
        var p = partition(lo, hi);
        qs(lo, p - 1);
        qs(p + 1, hi);
      }

      qs(0, n - 1);

      emit && emit({ type: "range", start: null, label: "", line: 4 });
      var all = [];
      for (i = 0; i < n; i++) all.push(i);
      emit && emit({ type: "mark", role: "sorted", indices: all, line: 4 });
      emit && emit({ type: "result", value: "sorted", line: 4 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
