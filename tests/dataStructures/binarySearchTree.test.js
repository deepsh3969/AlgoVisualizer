/**
 * Binary search tree structure tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(input) {
    var def = AV.structures.get("binarySearchTree");
    if (!def) throw new Error("Missing structure: binarySearchTree");
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline, definition: def };
  }

  /** Rebuild the reachable shape as { v, l, r } for assertions. */
  function shape(state, depth) {
    var table = state.array;
    var root = state.pointers.root;
    if (root === undefined || root === null || root < 0) return null;
    var limit = depth === undefined ? 32 : depth;

    function build(idx, left) {
      if (idx < 0 || idx >= table.length || left <= 0) return null;
      var n = table[idx];
      var nextLeftId = AV.indexOfNodeId(table, n.left);
      var nextRightId = AV.indexOfNodeId(table, n.right);
      if (nextLeftId === idx || nextRightId === idx) return null;
      return {
        v: n.value,
        l: build(nextLeftId, left - 1),
        r: build(nextRightId, left - 1)
      };
    }
    return build(root, limit);
  }

  function inorder(state) {
    var table = state.array;
    var root = state.pointers.root;
    if (root === undefined || root === null || root < 0) return [];
    var out = [];
    var guard = 0;
    function walk(idx) {
      if (idx < 0 || idx >= table.length || guard > 64) return;
      guard += 1;
      var n = table[idx];
      walk(AV.indexOfNodeId(table, n.left));
      out.push(n.value);
      walk(AV.indexOfNodeId(table, n.right));
    }
    walk(root);
    return out;
  }

  var GROUP = "dataStructures/binarySearchTree";

  AV.test(GROUP, "registers with metadata and tree operations", function () {
    var def = AV.structures.get("binarySearchTree");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "structures");
    AV.assertEqual(def.viz, "tree");
    var ids = def.operations.map(function (op) { return op.id; }).join(",");
    AV.assertEqual(ids, "insert,search,remove,inorder");
    AV.assert(def.complexity.worst.indexOf("O(n)") >= 0, "honest about skew");
  });

  AV.test(GROUP, "input builder produces an ordered tree", function () {
    var input = AV.binarySearchTreeInput([8, 4, 15]);
    AV.assert(input.rootId, "root id present");
    AV.assertEqual(input.array.length, 3);
    var out = run(input);
    AV.assertEqual(JSON.stringify(shape(out.state)), JSON.stringify({ v: 8, l: { v: 4, l: null, r: null }, r: { v: 15, l: null, r: null } }));
  });

  AV.test(GROUP, "insert fills an empty tree", function () {
    var out = run({ operation: "insert", array: [], rootId: null, value: 8 });
    AV.assertEqual(out.state.array.length, 1);
    AV.assertEqual(out.state.result, 8);
    AV.assert(out.state.pointers.root >= 0, "root adopted");
    AV.assertEqual(shape(out.state).v, 8);
  });

  AV.test(GROUP, "insert respects the ordering invariant", function () {
    var input = AV.binarySearchTreeInput([8]);
    input.operation = "insert";
    input.value = 4;
    var small = run(input);
    AV.assertEqual(shape(small.state).l.v, 4, "smaller goes left");
    AV.assertEqual(shape(small.state).r, null);

    input.value = 15;
    var large = run(input);
    AV.assertEqual(shape(large.state).r.v, 15, "larger goes right");
    AV.assertEqual(shape(large.state).l, null);
  });

  AV.test(GROUP, "insert descends to the right leaf", function () {
    var input = AV.binarySearchTreeInput([8, 4, 15]);
    input.operation = "insert";
    input.value = 12;
    var out = run(input);
    AV.assertEqual(shape(out.state).r.l.v, 12, "under the 15");
    AV.assertEqual(shape(out.state).r.r, null);
    AV.assertEqual(out.state.result, 12);
  });

  AV.test(GROUP, "insert rejects duplicates", function () {
    var input = AV.binarySearchTreeInput([8, 4]);
    input.operation = "insert";
    input.value = 8;
    var out = run(input);
    AV.assertEqual(out.state.result, "duplicate");
    AV.assertEqual(out.state.array.length, 2, "no node added");
    AV.assert(String(out.state.message).indexOf("duplicate") >= 0);
  });

  AV.test(GROUP, "search discards half the tree per step", function () {
    var input = AV.binarySearchTreeInput([8, 4, 15, 2]);
    input.operation = "search";
    input.value = 2;
    var out = run(input);
    AV.assertEqual(out.state.result, 2);
    AV.assert(out.state.hasFound);
    var compares = out.timeline.events.filter(function (e) { return e.type === "compare"; });
    AV.assertEqual(compares.length, 3, "8, then 4, then 2");
  });

  AV.test(GROUP, "search misses report not found", function () {
    var input = AV.binarySearchTreeInput([8, 4, 15]);
    input.operation = "search";
    input.value = 99;
    var out = run(input);
    AV.assertEqual(out.state.result, "not found");
    AV.assertEqual(out.state.found, null);
  });

  AV.test(GROUP, "remove unlinks a leaf", function () {
    var input = AV.binarySearchTreeInput([8, 4, 15]);
    input.operation = "remove";
    input.value = 4;
    var out = run(input);
    AV.assertEqual(shape(out.state).l, null, "left child gone");
    AV.assertEqual(shape(out.state).v, 8, "root untouched");
    AV.assertEqual(out.state.result, 4);
    AV.assert(out.state.array.length === 3, "detached node keeps its slot");
    AV.assert(inorder(out.state).indexOf(4) < 0, "but it is unreachable");
  });

  AV.test(GROUP, "remove relinks a single child", function () {
    var input = AV.binarySearchTreeInput([8, 4, 2]);
    input.operation = "remove";
    input.value = 4;
    var out = run(input);
    AV.assertEqual(shape(out.state).l.v, 2, "grandchild promoted");
    AV.assertEqual(shape(out.state).l.l, null);
    AV.assertEqual(out.state.result, 4);
  });

  AV.test(GROUP, "remove swaps in the in-order successor", function () {
    var input = AV.binarySearchTreeInput([8, 4, 15, 12]);
    AV.assertEqual(inorder(run(input).state).join(","), "4,8,12,15");

    input.operation = "remove";
    input.value = 8;
    var out = run(input);
    AV.assertEqual(out.state.result, 8);
    AV.assertEqual(shape(out.state).v, 12, "successor value promoted to the root");
    AV.assertEqual(shape(out.state).l.v, 4, "left subtree stays");
    AV.assertEqual(shape(out.state).r.v, 15, "right subtree stays");
    AV.assertEqual(shape(out.state).r.l, null, "successor unlinked from its old place");
    AV.assertEqual(inorder(out.state).join(","), "4,12,15", "still ascending");
  });

  AV.test(GROUP, "remove reports a missing value", function () {
    var input = AV.binarySearchTreeInput([8]);
    input.operation = "remove";
    input.value = 99;
    var out = run(input);
    AV.assertEqual(out.state.result, "not found");
    AV.assertEqual(out.state.array.length, 1);
  });

  AV.test(GROUP, "in-order traversal yields ascending values", function () {
    var input = AV.binarySearchTreeInput([8, 4, 15, 2, 12]);
    input.operation = "inorder";
    var out = run(input);
    AV.assertEqual(out.state.result.join(","), "2,4,8,12,15");
    var rows = out.timeline.events.filter(function (e) { return e.type === "row"; });
    AV.assertEqual(rows.length, 5, "one output cell per node");
    AV.assertEqual(rows.map(function (e) { return e.value; }).join(","), "2,4,8,12,15");
    AV.assertEqual(
      out.timeline.events.filter(function (e) { return e.type === "mark" && e.role === "sorted"; }).length,
      5,
      "each node is highlighted as it is visited"
    );
  });

  AV.test(GROUP, "in-order on an empty tree is empty", function () {
    var out = run({ operation: "inorder", array: [], rootId: null });
    AV.assertEqual(out.state.result.length, 0);
  });

  AV.test(GROUP, "never mutates the caller's node objects", function () {
    var input = AV.binarySearchTreeInput([8, 4]);
    var before = JSON.stringify(input.array);
    input.operation = "insert";
    input.value = 15;
    run(input);
    AV.assertEqual(JSON.stringify(input.array), before, "input untouched");
  });

  AV.test(GROUP, "rejects unknown operations", function () {
    var input = AV.binarySearchTreeInput([8]);
    input.operation = "juggle";
    AV.assertEqual(run(input).state.result, "error");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
