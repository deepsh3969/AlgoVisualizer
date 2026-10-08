/**
 * Queue — first in, first out (array backed).
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function reject(emit, text, line) {
    emit && emit({ type: "message", text: text, line: line || 1 });
    emit && emit({ type: "result", value: "error", line: line || 1 });
    return null;
  }

  function markEnds(store, emit, line) {
    emit && emit({
      type: "pointer",
      name: "front",
      index: store.length > 0 ? 0 : null,
      line: line,
      text: store.length > 0 ? "The front sits at index 0" : "There is no front - the queue is empty"
    });
    emit && emit({
      type: "pointer",
      name: "back",
      index: store.length > 0 ? store.length - 1 : null,
      line: line,
      text: store.length > 0
        ? "The back sits at index " + (store.length - 1)
        : "There is no back either"
    });
  }

  function opEnqueue(store, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to enqueue", 1);
    }
    var len = store.length;
    markEnds(store, emit, 1);

    emit && emit({
      type: "write",
      index: len,
      value: value,
      line: 2,
      text: "Enqueue " + value + " at the back, index " + len
    });
    store.push(value);

    emit && emit({
      type: "pointer",
      name: "back",
      index: store.length - 1,
      line: 3,
      text: "The back moves to index " + (store.length - 1)
    });
    emit && emit({
      type: "pointer",
      name: "front",
      index: 0,
      line: 4,
      text: len === 0 ? "This first arrival also becomes the front" : "The front stays at index 0"
    });
    emit && emit({ type: "message", text: "Enqueue is O(1) - only the back moves", line: 5 });
    emit && emit({ type: "result", value: store.length, line: 6 });
    return store.length;
  }

  function opDequeue(store, emit) {
    var len = store.length;
    if (len === 0) {
      return reject(emit, "Queue underflow - there is nothing to dequeue", 1);
    }
    var removed = store[0];

    emit && emit({
      type: "pointer",
      name: "front",
      index: 0,
      line: 2,
      text: "The front holds " + removed + ", the value that arrived first"
    });
    emit && emit({
      type: "message",
      text: "The front value leaves; every remaining cell slides one slot towards it",
      line: 3
    });

    for (var i = 0; i < len - 1; i++) {
      emit && emit({
        type: "write",
        index: i,
        value: store[i + 1],
        line: 4,
        text: "Slide a[" + (i + 1) + "] = " + store[i + 1] + " into a[" + i + "]"
      });
      store[i] = store[i + 1];
    }

    emit && emit({
      type: "resize",
      length: len - 1,
      line: 6,
      text: "Drop the vacated tail cell; " + (len - 1) + " value(s) remain"
    });
    store.length = len - 1;

    markEnds(store, emit, 7);
    emit && emit({
      type: "message",
      text: "An array-backed dequeue slides " + (len - 1) +
        " cell(s), so it costs O(n). A linked list or ring buffer makes it O(1).",
      line: 8
    });
    emit && emit({ type: "result", value: removed, line: 9 });
    return removed;
  }

  function opPeek(store, emit) {
    if (store.length === 0) {
      return reject(emit, "Peek on an empty queue - there is no front", 1);
    }
    emit && emit({
      type: "pointer",
      name: "front",
      index: 0,
      line: 1,
      text: "The front sits at index 0"
    });
    emit && emit({
      type: "compare",
      indices: [0],
      key: store[0],
      line: 2,
      text: "Read the front value " + store[0] + " without removing it"
    });
    emit && emit({ type: "result", value: store[0], line: 3 });
    return store[0];
  }

  function opSearch(store, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to search for", 1);
    }
    if (store.length === 0) {
      emit && emit({ type: "message", text: "The queue is empty", line: 2 });
      emit && emit({ type: "notFound", line: 3 });
      emit && emit({ type: "result", value: -1, line: 3 });
      return -1;
    }

    markEnds(store, emit, 2);
    emit && emit({
      type: "range",
      start: 0,
      end: store.length - 1,
      label: "FIFO scan from front to back",
      line: 3
    });

    for (var i = 0; i < store.length; i++) {
      emit && emit({
        type: "compare",
        indices: [i],
        key: value,
        line: 4,
        text: "Compare a[" + i + "] = " + store[i] + " with the key " + value
      });
      if (store[i] === value) {
        emit && emit({
          type: "found",
          index: i,
          line: 5,
          text: "Found " + value + " at index " + i
        });
        emit && emit({ type: "result", value: i, line: 6 });
        return i;
      }
    }

    emit && emit({ type: "range", start: null, end: null, line: 7 });
    emit && emit({ type: "notFound", line: 8, text: value + " is not waiting in the queue" });
    emit && emit({ type: "result", value: -1, line: 8 });
    return -1;
  }

  function opIsEmpty(store, emit) {
    var empty = store.length === 0;
    if (!empty) markEnds(store, emit, 1);
    emit && emit({
      type: "message",
      text: empty ? "length is 0, so the queue is empty" : "length is " + store.length + " > 0",
      line: 2
    });
    emit && emit({ type: "result", value: empty, line: 3 });
    return empty;
  }

  AV.registerStructure({
    id: "queue",
    name: "Queue",
    category: "structures",
    viz: "queue",
    tagline: "First in, first out - enqueue at the back, dequeue at the front.",
    keywords: ["queue", "fifo", "enqueue", "dequeue", "breadth first"],
    complexity: {
      best: "O(1) enqueue",
      average: "O(n) dequeue (array backed)",
      worst: "O(n) dequeue",
      space: "O(n)"
    },
    stable: true,
    inPlace: true,

    explanation: {
      what:
        "A queue is a first-in-first-out collection: the value that has waited longest is the next one out. New arrivals go to the back, removals come from the front.",
      how:
        "This implementation stores the waiting values contiguously with a front pointer at index 0 and a back pointer at the end. Enqueue writes past the back in constant time. Dequeue has to close the gap at the front, which slides every remaining cell - the reason production queues use a linked list or a circular buffer.",
      steps: [
        "Enqueue: write the value at the back, then move the back pointer.",
        "Dequeue: take the value at the front, then slide the rest forward.",
        "Peek: read the front value without removing it.",
        "Search: scan front to back, because that is the arrival order."
      ],
      useCases: [
        "Print job and task scheduling.",
        "Breadth-first search's frontier.",
        "Message buffers and request queues in servers."
      ]
    },

    example:
      "enqueue A, enqueue B, dequeue \u2192 A comes back (arrival order preserved), then B. Swap the ends and you have a stack.",

    pseudocode: [
      "procedure enqueue(value):",
      "    a[length] \u2190 value;   back \u2190 length;   length \u2190 length + 1",
      "",
      "procedure dequeue():",
      "    if length = 0:  raise underflow",
      "    value \u2190 a[0]",
      "    for i \u2190 0 to length \u2212 2:",
      "        a[i] \u2190 a[i + 1]          // close the gap at the front",
      "    length \u2190 length \u2212 1",
      "    front \u2190 0;   back \u2190 length \u2212 1",
      "    return value",
      "",
      "function peek():",
      "    if length = 0:  raise underflow",
      "    return a[0]"
    ],

    readyMessage: "Press Play to enqueue and dequeue while the front and back pointers move.",

    operations: [
      { id: "enqueue", label: "Enqueue", signature: "enqueue(value)", description: "Add a value at the back in O(1).", fields: ["value"] },
      { id: "dequeue", label: "Dequeue", signature: "dequeue()", description: "Remove the value that arrived first.", fields: [] },
      { id: "peek", label: "Peek", signature: "peek()", description: "Read the front value without removing it.", fields: [] },
      { id: "search", label: "Search", signature: "search(value)", description: "Scan from front to back for a value.", fields: ["value"] },
      { id: "isEmpty", label: "Is empty", signature: "isEmpty()", description: "Check whether anyone is waiting.", fields: [] }
    ],

    defaultOperation: "enqueue",
    defaultInput: { array: [4, 8, 15, 16] },

    run: function (input, emit) {
      var store = Array.isArray(input.array) ? input.array.slice() : [];
      var op = input.operation || "enqueue";

      emit && emit({
        type: "message",
        text: "The queue holds " + store.length + " waiting value(s)",
        line: 1
      });

      switch (op) {
        case "enqueue":
          return opEnqueue(store, input.value, emit);
        case "dequeue":
          return opDequeue(store, emit);
        case "peek":
          return opPeek(store, emit);
        case "search":
          return opSearch(store, input.value, emit);
        case "isEmpty":
          return opIsEmpty(store, emit);
        default:
          return reject(emit, "Unknown queue operation: " + op, 1);
      }
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
