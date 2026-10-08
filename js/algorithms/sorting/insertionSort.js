/**
 * Insertion Sort
 * Builds a sorted prefix by taking the next value and sliding it backwards
 * into its correct position.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "insertionSort",
    name: "Insertion Sort",
    category: "sorting",
    viz: "array",
    tagline: "Grow a sorted prefix by sliding each new value into position.",
    keywords: ["insertion", "prefix", "shift", "key", "nearly sorted"],

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
        "Insertion Sort maintains a sorted prefix on the left. It takes the first unsorted value (the key), shifts every larger value in the prefix one slot to the right, and drops the key into the gap.",
      how:
        "Because the prefix is already sorted, the inner loop can stop as soon as it finds a value that is not greater than the key - which is why nearly-sorted input runs in close to linear time.",
      steps: [
        "Take the value at index i as the key.",
        "Compare the key with the value to its left.",
        "While that value is larger, shift it one slot to the right.",
        "Repeat until you find a value that is smaller than or equal to the key.",
        "Write the key into the vacated slot - the prefix grows by one."
      ],
      useCases: [
        "Sorting small or nearly-ordered datasets efficiently.",
        "Online sorting, where items arrive one at a time.",
        "The inner loop of Timsort used by many standard libraries."
      ]
    },

    example:
      "Start [42, 17, 8] \u2192 key = 17, 42 > 17 so shift 42 \u2192 [42, 42, 8] \u2192 place 17 \u2192 [17, 42, 8] \u2192 key = 8, shift 42 and 17 \u2192 [42, 42, 17] \u2192 place 8 \u2192 [8, 17, 42].",

    pseudocode: [
      "procedure insertionSort(A):",
      "    n \u2190 length(A)",
      "    for i \u2190 1 to n \u2212 1:",
      "        key \u2190 A[i]",
      "        j \u2190 i \u2212 1",
      "        while j \u2265 0 and A[j] > key:",
      "            A[j + 1] \u2190 A[j]",
      "            j \u2190 j \u2212 1",
      "        A[j + 1] \u2190 key"
    ],

    readyMessage: "Press Play to grow a sorted prefix one key at a time.",

    run: function (input, emit) {
      var a = input.array;
      var n = a.length;
      var i;
      var k;

      if (n <= 1) {
        if (n === 1) emit && emit({ type: "mark", role: "sorted", index: 0, line: 8 });
        emit && emit({ type: "result", value: "already sorted", line: 8 });
        return;
      }

      for (i = 1; i < n; i++) {
        if (i > 1) emit && emit({ type: "unmark", role: "active", index: i - 1, line: 2 });
        emit && emit({ type: "mark", role: "active", index: i, line: 2 });

        var key = a[i];
        emit && emit({ type: "pointer", name: "key", index: i, line: 3 });

        var j = i - 1;
        var shifted = 0;

        while (j >= 0) {
          emit && emit({ type: "compare", indices: [j], key: key, line: 5 });
          if (a[j] > key) {
            emit && emit({
              type: "write",
              index: j + 1,
              value: a[j],
              line: 6,
              text: "Shift a[" + j + "] = " + a[j] + " right into slot " + (j + 1)
            });
            a[j + 1] = a[j];
            shifted += 1;
            j -= 1;
            emit && emit({ type: "pointer", name: "key", index: j + 1, line: 7 });
          } else {
            emit && emit({
              type: "message",
              text: a[j] + " is not larger than the key " + key + ", so the search stops",
              line: 5
            });
            break;
          }
        }

        emit && emit({
          type: "write",
          index: j + 1,
          value: key,
          line: 8,
          text: "Insert the key " + key + " at index " + (j + 1)
        });
        a[j + 1] = key;

        emit && emit({ type: "pointer", name: "key", index: null, line: 8 });

        var prefix = [];
        for (k = 0; k <= i; k++) prefix.push(k);
        emit && emit({ type: "mark", role: "sorted", indices: prefix, line: 8 });
        emit && emit({ type: "unmark", role: "active", index: i, line: 8 });

        if (shifted === 0) {
          emit && emit({
            type: "message",
            text: "The key was already in order, no shifting needed",
            line: 8
          });
        }
      }

      var all = [];
      for (i = 0; i < n; i++) all.push(i);
      emit && emit({ type: "mark", role: "sorted", indices: all, line: 8 });
      emit && emit({ type: "result", value: "sorted", line: 8 });
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
