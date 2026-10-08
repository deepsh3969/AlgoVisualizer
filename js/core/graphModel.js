/**
 * AlgoVisualizer — graph model
 * Pure data operations used by the graph editor and the graph algorithms.
 * Every mutating helper returns { ok, ... } or { ok: false, error } so the UI
 * can surface user-friendly messages instead of crashing.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var MAX_NODES = 24;
  var MAX_EDGES = 80;

  function createGraph(directed) {
    return {
      nodes: [],
      edges: [],
      directed: !!directed,
      nextNode: 1,
      nextEdge: 1
    };
  }

  function cloneGraph(graph) {
    return {
      nodes: graph.nodes.map(function (n) { return Object.assign({}, n); }),
      edges: graph.edges.map(function (e) { return Object.assign({}, e); }),
      directed: !!graph.directed,
      nextNode: graph.nextNode,
      nextEdge: graph.nextEdge
    };
  }

  function resetGraph(graph) {
    graph.nodes.length = 0;
    graph.edges.length = 0;
    graph.nextNode = 1;
    graph.nextEdge = 1;
    return graph;
  }

  /* ---------------------------------------------------------------------
   * Node operations
   * ------------------------------------------------------------------- */

  function addNode(graph, opts) {
    var o = opts || {};
    if (graph.nodes.length >= MAX_NODES) {
      return { ok: false, error: "The graph is limited to " + MAX_NODES + " nodes." };
    }
    var labelCheck = AV.validate.validateNodeLabel(graph, o.label, null);
    if (!labelCheck.ok) return labelCheck;

    var id = "n" + graph.nextNode;
    graph.nextNode += 1;

    var node = {
      id: id,
      label: labelCheck.value,
      x: typeof o.x === "number" ? o.x : 0,
      y: typeof o.y === "number" ? o.y : 0
    };
    graph.nodes.push(node);
    return { ok: true, node: node };
  }

  function findNode(graph, id) {
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].id === id) return graph.nodes[i];
    }
    return null;
  }

  function removeNode(graph, id) {
    var idx = -1;
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].id === id) idx = i;
    }
    if (idx < 0) return { ok: false, error: "That node no longer exists." };
    if (graph.nodes.length <= 1) {
      return { ok: false, error: "A graph needs at least one node." };
    }
    graph.nodes.splice(idx, 1);
    graph.edges = graph.edges.filter(function (e) {
      return e.from !== id && e.to !== id;
    });
    return { ok: true };
  }

  /* ---------------------------------------------------------------------
   * Edge operations
   * ------------------------------------------------------------------- */

  function edgeExists(graph, from, to) {
    for (var i = 0; i < graph.edges.length; i++) {
      var e = graph.edges[i];
      if (e.from === from && e.to === to) return e;
      if (!graph.directed && e.from === to && e.to === from) return e;
    }
    return null;
  }

  function addEdge(graph, from, to, weight) {
    if (graph.edges.length >= MAX_EDGES) {
      return { ok: false, error: "The graph is limited to " + MAX_EDGES + " edges." };
    }
    var check = AV.validate.validateEdge(graph, from, to, { directed: graph.directed });
    if (!check.ok) return check;

    var w = weight === undefined || weight === null ? 1 : Number(weight);
    if (!isFinite(w)) return { ok: false, error: "Edge weights must be numbers." };
    if (w < 0) return { ok: false, error: "Edge weights must be 0 or greater." };

    var edge = {
      id: "e" + graph.nextEdge,
      from: from,
      to: to,
      weight: w
    };
    graph.nextEdge += 1;
    graph.edges.push(edge);
    return { ok: true, edge: edge };
  }

  function removeEdge(graph, edgeId) {
    for (var i = 0; i < graph.edges.length; i++) {
      if (graph.edges[i].id === edgeId) {
        graph.edges.splice(i, 1);
        return { ok: true };
      }
    }
    return { ok: false, error: "That edge no longer exists." };
  }

  function setEdgeWeight(graph, edgeId, weight) {
    var w = Number(weight);
    if (!isFinite(w)) return { ok: false, error: "Weights must be numbers." };
    if (w < 0) return { ok: false, error: "Weights must be 0 or greater." };
    if (w > 10000) return { ok: false, error: "Weights must be 10,000 or less." };
    for (var i = 0; i < graph.edges.length; i++) {
      if (graph.edges[i].id === edgeId) {
        graph.edges[i].weight = w;
        return { ok: true, edge: graph.edges[i] };
      }
    }
    return { ok: false, error: "That edge no longer exists." };
  }

  /* ---------------------------------------------------------------------
   * Derived structures
   * ------------------------------------------------------------------- */

  /** adjacency: Map<nodeId, [{ to, weight, edgeId, dir }] > */
  function buildAdjacency(graph) {
    var adj = new Map();
    graph.nodes.forEach(function (n) { adj.set(n.id, []); });

    graph.edges.forEach(function (e) {
      if (adj.has(e.from)) {
        adj.get(e.from).push({ to: e.to, weight: e.weight, edgeId: e.id, dir: "out" });
      }
      if (!graph.directed && adj.has(e.to)) {
        adj.get(e.to).push({ to: e.from, weight: e.weight, edgeId: e.id, dir: "back" });
      }
    });

    adj.forEach(function (list) {
      list.sort(function (a, b) {
        var la = labelOf(graph, a.to);
        var lb = labelOf(graph, b.to);
        if (la < lb) return -1;
        if (la > lb) return 1;
        return 0;
      });
    });

    return adj;
  }

  function labelOf(graph, id) {
    var n = findNode(graph, id);
    return n ? n.label : String(id);
  }

  function degree(graph, id) {
    var count = 0;
    graph.edges.forEach(function (e) {
      if (e.from === id) count += 1;
      if (!graph.directed && e.to === id) count += 1;
      else if (graph.directed && e.to === id) count += 1;
    });
    return count;
  }

  function totalWeight(graph) {
    return graph.edges.reduce(function (sum, e) { return sum + e.weight; }, 0);
  }

  function isValid(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      return { ok: false, error: "The graph is malformed." };
    }
    if (graph.nodes.length === 0) {
      return { ok: false, error: "Add at least one node before running an algorithm." };
    }
    var ids = {};
    for (var i = 0; i < graph.nodes.length; i++) {
      var id = graph.nodes[i].id;
      if (ids[id]) return { ok: false, error: "Duplicate node id: " + id };
      ids[id] = true;
    }
    for (var j = 0; j < graph.edges.length; j++) {
      var e = graph.edges[j];
      if (!ids[e.from] || !ids[e.to]) {
        return { ok: false, error: "An edge references a missing node." };
      }
      if (!isFinite(e.weight) || e.weight < 0) {
        return { ok: false, error: "Every edge needs a non-negative weight." };
      }
    }
    return { ok: true };
  }

  function reachableFrom(graph, start) {
    var adj = buildAdjacency(graph);
    var seen = {};
    var stack = [start];
    while (stack.length) {
      var id = stack.pop();
      if (seen[id]) continue;
      seen[id] = true;
      (adj.get(id) || []).forEach(function (nb) { stack.push(nb.to); });
    }
    return seen;
  }

  /* ---------------------------------------------------------------------
   * Generation
   * ------------------------------------------------------------------- */

  var DEFAULT_LABELS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

  function nextLabel(index) {
    if (index < DEFAULT_LABELS.length) return DEFAULT_LABELS[index];
    return "N" + (index + 1);
  }

  /**
   * Build a connected random graph.
   * opts: { count, seed, weighted, directed, density }
   */
  function randomGraph(opts) {
    var o = opts || {};
    var count = AV.random.clampInt(o.count, 2, MAX_NODES, 7);
    var weighted = o.weighted !== false;
    var directed = !!o.directed;
    var density = typeof o.density === "number" ? o.density : 0.45;
    var rng = AV.random.createRng(o.seed);

    var graph = createGraph(directed);
    var i;
    for (i = 0; i < count; i++) {
      addNode(graph, {
        label: nextLabel(i),
        x: 0,
        y: 0
      });
    }
    layoutCircle(graph, o.width || 640, o.height || 420);

    // Spanning chain first so every node is reachable.
    for (i = 1; i < count; i++) {
      addEdge(graph, graph.nodes[i - 1].id, graph.nodes[i].id, randomWeight(rng, weighted));
    }

    var attempts = Math.floor(count * (count - 1) * density);
    var guard = 0;
    while (attempts > 0 && guard < 400) {
      var a = Math.floor(rng() * count);
      var b = Math.floor(rng() * count);
      guard += 1;
      if (a === b) continue;
      if (!edgeExists(graph, graph.nodes[a].id, graph.nodes[b].id)) {
        addEdge(graph, graph.nodes[a].id, graph.nodes[b].id, randomWeight(rng, weighted));
        attempts -= 1;
      }
    }

    return graph;
  }

  function randomWeight(rng, weighted) {
    if (!weighted) return 1;
    return 1 + Math.floor(rng() * 9);
  }

  function layoutCircle(graph, width, height) {
    var cx = width / 2;
    var cy = height / 2;
    var radius = Math.min(width, height) / 2 - 54;
    var n = graph.nodes.length;
    for (var i = 0; i < n; i++) {
      var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      graph.nodes[i].x = Math.round(cx + radius * Math.cos(angle));
      graph.nodes[i].y = Math.round(cy + radius * Math.sin(angle));
    }
    return graph;
  }

  /** A curated demo graph used by the landing page and default workspace. */
  function demoGraph() {
    var graph = createGraph(false);
    var labels = ["A", "B", "C", "D", "E", "F", "G"];
    labels.forEach(function (label) { addNode(graph, { label: label }); });
    var positions = [
      [90, 200], [210, 90], [210, 310], [360, 90],
      [360, 310], [510, 200], [640, 200]
    ];
    graph.nodes.forEach(function (n, i) {
      n.x = positions[i][0];
      n.y = positions[i][1];
    });
    var pairs = [
      ["A", "B", 4], ["A", "C", 5], ["B", "D", 6], ["C", "D", 3],
      ["B", "E", 2], ["C", "E", 7], ["D", "F", 4], ["E", "F", 3],
      ["F", "G", 5]
    ];
    pairs.forEach(function (p) {
      addEdge(graph, idFor(graph, p[0]), idFor(graph, p[1]), p[2]);
    });
    return graph;
  }

  function idFor(graph, label) {
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].label === label) return graph.nodes[i].id;
    }
    return null;
  }

  AV.graphModel = {
    MAX_NODES: MAX_NODES,
    MAX_EDGES: MAX_EDGES,
    createGraph: createGraph,
    cloneGraph: cloneGraph,
    resetGraph: resetGraph,
    addNode: addNode,
    removeNode: removeNode,
    addEdge: addEdge,
    removeEdge: removeEdge,
    setEdgeWeight: setEdgeWeight,
    edgeExists: edgeExists,
    findNode: findNode,
    labelOf: labelOf,
    buildAdjacency: buildAdjacency,
    degree: degree,
    totalWeight: totalWeight,
    isValid: isValid,
    reachableFrom: reachableFrom,
    randomGraph: randomGraph,
    layoutCircle: layoutCircle,
    demoGraph: demoGraph,
    idFor: idFor
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
