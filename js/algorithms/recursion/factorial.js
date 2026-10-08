/**
 * Factorial — the canonical recursion, visualised as a call tree.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var MAX_N = 18; // 19! already exceeds Number.MAX_SAFE_INTEGER

  function reject(emit, text, line) {
    emit && emit({ type: "message", text: text, line: line || 1 });
    emit && emit({ type: "result", value: "error", line: line || 1 });
    return null;
  }

  AV.registerAlgorithm({
    id: "factorial",
    name: "Factorial (Recursion)",
    category: "recursion",
    viz: "recursion",
    tagline: "Watch frames push onto the call stack and unwind with their answers.",
    keywords: ["factorial", "recursion", "call stack", "base case", "frames"],
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
        "n! is n multiplied by (n-1)!, with 0! and 1! defined as 1. Written recursively, the definition and the code are almost the same sentence.",
      how:
        "Each call pushes a frame holding its own n, then waits for the smaller call to come back. The unwinding phase is where the multiplication actually happens: the deepest frame knows its answer immediately, and each returning frame multiplies its own n into the result travelling up.",
      steps: [
        "Push a frame for the current n.",
        "If n is 0 or 1, this is the base case: return 1 without recursing.",
        "Otherwise call factorial(n - 1) and wait for its answer.",
        "Multiply the returned value by this frame's n.",
        "Pop the frame and hand the result to the caller."
      ],
      useCases: [
        "Counting permutations and combinations.",
        "Power series such as e and the factorial definition of gamma.",
        "The standard first example of a base case and a recursive step."
      ]
    },

    example:
      "factorial(4) calls 3, which calls 2, which calls 1. 1 returns 1, then 2 x 1 = 2, 3 x 2 = 6, 4 x 6 = 24 - the multiplication happens on the way back up.",

    pseudocode: [
      "function factorial(n):",
      "    if n \u2264 1:            // base case stops the descent",
      "        return 1",
      "    return n \u00d7 factorial(n \u2212 1)"
    ],

    readyMessage: "Press Play to push and unwind the call stack.",

    run: function (input, emit) {
      var raw = input.value !== undefined ? input.value : input.n;
      var n = Number(raw);

      if (!isFinite(n) || Math.floor(n) !== n || n < 0) {
        return reject(emit, "Enter a whole number of 0 or more", 1);
      }
      if (n > MAX_N) {
        return reject(emit,
          "Factorial above " + MAX_N + " overflows safe integer precision - try 0.." + MAX_N, 1);
      }

      emit && emit({
        type: "message",
        text: "Computing " + n + "! = " + n + " \u00d7 " + (n - 1) + "! \u00d7 ... down to 1!",
        line: 1
      });

      var counter = 0;

      function frame(id, depth, value) {
        counter += 1;
        emit && emit({
          type: "enter",
          id: id,
          parent: id.indexOf(".") < 0 ? null : id.slice(0, id.lastIndexOf(".")),
          label: "fact",
          depth: depth,
          args: [value],
          line: 2,
          text: "Call fact(" + value + ") - frame #" + counter + " pushed"
        });
      }

      function fact(value, id, depth) {
        frame(id, depth, value);

        if (value <= 1) {
          emit && emit({
            type: "message",
            text: "Base case: fact(" + value + ") is defined as 1, so no further call",
            line: 3
          });
          emit && emit({ type: "frameValue", value: 1, line: 3 });
          emit && emit({
            type: "exit",
            id: id,
            value: 1,
            line: 4,
            text: "fact(" + value + ") returns 1"
          });
          return 1;
        }

        var sub = fact(value - 1, id + ".1", depth + 1);
        var result = value * sub;

        emit && emit({
          type: "frameValue",
          value: result,
          line: 5,
          text: value + " \u00d7 " + sub + " = " + result
        });
        emit && emit({
          type: "exit",
          id: id,
          value: result,
          line: 5,
          text: "fact(" + value + ") returns " + result
        });
        return result;
      }

      var answer = fact(n, "f", 0);
      var peak = Math.max(1, n);

      emit && emit({
        type: "message",
        text: counter + " frame(s) pushed and popped for " + n + "! - stack depth peaked at " +
          peak,
        line: 6
      });
      emit && emit({ type: "result", value: answer, line: 6 });
      return answer;
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
