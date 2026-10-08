/**
 * Two Pointer pattern
 * Walks two ends of a sorted array towards each other to find a pair whose
 * values sum to a target.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "twoPointer",
    name: "Two Pointer",
    category: "patterns",
    viz: "pattern",
    tagline: "Advance two ends of a sorted array towards each other in linear time.",
    keywords: ["two pointer", "pair sum", "sorted", "converge", "pattern"],
    requiresSorted: true,

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
        "The two pointer technique keeps a left index at the start and a right index at the end of a sorted array, moving one of them inwards depending on how the current sum compares with the target.",
      how:
        "Because the array is sorted, increasing the left pointer always raises the sum and decreasing the right pointer always lowers it - so exactly one of the two directions can possibly help. Every step discards a whole set of impossible pairs.",
      steps: [
        "Place one pointer at index 0 and one at the last index.",
        "Add the two values under the pointers.",
        "If the sum equals the target, the pair has been found.",
        "If the sum is too small, move the left pointer right to increase it.",
        "If the sum is too large, move the right pointer left to decrease it.",
        "Stop when the pointers meet - no pair exists."
      ],
      useCases: [
        "Finding a pair with a given sum in a sorted array.",
        "Removing duplicates from a sorted array in place.",
        "Checking whether a string or array is a palindrome."
      ]
    },

    example:
      "Sorted [2, 7, 11, 15], target 18 \u2192 2 + 15 = 17 (too small) \u2192 move left \u2192 7 + 15 = 22 (too big) \u2192 move right \u2192 7 + 11 = 18 \u2192 pair (1, 2).",

    pseudocode: [
      "procedure twoPointerPair(A, target):   // A sorted ascending",
      "    lo \u2190 0;   hi \u2190 length(A) \u2212 1",
      "    while lo < hi:",
      "        s \u2190 A[lo] + A[hi]",
      "        if s = target:  return (lo, hi)",
      "        else if s < target:  lo \u2190 lo + 1",
      "        else:  hi \u2190 hi \u2212 1",
      "    return no pair found"
    ],

    readyMessage: "Press Play to converge both pointers on a matching pair.",

    run: function (input, emit) {
      var a = input.array;
      var target = input.target;
      var n = a.length;
      var lo = 0;
      var hi = n - 1;

      if (n < 2) {
        emit && emit({ type: "notFound", line: 7 });
        emit && emit({ type: "result", value: "no pair", line: 7 });
        return;
      }

      emit && emit({ type: "pointer", name: "left", index: lo, line: 1 });
      emit && emit({ type: "pointer", name: "right", index: hi, line: 1 });

      while (lo < hi) {
        emit && emit({ type: "compare", indices: [lo, hi], line: 3 });
        var sum = a[lo] + a[hi];

        if (sum === target) {
          emit && emit({
            type: "message",
            text: a[lo] + " + " + a[hi] + " = " + sum + ", the pair matches the target",
            line: 4
          });
          emit && emit({
            type: "found",
            index: lo,
            line: 4,
            text: "Pair found at indices " + lo + " and " + hi
          });
          emit && emit({ type: "mark", role: "found", indices: [lo, hi], line: 4 });
          emit && emit({ type: "result", value: "(" + lo + ", " + hi + ")", line: 4 });
          return;
        }

        if (sum < target) {
          emit && emit({
            type: "message",
            text: a[lo] + " + " + a[hi] + " = " + sum + " is less than " + target +
              ", move the left pointer right",
            line: 5
          });
          lo += 1;
          emit && emit({ type: "pointer", name: "left", index: lo, line: 5 });
        } else {
          emit && emit({
            type: "message",
            text: a[lo] + " + " + a[hi] + " = " + sum + " is greater than " + target +
              ", move the right pointer left",
            line: 6
          });
          hi -= 1;
          emit && emit({ type: "pointer", name: "right", index: hi, line: 6 });
        }
      }

      emit && emit({ type: "pointer", name: "left", index: null, line: 7 });
      emit && emit({ type: "pointer", name: "right", index: null, line: 7 });
      emit && emit({
        type: "notFound",
        line: 7,
        text: "The pointers met - no pair adds up to " + target
      });
      emit && emit({ type: "result", value: "no pair", line: 7 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
