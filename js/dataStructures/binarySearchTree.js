/**
 * Binary Search Tree — ordered nodes joined by left / right pointers.
 *
 * Storage is a node table of { id, value, left, right } entries. Inserts
 * append a node and edits one parent link; deletes relink the parent and
 * leave the removed node unreachable, so no surviving index ever shifts.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function reject(emit, text, line) {
    emit && emit({ type: "message", text: text, line: line || 1 });
    emit && emit({ type: "result", value: "error", line: line || 1 });
    return null;
  }

  function notFound(emit, value, line) {
    emit && emit({
      type: "notFound",
      line: line,
      text: value + " is not in the tree"
    });
    emit && emit({ type: "result", value: "not found", line: line });
    return "not found";
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

  function setRootPointer(emit, store, rootId, line, text) {
    var index = indexOfId(store, rootId);
    emit && emit({
      type: "pointer",
      name: "root",
      index: index >= 0 ? index : null,
      line: line,
      text: text
    });
  }

  function setCursor(emit, index, line, text) {
    emit && emit({
      type: "pointer",
      name: "current",
      index: index !== null && index >= 0 ? index : null,
      line: line,
      text: text
    });
  }

  function writeNode(store, index, node, emit, line, text) {
    emit && emit({ type: "write", index: index, value: node, line: line, text: text });
    store[index] = node;
  }

  function compareAt(store, index, value, emit, line) {
    emit && emit({
      type: "compare",
      indices: [index],
      key: value,
      line: line,
      text: "Compare " + value + " with node " + store[index].value
    });
  }

  function findMinFrom(store, startId) {
    var idx = indexOfId(store, startId);
    var parentId = null;
    var guard = 0;
    while (idx >= 0 && store[idx].left !== null && guard <= store.length) {
      parentId = store[idx].id;
      idx = indexOfId(store, store[idx].left);
      guard += 1;
    }
    if (idx < 0) return null;
    return { index: idx, node: store[idx], parentId: parentId };
  }

  /* ------------------------------------------------------------------ */

  function opInsert(store, rootId, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to insert", 1);
    }

    var idx = indexOfId(store, rootId);
    if (idx < 0) {
      var first = { id: freshId(store), value: value, left: null, right: null };
      writeNode(store, store.length, first, emit, 2,
        "The tree is empty - node " + first.id + " holding " + value + " becomes the root");
      setRootPointer(emit, store, first.id, 3, "The root pointer adopts node " + first.id);
      emit && emit({ type: "message", text: "An empty tree grows its root in one write", line: 4 });
      emit && emit({ type: "result", value: value, line: 5 });
      return value;
    }

    var parentId = null;
    var key = null;
    var guard = 0;
    setRootPointer(emit, store, rootId, 1, "Start at the root");

    while (idx >= 0 && guard <= store.length) {
      var node = store[idx];
      setCursor(emit, idx, 2, "Inspect node " + node.value);
      compareAt(store, idx, value, emit, 3);

      if (value === node.value) {
        emit && emit({
          type: "message",
          text: value + " already exists - a BST keeps no duplicates",
          line: 4
        });
        emit && emit({ type: "result", value: "duplicate", line: 5 });
        return "duplicate";
      }

      parentId = node.id;
      key = value < node.value ? "left" : "right";
      emit && emit({
        type: "message",
        text: value < node.value
          ? value + " is smaller than " + node.value + ", go left"
          : value + " is larger than " + node.value + ", go right",
        line: 5
      });
      idx = indexOfId(store, node[key]);
      guard += 1;
    }

    var child = { id: freshId(store), value: value, left: null, right: null };
    writeNode(store, store.length, child, emit, 6,
      "Create node " + child.id + " holding " + value + " with no children");

    var parentIndex = indexOfId(store, parentId);
    var parent = store[parentIndex];
    var updated = { id: parent.id, value: parent.value, left: parent.left, right: parent.right };
    updated[key] = child.id;
    writeNode(store, parentIndex, updated, emit, 7,
      "Link " + parent.value + "." + key + " to the new node");

    setCursor(emit, store.length - 1, 8, "Node " + value + " is in place");
    emit && emit({
      type: "message",
      text: "Insert follows one root-to-leaf path: O(height) comparisons",
      line: 9
    });
    emit && emit({ type: "result", value: value, line: 10 });
    return value;
  }

  function opSearch(store, rootId, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to search for", 1);
    }
    var idx = indexOfId(store, rootId);
    if (idx < 0) {
      emit && emit({ type: "message", text: "The tree is empty", line: 2 });
      return notFound(emit, value, 3);
    }

    var guard = 0;
    setRootPointer(emit, store, rootId, 2, "Start at the root");

    while (idx >= 0 && guard <= store.length) {
      var node = store[idx];
      setCursor(emit, idx, 3, "Inspect node " + node.value);
      compareAt(store, idx, value, emit, 4);

      if (value === node.value) {
        emit && emit({
          type: "found",
          index: idx,
          line: 5,
          text: "Match - node " + node.value + " is in the tree"
        });
        emit && emit({ type: "result", value: node.value, line: 6 });
        return node.value;
      }

      var side = value < node.value ? "left" : "right";
      emit && emit({
        type: "message",
        text: value < node.value
          ? value + " < " + node.value + ", discard the right subtree"
          : value + " > " + node.value + ", discard the left subtree",
        line: 7
      });
      idx = indexOfId(store, node[side]);
      guard += 1;
    }

    return notFound(emit, value, 8);
  }

  function unlink(store, rootId, parentId, key, replacementId, emit, line) {
    if (parentId === null) {
      rootId = replacementId;
      setRootPointer(emit, store, rootId, line, replacementId
        ? "The removed node's child is promoted to the root"
        : "The root clears - the tree is empty");
      return rootId;
    }
    var pIdx = indexOfId(store, parentId);
    if (pIdx < 0) return rootId;
    var parent = store[pIdx];
    var updated = { id: parent.id, value: parent.value, left: parent.left, right: parent.right };
    updated[key] = replacementId;
    writeNode(store, pIdx, updated, emit, line,
      "Relink " + parent.value + "." + key + " to " +
      (replacementId ? "node " + replacementId : "null"));
    return rootId;
  }

  function opRemove(store, rootId, value, emit) {
    if (value === undefined || value === null || value === "") {
      return reject(emit, "Enter a value to remove", 1);
    }
    var idx = indexOfId(store, rootId);
    if (idx < 0) {
      emit && emit({ type: "message", text: "The tree is empty", line: 2 });
      return notFound(emit, value, 3);
    }

    var parentId = null;
    var key = null;
    var guard = 0;
    setRootPointer(emit, store, rootId, 2, "Start at the root");

    while (idx >= 0 && guard <= store.length) {
      var node = store[idx];
      setCursor(emit, idx, 3, "Inspect node " + node.value);
      compareAt(store, idx, value, emit, 4);
      if (value === node.value) break;

      parentId = node.id;
      key = value < node.value ? "left" : "right";
      emit && emit({
        type: "message",
        text: value < node.value ? "Go left" : "Go right",
        line: 5
      });
      idx = indexOfId(store, node[key]);
      guard += 1;
    }
    if (idx < 0) return notFound(emit, value, 6);

    var target = store[idx];

    if (target.left === null && target.right === null) {
      emit && emit({ type: "message", text: "A leaf has no children to reattach", line: 7 });
      rootId = unlink(store, rootId, parentId, key, null, emit, 8);
    } else if (target.left === null || target.right === null) {
      var only = target.left !== null ? target.left : target.right;
      emit && emit({
        type: "message",
        text: "One child - the parent links straight to it, skipping the removed node",
        line: 7
      });
      rootId = unlink(store, rootId, parentId, key, only, emit, 8);
    } else {
      emit && emit({
        type: "message",
        text: "Two children - replace the value with its in-order successor",
        line: 7
      });
      var succ = findMinFrom(store, target.right);
      if (!succ) return notFound(emit, value, 7);

      writeNode(store, idx, {
        id: target.id,
        value: succ.node.value,
        left: target.left,
        right: target.right
      }, emit, 8, "Copy the successor value " + succ.node.value + " into node " + target.value);

      if (succ.parentId === null) {
        rootId = unlink(store, rootId, target.id, "right", succ.node.right, emit, 9);
      } else {
        var spIdx = indexOfId(store, succ.parentId);
        var sp = store[spIdx];
        var spUpdated = { id: sp.id, value: sp.value, left: sp.left, right: sp.right };
        spUpdated.left = succ.node.right;
        writeNode(store, spIdx, spUpdated, emit, 9,
          "Unlink the successor; " + sp.value + ".left becomes " +
          (succ.node.right || "null"));
      }
    }

    emit && emit({
      type: "mark",
      index: idx,
      role: "eliminated",
      line: 10,
      text: "Node " + target.id + " is detached from the tree"
    });
    emit && emit({
      type: "message",
      text: "Deletion follows one search path, then repairs a single link: O(height)",
      line: 11
    });
    emit && emit({ type: "result", value: value, line: 12 });
    return value;
  }

  function opInorder(store, rootId, emit) {
    var idx = indexOfId(store, rootId);
    if (idx < 0) {
      emit && emit({ type: "message", text: "The tree is empty - nothing to traverse", line: 2 });
      emit && emit({ type: "result", value: [], line: 3 });
      return [];
    }

    var output = [];
    setRootPointer(emit, store, rootId, 2, "Start at the root");

    function walk(nodeId, depth) {
      if (output.length > 128) return;
      var i = indexOfId(store, nodeId);
      if (i < 0) return;
      var n = store[i];
      setCursor(emit, i, 3, "Descend to node " + n.value + " (depth " + depth + ")");
      if (n.left !== null) {
        emit && emit({
          type: "message",
          text: "Left subtree of " + n.value + " comes first",
          line: 4
        });
        walk(n.left, depth + 1);
      }
      output.push(n.value);
      emit && emit({
        type: "mark",
        index: i,
        role: "sorted",
        line: 5,
        text: "Visit " + n.value + " - it is next in ascending order"
      });
      emit && emit({
        type: "row",
        name: "traversal",
        index: output.length - 1,
        value: n.value,
        line: 5
      });
      if (n.right !== null) {
        emit && emit({
          type: "message",
          text: "Right subtree of " + n.value + " comes last",
          line: 6
        });
        walk(n.right, depth + 1);
      }
    }

    walk(rootId, 0);
    emit && emit({
      type: "message",
      text: "In-order is left, root, right - which yields ascending order on a BST",
      line: 7
    });
    emit && emit({ type: "result", value: output, line: 8 });
    return output;
  }

  /* ------------------------------------------------------------------ */

  AV.registerStructure({
    id: "binarySearchTree",
    name: "Binary Search Tree",
    category: "structures",
    viz: "tree",
    tagline: "Ordered binary nodes - O(height) search, sorted traversal for free.",
    keywords: ["bst", "binary search tree", "tree", "inorder", "node"],
    complexity: {
      best: "O(log n)",
      average: "O(log n)",
      worst: "O(n) skewed",
      space: "O(n)"
    },
    stable: false,
    inPlace: false,

    explanation: {
      what:
        "A binary search tree keeps every node's value ordered: everything smaller lives in the left subtree, everything larger in the right. That invariant lets you discard half the tree at every step.",
      how:
        "Insert and search both walk one root-to-leaf path, branching left or right after each comparison. Deleting has three cases: a leaf simply unlinks, a node with one child is skipped over, and a node with two children is replaced by its in-order successor (the smallest value in the right subtree).",
      steps: [
        "Start at the root and compare the target with the current node.",
        "Go left when the target is smaller, right when it is larger.",
        "Insert at the first empty child slot you reach.",
        "Delete: leaf unlinks, one child relinks, two children swap in the successor.",
        "Traverse in-order (left, root, right) to read the values ascending."
      ],
      useCases: [
        "Ordered dictionaries and sets with dynamic size.",
        "Database indexes and ordered lookups.",
        "Building sorted output from an unsorted stream."
      ]
    },

    example:
      "Search 15 in 8 \u2192 15: one comparison. Search 4: go left, then left again. Each comparison halves the remaining subtree - until the tree becomes a skewed linked list, which is why balanced trees exist.",

    pseudocode: [
      "procedure insert(root, value):",
      "    if root = null:  return Node(value)",
      "    if value < root.value:   root.left \u2190 insert(root.left, value)",
      "    elif value > root.value: root.right \u2190 insert(root.right, value)",
      "    return root                         // duplicates ignored",
      "",
      "function search(node, value):",
      "    if node = null or node.value = value:  return node",
      "    if value < node.value:  return search(node.left, value)",
      "    return search(node.right, value)",
      "",
      "procedure remove(node, value):",
      "    if leaf:          unlink the node",
      "    if one child:     parent links straight to that child",
      "    if two children:  copy the in-order successor's value in,",
      "                     then unlink the successor from the right subtree",
      "",
      "procedure inOrder(node):",
      "    if node = null:  return",
      "    inOrder(node.left);   visit(node);   inOrder(node.right)"
    ],

    readyMessage: "Press Play to descend the tree one comparison at a time.",

    operations: [
      { id: "insert", label: "Insert", signature: "insert(value)", description: "Walk one path down and link a new leaf.", fields: ["value"] },
      { id: "search", label: "Search", signature: "search(value)", description: "Halve the search space at every node.", fields: ["value"] },
      { id: "remove", label: "Remove", signature: "remove(value)", description: "Delete a node and repair its parent link.", fields: ["value"] },
      { id: "inorder", label: "In-order", signature: "inOrder()", description: "Read the values back in ascending order.", fields: [] }
    ],

    defaultOperation: "search",
    defaultInput: {
      array: [
        { id: "t1", value: 8, left: "t2", right: "t3" },
        { id: "t2", value: 4, left: null, right: null },
        { id: "t3", value: 15, left: null, right: null }
      ],
      rootId: "t1",
      value: 15
    },

    run: function (input, emit) {
      var store = Array.isArray(input.array) ? input.array.map(function (n) {
        return { id: n.id, value: n.value, left: n.left, right: n.right };
      }) : [];
      var rootId = input.rootId === undefined ? null : input.rootId;
      var op = input.operation || "search";

      if (rootId !== null && indexOfId(store, rootId) < 0) rootId = null;

      emit && emit({
        type: "message",
        text: "The tree holds " + store.length + " node(s); the root is " + (rootId || "\u2212"),
        line: 1
      });
      setRootPointer(emit, store, rootId, 1, rootId ? "Root pointer on " + rootId : "No root yet");

      switch (op) {
        case "insert":
          return opInsert(store, rootId, input.value, emit);
        case "search":
          return opSearch(store, rootId, input.value, emit);
        case "remove":
          return opRemove(store, rootId, input.value, emit);
        case "inorder":
          return opInorder(store, rootId, emit);
        default:
          return reject(emit, "Unknown tree operation: " + op, 1);
      }
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
