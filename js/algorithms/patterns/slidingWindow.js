/**
 * Sliding Window pattern
 * Maintains a fixed-size window over an array and updates its sum in O(1)
 * as the window advances.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "slidingWindow",
    name: "Sliding Window",
    category: "patterns",
    viz: "pattern",
    tagline: "Slide a fixed window across the array, updating the sum in constant time.",
    keywords: ["sliding window", "subarray", "window sum", "subarray sum", "pattern"],
    requiresSorted: false,

    complexity: {
      best: "O(n)",
      average: "O(n)",
      worst: "O(n)",
      space: "O(1)"
    },
    stable: false,
    inPlace: true,

    explanation: {
      what:
        "The sliding window pattern keeps a contiguous window of fixed size and tracks a running aggregate (here, the sum). When the window moves one step, one value leaves and one enters, so the aggregate is updated with a single subtraction and addition.",
      how:
        "Recomputing each window from scratch would cost O(n \u00B7 k). Sliding the window reuses the previous total, turning the whole scan into a single O(n) pass.",
      steps: [
        "Compute the sum of the first k elements once.",
        "Record it as the best sum seen so far.",
        "Slide the window one position to the right.",
        "Subtract the value that left the window and add the value that entered.",
        "If the new sum beats the record, remember it.",
        "Repeat until the window reaches the end of the array."
      ],
      useCases: [
        "Maximum or minimum sum of any subarray of fixed length.",
        "Longest subarray satisfying a constraint (variable-size window).",
        "Finding averages of consecutive groups in time-series data."
      ]
    },

    example:
      "[1, 4, 2, 10, 3], k = 2 \u2192 windows 1+4 = 5, 4+2 = 6, 2+10 = 12, 10+3 = 13 \u2192 best = 13.",

    pseudocode: [
      "procedure maxWindowSum(A, k):",
      "    windowSum \u2190 sum(A[0 .. k \u2212 1])",
      "    best \u2190 windowSum;  bestEnd \u2190 k \u2212 1",
      "    for i \u2190 k to length(A) \u2212 1:",
      "        windowSum \u2190 windowSum \u2212 A[i \u2212 k] + A[i]",
      "        if windowSum > best:",
      "            best \u2190 windowSum;  bestEnd \u2190 i",
      "    return best"
    ],

    readyMessage: "Press Play to slide the window and track the running sum.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var k = input.window;

      k = Math.floor(Number(k));
      if (!isFinite(k) || k < 1) k = 1;
      if (k > n) k = n;

      if (n === 0 || k === 0) {
        emit && emit({ type: "result", value: 0, line: 7 });
        return;
      }

      var i;
      var j;
      var windowSum = 0;
      var best = -Infinity;
      var bestEnd = k - 1;

      for (i = 0; i < k; i++) windowSum += a[i];

      best = windowSum;

      emit && emit({
        type: "range",
        start: 0,
        end: k - 1,
        label: "Window of " + k,
        line: 1
      });
      emit && emit({
        type: "message",
        text: "Initial window [0.." + (k - 1) + "] sums to " + windowSum,
        line: 1
      });

      var bestMarks = [];
      for (j = 0; j < k; j++) bestMarks.push(j);
      emit && emit({ type: "mark", role: "candidate", indices: bestMarks, line: 2 });
      emit && emit({
        type: "pointer",
        name: "best",
        index: k - 1,
        line: 2
      });

      for (i = k; i < n; i++) {
        emit && emit({
          type: "range",
          start: i - k + 1,
          end: i,
          label: "Window of " + k,
          line: 4
        });

        var leaving = a[i - k];
        var entering = a[i];
        emit && emit({ type: "compare", indices: [i - k, i], line: 4 });

        windowSum = windowSum - leaving + entering;
        emit && emit({
          type: "message",
          text: "Drop " + leaving + ", add " + entering + " \u2192 window sum = " + windowSum,
          line: 4
        });

        if (windowSum > best) {
          best = windowSum;
          bestEnd = i;
          var marks = [];
          for (j = i - k + 1; j <= i; j++) marks.push(j);
          emit && emit({ type: "unmark", role: "candidate", line: 6 });
          emit && emit({ type: "mark", role: "candidate", indices: marks, line: 6 });
          emit && emit({ type: "pointer", name: "best", index: i, line: 6 });
          emit && emit({
            type: "message",
            text: "New best window sum: " + best + " over [" + (i - k + 1) + ".." + i + "]",
            line: 6
          });
        }
      }

      emit && emit({
        type: "range",
        start: bestEnd - k + 1,
        end: bestEnd,
        label: "Best window",
        line: 7
      });
      emit && emit({
        type: "result",
        value: best,
        line: 7,
        text: "Maximum sum of any " + k + "-element window is " + best
      });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
