/**
 * Prefix Sum pattern
 * Precomputes cumulative totals so any range sum answers in O(1).
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "prefixSum",
    name: "Prefix Sum",
    category: "patterns",
    viz: "pattern",
    tagline: "Precompute cumulative totals and answer any range sum in constant time.",
    keywords: ["prefix", "cumulative", "range sum", "precompute", "pattern"],
    requiresSorted: false,

    complexity: {
      best: "O(n)",
      average: "O(n)",
      worst: "O(n)",
      space: "O(n)"
    },
    stable: true,
    inPlace: false,

    explanation: {
      what:
        "A prefix sum array P stores the running total of the input: P[i] is the sum of every element from index 0 up to and including i. Once P exists, the sum of any range [l .. r] is just P[r] \u2212 P[l \u2212 1].",
      how:
        "Building P costs one pass over the data. After that, every range query is a subtraction instead of a new loop - turning repeated O(n) queries into O(1) lookups.",
      steps: [
        "Set P[0] equal to A[0].",
        "For each later index, add the current value to the previous total.",
        "P now holds every cumulative sum.",
        "To sum the range [l .. r], subtract P[l \u2212 1] from P[r].",
        "For a range starting at index 0, P[r] alone is the answer."
      ],
      useCases: [
        "Answering many range-sum queries on a static array.",
        "Finding equilibrium indices and running balances.",
        "Subarray-sum problems such as counting subarrays with a given sum."
      ]
    },

    example:
      "A = [3, 1, 4, 2] \u2192 P = [3, 4, 8, 10]. Sum of A[1..3] = P[3] \u2212 P[0] = 10 \u2212 3 = 7.",

    pseudocode: [
      "procedure buildPrefix(A):",
      "    P[0] \u2190 A[0]",
      "    for i \u2190 1 to length(A) \u2212 1:",
      "        P[i] \u2190 P[i \u2212 1] + A[i]",
      "    return P",
      "",
      "function rangeSum(P, l, r):",
      "    if l = 0:  return P[r]",
      "    return P[r] \u2212 P[l \u2212 1]"
    ],

    readyMessage: "Press Play to build the prefix array, then answer a range query.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var i;

      if (n === 0) {
        emit && emit({ type: "result", value: 0, line: 8 });
        return;
      }

      emit && emit({ type: "rowClear", name: "prefix", line: 0 });
      emit && emit({
        type: "message",
        text: "Start the cumulative total at A[0] = " + a[0],
        line: 1
      });
      emit && emit({ type: "row", name: "prefix", index: 0, value: a[0], line: 1 });
      emit && emit({ type: "mark", role: "active", index: 0, line: 1 });

      var running = a[0];

      for (i = 1; i < n; i++) {
        emit && emit({ type: "unmark", role: "active", index: i - 1, line: 2 });
        emit && emit({ type: "mark", role: "active", index: i, line: 2 });
        emit && emit({ type: "compare", indices: [i - 1, i], line: 3 });

        running += a[i];
        emit && emit({
          type: "row",
          name: "prefix",
          index: i,
          value: running,
          line: 3
        });
        emit && emit({
          type: "message",
          text: "P[" + i + "] = P[" + (i - 1) + "] + A[" + i + "] = " +
            (running - a[i]) + " + " + a[i] + " = " + running,
          line: 3
        });
      }

      emit && emit({ type: "unmark", role: "active", index: n - 1, line: 4 });
      emit && emit({
        type: "message",
        text: "The prefix array is complete: [" + prefixPreview(a) + "]",
        line: 4
      });

      // Demonstrate a range query using the built prefix array.
      var l = input.queryStart;
      var r = input.queryEnd;
      if (!Number.isInteger(l)) l = Math.max(0, Math.floor(n / 3));
      if (!Number.isInteger(r)) r = Math.min(n - 1, Math.max(l + 1, Math.floor((2 * n) / 3)));
      if (l < 0) l = 0;
      if (r > n - 1) r = n - 1;
      if (l > r) {
        var swap = l;
        l = r;
        r = swap;
      }

      emit && emit({
        type: "range",
        start: l,
        end: r,
        label: "Query",
        line: 6,
        text: "Query the sum of A[" + l + ".." + r + "]"
      });

      var p = prefixValues(a);
      var total = l === 0 ? p[r] : p[r] - p[l - 1];

      emit && emit({
        type: "message",
        text: l === 0
          ? "P[" + r + "] = " + p[r] + " is the answer"
          : "P[" + r + "] \u2212 P[" + (l - 1) + "] = " + p[r] + " \u2212 " +
            p[l - 1] + " = " + total,
        line: 8
      });
      emit && emit({
        type: "result",
        value: total,
        line: 8,
        text: "Sum of A[" + l + ".." + r + "] = " + total
      });
    }
  });

  function prefixValues(a) {
    var out = [];
    var run = 0;
    for (var i = 0; i < a.length; i++) {
      run += a[i];
      out.push(run);
    }
    return out;
  }

  function prefixPreview(a) {
    return prefixValues(a).join(", ");
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
