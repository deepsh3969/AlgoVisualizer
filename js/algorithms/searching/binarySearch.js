/**
 * Binary Search
 * Repeatedly halves a sorted search interval until the target is found or the
 * interval disappears.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "binarySearch",
    name: "Binary Search",
    category: "searching",
    viz: "search",
    tagline: "Halve the search interval on every comparison over a sorted array.",
    keywords: ["binary", "halve", "logarithmic", "sorted", "midpoint"],
    requiresSorted: true,

    complexity: {
      best: "O(1)",
      average: "O(log n)",
      worst: "O(log n)",
      space: "O(1)"
    },
    stable: false,
    inPlace: true,

    explanation: {
      what:
        "Binary Search requires a sorted array. It compares the target with the middle element and discards the half that cannot possibly contain it.",
      how:
        "Each comparison removes half of the remaining candidates, so a million elements need at most about twenty comparisons instead of a million.",
      steps: [
        "Set the interval to the whole array: lo = 0, hi = n \u2212 1.",
        "While lo is not greater than hi, take the middle index.",
        "If the middle value equals the target, return that index.",
        "If the middle value is too small, discard the left half by moving lo up.",
        "If the middle value is too large, discard the right half by moving hi down.",
        "An empty interval means the target is absent."
      ],
      useCases: [
        "Lookup in sorted datasets such as dictionaries and databases.",
        "Library calls like std::binary_search, Array.prototype based lookups.",
        "Finding boundaries, thresholds or insertion points in sorted ranges."
      ]
    },

    example:
      "Sorted [8, 17, 42, 63, 91], target 63 \u2192 mid = 42 (too small) \u2192 interval [2..4] \u2192 mid = 63 \u2192 found at index 3.",

    pseudocode: [
      "procedure binarySearch(A, target):   // A must be sorted",
      "    lo \u2190 0;   hi \u2190 length(A) \u2212 1",
      "    while lo \u2264 hi:",
      "        mid \u2190 \u230A(lo + hi) / 2\u230B",
      "        if A[mid] = target:  return mid",
      "        else if A[mid] < target:  lo \u2190 mid + 1",
      "        else:  hi \u2190 mid \u2212 1",
      "    return \u22121"
    ],

    readyMessage: "Set a target and press Play to watch the interval halve each step.",

    run: function (input, emit) {
      var a = input.array;
      var target = input.target;
      var n = a.length;
      var lo = 0;
      var hi = n - 1;
      var step = 0;

      if (n === 0) {
        emit && emit({ type: "range", start: null, line: 7 });
        emit && emit({ type: "notFound", line: 7 });
        emit && emit({ type: "result", value: -1, line: 7 });
        return;
      }

      emit && emit({
        type: "range",
        start: lo,
        end: hi,
        label: "Search interval",
        line: 1,
        text: "Start with the full interval [0 .. " + hi + "]"
      });

      while (lo <= hi) {
        var mid = Math.floor((lo + hi) / 2);
        emit && emit({
          type: "message",
          text: "Interval [" + lo + ".." + hi + "] has " + (hi - lo + 1) +
            " candidate(s); the middle index is " + mid,
          line: 3
        });
        emit && emit({ type: "compare", indices: [mid], key: target, line: 4 });
        step += 1;

        if (a[mid] === target) {
          emit && emit({
            type: "found",
            index: mid,
            line: 4,
            text: "a[" + mid + "] = " + a[mid] + " matches the target " + target
          });
          emit && emit({
            type: "message",
            text: "Found after " + step + " " + AV.format.plural(step, "comparison"),
            line: 4
          });
          emit && emit({ type: "result", value: mid, line: 4 });
          return;
        }

        if (a[mid] < target) {
          lo = mid + 1;
          emit && emit({
            type: "range",
            start: lo <= hi ? lo : null,
            end: hi,
            label: "Search interval",
            line: 5,
            text: a[mid] + " is smaller than " + target + ", discard the left half"
          });
        } else {
          hi = mid - 1;
          emit && emit({
            type: "range",
            start: lo <= hi ? lo : null,
            end: hi >= lo ? hi : null,
            label: "Search interval",
            line: 6,
            text: a[mid] + " is larger than " + target + ", discard the right half"
          });
        }

        if (lo > hi) break;
      }

      emit && emit({ type: "range", start: null, line: 7 });
      emit && emit({
        type: "notFound",
        line: 7,
        text: "The interval collapsed after " + step + " " +
          AV.format.plural(step, "comparison") + " - " + target + " is not present"
      });
      emit && emit({ type: "result", value: -1, line: 7 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
