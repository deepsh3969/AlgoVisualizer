/**
 * Heap Sort
 * Builds a max-heap in place, then repeatedly extracts the maximum.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "heapSort",
    name: "Heap Sort",
    category: "sorting",
    viz: "array",
    tagline: "Build a max-heap, then repeatedly move the largest value to the end.",
    keywords: ["heap", "binary heap", "priority queue", "tree", "in place"],

    complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      space: "O(1)"
    },
    stable: false,
    inPlace: true,
    adaptive: false,

    explanation: {
      what:
        "Heap Sort treats the array as a complete binary tree. It first turns that tree into a max-heap, then swaps the root (the largest value) with the last element and repairs the heap.",
      how:
        "A node at index i has children at 2i + 1 and 2i + 2. Heapifying pushes a too-small node down to the larger of its children, restoring the heap property in O(log n).",
      steps: [
        "Heapify every non-leaf node, starting from the last parent backwards.",
        "Swap the root with the last element of the heap - the maximum lands in place.",
        "Shrink the heap by one and sift the new root down to restore the heap property.",
        "Repeat until only one element remains.",
        "The array is now sorted."
      ],
      useCases: [
        "Guaranteed O(n log n) sorting without extra memory.",
        "Priority queues and scheduler implementations.",
        "When worst-case latency matters more than average speed."
      ]
    },

    example:
      "[42, 17, 8] \u2192 heapify gives [42, 17, 8] \u2192 swap 42 with 8 \u2192 [8, 17, 42] \u2192 sift 8 down, swap 17 with 8 \u2192 [17, 8, 42] \u2192 sorted.",

    pseudocode: [
      "procedure heapSort(A):",
      "    n \u2190 length(A)",
      "    for i \u2190 \u230An / 2\u230B \u2212 1 down to 0:",
      "        heapify(A, n, i)",
      "    for i \u2190 n \u2212 1 down to 1:",
      "        swap(A[0], A[i])",
      "        heapify(A, i, 0)",
      "",
      "procedure heapify(A, size, root):",
      "    largest \u2190 root",
      "    l \u2190 2\u00B7root + 1;   r \u2190 2\u00B7root + 2",
      "    if l < size and A[l] > A[largest]: largest \u2190 l",
      "    if r < size and A[r] > A[largest]: largest \u2190 r",
      "    if largest \u2260 root:",
      "        swap(A[root], A[largest])",
      "        heapify(A, size, largest)"
    ],

    readyMessage: "Press Play to build a max-heap and extract the maximum value repeatedly.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var i;

      if (n <= 1) {
        if (n === 1) emit && emit({ type: "mark", role: "sorted", index: 0, line: 14 });
        emit && emit({ type: "result", value: "already sorted", line: 14 });
        return;
      }

      function heapify(size, root, depth) {
        var largest = root;
        var left = 2 * root + 1;
        var right = 2 * root + 2;

        emit && emit({
          type: "message",
          text: "Sift the value " + a[root] + " at index " + root + " down the heap",
          line: 9
        });

        if (left < size) {
          emit && emit({ type: "compare", indices: [left, largest], line: 11 });
          if (a[left] > a[largest]) largest = left;
        }
        if (right < size) {
          emit && emit({ type: "compare", indices: [right, largest], line: 12 });
          if (a[right] > a[largest]) largest = right;
        }

        if (largest !== root) {
          emit && emit({
            type: "swap",
            indices: [root, largest],
            line: 14,
            text: a[root] + " is smaller than " + a[largest] + ", swap them down the heap"
          });
          var t = a[root];
          a[root] = a[largest];
          a[largest] = t;
          heapify(size, largest, depth + 1);
        } else {
          emit && emit({ type: "message", text: "The heap property holds at index " + root, line: 13 });
        }
      }

      var lastParent = Math.floor(n / 2) - 1;
      emit && emit({ type: "range", start: 0, end: n - 1, label: "Heap", line: 2 });

      for (i = lastParent; i >= 0; i--) {
        emit && emit({ type: "mark", role: "active", index: i, line: 3 });
        heapify(n, i, 0);
        emit && emit({ type: "unmark", role: "active", index: i, line: 3 });
      }

      emit && emit({ type: "message", text: "The max-heap is built, start extracting", line: 5 });

      for (i = n - 1; i > 0; i--) {
        emit && emit({
          type: "swap",
          indices: [0, i],
          line: 5,
          text: "Move the maximum " + a[0] + " to its final slot at index " + i
        });
        var t2 = a[0];
        a[0] = a[i];
        a[i] = t2;

        emit && emit({ type: "mark", role: "sorted", index: i, line: 5 });
        emit && emit({ type: "range", start: 0, end: i - 1, label: "Heap", line: 5 });

        if (i > 1) heapify(i, 0, 0);
      }

      emit && emit({ type: "range", start: null, label: "", line: 6 });
      var all = [];
      for (i = 0; i < n; i++) all.push(i);
      emit && emit({ type: "mark", role: "sorted", indices: all, line: 6 });
      emit && emit({ type: "result", value: "sorted", line: 6 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
