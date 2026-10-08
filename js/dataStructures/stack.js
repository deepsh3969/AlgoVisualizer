/**
 * Stack — last in, first out.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function reject(emit, text, line) {
    emit && emit({ type: "message", text: text, line: line || 1 });
    emit && emit({ type: "result", value: "error", line: line || 1 });
    return null;
  }

  function opPush(store, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to push", 1);
    }
    var len = store.length;
    emit && emit({
      type: "pointer",
      name: "top",
      index: len > 0 ? len - 1 : null,
      line: 1,
      text: len > 0 ? "The top sits at index " + (len - 1) : "The stack is empty"
    });
    emit && emit({
      type: "write",
      index: len,
      value: value,
      line: 2,
      text: "Push " + value + " onto index " + len
    });
    store.push(value);
    emit && emit({
      type: "pointer",
      name: "top",
      index: store.length - 1,
      line: 3,
      text: "The top moves up to index " + (store.length - 1)
    });
    emit && emit({ type: "message", text: "Push is O(1) - nothing below the top moves", line: 4 });
    emit && emit({ type: "result", value: store.length, line: 5 });
    return store.length;
  }

  function opPop(store, emit) {
    var len = store.length;
    if (len === 0) {
      return reject(emit, "Stack underflow - there is nothing left to pop", 1);
    }
    var removed = store[len - 1];
    emit && emit({
      type: "pointer",
      name: "top",
      index: len - 1,
      line: 2,
      text: "The top holds " + removed
    });
    emit && emit({
      type: "resize",
      length: len - 1,
      line: 3,
      text: "Pop " + removed + "; the stack shrinks to " + (len - 1) + " value(s)"
    });
    store.length = len - 1;
    emit && emit({
      type: "pointer",
      name: "top",
      index: store.length > 0 ? store.length - 1 : null,
      line: 4,
      text: store.length > 0
        ? "The top falls back to index " + (store.length - 1)
        : "The stack is empty again"
    });
    emit && emit({ type: "message", text: "Pop is O(1) - only the top changes", line: 5 });
    emit && emit({ type: "result", value: removed, line: 6 });
    return removed;
  }

  function opPeek(store, emit) {
    var len = store.length;
    if (len === 0) {
      return reject(emit, "Peek on an empty stack - there is no top", 1);
    }
    emit && emit({
      type: "pointer",
      name: "top",
      index: len - 1,
      line: 1,
      text: "The top sits at index " + (len - 1)
    });
    emit && emit({
      type: "compare",
      indices: [len - 1],
      key: store[len - 1],
      line: 2,
      text: "Read the top value " + store[len - 1] + " without removing it"
    });
    emit && emit({ type: "result", value: store[len - 1], line: 3 });
    return store[len - 1];
  }

  function opSearch(store, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to search for", 1);
    }
    if (store.length === 0) {
      emit && emit({ type: "message", text: "The stack is empty", line: 2 });
      emit && emit({ type: "notFound", line: 3 });
      emit && emit({ type: "result", value: -1, line: 3 });
      return -1;
    }

    emit && emit({
      type: "range",
      start: 0,
      end: store.length - 1,
      label: "Search from the top down",
      line: 2
    });
    // LIFO search: the most recently pushed value is examined first.
    for (var i = store.length - 1; i >= 0; i--) {
      emit && emit({
        type: "compare",
        indices: [i],
        key: value,
        line: 3,
        text: "Compare the entry at index " + i + " = " + store[i] + " with the key " + value
      });
      if (store[i] === value) {
        emit && emit({
          type: "found",
          index: i,
          line: 4,
          text: "Found " + value + " at index " + i +
            " (" + (store.length - 1 - i) + " step(s) above the bottom)"
        });
        emit && emit({ type: "result", value: i, line: 5 });
        return i;
      }
    }

    emit && emit({ type: "range", start: null, end: null, line: 6 });
    emit && emit({ type: "notFound", line: 7, text: value + " is not on the stack" });
    emit && emit({ type: "result", value: -1, line: 7 });
    return -1;
  }

  function opIsEmpty(store, emit) {
    var empty = store.length === 0;
    if (!empty) {
      emit && emit({
        type: "pointer",
        name: "top",
        index: store.length - 1,
        line: 1,
        text: "A top value is present at index " + (store.length - 1)
      });
    }
    emit && emit({
      type: "message",
      text: empty ? "length is 0, so the stack is empty" : "length is " + store.length + " > 0",
      line: 2
    });
    emit && emit({ type: "result", value: empty, line: 3 });
    return empty;
  }

  AV.registerStructure({
    id: "stack",
    name: "Stack",
    category: "structures",
    viz: "stack",
    tagline: "Last in, first out - push and pop only touch the top.",
    keywords: ["stack", "lifo", "push", "pop", "call stack"],
    complexity: {
      best: "O(1)",
      average: "O(1)",
      worst: "O(1) push/pop",
      space: "O(n)"
    },
    stable: true,
    inPlace: true,

    explanation: {
      what:
        "A stack is a last-in-first-out collection: the value you put in last is the first one you get back. Only the top element is reachable.",
      how:
        "The stack tracks a top index. Push writes one cell past the top and advances the index; pop reads the top cell and moves the index back. Neither operation touches the rest of the storage, which is why both are constant time.",
      steps: [
        "Push: write the value at the free slot above the top, then move the top pointer up.",
        "Pop: read the value under the top pointer, then move the pointer down.",
        "Peek: read the top value without moving anything.",
        "Search: walk from the top downwards, because the newest entry is the likeliest hit."
      ],
      useCases: [
        "The call stack that tracks nested function returns.",
        "Undo history in editors.",
        "Depth-first traversal and expression parsing."
      ]
    },

    example:
      "push 7, push 3, pop \u2192 you get 3 back first; push 7, push 3, pop, pop \u2192 3 then 7. Reversing order is the whole point.",

    pseudocode: [
      "procedure push(value):",
      "    a[length] \u2190 value;   top \u2190 length;   length \u2190 length + 1",
      "",
      "procedure pop():",
      "    if length = 0:  raise underflow",
      "    value \u2190 a[length \u2212 1]",
      "    length \u2190 length \u2212 1;   top \u2190 length \u2212 1",
      "    return value",
      "",
      "function peek():",
      "    if length = 0:  raise underflow",
      "    return a[length \u2212 1]",
      "",
      "function search(value):",
      "    for i \u2190 length \u2212 1 down to 0:",
      "        if a[i] = value:  return i",
      "    return \u22121"
    ],

    readyMessage: "Press Play to push, pop or peek your way through the stack.",

    operations: [
      { id: "push", label: "Push", signature: "push(value)", description: "Place a value on top in O(1).", fields: ["value"] },
      { id: "pop", label: "Pop", signature: "pop()", description: "Remove and return the top value.", fields: [] },
      { id: "peek", label: "Peek", signature: "peek()", description: "Read the top value without removing it.", fields: [] },
      { id: "search", label: "Search", signature: "search(value)", description: "Scan from the top down for a value.", fields: ["value"] },
      { id: "isEmpty", label: "Is empty", signature: "isEmpty()", description: "Check whether the stack holds nothing.", fields: [] }
    ],

    defaultOperation: "push",
    defaultInput: { array: [4, 8, 15] },

    run: function (input, emit) {
      var store = Array.isArray(input.array) ? input.array.slice() : [];
      var op = input.operation || "push";

      emit && emit({
        type: "message",
        text: "The stack holds " + store.length + " value(s); the top is index " +
          (store.length ? store.length - 1 : "\u2212"),
        line: 1
      });

      switch (op) {
        case "push":
          return opPush(store, input.value, emit);
        case "pop":
          return opPop(store, emit);
        case "peek":
          return opPeek(store, emit);
        case "search":
          return opSearch(store, input.value, emit);
        case "isEmpty":
          return opIsEmpty(store, emit);
        default:
          return reject(emit, "Unknown stack operation: " + op, 1);
      }
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
