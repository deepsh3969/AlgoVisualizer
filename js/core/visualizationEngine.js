/**
 * AlgoVisualizer — visualization engine
 *
 * Architecture:
 *
 *   Algorithm.run(input, emit)
 *          |  emits structured events (compare / swap / visit / ...)
 *          v
 *   buildTimeline()  --->  { events[], checkpoints[], initial }
 *          |
 *          v
 *   ExecutionEngine seeks to step N by restoring the nearest checkpoint
 *   and replaying the following events through applyEvent().
 *          |
 *          v
 *   Renderer receives a plain state object and paints the DOM.
 *
 * Keeping algorithms event-based (instead of mutating the DOM) is what makes
 * step-through, replay, comparison mode, metrics and benchmarking possible
 * from a single implementation.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var CHECKPOINT_INTERVAL = 64;

  var ROLE_PRIORITY = {
    swap: 100,
    compare: 90,
    active: 80,
    pivot: 74,
    candidate: 70,
    found: 66,
    "new": 64,
    sorted: 40,
    eliminated: 30,
    muted: 10
  };

  var TRANSIENT_ROLES = ["compare", "swap"];

  /**
   * Viz kinds whose primary storage is a flat array in `state.array`.
   * Graph and recursion kinds keep their own structures instead.
   */
  var ARRAY_VIZ_KINDS = {
    array: 1,
    search: 1,
    pattern: 1,
    stack: 1,
    queue: 1,
    linked: 1,
    tree: 1
  };

  var DEFAULT_METRICS = {
    comparisons: 0,
    swaps: 0,
    writes: 0,
    accesses: 0,
    steps: 0,
    visited: 0,
    enqueued: 0,
    dequeued: 0,
    pushes: 0,
    pops: 0,
    relaxations: 0,
    calls: 0,
    maxDepth: 0
  };

  /* ------------------------------------------------------------------------
   * State lifecycle
   * ---------------------------------------------------------------------- */

  function createMetrics() {
    var m = {};
    for (var k in DEFAULT_METRICS) m[k] = DEFAULT_METRICS[k];
    return m;
  }

  function cloneInput(definition, input) {
    if (input === null || typeof input !== "object") return input;
    if (Array.isArray(input)) return input.slice();
    var out = {};
    for (var k in input) {
      if (!Object.prototype.hasOwnProperty.call(input, k)) continue;
      var v = input[k];
      out[k] = Array.isArray(v) ? v.slice() : v;
    }
    if (out.graph) {
      out.graph = {
        nodes: out.graph.nodes.map(function (n) { return Object.assign({}, n); }),
        edges: out.graph.edges.map(function (e) { return Object.assign({}, e); })
      };
    }
    return out;
  }

  function createState(definition, input) {
    var kind = (definition && definition.viz) || "array";
    var state = {
      viz: kind,
      definition: definition || null,
      input: cloneInput(definition, input),
      array: null,
      mark: {},
      roles: {},
      pointers: {},
      range: null,
      visited: {},
      visitOrder: [],
      current: null,
      queue: [],
      stack: [],
      distances: {},
      path: [],
      traversed: {},
      hasFound: false,
      found: null,
      result: undefined,
      resultReady: false,
      rows: {},
      frames: [],
      callNodes: {},
      callEdges: [],
      metrics: createMetrics()
    };

    if (ARRAY_VIZ_KINDS[kind]) {
      state.array = Array.isArray(input && input.array) ? input.array.slice() : [];
    }
    return state;
  }

  /* ------------------------------------------------------------------------
   * Roles
   * ---------------------------------------------------------------------- */

  function addRole(state, role, index) {
    var set = state.roles[role];
    if (!set) {
      set = Object.create(null);
      state.roles[role] = set;
    }
    if (set[index]) return;
    set[index] = true;
    recomputeMark(state, index);
  }

  function removeRoleFromIndex(state, role, index) {
    var set = state.roles[role];
    if (!set || !set[index]) return;
    delete set[index];
    recomputeMark(state, index);
  }

  function removeRoleEverywhere(state, role) {
    var set = state.roles[role];
    if (!set) return;
    // Drop the role first, otherwise recomputeMark still sees it and leaves
    // a stale entry in state.mark.
    delete state.roles[role];
    for (var k in set) {
      if (Object.prototype.hasOwnProperty.call(set, k)) {
        recomputeMark(state, Number(k));
      }
    }
  }

  function recomputeMark(state, index) {
    var best = null;
    var bestPriority = -1;
    for (var role in state.roles) {
      if (!Object.prototype.hasOwnProperty.call(state.roles, role)) continue;
      if (state.roles[role][index]) {
        var p = ROLE_PRIORITY[role];
        if (p === undefined) p = 0;
        if (p > bestPriority) {
          bestPriority = p;
          best = role;
        }
      }
    }
    if (best === null) delete state.mark[index];
    else state.mark[index] = best;
  }

  /**
   * Drop pointers and role highlights that no longer address a live cell
   * after the storage shrinks. Keeps renderers from painting ghosts.
   */
  function trimToLength(state, length) {
    var name;
    for (name in state.pointers) {
      if (!Object.prototype.hasOwnProperty.call(state.pointers, name)) continue;
      if (state.pointers[name] === null || state.pointers[name] >= length) {
        delete state.pointers[name];
      }
    }
    for (name in state.roles) {
      if (!Object.prototype.hasOwnProperty.call(state.roles, name)) continue;
      var set = state.roles[name];
      for (var k in set) {
        if (!Object.prototype.hasOwnProperty.call(set, k)) continue;
        if (Number(k) >= length) removeRoleFromIndex(state, name, Number(k));
      }
    }
    if (state.range && state.range.start >= length) state.range = null;
  }

  function roleIndices(state, role) {
    var set = state.roles[role];
    if (!set) return [];
    var out = [];
    for (var k in set) {
      if (Object.prototype.hasOwnProperty.call(set, k)) out.push(Number(k));
    }
    return out;
  }

  /* ------------------------------------------------------------------------
   * Event application (deterministic given state + event)
   * ---------------------------------------------------------------------- */

  function applyEvent(state, event) {
    if (!event || !state) return state;
    var i;
    var idx = event.indices
      ? event.indices
      : event.index !== undefined
        ? [event.index]
        : [];

    for (i = 0; i < TRANSIENT_ROLES.length; i++) {
      removeRoleEverywhere(state, TRANSIENT_ROLES[i]);
    }

    state.metrics.steps += 1;

    switch (event.type) {
      case "compare":
        state.metrics.comparisons += 1;
        state.metrics.accesses += 2;
        for (i = 0; i < idx.length; i++) addRole(state, "compare", idx[i]);
        break;

      case "swap": {
        var a = event.indices[0];
        var b = event.indices[1];
        var tmp = state.array[a];
        state.array[a] = state.array[b];
        state.array[b] = tmp;
        state.metrics.swaps += 1;
        state.metrics.accesses += 4;
        addRole(state, "swap", a);
        addRole(state, "swap", b);
        break;
      }

      case "write":
        state.array[event.index] = event.value;
        state.metrics.writes += 1;
        state.metrics.accesses += 2;
        addRole(state, "swap", event.index);
        break;

      case "resize": {
        if (!Array.isArray(state.array)) break;
        var next = Math.max(0, Math.floor(Number(event.length)));
        if (!isFinite(next)) next = 0;
        var previous = state.array.length;
        state.array.length = next;
        state.metrics.writes += Math.max(1, Math.abs(next - previous));
        state.metrics.accesses += 1;
        trimToLength(state, next);
        break;
      }

      case "mark": {
        var indices = event.indices || (event.index !== undefined ? [event.index] : []);
        for (i = 0; i < indices.length; i++) addRole(state, event.role, indices[i]);
        break;
      }

      case "unmark":
        if (event.indices || event.index !== undefined) {
          var ui = event.indices || [event.index];
          for (i = 0; i < ui.length; i++) removeRoleFromIndex(state, event.role, ui[i]);
        } else {
          removeRoleEverywhere(state, event.role);
        }
        break;

      case "pointer":
        if (event.index === null || event.index === undefined) {
          delete state.pointers[event.name];
        } else {
          state.pointers[event.name] = event.index;
        }
        break;

      case "range":
        if (event.start === null || event.start === undefined) state.range = null;
        else state.range = { start: event.start, end: event.end, label: event.label || "" };
        break;

      case "visit":
        if (!state.visited[event.node]) {
          state.visited[event.node] = true;
          state.visitOrder.push(event.node);
          state.metrics.visited += 1;
        }
        state.current = event.node;
        break;

      case "current":
        state.current = event.node;
        break;

      case "enqueue":
        state.queue.push(event.node);
        state.metrics.enqueued += 1;
        break;

      case "dequeue":
        state.queue.shift();
        state.metrics.dequeued += 1;
        break;

      case "push":
        state.stack.push(event.node);
        state.metrics.pushes += 1;
        break;

      case "pop":
        state.stack.pop();
        state.metrics.pops += 1;
        break;

      case "remove": {
        var qi = state.queue.indexOf(event.node);
        if (qi >= 0) {
          state.queue.splice(qi, 1);
          state.metrics.dequeued += 1;
        }
        break;
      }

      case "edge": {
        var key = edgeKey(event.from, event.to);
        if (event.edgeState === "remove") delete state.traversed[key];
        else state.traversed[key] = event.edgeState || "traversed";
        break;
      }

      case "distance":
        state.distances[event.node] = event.distance;
        if (event.from) state.distances["__from__" + event.node] = event.from;
        state.metrics.relaxations += 1;
        break;

      case "path":
        state.path = event.nodes ? event.nodes.slice() : [];
        break;

      case "found":
        state.hasFound = true;
        state.found = event.index !== undefined ? event.index : event.node;
        if (event.index !== undefined) addRole(state, "found", event.index);
        if (event.node !== undefined) state.current = event.node;
        break;

      case "notFound":
        state.hasFound = true;
        state.found = null;
        break;

      case "enter": {
        var frame = {
          id: event.id,
          parent: event.parent === undefined ? null : event.parent,
          label: event.label,
          depth: event.depth,
          args: event.args ? event.args.slice() : [],
          status: "active",
          value: null,
          returned: false
        };
        state.frames.push(frame);
        state.callNodes[event.id] = {
          id: event.id,
          parent: frame.parent,
          depth: frame.depth,
          label: frame.label,
          args: frame.args,
          status: "active",
          value: null,
          order: state.metrics.calls
        };
        if (frame.parent !== null && frame.parent !== undefined) {
          state.callEdges.push({ from: frame.parent, to: event.id });
        }
        state.current = event.id;
        state.metrics.calls += 1;
        if (frame.depth + 1 > state.metrics.maxDepth) {
          state.metrics.maxDepth = frame.depth + 1;
        }
        break;
      }

      case "exit": {
        var target = null;
        for (i = state.frames.length - 1; i >= 0; i--) {
          if (state.frames[i].id === event.id) {
            target = state.frames[i];
            state.frames.splice(i, 1);
            break;
          }
        }
        if (target) {
          target.status = "returned";
          target.value = event.value;
          target.returned = true;
        }
        if (state.callNodes[event.id]) {
          state.callNodes[event.id].status = "returned";
          state.callNodes[event.id].value = event.value;
        }
        state.lastReturned = target
          ? { id: target.id, label: target.label, value: event.value, depth: target.depth }
          : null;
        state.current = state.frames.length ? state.frames[state.frames.length - 1].id : null;
        break;
      }

      case "frameValue": {
        var top = state.frames.length ? state.frames[state.frames.length - 1] : null;
        if (top) top.value = event.value;
        if (top && state.callNodes[top.id]) state.callNodes[top.id].value = event.value;
        break;
      }

      case "result":
        state.result = event.value;
        state.resultReady = true;
        break;

      case "row": {
        if (!state.rows[event.name]) state.rows[event.name] = [];
        state.rows[event.name][event.index] = event.value;
        break;
      }

      case "rowClear":
        if (event.name && state.rows[event.name]) delete state.rows[event.name];
        else state.rows = {};
        break;

      case "message":
        state.message = event.text;
        break;

      case "clear":
        state.roles = {};
        state.mark = {};
        break;

      default:
        break;
    }

    return state;
  }

  function edgeKey(a, b) {
    return String(a) + " > " + String(b);
  }

  /* ------------------------------------------------------------------------
   * Snapshot / restore (checkpoints)
   * ---------------------------------------------------------------------- */

  function cloneRoles(roles) {
    var out = {};
    for (var role in roles) {
      if (!Object.prototype.hasOwnProperty.call(roles, role)) continue;
      var src = roles[role];
      var copy = {};
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) copy[k] = true;
      }
      out[role] = copy;
    }
    return out;
  }

  function cloneMap(obj) {
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    }
    return out;
  }

  function cloneRows(rows) {
    var out = {};
    for (var name in rows) {
      if (!Object.prototype.hasOwnProperty.call(rows, name)) continue;
      var src = rows[name];
      out[name] = Array.isArray(src) ? src.slice() : src;
    }
    return out;
  }

  function cloneFrame(f) {
    return {
      id: f.id,
      parent: f.parent,
      label: f.label,
      depth: f.depth,
      args: f.args.slice(),
      status: f.status,
      value: f.value,
      returned: f.returned
    };
  }

  function snapshot(state) {
    return {
      viz: state.viz,
      array: state.array ? state.array.slice() : null,
      mark: cloneMap(state.mark),
      roles: cloneRoles(state.roles),
      pointers: cloneMap(state.pointers),
      range: state.range ? { start: state.range.start, end: state.range.end, label: state.range.label } : null,
      visited: cloneMap(state.visited),
      visitOrder: state.visitOrder.slice(),
      current: state.current,
      queue: state.queue.slice(),
      stack: state.stack.slice(),
      distances: cloneMap(state.distances),
      path: state.path.slice(),
      traversed: cloneMap(state.traversed),
      hasFound: state.hasFound,
      found: state.found,
      result: state.result,
      resultReady: state.resultReady,
      rows: cloneRows(state.rows),
      frames: state.frames.map(cloneFrame),
      callNodes: JSON.parse(JSON.stringify(state.callNodes)),
      callEdges: state.callEdges.map(function (e) {
        return { from: e.from, to: e.to };
      }),
      metrics: cloneMap(state.metrics)
    };
  }

  function restore(state, snap) {
    state.array = snap.array ? snap.array.slice() : null;
    state.mark = cloneMap(snap.mark);
    state.roles = cloneRoles(snap.roles);
    state.pointers = cloneMap(snap.pointers);
    state.range = snap.range ? { start: snap.range.start, end: snap.range.end, label: snap.range.label } : null;
    state.visited = cloneMap(snap.visited);
    state.visitOrder = snap.visitOrder.slice();
    state.current = snap.current;
    state.queue = snap.queue.slice();
    state.stack = snap.stack.slice();
    state.distances = cloneMap(snap.distances);
    state.path = snap.path.slice();
    state.traversed = cloneMap(snap.traversed);
    state.hasFound = snap.hasFound;
    state.found = snap.found;
    state.result = snap.result;
    state.resultReady = snap.resultReady;
    state.rows = cloneRows(snap.rows);
    state.frames = snap.frames.map(cloneFrame);
    state.callNodes = JSON.parse(JSON.stringify(snap.callNodes));
    state.callEdges = snap.callEdges.map(function (e) {
      return { from: e.from, to: e.to };
    });
    state.metrics = cloneMap(snap.metrics);
    state.lastReturned = null;
    state.message = undefined;
    return state;
  }

  /* ------------------------------------------------------------------------
   * Event descriptions (rendered lazily so large timelines stay cheap)
   * ---------------------------------------------------------------------- */

  function valueAt(state, index) {
    if (state && Array.isArray(state.array)) return state.array[index];
    return "?";
  }

  function labelFor(state, node) {
    var graph = state && state.input ? state.input.graph : null;
    if (!graph || !graph.nodes) return String(node);
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].id === node) return graph.nodes[i].label;
    }
    return String(node);
  }

  function argsFor(state, id) {
    var node = state && state.callNodes ? state.callNodes[id] : null;
    if (!node) return "?";
    return (node.args || []).join(", ");
  }

  function formatEvent(event, state) {
    if (!event) return "Ready to run";
    // Algorithms may supply a bespoke narration; otherwise we synthesise one.
    if (event.text && event.type !== "message") return event.text;
    var a;
    var b;
    switch (event.type) {
      case "compare":
        if (event.indices && event.indices.length) {
          if (event.key !== undefined) {
            a = event.indices[0];
            return "Compare a[" + a + "] = " + valueAt(state, a) +
              " with the key " + event.key;
          }
          a = event.indices[0];
          b = event.indices[1];
          return "Compare a[" + a + "] = " + valueAt(state, a) +
            " with a[" + b + "] = " + valueAt(state, b);
        }
        // Graph algorithms compare a candidate value rather than a cell.
        if (event.key !== undefined) return "Compare against " + event.key;
        return "Compare values";
      case "swap":
        a = event.indices[0];
        b = event.indices[1];
        return "Swap a[" + a + "] = " + valueAt(state, a) +
          " and a[" + b + "] = " + valueAt(state, b);
      case "write":
        return event.text || ("Set a[" + event.index + "] = " + event.value);
      case "resize":
        return "Resize the storage to length " + event.length;
      case "mark":
        return "Mark " +
          (event.index !== undefined
            ? "index " + event.index
            : "indices " + (event.indices || []).join(", ")) +
          " as " + event.role;
      case "unmark":
        return "Clear the " + event.role + " highlight";
      case "pointer":
        return event.index === null || event.index === undefined
          ? "Remove the " + event.name + " pointer"
          : "Move the " + event.name + " pointer to index " + event.index;
      case "range":
        if (event.start === null || event.start === undefined) {
          return "Clear the highlighted range";
        }
        return event.label
          ? event.label + ": [" + event.start + " .. " + event.end + "]"
          : "Search interval is now [" + event.start + " .. " + event.end + "]";
      case "visit":
        return "Visit " + labelFor(state, event.node);
      case "current":
        return "Focus " + labelFor(state, event.node);
      case "enqueue":
        return "Enqueue " + labelFor(state, event.node);
      case "dequeue":
        // The node has already left the queue by the time this is narrated,
        // so prefer the id carried by the event itself.
        a = event.node !== undefined ? event.node
          : (state.queue.length ? state.queue[0] : undefined);
        return a === undefined || a === null
          ? "Dequeue from an empty queue"
          : "Dequeue " + labelFor(state, a);
      case "push":
        return "Push " + labelFor(state, event.node);
      case "pop":
        a = event.node !== undefined ? event.node
          : (state.stack.length ? state.stack[state.stack.length - 1] : undefined);
        return a === undefined || a === null
          ? "Pop from an empty stack"
          : "Pop " + labelFor(state, a);
      case "remove":
        return "Remove " + labelFor(state, event.node) + " from the open set";
      case "edge":
        return "Traverse edge " + labelFor(state, event.from) +
          " \u2192 " + labelFor(state, event.to);
      case "distance":
        return "Distance to " + labelFor(state, event.node) + " = " + event.distance +
          (event.from ? " via " + labelFor(state, event.from) : "");
      case "path":
        return "Shortest path: " +
          event.nodes.map(function (n) { return labelFor(state, n); }).join(" \u2192 ");
      case "found":
        return event.index !== undefined
          ? "Found the target at index " + event.index
          : "Found target node " + labelFor(state, event.node);
      case "notFound":
        return "The target was not found";
      case "enter":
        return "Call " + event.label + "(" + (event.args || []).join(", ") + ")";
      case "exit":
        return event.label + "(" + argsFor(state, event.id) + ") returns " + event.value;
      case "frameValue":
        return "Computed value " + event.value;
      case "result":
        return "Result: " + event.value;
      case "message":
        return event.text;
      case "clear":
        return "Reset the highlights";
      default:
        return event.type;
    }
  }

  /* ------------------------------------------------------------------------
   * Timeline construction
   * ---------------------------------------------------------------------- */

  /**
   * Run an algorithm definition and produce a fully replayable timeline.
   * Returns { events, checkpoints, initial, total, ... }.
   */
  function buildTimeline(definition, input) {
    if (!definition || typeof definition.run !== "function") {
      throw new Error("Algorithm definition is missing a run(input, emit) function");
    }

    var events = [];
    var emit = function (event) {
      if (!event || typeof event.type !== "string") return;
      events.push(event);
    };

    var working = cloneInput(definition, input);
    definition.run(working, emit);

    var state = createState(definition, input);
    state.definition = definition;
    var initial = snapshot(state);
    var checkpoints = [initial];

    for (var i = 0; i < events.length; i++) {
      applyEvent(state, events[i]);
      if ((i + 1) % CHECKPOINT_INTERVAL === 0) {
        checkpoints.push(snapshot(state));
      }
    }

    return {
      definition: definition,
      input: cloneInput(definition, input),
      events: events,
      checkpoints: checkpoints,
      initial: initial,
      total: events.length,
      checkpointInterval: CHECKPOINT_INTERVAL
    };
  }

  function checkpointStartIndex(step) {
    return Math.floor(step / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL;
  }

  function checkpointFor(timeline, step) {
    var idx = checkpointStartIndex(step) / CHECKPOINT_INTERVAL;
    return timeline.checkpoints[idx] || timeline.initial;
  }

  /**
   * Move an existing state object from `fromStep` to `toStep`.
   * Restores a checkpoint when rewinding or jumping far forward.
   */
  function advance(state, timeline, fromStep, toStep) {
    var total = timeline.events.length;
    var target = Math.max(0, Math.min(total, toStep));
    var from = Math.max(0, Math.min(total, fromStep));
    if (target === from) return state;

    if (target < from || target - from > CHECKPOINT_INTERVAL) {
      restore(state, checkpointFor(timeline, target));
      from = checkpointStartIndex(target);
    }

    for (var i = from; i < target; i++) {
      applyEvent(state, timeline.events[i]);
    }
    return state;
  }

  function resetState(state, timeline) {
    state.definition = timeline.definition;
    restore(state, timeline.initial);
    return state;
  }

  AV.viz = {
    CHECKPOINT_INTERVAL: CHECKPOINT_INTERVAL,
    ROLE_PRIORITY: ROLE_PRIORITY,
    createMetrics: createMetrics,
    createState: createState,
    cloneInput: cloneInput,
    applyEvent: applyEvent,
    snapshot: snapshot,
    restore: restore,
    roleIndices: roleIndices,
    edgeKey: edgeKey,
    formatEvent: formatEvent,
    buildTimeline: buildTimeline,
    advance: advance,
    resetState: resetState,
    checkpointFor: checkpointFor,
    checkpointStartIndex: checkpointStartIndex
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
