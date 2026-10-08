/**
 * Singly linked list structure tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(input) {
    var def = AV.structures.get("linkedList");
    if (!def) throw new Error("Missing structure: linkedList");
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline, definition: def };
  }

  /** Walk head -> next and collect the reachable values. */
  function chain(state) {
    var table = state.array;
    var head = state.pointers.head;
    if (head === undefined || head === null || head < 0) return [];
    var values = [];
    var idx = head;
    var guard = 0;
    while (idx >= 0 && idx < table.length && guard <= table.length) {
      values.push(table[idx].value);
      var next = table[idx].next;
      if (next === null || next === undefined) break;
      idx = AV.indexOfNodeId(table, next);
      guard += 1;
      if (idx < 0) break;
    }
    return values;
  }

  var GROUP = "dataStructures/linkedList";

  AV.test(GROUP, "registers with metadata and list operations", function () {
    var def = AV.structures.get("linkedList");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "structures");
    AV.assertEqual(def.viz, "linked");
    var ids = def.operations.map(function (op) { return op.id; }).join(",");
    AV.assertEqual(ids, "prepend,append,insertAt,removeAt,search,get");
  });

  AV.test(GROUP, "input builder wires a reachable chain", function () {
    var input = AV.linkedListInput([4, 8, 15]);
    AV.assertEqual(input.array.length, 3);
    AV.assert(input.headId, "head id present");
    AV.assert(AV.findNodeById(input.array, input.headId), "head resolves");
    var out = run(input);
    AV.assertEqual(chain(out.state).join(","), "4,8,15");
  });

  AV.test(GROUP, "prepend installs a new head in O(1)", function () {
    var input = AV.linkedListInput([4, 8]);
    input.operation = "prepend";
    input.value = 99;
    var out = run(input);

    AV.assertEqual(chain(out.state).join(","), "99,4,8");
    AV.assertEqual(out.state.result, 3, "returns the new length");
    AV.assertEqual(
      out.timeline.events.filter(function (e) { return e.type === "write"; }).length,
      1,
      "one node created - nothing else is rewritten"
    );
    AV.assert(
      out.state.array.length > 2,
      "the old nodes keep their table slots"
    );
  });

  AV.test(GROUP, "prepend fills an empty list", function () {
    var input = AV.linkedListInput([]);
    input.operation = "prepend";
    input.value = 7;
    var out = run(input);
    AV.assertEqual(chain(out.state).join(","), "7");
    AV.assertEqual(out.state.result, 1);
    AV.assert(out.state.pointers.head >= 0, "head adopted the new node");
  });

  AV.test(GROUP, "append walks to the tail then links", function () {
    var input = AV.linkedListInput([4, 8]);
    input.operation = "append";
    input.value = 15;
    var out = run(input);

    AV.assertEqual(chain(out.state).join(","), "4,8,15");
    AV.assertEqual(out.state.result, 3);
    AV.assert(
      out.timeline.events.some(function (e) { return e.type === "pointer" && e.name === "current"; }),
      "the walk is visible"
    );
    var writes = out.timeline.events.filter(function (e) { return e.type === "write"; });
    AV.assertEqual(writes.length, 2, "create the node, then relink the tail");
  });

  AV.test(GROUP, "append fills an empty list", function () {
    var input = AV.linkedListInput([]);
    input.operation = "append";
    input.value = 7;
    var out = run(input);
    AV.assertEqual(chain(out.state).join(","), "7");
    AV.assertEqual(out.state.result, 1);
  });

  AV.test(GROUP, "insertAt splices into the middle", function () {
    var input = AV.linkedListInput([4, 8, 15]);
    input.operation = "insertAt";
    input.index = 1;
    input.value = 99;
    var out = run(input);

    AV.assertEqual(chain(out.state).join(","), "4,99,8,15");
    AV.assertEqual(out.state.result, 4);
    var writes = out.timeline.events.filter(function (e) { return e.type === "write"; });
    AV.assertEqual(writes.length, 2, "create then relink");
  });

  AV.test(GROUP, "insertAt at position zero behaves like prepend", function () {
    var input = AV.linkedListInput([4, 8]);
    input.operation = "insertAt";
    input.index = 0;
    input.value = 99;
    var out = run(input);
    AV.assertEqual(chain(out.state).join(","), "99,4,8");
  });

  AV.test(GROUP, "insertAt rejects a bad position", function () {
    var input = AV.linkedListInput([4, 8]);
    input.operation = "insertAt";
    input.index = 9;
    input.value = 1;
    AV.assertEqual(run(input).state.result, "error");
  });

  AV.test(GROUP, "removeAt detaches the head", function () {
    var input = AV.linkedListInput([4, 8, 15]);
    input.operation = "removeAt";
    input.index = 0;
    var out = run(input);

    AV.assertEqual(chain(out.state).join(","), "8,15");
    AV.assertEqual(out.state.result, 4, "returns the removed value");
    AV.assert(out.state.array.length === 3, "detached node keeps its slot");
    AV.assert(
      chain(out.state).indexOf(4) < 0,
      "but it is no longer reachable from the head"
    );
  });

  AV.test(GROUP, "removeAt bypasses a middle node", function () {
    var input = AV.linkedListInput([4, 8, 15]);
    input.operation = "removeAt";
    input.index = 1;
    var out = run(input);
    AV.assertEqual(chain(out.state).join(","), "4,15");
    AV.assertEqual(out.state.result, 8);
    var writes = out.timeline.events.filter(function (e) { return e.type === "write"; });
    AV.assertEqual(writes.length, 1, "only the predecessor is relinked");
  });

  AV.test(GROUP, "removeAt rejects a bad position", function () {
    var input = AV.linkedListInput([4, 8]);
    input.operation = "removeAt";
    input.index = 5;
    AV.assertEqual(run(input).state.result, "error");

    var empty = AV.linkedListInput([]);
    empty.operation = "removeAt";
    empty.index = 0;
    AV.assertEqual(run(empty).state.result, "error");
  });

  AV.test(GROUP, "search reports the logical position", function () {
    var input = AV.linkedListInput([4, 8, 15]);
    input.operation = "search";
    input.value = 15;
    var out = run(input);
    AV.assertEqual(out.state.result, 2, "third node");
    AV.assert(out.state.hasFound);

    var compares = out.timeline.events
      .filter(function (e) { return e.type === "compare"; });
    AV.assertEqual(compares.length, 3, "one comparison per node walked");
  });

  AV.test(GROUP, "search misses report -1", function () {
    var input = AV.linkedListInput([4, 8]);
    input.operation = "search";
    input.value = 99;
    var out = run(input);
    AV.assertEqual(out.state.result, -1);
    AV.assertEqual(out.state.found, null);
  });

  AV.test(GROUP, "get reads a position", function () {
    var input = AV.linkedListInput([4, 8, 15]);
    input.operation = "get";
    input.index = 2;
    AV.assertEqual(run(input).state.result, 15);

    input.index = 7;
    AV.assertEqual(run(input).state.result, "error");
  });

  AV.test(GROUP, "never mutates the caller's node objects", function () {
    var input = AV.linkedListInput([4, 8]);
    var before = JSON.stringify(input.array);
    input.operation = "prepend";
    input.value = 99;
    run(input);
    AV.assertEqual(JSON.stringify(input.array), before, "input untouched");
  });

  AV.test(GROUP, "rejects unknown operations", function () {
    var input = AV.linkedListInput([4]);
    input.operation = "juggle";
    AV.assertEqual(run(input).state.result, "error");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
