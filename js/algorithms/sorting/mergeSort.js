/**
 * Merge Sort
 * Top-down divide and conquer: split the array in half, sort each half
 * recursively, then merge the two sorted runs back together.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "mergeSort",
    name: "Merge Sort",
    category: "sorting",
    viz: "array",
    tagline: "Split the array in half, sort each half, then merge the sorted runs.",
    keywords: ["merge", "divide", "conquer", "stable", "divide and conquer"],

    complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      space: "O(n)"
    },
    stable: true,
    inPlace: false,
    adaptive: false,

    explanation: {
      what:
        "Merge Sort splits the array down to single elements, then repeatedly merges pairs of sorted runs into larger sorted runs until one sorted run remains.",
      how:
        "Dividing halves the problem log n times, and every level of merging touches all n elements once - so the total work is always n log n, no matter how ordered the input is.",
      steps: [
        "Split the current range at its midpoint.",
        "Recurse on the left half, then the right half.",
        "Merge the two sorted halves by repeatedly taking the smaller front value.",
        "Copy any leftovers from whichever half still has elements.",
        "The merged range is now sorted."
      ],
      useCases: [
        "External sorting of files too large to fit in memory.",
        "Sorting linked lists with O(1) extra space.",
        "The stable merge step inside Timsort and built-in library sorts."
      ]
    },

    example:
      "[42, 17, 8] \u2192 split [42] and [17, 8] \u2192 split [17] and [8] \u2192 merge 17, 8 \u2192 [8, 17] \u2192 merge 42 with [8, 17] \u2192 [8, 17, 42].",

    pseudocode: [
      "procedure mergeSort(A, lo, hi):",
      "    if lo \u2265 hi: return",
      "    mid \u2190 \u230A(lo + hi) / 2\u230B",
      "    mergeSort(A, lo, mid)",
      "    mergeSort(A, mid + 1, hi)",
      "    merge(A, lo, mid, hi)",
      "",
      "procedure merge(A, lo, mid, hi):",
      "    L \u2190 A[lo .. mid];  R \u2190 A[mid + 1 .. hi]",
      "    i \u2190 lo;  j \u2190 mid + 1;  k \u2190 lo",
      "    while i \u2264 mid and j \u2264 hi:",
      "        if L[i] \u2264 R[j]:  A[k] \u2190 L[i];  i \u2190 i + 1",
      "        else:              A[k] \u2190 R[j];  j \u2190 j + 1",
      "        k \u2190 k + 1",
      "    copy any remaining elements of L and R into A"
    ],

    readyMessage: "Press Play to divide the array and merge sorted runs back together.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var i;

      if (n <= 1) {
        if (n === 1) emit && emit({ type: "mark", role: "sorted", index: 0, line: 1 });
        emit && emit({ type: "result", value: "already sorted", line: 1 });
        return;
      }

      function indices(lo, hi) {
        var out = [];
        for (var k = lo; k <= hi; k++) out.push(k);
        return out;
      }

      function msort(lo, hi) {
        if (lo >= hi) return;
        var mid = Math.floor((lo + hi) / 2);

        emit && emit({
          type: "range",
          start: lo,
          end: hi,
          label: "Split [" + lo + ".." + hi + "]",
          line: 2
        });
        emit && emit({
          type: "message",
          text: "Split the range [" + lo + ".." + hi + "] at index " + mid,
          line: 2
        });

        msort(lo, mid);
        msort(mid + 1, hi);
        merge(lo, mid, hi);
      }

      function merge(lo, mid, hi) {
        emit && emit({ type: "range", start: lo, end: hi, label: "Merging", line: 7 });
        emit && emit({ type: "unmark", role: "sorted", indices: indices(lo, hi), line: 7 });

        var buffer = [];
        var l = lo;
        var r = mid + 1;

        while (l <= mid && r <= hi) {
          emit && emit({ type: "compare", indices: [l, r], line: 11 });
          if (a[l] <= a[r]) {
            buffer.push(a[l]);
            emit && emit({
              type: "message",
              text: a[l] + " \u2264 " + a[r] + ", take the left value",
              line: 11
            });
            l += 1;
          } else {
            buffer.push(a[r]);
            emit && emit({
              type: "message",
              text: a[r] + " < " + a[l] + ", take the right value",
              line: 12
            });
            r += 1;
          }
          emit && emit({ type: "pointer", name: "left", index: l <= mid ? l : null, line: 13 });
          emit && emit({ type: "pointer", name: "right", index: r <= hi ? r : null, line: 13 });
        }

        while (l <= mid) {
          buffer.push(a[l]);
          emit && emit({
            type: "message",
            text: "Right run is empty, copy a[" + l + "] = " + a[l] + " from the left run",
            line: 14
          });
          l += 1;
        }
        while (r <= hi) {
          buffer.push(a[r]);
          emit && emit({
            type: "message",
            text: "Left run is empty, copy a[" + r + "] = " + a[r] + " from the right run",
            line: 14
          });
          r += 1;
        }

        for (var k = lo; k <= hi; k++) {
          var value = buffer[k - lo];
          emit && emit({
            type: "write",
            index: k,
            value: value,
            line: 14,
            text: "Write merged value " + value + " into a[" + k + "]"
          });
          a[k] = value;
        }

        emit && emit({ type: "mark", role: "sorted", indices: indices(lo, hi), line: 14 });
        emit && emit({ type: "pointer", name: "left", index: null, line: 14 });
        emit && emit({ type: "pointer", name: "right", index: null, line: 14 });
        emit && emit({
          type: "message",
          text: "Range [" + lo + ".." + hi + "] is now sorted",
          line: 14
        });
      }

      emit && emit({ type: "range", start: 0, end: n - 1, label: "Whole array", line: 0 });
      msort(0, n - 1);

      var all = [];
      for (i = 0; i < n; i++) all.push(i);
      emit && emit({ type: "mark", role: "sorted", indices: all, line: 5 });
      emit && emit({ type: "range", start: null, label: "", line: 5 });
      emit && emit({ type: "result", value: "sorted", line: 5 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
