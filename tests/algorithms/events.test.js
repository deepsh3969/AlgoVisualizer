/**
 * Event contract tests — every definition must speak the documented dialect.
 *
 * The whole platform depends on events being well formed: the timeline
 * builder stores them, the execution engine replays them, renderers paint
 * from the resulting state and the metrics counters are derived from them.
 * A single malformed event would silently corrupt every one of those layers.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var GROUP = "algorithms/events";

  var VOCABULARY = {
    compare: 1, swap: 1, write: 1, resize: 1, mark: 1, unmark: 1,
    pointer: 1, range: 1, visit: 1, current: 1, enqueue: 1, dequeue: 1,
    push: 1, pop: 1, remove: 1, edge: 1, distance: 1, path: 1,
    found: 1, notFound: 1, enter: 1, exit: 1, frameValue: 1, result: 1,
    row: 1, rowClear: 1, message: 1, clear: 1
  };

  var SIZE = 12;
  var SEED = 1;

  function definitions() {
    return AV.algorithms.all().concat(AV.structures.all());
  }

  function inputFor(def) {
    return AV.benchmark.buildInput(def, SIZE, SEED);
  }

  function collect(def, input) {
    var events = [];
    def.run(AV.viz.cloneInput(def, input), function (event) {
      events.push(event);
    });
    return events;
  }

  function isNumber(v) {
    return typeof v === "number" && isFinite(v);
  }

  function hasIndex(event) {
    return isNumber(event.index) ||
      (Array.isArray(event.indices) && event.indices.length > 0);
  }

  AV.test(GROUP, "the event vocabulary is stable", function () {
    var known = Object.keys(VOCABULARY).sort();
    AV.assert(known.length >= 25, "expected the documented vocabulary");
    AV.assert(VOCABULARY.compare && VOCABULARY.swap && VOCABULARY.result);
    AV.assert(VOCABULARY.enter && VOCABULARY.exit, "recursion frames are part of the dialect");
  });

  AV.test(GROUP, "every definition emits well-formed events", function () {
    definitions().forEach(function (def) {
      var input = inputFor(def);
      AV.assert(input, def.id + " needs a benchmark input");
      var events = collect(def, input);
      AV.assert(events.length > 0, def.id + " produced no events");

      events.forEach(function (event, i) {
        var where = def.id + " event #" + i;
        AV.assert(event && typeof event === "object", where + " must be an object");
        AV.assert(
          typeof event.type === "string" && event.type,
          where + " must carry a type"
        );
        AV.assert(VOCABULARY[event.type], where + " used unknown type " + event.type);
      });
    });
  });

  AV.test(GROUP, "each event type carries its required fields", function () {
    definitions().forEach(function (def) {
      var events = collect(def, inputFor(def));
      events.forEach(function (event, i) {
        var where = def.id + " #" + i + " (" + event.type + ")";
        switch (event.type) {
          case "compare":
            AV.assert(Array.isArray(event.indices), where + " needs an indices array");
            AV.assert(
              event.indices.length > 0 || event.key !== undefined,
              where + " needs cells to compare or a key to compare against"
            );
            event.indices.forEach(function (n) { AV.assert(isNumber(n), where + " index"); });
            break;
          case "swap":
            AV.assert(Array.isArray(event.indices) && event.indices.length === 2, where);
            AV.assert(isNumber(event.indices[0]) && isNumber(event.indices[1]), where);
            break;
          case "write":
            AV.assert(isNumber(event.index), where + " needs an index");
            AV.assert(event.value !== undefined, where + " needs a value");
            break;
          case "resize":
            AV.assert(isNumber(event.length), where + " needs a length");
            break;
          case "mark":
            AV.assert(typeof event.role === "string" && event.role, where + " needs a role");
            AV.assert(hasIndex(event), where + " needs targets");
            break;
          case "unmark":
            AV.assert(typeof event.role === "string" && event.role, where + " needs a role");
            break;
          case "pointer":
            AV.assert(typeof event.name === "string" && event.name, where + " needs a name");
            AV.assert(event.index === null || isNumber(event.index), where + " index");
            break;
          case "range":
            AV.assert(event.start === null || isNumber(event.start), where + " start");
            if (event.start !== null && event.start !== undefined) {
              AV.assert(isNumber(event.end), where + " needs an end");
            }
            break;
          case "visit":
          case "current":
          case "enqueue":
          case "dequeue":
          case "push":
          case "pop":
          case "remove":
            AV.assert(event.node !== undefined && event.node !== null, where + " needs a node");
            break;
          case "edge":
            AV.assert(event.from !== undefined && event.from !== null, where + " from");
            AV.assert(event.to !== undefined && event.to !== null, where + " to");
            break;
          case "distance":
            AV.assert(event.node !== undefined, where + " needs a node");
            AV.assert(isNumber(event.distance), where + " needs a distance");
            break;
          case "path":
            AV.assert(Array.isArray(event.nodes), where + " needs nodes");
            break;
          case "found":
            AV.assert(
              event.index !== undefined || event.node !== undefined,
              where + " needs an index or a node"
            );
            break;
          case "enter":
            AV.assert(typeof event.id === "string" && event.id, where + " needs an id");
            AV.assert(typeof event.label === "string" && event.label, where + " needs a label");
            AV.assert(isNumber(event.depth), where + " needs a depth");
            break;
          case "exit":
            AV.assert(typeof event.id === "string" && event.id, where + " needs an id");
            AV.assert(event.value !== undefined, where + " needs a return value");
            break;
          case "frameValue":
          case "result":
            AV.assert(event.value !== undefined, where + " needs a value");
            break;
          case "row":
            AV.assert(typeof event.name === "string" && event.name, where + " needs a name");
            AV.assert(isNumber(event.index), where + " needs an index");
            AV.assert(event.value !== undefined, where + " needs a value");
            break;
          case "message":
            AV.assert(typeof event.text === "string" && event.text.length > 0,
              where + " needs text");
            break;
          default:
            break;
        }
      });
    });
  });

  AV.test(GROUP, "array indices always address a live cell", function () {
    definitions().forEach(function (def) {
      var input = inputFor(def);
      var timeline = AV.viz.buildTimeline(def, input);
      var state = AV.viz.createState(def, input);
      state.definition = def;

      timeline.events.forEach(function (event, i) {
        var where = def.id + " #" + i + " (" + event.type + ")";
        var before = state.array;
        if (Array.isArray(before)) {
          var indices = [];
          if (event.type === "compare" || event.type === "swap" ||
              event.type === "write" || event.type === "mark") {
            indices = event.indices ||
              (event.index !== undefined ? [event.index] : []);
          }
          indices.forEach(function (n) {
            AV.assert(isNumber(n) && n >= 0, where + " has a bad index " + n);
            if (event.type === "write") {
              // A write at exactly length is an append, which extends storage.
              AV.assert(
                n <= before.length,
                where + " writes " + n + " into a storage of " + before.length
              );
            } else {
              AV.assert(
                n < before.length,
                where + " reads " + n + " from a storage of " + before.length
              );
            }
          });
        }
        AV.viz.applyEvent(state, event);
        if (Array.isArray(state.array)) {
          AV.assert(
            state.array.length >= 0,
            where + " must leave a usable storage"
          );
        }
      });
    });
  });

  AV.test(GROUP, "sorting and searching keep every cell finite", function () {
    var numeric = definitions().filter(function (def) {
      return def.category === "sorting" || def.category === "searching" ||
        def.category === "patterns" || def.id === "array" || def.id === "stack" ||
        def.id === "queue";
    });
    numeric.forEach(function (def) {
      var input = inputFor(def);
      var timeline = AV.viz.buildTimeline(def, input);
      var state = AV.viz.createState(def, input);
      state.definition = def;
      for (var i = 0; i < timeline.events.length; i++) {
        AV.viz.applyEvent(state, timeline.events[i]);
      }
      state.array.forEach(function (v, index) {
        AV.assert(isNumber(v), def.id + " left a non-number at index " + index + ": " + v);
      });
      AV.assert(state.metrics.steps > 0, def.id + " must count its steps");
    });
  });

  AV.test(GROUP, "formatEvent narrates every event", function () {
    definitions().forEach(function (def) {
      var input = inputFor(def);
      var timeline = AV.viz.buildTimeline(def, input);
      var state = AV.viz.createState(def, input);
      state.definition = def;
      timeline.events.forEach(function (event, i) {
        var text = AV.viz.formatEvent(event, state);
        AV.assert(typeof text === "string" && text.length > 0,
          def.id + " #" + i + " (" + event.type + ") narrated as empty");
        AV.viz.applyEvent(state, event);
      });
    });
  });

  AV.test(GROUP, "timeline building is deterministic", function () {
    definitions().forEach(function (def) {
      var input = inputFor(def);
      var a = AV.viz.buildTimeline(def, input);
      var b = AV.viz.buildTimeline(def, input);
      AV.assertEqual(a.total, b.total, def.id + " must produce the same number of steps");
      AV.assertEqual(
        JSON.stringify(a.events),
        JSON.stringify(b.events),
        def.id + " must emit the same events for the same input"
      );
      AV.assertDeepEqual(
        AV.viz.createState(def, input).array,
        AV.viz.createState(def, input).array,
        def.id + " must start from the same storage"
      );
    });
  });

  AV.test(GROUP, "checkpoints replay to the same final state", function () {
    definitions().forEach(function (def) {
      var input = inputFor(def);
      var timeline = AV.viz.buildTimeline(def, input);

      var direct = AV.viz.createState(def, input);
      direct.definition = def;
      for (var i = 0; i < timeline.events.length; i++) {
        AV.viz.applyEvent(direct, timeline.events[i]);
      }

      var seeked = AV.viz.createState(def, input);
      seeked.definition = def;
      AV.viz.advance(seeked, timeline, 0, timeline.total);

      AV.assertEqual(
        JSON.stringify(seeked.metrics),
        JSON.stringify(direct.metrics),
        def.id + " metrics must match after a full seek"
      );
      if (Array.isArray(direct.array)) {
        AV.assertDeepEqual(
          seeked.array,
          direct.array,
          def.id + " storage must match after a full seek"
        );
      }
      AV.assertEqual(
        JSON.stringify(seeked.result),
        JSON.stringify(direct.result),
        def.id + " result must match"
      );
    });
  });

  AV.test(GROUP, "the emission contract survives emit = null", function () {
    definitions().forEach(function (def) {
      var input = inputFor(def);
      AV.assertNoThrow(function () { def.run(AV.viz.cloneInput(def, input), null); },
        def.id + " must tolerate a missing emit");
    });
  });

  AV.test(GROUP, "invalid events are ignored rather than fatal", function () {
    var state = AV.viz.createState(AV.algorithms.get("bubbleSort"), { array: [3, 1] });
    var before = state.metrics.steps;
    AV.assertNoThrow(function () { AV.viz.applyEvent(state, null); });
    AV.assertNoThrow(function () { AV.viz.applyEvent(state, { type: "nonsense" }); });
    AV.assertNoThrow(function () { AV.viz.applyEvent(null, { type: "compare" }); });
    AV.assertEqual(state.metrics.steps, before + 1,
      "an unknown type still counts as a step, a null event does not");
  });

  AV.test(GROUP, "registered ids are unique and reachable", function () {
    var seen = Object.create(null);
    definitions().forEach(function (def) {
      AV.assert(!seen[def.id], "duplicate id " + def.id);
      seen[def.id] = true;
      AV.assert(typeof def.name === "string" && def.name.length > 0, def.id + " needs a name");
      AV.assert(typeof def.run === "function", def.id + " needs run()");
      AV.assert(def.complexity && def.complexity.worst, def.id + " needs a worst case");
      AV.assert(Array.isArray(def.pseudocode) && def.pseudocode.length > 0,
        def.id + " needs pseudocode");
    });
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
