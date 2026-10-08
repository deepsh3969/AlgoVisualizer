/**
 * Fibonacci (naive recursion) — the classic exponential blow-up, made visible.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var MAX_N = 14; // C(14) is ~1200 calls, already a busy call tree

  function reject(emit, text, line) {
    emit && emit({ type: "message", text: text, line: line || 1 });
    emit && emit({ type: "result", value: "error", line: line || 1 });
    return null;
  }

  AV.registerAlgorithm({
    id: "fibonacci",
    name: "Fibonacci (Recursion)",
    category: "recursion",
    viz: "recursion",
    tagline: "The same subproblems explode into a tree - watch the repeats pile up.",
    keywords: ["fibonacci", "recursion", "exponential", "call tree", "memoisation"],
    complexity: {
      best: "O(n)",
      average: "O(2^n)",
      worst: "O(2^n)",
      space: "O(n)"
    },
    stable: true,
    inPlace: false,

    explanation: {
      what:
        "The Fibonacci sequence starts 0, 1 and each later term is the sum of the two before it. Written directly from the definition, fib(n) calls fib(n-1) and fib(n-2).",
      how:
        "That definition is honest but wasteful. The call tree expands into roughly 2^n nodes because fib(k) is recomputed by every branch that needs it. The call counter in the narration makes the repetition concrete: one cached result per distinct k would collapse the whole tree to a single chain.",
      steps: [
        "Push a frame for the requested index.",
        "If the index is 0 or 1, return it directly - the base cases.",
        "Call fib(n - 1) and wait for that subtree.",
        "Call fib(n - 2) and wait for the second subtree.",
        "Add the two answers, store it in this frame, then pop."
      ],
      useCases: [
        "The standard example of why naive recursion needs memoisation.",
        "Counting lattice paths and rabbit populations.",
        "A stress test for call-stack depth limits."
      ]
    },

    example:
      "fib(5) needs fib(4) and fib(3); fib(4) already needs fib(3) - so fib(3) is computed twice, fib(2) three times, and the repeats keep doubling as n grows.",

    pseudocode: [
      "function fib(n):",
      "    if n \u2264 0:            // base case",
      "        return 0",
      "    if n = 1:              // second base case",
      "        return 1",
      "    return fib(n \u2212 1) + fib(n \u2212 2)",
      "",
      "// with memoisation the two calls become table lookups: O(n)"
    ],

    readyMessage: "Press Play to grow the call tree and watch duplicates appear.",

    run: function (input, emit) {
      var raw = input.value !== undefined ? input.value : input.n;
      var n = Number(raw);

      if (!isFinite(n) || Math.floor(n) !== n || n < 0) {
        return reject(emit, "Enter a whole number of 0 or more", 1);
      }
      if (n > MAX_N) {
        return reject(emit,
          "fib(" + n + ") would spawn an enormous call tree - keep it at 0.." + MAX_N, 1);
      }

      emit && emit({
        type: "message",
        text: "Computing fib(" + n + ") = fib(" + (n - 1) + ") + fib(" + (n - 2) + ")",
        line: 1
      });

      var counter = 0;
      var visits = Object.create(null);

      function fib(value, id, depth) {
        counter += 1;
        visits[value] = (visits[value] || 0) + 1;
        var repeats = visits[value] > 1 ? " (visit #" + visits[value] + " for this index)" : "";

        emit && emit({
          type: "enter",
          id: id,
          parent: id.indexOf(".") < 0 ? null : id.slice(0, id.lastIndexOf(".")),
          label: "fib",
          depth: depth,
          args: [value],
          line: 2,
          text: "Call fib(" + value + ")" + repeats + " - frame #" + counter + " pushed"
        });

        if (value <= 0) {
          emit && emit({ type: "frameValue", value: 0, line: 3 });
          emit && emit({
            type: "exit",
            id: id,
            value: 0,
            line: 3,
            text: "fib(0) returns 0"
          });
          return 0;
        }
        if (value === 1) {
          emit && emit({ type: "frameValue", value: 1, line: 4 });
          emit && emit({
            type: "exit",
            id: id,
            value: 1,
            line: 4,
            text: "fib(1) returns 1"
          });
          return 1;
        }

        var left = fib(value - 1, id + ".1", depth + 1);
        var right = fib(value - 2, id + ".2", depth + 1);
        var result = left + right;

        emit && emit({
          type: "frameValue",
          value: result,
          line: 5,
          text: "fib(" + (value - 1) + ") = " + left + " plus fib(" + (value - 2) + ") = " +
            right + " gives " + result
        });
        emit && emit({
          type: "exit",
          id: id,
          value: result,
          line: 5,
          text: "fib(" + value + ") returns " + result
        });
        return result;
      }

      var answer = fib(n, "f", 0);

      var distinct = Object.keys(visits).length;
      var wasted = counter - distinct;
      emit && emit({
        type: "message",
        text: counter + " call(s) for only " + distinct +
          " distinct index(es) - " + wasted +
          " of them recomputed work that memoisation would have cached",
        line: 6
      });
      emit && emit({ type: "result", value: answer, line: 6 });
      return answer;
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
