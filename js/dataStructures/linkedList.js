/**
 * Singly Linked List — nodes joined by next pointers.
 *
 * Storage is a node table of { id, value, next } entries. Removed nodes stay
 * in the table but are no longer reachable from the head, which keeps every
 * surviving node's table index stable while the chain changes shape.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function reject(emit, text, line) {
    emit && emit({ type: "message", text: text, line: line || 1 });
    emit && emit({ type: "result", value: "error", line: line || 1 });
    return null;
  }

  function indexOfId(store, id) {
    if (id === null || id === undefined) return -1;
    return AV.indexOfNodeId(store, id);
  }

  function freshId(store) {
    var used = Object.create(null);
    for (var i = 0; i < store.length; i++) used[store[i].id] = true;
    var n = 1;
    while (used["n" + n]) n += 1;
    return "n" + n;
  }

  function chainLength(store, headId) {
    var idx = indexOfId(store, headId);
    var count = 0;
    var guard = 0;
    while (idx >= 0 && guard <= store.length) {
      count += 1;
      idx = indexOfId(store, store[idx].next);
      guard += 1;
    }
    return count;
  }

  function locate(store, headId, position) {
    var idx = indexOfId(store, headId);
    var parentIndex = null;
    var pos = 0;
    var guard = 0;
    while (idx >= 0 && guard <= store.length) {
      if (pos === position) {
        return { index: idx, node: store[idx], parentIndex: parentIndex, position: pos };
      }
      parentIndex = idx;
      idx = indexOfId(store, store[idx].next);
      pos += 1;
      guard += 1;
    }
    return null;
  }

  function setHeadPointer(emit, store, headId, line, text) {
    var index = indexOfId(store, headId);
    emit && emit({
      type: "pointer",
      name: "head",
      index: index >= 0 ? index : null,
      line: line,
      text: text
    });
  }

  function setCurrent(emit, index, line, text) {
    emit && emit({
      type: "pointer",
      name: "current",
      index: index !== null && index >= 0 ? index : null,
      line: line,
      text: text
    });
  }

  /* ------------------------------------------------------------------ */

  function opPrepend(store, headId, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to prepend", 1);
    }
    var id = freshId(store);
    var before = chainLength(store, headId);

    emit && emit({ type: "message", text: "The new node will become the head", line: 2 });
    emit && emit({
      type: "write",
      index: store.length,
      value: { id: id, value: value, next: headId },
      line: 3,
      text: "Create node " + id + " holding " + value +
        ", pointing at the old head"
    });
    store.push({ id: id, value: value, next: headId });

    var newHead = id;
    setHeadPointer(emit, store, newHead, 4, "The head pointer swings to the new node");
    headId = newHead;

    emit && emit({
      type: "message",
      text: "Prepend touches two pointers, so it is O(1) - no existing node moves",
      line: 5
    });
    emit && emit({ type: "result", value: before + 1, line: 6 });
    return before + 1;
  }

  function opAppend(store, headId, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to append", 1);
    }
    var id = freshId(store);
    var before = chainLength(store, headId);
    var tailIndex = indexOfId(store, headId);

    if (tailIndex < 0) {
      emit && emit({ type: "message", text: "The list is empty, so the new node is the head", line: 2 });
      emit && emit({
        type: "write",
        index: store.length,
        value: { id: id, value: value, next: null },
        line: 3,
        text: "Create node " + id + " holding " + value + " with no successor"
      });
      store.push({ id: id, value: value, next: null });
      setHeadPointer(emit, store, id, 4, "The head pointer adopts the new node");
      emit && emit({ type: "result", value: 1, line: 5 });
      return 1;
    }

    var guard = 0;
    var step = 0;
    while (store[tailIndex].next !== null && guard <= store.length) {
      var nextId = store[tailIndex].next;
      step += 1;
      setCurrent(emit, tailIndex, 2, "Node " + store[tailIndex].id + " points onwards");
      tailIndex = indexOfId(store, nextId);
      guard += 1;
      if (tailIndex < 0) break;
    }

    var tail = store[tailIndex];
    emit && emit({
      type: "compare",
      indices: [tailIndex],
      key: value,
      line: 4,
      text: "Reach the tail " + tail.id + " after walking " + step + " link(s)"
    });
    emit && emit({
      type: "write",
      index: store.length,
      value: { id: id, value: value, next: null },
      line: 5,
      text: "Create node " + id + " holding " + value + " with no successor"
    });
    store.push({ id: id, value: value, next: null });

    emit && emit({
      type: "write",
      index: tailIndex,
      value: { id: tail.id, value: tail.value, next: id },
      line: 6,
      text: "Relink " + tail.id + " to point at " + id
    });

    setCurrent(emit, store.length - 1, 7, "The tail is now node " + id);
    emit && emit({
      type: "message",
      text: "Appending walks to the tail first, so it costs O(n) unless you keep a tail pointer",
      line: 8
    });
    emit && emit({ type: "result", value: before + 1, line: 9 });
    return before + 1;
  }

  function opInsertAt(store, headId, index, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to insert", 1);
    }
    var len = chainLength(store, headId);
    if (typeof index !== "number" || Math.floor(index) !== index || index < 0 || index > len) {
      return reject(emit, "Position " + index + " is outside the valid range 0.." + len, 1);
    }
    if (index === 0) return opPrepend(store, headId, value, emit);

    var id = freshId(store);
    emit && emit({
      type: "range",
      start: 0,
      end: index - 1,
      label: "Walk to position " + (index - 1),
      line: 2
    });

    var at = locate(store, headId, index - 1);
    if (!at) return reject(emit, "The list is shorter than position " + index, 1);
    setCurrent(emit, at.index, 3, "Stop at position " + (index - 1) + ", node " + at.node.id);

    var successor = at.node.next;
    emit && emit({
      type: "write",
      index: store.length,
      value: { id: id, value: value, next: successor },
      line: 4,
      text: "Create node " + id + " holding " + value +
        (successor ? ", pointing at " + successor : ", with no successor")
    });
    store.push({ id: id, value: value, next: successor });

    emit && emit({
      type: "write",
      index: at.index,
      value: { id: at.node.id, value: at.node.value, next: id },
      line: 5,
      text: "Relink " + at.node.id + " to point at " + id
    });

    emit && emit({ type: "range", start: null, end: null, line: 6 });
    setCurrent(emit, store.length - 1, 7, "Node " + id + " is now at position " + index);
    emit && emit({
      type: "message",
      text: "Only the predecessor's link changes, but reaching it costs O(n)",
      line: 8
    });
    emit && emit({ type: "result", value: len + 1, line: 9 });
    return len + 1;
  }

  function opRemoveAt(store, headId, index, emit) {
    var len = chainLength(store, headId);
    if (typeof index !== "number" || Math.floor(index) !== index ||
        index < 0 || index >= len) {
      return reject(emit, "Position " + index + " is outside the valid range 0.." + (len - 1), 1);
    }

    emit && emit({
      type: "range",
      start: 0,
      end: index,
      label: "Walk to position " + index,
      line: 2
    });
    var at = locate(store, headId, index);
    if (!at) return reject(emit, "The list is shorter than position " + index, 1);
    setCurrent(emit, at.index, 3, "Target node " + at.node.id + " at position " + index);
    emit && emit({ type: "range", start: null, end: null, line: 4 });

    if (at.parentIndex === null) {
      headId = at.node.next;
      setHeadPointer(emit, store, headId, 5,
        headId
          ? "The head pointer skips straight to " + headId
          : "The head pointer clears - the list is now empty");
    } else {
      var parent = store[at.parentIndex];
      emit && emit({
        type: "write",
        index: at.parentIndex,
        value: { id: parent.id, value: parent.value, next: at.node.next },
        line: 5,
        text: "Relink " + parent.id + " to bypass " + at.node.id
      });
    }

    emit && emit({
      type: "mark",
      index: at.index,
      role: "eliminated",
      line: 6,
      text: "Node " + at.node.id + " is detached - nothing points at it any more"
    });
    setCurrent(emit, at.parentIndex === null ? indexOfId(store, headId) : at.parentIndex, 7,
      "The chain closes over the gap");

    emit && emit({
      type: "message",
      text: "Only one predecessor link changes, but reaching the position costs O(n)",
      line: 8
    });
    emit && emit({ type: "result", value: at.node.value, line: 9 });
    return at.node.value;
  }

  function opSearch(store, headId, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to search for", 1);
    }
    var idx = indexOfId(store, headId);
    if (idx < 0) {
      emit && emit({ type: "message", text: "The list is empty", line: 2 });
      emit && emit({ type: "notFound", line: 3 });
      emit && emit({ type: "result", value: -1, line: 3 });
      return -1;
    }

    var pos = 0;
    var guard = 0;
    setHeadPointer(emit, store, headId, 2, "Start at the head pointer");
    while (idx >= 0 && guard <= store.length) {
      var node = store[idx];
      setCurrent(emit, idx, 3, "Inspect node " + node.id + " at position " + pos);
      emit && emit({
        type: "compare",
        indices: [idx],
        key: value,
        line: 4,
        text: "Compare node " + node.id + " value " + node.value + " with the key " + value
      });
      if (node.value === value) {
        emit && emit({
          type: "found",
          index: idx,
          line: 5,
          text: "Found " + value + " at position " + pos
        });
        emit && emit({ type: "result", value: pos, line: 6 });
        return pos;
      }
      idx = indexOfId(store, node.next);
      pos += 1;
      guard += 1;
    }

    emit && emit({ type: "notFound", line: 7, text: value + " is not in the list" });
    emit && emit({ type: "result", value: -1, line: 7 });
    return -1;
  }

  function opGet(store, headId, index, emit) {
    var len = chainLength(store, headId);
    if (typeof index !== "number" || Math.floor(index) !== index ||
        index < 0 || index >= len) {
      return reject(emit, "Position " + index + " is outside the valid range 0.." + (len - 1), 1);
    }
    emit && emit({ type: "range", start: 0, end: index, label: "Walk to position " + index, line: 2 });
    var at = locate(store, headId, index);
    if (!at) return reject(emit, "The list is shorter than position " + index, 1);
    setCurrent(emit, at.index, 3, "Stop at position " + index + ", node " + at.node.id);
    emit && emit({
      type: "compare",
      indices: [at.index],
      key: at.node.value,
      line: 4,
      text: "Read the value " + at.node.value + " at position " + index +
        " after following " + index + " link(s)"
    });
    emit && emit({ type: "range", start: null, end: null, line: 5 });
    emit && emit({ type: "result", value: at.node.value, line: 6 });
    return at.node.value;
  }

  /* ------------------------------------------------------------------ */

  AV.registerStructure({
    id: "linkedList",
    name: "Singly Linked List",
    category: "structures",
    viz: "linked",
    tagline: "Nodes chained by next pointers - O(1) head changes, O(n) lookup.",
    keywords: ["linked list", "singly linked", "node", "pointer", "next"],
    complexity: {
      best: "O(1) prepend",
      average: "O(n) access",
      worst: "O(n) search",
      space: "O(n)"
    },
    stable: true,
    inPlace: true,

    explanation: {
      what:
        "A singly linked list stores values in separate nodes, each holding a value and a pointer to the next node. Only the head pointer gives you entry to the chain.",
      how:
        "Because nodes are not contiguous, inserting at the front is a pure relink: the new node points at the old head and the head pointer moves. Everything else - reaching position i, appending, deleting in the middle - means following links from the head one at a time.",
      steps: [
        "Prepend: point the new node at the old head, then move the head pointer.",
        "Append: walk to the tail, then relink the tail to the new node.",
        "Insert at i: walk to position i-1, relink it through the new node.",
        "Remove at i: walk to position i, then bypass it from its predecessor.",
        "Search: walk from the head, comparing as you go, until you match or run off the end."
      ],
      useCases: [
        "Queues, where head and tail pointers give O(1) ends.",
        "Frequently rebuilt collections where size changes unpredictably.",
        "Structures that must never move existing elements (undo chains, adjacency lists)."
      ]
    },

    example:
      "prepend(9) on 4 \u2192 8 \u2192 15: create a node holding 9, point it at 4, then set head = 9. Two pointer writes, zero shifts.",

    pseudocode: [
      "procedure prepend(value):",
      "    node \u2190 Node(value, next: head)",
      "    head \u2190 node                       // O(1)",
      "",
      "procedure append(value):",
      "    cur \u2190 head",
      "    while cur.next \u2260 null:  cur \u2190 cur.next",
      "    cur.next \u2190 Node(value, next: null) // O(n)",
      "",
      "procedure removeAt(position):",
      "    walk to the node at position",
      "    predecessor.next \u2190 node.next       // bypass it",
      "",
      "function search(value):",
      "    cur \u2190 head;   i \u2190 0",
      "    while cur \u2260 null:",
      "        if cur.value = value:  return i",
      "        cur \u2190 cur.next;   i \u2190 i + 1",
      "    return \u22121"
    ],

    readyMessage: "Press Play to walk the chain node by node.",

    operations: [
      { id: "prepend", label: "Prepend", signature: "prepend(value)", description: "Insert at the head in O(1).", fields: ["value"] },
      { id: "append", label: "Append", signature: "append(value)", description: "Walk to the tail and link a new node.", fields: ["value"] },
      { id: "insertAt", label: "Insert at", signature: "insertAt(position, value)", description: "Relink a new node into the middle.", fields: ["index", "value"] },
      { id: "removeAt", label: "Remove at", signature: "removeAt(position)", description: "Bypass the node at a position.", fields: ["index"] },
      { id: "search", label: "Search", signature: "search(value)", description: "Follow links until the value matches.", fields: ["value"] },
      { id: "get", label: "Get at", signature: "get(position)", description: "Walk to a position and read its value.", fields: ["index"] }
    ],

    defaultOperation: "search",
    defaultInput: { array: [{ id: "l1", value: 4, next: "l2" }, { id: "l2", value: 8, next: "l3" }, { id: "l3", value: 15, next: null }], headId: "l1", value: 15 },

    run: function (input, emit) {
      var store = Array.isArray(input.array) ? input.array.map(function (n) {
        return { id: n.id, value: n.value, next: n.next };
      }) : [];
      var headId = input.headId === undefined ? null : input.headId;
      var op = input.operation || "search";

      if (headId !== null && indexOfId(store, headId) < 0) headId = null;

      emit && emit({
        type: "message",
        text: "The list holds " + chainLength(store, headId) + " node(s); head is " +
          (headId || "\u2212"),
        line: 1
      });
      setHeadPointer(emit, store, headId, 1, headId ? "Head pointer on " + headId : "No head yet");

      switch (op) {
        case "prepend":
          return opPrepend(store, headId, input.value, emit);
        case "append":
          return opAppend(store, headId, input.value, emit);
        case "insertAt":
          return opInsertAt(store, headId, input.index, input.value, emit);
        case "removeAt":
          return opRemoveAt(store, headId, input.index, emit);
        case "search":
          return opSearch(store, headId, input.value, emit);
        case "get":
          return opGet(store, headId, input.index, emit);
        default:
          return reject(emit, "Unknown linked list operation: " + op, 1);
      }
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
