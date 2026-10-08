/**
 * Dynamic Array — contiguous, index-addressed storage.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function reject(emit, text, line) {
    emit && emit({ type: "message", text: text, line: line || 1 });
    emit && emit({ type: "result", value: "error", line: line || 1 });
    return null;
  }

  function opAppend(store, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to append", 1);
    }
    var len = store.length;
    emit && emit({
      type: "pointer",
      name: "tail",
      index: len > 0 ? len - 1 : null,
      line: 1,
      text: len > 0 ? "The tail currently sits at index " + (len - 1) : "The array is empty"
    });
    emit && emit({
      type: "write",
      index: len,
      value: value,
      line: 2,
      text: "Write " + value + " at index " + len + " (the free slot after the tail)"
    });
    store.push(value);
    emit && emit({
      type: "pointer",
      name: "tail",
      index: len,
      line: 3,
      text: "The tail moves to index " + len
    });
    emit && emit({ type: "message", text: "Append costs O(1) amortised - no cells move", line: 4 });
    emit && emit({ type: "result", value: store.length, line: 5 });
    return store.length;
  }

  function opInsert(store, index, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to insert", 1);
    }
    var len = store.length;
    if (typeof index !== "number" || Math.floor(index) !== index || index < 0 || index > len) {
      return reject(emit, "Index " + index + " is outside the valid range 0.." + len, 1);
    }

    emit && emit({
      type: "pointer",
      name: "cursor",
      index: index,
      line: 2,
      text: "Insert at index " + index
    });
    emit && emit({
      type: "message",
      text: "Every cell from index " + index + " onward has to move one slot right",
      line: 3
    });

    for (var i = len; i > index; i--) {
      emit && emit({
        type: "write",
        index: i,
        value: store[i - 1],
        line: 4,
        text: "Shift a[" + (i - 1) + "] = " + store[i - 1] + " right into a[" + i + "]"
      });
      store[i] = store[i - 1];
    }

    emit && emit({
      type: "write",
      index: index,
      value: value,
      line: 6,
      text: "Place " + value + " into the gap at index " + index
    });
    store[index] = value;

    emit && emit({
      type: "pointer",
      name: "tail",
      index: store.length - 1,
      line: 7,
      text: "The tail now points at index " + (store.length - 1)
    });
    emit && emit({
      type: "message",
      text: "Insertion moves " + (len - index) + " cell(s), so it costs O(n)",
      line: 8
    });
    emit && emit({ type: "result", value: store.length, line: 9 });
    return store.length;
  }

  function opRemoveAt(store, index, emit) {
    var len = store.length;
    if (typeof index !== "number" || Math.floor(index) !== index ||
        index < 0 || index >= len) {
      return reject(emit, "Index " + index + " is outside the valid range 0.." + (len - 1), 1);
    }
    var removed = store[index];

    emit && emit({
      type: "pointer",
      name: "cursor",
      index: index,
      line: 2,
      text: "Remove the value at index " + index
    });

    for (var i = index; i < len - 1; i++) {
      emit && emit({
        type: "write",
        index: i,
        value: store[i + 1],
        line: 4,
        text: "Shift a[" + (i + 1) + "] = " + store[i + 1] + " left into a[" + i + "]"
      });
      store[i] = store[i + 1];
    }

    emit && emit({
      type: "resize",
      length: len - 1,
      line: 6,
      text: "Drop the last cell; the array now holds " + (len - 1) + " value(s)"
    });
    store.length = len - 1;

    emit && emit({
      type: "message",
      text: "Removal moved " + (len - 1 - index) + " cell(s), so it costs O(n)",
      line: 7
    });
    emit && emit({ type: "result", value: removed, line: 8 });
    return removed;
  }

  function opPop(store, emit) {
    var len = store.length;
    if (len === 0) {
      return reject(emit, "Pop on an empty array - there is no tail to remove", 1);
    }
    var removed = store[len - 1];
    emit && emit({
      type: "pointer",
      name: "tail",
      index: len - 1,
      line: 2,
      text: "The tail holds " + removed
    });
    emit && emit({
      type: "resize",
      length: len - 1,
      line: 3,
      text: "Remove the tail; the array shrinks to " + (len - 1) + " cell(s)"
    });
    store.length = len - 1;
    emit && emit({ type: "message", text: "Pop costs O(1) - nothing has to shift", line: 4 });
    emit && emit({ type: "result", value: removed, line: 5 });
    return removed;
  }

  function opIndexOf(store, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to search for", 1);
    }
    if (store.length === 0) {
      emit && emit({ type: "message", text: "The array is empty", line: 2 });
      emit && emit({ type: "notFound", line: 3 });
      emit && emit({ type: "result", value: -1, line: 3 });
      return -1;
    }

    emit && emit({ type: "range", start: 0, end: store.length - 1, label: "Search range", line: 2 });
    for (var i = 0; i < store.length; i++) {
      emit && emit({
        type: "compare",
        indices: [i],
        key: value,
        line: 3,
        text: "Compare a[" + i + "] = " + store[i] + " with the key " + value
      });
      if (store[i] === value) {
        emit && emit({
          type: "found",
          index: i,
          line: 4,
          text: "Found " + value + " at index " + i
        });
        emit && emit({ type: "result", value: i, line: 5 });
        return i;
      }
    }

    emit && emit({ type: "range", start: null, end: null, line: 6 });
    emit && emit({ type: "notFound", line: 7, text: value + " is not in the array" });
    emit && emit({ type: "result", value: -1, line: 7 });
    return -1;
  }

  function opRead(store, index, emit) {
    var len = store.length;
    if (typeof index !== "number" || Math.floor(index) !== index ||
        index < 0 || index >= len) {
      return reject(emit, "Index " + index + " is outside the valid range 0.." + (len - 1), 1);
    }
    emit && emit({
      type: "pointer",
      name: "cursor",
      index: index,
      line: 2,
      text: "Point at index " + index
    });
    emit && emit({
      type: "compare",
      indices: [index],
      key: store[index],
      line: 3,
      text: "Read a[" + index + "] = " + store[index] + " directly - one access, no scanning"
    });
    emit && emit({ type: "result", value: store[index], line: 4 });
    return store[index];
  }

  AV.registerStructure({
    id: "array",
    name: "Dynamic Array",
    category: "structures",
    viz: "array",
    tagline: "Contiguous cells give O(1) reads but O(n) insertions.",
    keywords: ["array", "arraylist", "dynamic array", "contiguous", "arraylist"],
    complexity: {
      best: "O(1) read",
      average: "O(n) insert",
      worst: "O(n) insert",
      space: "O(n)"
    },
    stable: true,
    inPlace: true,

    explanation: {
      what:
        "A dynamic array stores values in a contiguous block of memory and addresses them with an index, which is why reading a single cell is a constant-time operation.",
      how:
        "The array keeps a length (and usually a capacity). Appending writes into the free slot after the last cell and occasionally doubles the backing block when it runs out of room. Inserting or removing in the middle has to slide every following cell one slot to keep the block contiguous.",
      steps: [
        "Read: jump straight to index - no visiting of other cells.",
        "Append: write after the tail, then move the tail pointer.",
        "Insert at i: shift cells i..n-1 one slot to the right, then write.",
        "Remove at i: shift cells i+1..n-1 one slot to the left, then shrink."
      ],
      useCases: [
        "Default list type in most languages (ArrayList, vector, Python list).",
        "Whenever random access by index matters more than frequent insertion.",
        "Building buffers where the tail is the only end that changes."
      ]
    },

    example:
      "insert(2, 9) on [4, 8, 15, 16]: shift 16 right, shift 15 right, then write 9 at index 2 - three writes for one insertion.",

    pseudocode: [
      "procedure append(value):",
      "    a[length] \u2190 value;   length \u2190 length + 1",
      "",
      "procedure insert(index, value):",
      "    for i \u2190 length down to index + 1:",
      "        a[i] \u2190 a[i - 1]          // shift the tail right",
      "    a[index] \u2190 value",
      "",
      "procedure removeAt(index):",
      "    for i \u2190 index to length - 2:",
      "        a[i] \u2190 a[i + 1]          // shift the tail left",
      "    length \u2190 length - 1",
      "",
      "procedure read(index):",
      "    return a[index]               // O(1)",
      "",
      "function indexOf(value):",
      "    for i \u2190 0 to length - 1:",
      "        if a[i] = value:  return i",
      "    return \u22121"
    ],

    readyMessage: "Pick an operation and press Play to watch the cells move.",

    operations: [
      { id: "append", label: "Append", signature: "append(value)", description: "Add a value after the tail in O(1).", fields: ["value"] },
      { id: "insert", label: "Insert at", signature: "insert(index, value)", description: "Insert at an index and shift the tail right.", fields: ["index", "value"] },
      { id: "removeAt", label: "Remove at", signature: "removeAt(index)", description: "Remove an index and shift the tail left.", fields: ["index"] },
      { id: "pop", label: "Pop", signature: "pop()", description: "Remove and return the last value.", fields: [] },
      { id: "indexOf", label: "Index of", signature: "indexOf(value)", description: "Scan the cells and return the first matching index.", fields: ["value"] },
      { id: "read", label: "Read", signature: "read(index)", description: "Fetch one cell directly in constant time.", fields: ["index"] }
    ],

    defaultOperation: "append",
    defaultInput: { array: [4, 8, 15, 16, 23, 42] },

    run: function (input, emit) {
      var store = Array.isArray(input.array) ? input.array.slice() : [];
      var op = input.operation || "append";

      emit && emit({
        type: "message",
        text: "The array currently holds " + store.length + " value(s)",
        line: 1
      });

      switch (op) {
        case "append":
          return opAppend(store, input.value, emit);
        case "insert":
          return opInsert(store, input.index, input.value, emit);
        case "removeAt":
          return opRemoveAt(store, input.index, emit);
        case "pop":
          return opPop(store, emit);
        case "indexOf":
          return opIndexOf(store, input.value, emit);
        case "read":
          return opRead(store, input.index, emit);
        default:
          return reject(emit, "Unknown array operation: " + op, 1);
      }
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
