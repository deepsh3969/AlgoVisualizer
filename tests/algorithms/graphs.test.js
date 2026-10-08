/**
 * Graph algorithm + graph model tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function run(id, input) {
    var def = AV.algorithms.get(id);
    if (!def) throw new Error("Missing graph algorithm: " + id);
    var timeline = AV.viz.buildTimeline(def, input);
    var state = AV.viz.createState(def, input);
    state.definition = def;
    for (var i = 0; i < timeline.events.length; i++) {
      AV.viz.applyEvent(state, timeline.events[i]);
    }
    return { state: state, timeline: timeline, definition: def };
  }

  function graphFrom(spec) {
    var g = AV.graphModel.createGraph(!!spec.directed);
    spec.labels.forEach(function (label) {
      AV.graphModel.addNode(g, { label: label });
    });
    spec.edges.forEach(function (e) {
      var res = AV.graphModel.addEdge(
        g,
        AV.graphModel.idFor(g, e[0]),
        AV.graphModel.idFor(g, e[1]),
        e[2] === undefined ? 1 : e[2]
      );
      if (!res.ok) throw new Error("fixture edge failed: " + res.error);
    });
    if (spec.positions) {
      g.nodes.forEach(function (n, i) {
        n.x = spec.positions[i][0];
        n.y = spec.positions[i][1];
      });
    }
    return g;
  }

  function labelPath(state, graph, nodes) {
    return nodes.map(function (id) { return AV.graphModel.labelOf(graph, id); }).join(">");
  }

  /* ------------------------------------------------------------------ */
  /* Graph model                                                         */
  /* ------------------------------------------------------------------ */

  var MODEL = "algorithms/graphs/model";

  AV.test(MODEL, "creates nodes with unique ids and labels", function () {
    var g = AV.graphModel.createGraph(false);
    AV.assert(AV.graphModel.addNode(g, { label: "A" }).ok);
    AV.assert(AV.graphModel.addNode(g, { label: "B" }).ok);
    AV.assertEqual(g.nodes.length, 2);
    AV.assertNotEqual(g.nodes[0].id, g.nodes[1].id);
  });

  AV.test(MODEL, "rejects duplicate labels", function () {
    var g = AV.graphModel.createGraph(false);
    AV.graphModel.addNode(g, { label: "A" });
    var res = AV.graphModel.addNode(g, { label: "A" });
    AV.assertEqual(res.ok, false);
    AV.assert(typeof res.error === "string" && res.error.length > 0);
  });

  AV.test(MODEL, "rejects empty labels", function () {
    var g = AV.graphModel.createGraph(false);
    AV.assertEqual(AV.graphModel.addNode(g, { label: "   " }).ok, false);
  });

  AV.test(MODEL, "rejects self loops and duplicate edges", function () {
    var g = AV.graphModel.createGraph(false);
    AV.graphModel.addNode(g, { label: "A" });
    AV.graphModel.addNode(g, { label: "B" });
    var a = g.nodes[0].id;
    var b = g.nodes[1].id;
    AV.assertEqual(AV.graphModel.addEdge(g, a, a, 1).ok, false, "self loop");
    AV.assert(AV.graphModel.addEdge(g, a, b, 1).ok, "first edge");
    AV.assertEqual(AV.graphModel.addEdge(g, a, b, 2).ok, false, "duplicate");
    AV.assertEqual(AV.graphModel.addEdge(g, b, a, 2).ok, false, "reverse duplicate");
  });

  AV.test(MODEL, "directed graphs allow both directions", function () {
    var g = AV.graphModel.createGraph(true);
    AV.graphModel.addNode(g, { label: "A" });
    AV.graphModel.addNode(g, { label: "B" });
    AV.assert(AV.graphModel.addEdge(g, g.nodes[0].id, g.nodes[1].id, 1).ok);
    AV.assert(AV.graphModel.addEdge(g, g.nodes[1].id, g.nodes[0].id, 1).ok);
    AV.assertEqual(g.edges.length, 2);
  });

  AV.test(MODEL, "removing a node removes its edges", function () {
    var g = graphFrom({
      labels: ["A", "B", "C"],
      edges: [["A", "B", 1], ["B", "C", 1], ["A", "C", 1]]
    });
    var b = AV.graphModel.idFor(g, "B");
    AV.assert(AV.graphModel.removeNode(g, b).ok);
    AV.assertEqual(g.nodes.length, 2);
    AV.assertEqual(g.edges.length, 1, "only A-C remains");
  });

  AV.test(MODEL, "refuses to remove the last node", function () {
    var g = AV.graphModel.createGraph(false);
    AV.graphModel.addNode(g, { label: "A" });
    AV.assertEqual(AV.graphModel.removeNode(g, g.nodes[0].id).ok, false);
  });

  AV.test(MODEL, "validates graph integrity", function () {
    var g = AV.graphModel.createGraph(false);
    AV.assertEqual(AV.graphModel.isValid(g).ok, false, "empty graph is invalid");
    AV.graphModel.addNode(g, { label: "A" });
    AV.assert(AV.graphModel.isValid(g).ok, "single node is valid");

    var h = graphFrom({ labels: ["A", "B"], edges: [["A", "B", 1]] });
    h.nodes[0].id = "ghost";
    AV.assertEqual(AV.graphModel.isValid(h).ok, false, "dangling edge detected");
  });

  AV.test(MODEL, "builds an undirected adjacency list", function () {
    var g = graphFrom({ labels: ["A", "B"], edges: [["A", "B", 3]] });
    var adj = AV.graphModel.buildAdjacency(g);
    AV.assertEqual(adj.get(g.nodes[0].id).length, 1);
    AV.assertEqual(adj.get(g.nodes[1].id).length, 1, "undirected => both sides");
    AV.assertEqual(adj.get(g.nodes[0].id)[0].weight, 3);
  });

  AV.test(MODEL, "builds a directed adjacency list", function () {
    var g = graphFrom({ directed: true, labels: ["A", "B"], edges: [["A", "B", 3]] });
    var adj = AV.graphModel.buildAdjacency(g);
    AV.assertEqual(adj.get(g.nodes[0].id).length, 1);
    AV.assertEqual(adj.get(g.nodes[1].id).length, 0, "directed => one side only");
  });

  AV.test(MODEL, "generates valid connected random graphs", function () {
    for (var seed = 1; seed <= 6; seed++) {
      var g = AV.graphModel.randomGraph({ count: 8, seed: seed, density: 0.4 });
      AV.assert(AV.graphModel.isValid(g).ok, "seed " + seed + " valid");
      AV.assertEqual(g.nodes.length, 8);
      AV.assert(g.edges.length >= 7, "spanning chain present");
      var reach = AV.graphModel.reachableFrom(g, g.nodes[0].id);
      AV.assertEqual(Object.keys(reach).length, 8, "seed " + seed + " fully connected");
    }
  });

  AV.test(MODEL, "demo graph is connected and weighted", function () {
    var g = AV.graphModel.demoGraph();
    AV.assert(AV.graphModel.isValid(g).ok);
    AV.assertEqual(g.nodes.length, 7);
    AV.assert(g.edges.length > 0);
    AV.assert(AV.graphModel.totalWeight(g) > g.edges.length, "weights vary");
    var reach = AV.graphModel.reachableFrom(g, g.nodes[0].id);
    AV.assertEqual(Object.keys(reach).length, g.nodes.length, "connected");
  });

  /* ------------------------------------------------------------------ */
  /* BFS                                                                 */
  /* ------------------------------------------------------------------ */

  var BFS = "algorithms/graphs/bfs";

  AV.test(BFS, "is registered with metadata", function () {
    var def = AV.algorithms.get("bfs");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "graphs");
    AV.assertEqual(def.complexity.worst, "O(V + E)");
    AV.assert(def.explanation.steps.length >= 4);
  });

  AV.test(BFS, "visits nodes level by level", function () {
    var g = graphFrom({
      labels: ["A", "B", "C", "D"],
      edges: [["A", "B", 1], ["A", "C", 1], ["B", "D", 1]]
    });
    var out = run("bfs", { graph: g, start: g.nodes[0].id });
    var order = out.state.visitOrder
      .map(function (id) { return AV.graphModel.labelOf(g, id); })
      .join(",");
    AV.assertEqual(order, "A,B,C,D", "level order expected");
  });

  AV.test(BFS, "finds an unweighted shortest path", function () {
    var g = graphFrom({
      labels: ["A", "B", "C", "D"],
      edges: [["A", "B", 1], ["B", "C", 1], ["C", "D", 1], ["A", "D", 10]]
    });
    var out = run("bfs", {
      graph: g,
      start: g.nodes[0].id,
      target: AV.graphModel.idFor(g, "D")
    });
    var path = out.state.path
      .map(function (id) { return AV.graphModel.labelOf(g, id); })
      .join(">");
    AV.assertEqual(path, "A>D", "BFS takes the fewest hops, ignoring weights");
    AV.assertEqual(out.state.result, 1, "one hop");
    var visited = out.state.visitOrder
      .map(function (id) { return AV.graphModel.labelOf(g, id); });
    AV.assert(visited.indexOf("C") < 0, "C is queued but never dequeued");
  });

  AV.test(BFS, "reports an unreachable target", function () {
    var g = graphFrom({
      labels: ["A", "B", "C"],
      edges: [["A", "B", 1]]
    });
    var out = run("bfs", {
      graph: g,
      start: g.nodes[0].id,
      target: AV.graphModel.idFor(g, "C")
    });
    AV.assert(out.state.hasFound);
    AV.assertEqual(out.state.found, null);
    AV.assertEqual(out.state.path.length, 0);
  });

  AV.test(BFS, "queues each node exactly once", function () {
    var g = AV.graphModel.randomGraph({ count: 9, seed: 11 });
    var out = run("bfs", { graph: g, start: g.nodes[0].id });
    var enqueued = out.state.metrics.enqueued;
    AV.assert(
      enqueued <= g.nodes.length,
      "each node enqueued at most once, got " + enqueued + " for " + g.nodes.length + " nodes"
    );
    AV.assertEqual(out.state.metrics.visited, g.nodes.length, "all nodes visited");
  });

  AV.test(BFS, "emits queue events in the right order", function () {
    var g = graphFrom({ labels: ["A", "B"], edges: [["A", "B", 1]] });
    var def = AV.algorithms.get("bfs");
    var timeline = AV.viz.buildTimeline(def, { graph: g, start: g.nodes[0].id });
    var sequence = timeline.events
      .filter(function (e) { return e.type === "enqueue" || e.type === "dequeue"; })
      .map(function (e) { return e.type; });
    AV.assertEqual(sequence[0], "enqueue");
    AV.assert(sequence.indexOf("dequeue") > 0, "dequeues happen after seeding");
    AV.assertEqual(
      sequence.filter(function (t) { return t === "enqueue"; }).length,
      sequence.filter(function (t) { return t === "dequeue"; }).length,
      "every enqueue is eventually dequeued"
    );
  });

  AV.test(BFS, "rejects a missing start node", function () {
    var g = graphFrom({ labels: ["A"], edges: [] });
    var out = run("bfs", { graph: g, start: "does-not-exist" });
    AV.assertEqual(out.state.result, "no path");
  });

  /* ------------------------------------------------------------------ */
  /* DFS                                                                 */
  /* ------------------------------------------------------------------ */

  var DFS = "algorithms/graphs/dfs";

  AV.test(DFS, "is registered with metadata", function () {
    var def = AV.algorithms.get("dfs");
    AV.assert(def, "should exist");
    AV.assertEqual(def.complexity.worst, "O(V + E)");
  });

  AV.test(DFS, "visits depth first", function () {
    var g = graphFrom({
      labels: ["A", "B", "C", "D"],
      edges: [["A", "B", 1], ["A", "C", 1], ["B", "D", 1]]
    });
    var out = run("dfs", { graph: g, start: g.nodes[0].id });
    var order = out.state.visitOrder
      .map(function (id) { return AV.graphModel.labelOf(g, id); })
      .join(",");
    AV.assertEqual(order, "A,B,D,C", "depth before breadth");
  });

  AV.test(DFS, "visits every reachable node exactly once", function () {
    var g = AV.graphModel.randomGraph({ count: 10, seed: 5, density: 0.3 });
    var out = run("dfs", { graph: g, start: g.nodes[0].id });
    AV.assertEqual(out.state.metrics.visited, g.nodes.length);
    AV.assertEqual(out.state.visitOrder.length, g.nodes.length, "no repeats");
  });

  AV.test(DFS, "finds a path to the target", function () {
    var g = graphFrom({
      labels: ["A", "B", "C", "D"],
      edges: [["A", "B", 1], ["B", "D", 1], ["A", "C", 1]]
    });
    var out = run("dfs", {
      graph: g,
      start: g.nodes[0].id,
      target: AV.graphModel.idFor(g, "D")
    });
    var path = out.state.path
      .map(function (id) { return AV.graphModel.labelOf(g, id); })
      .join(">");
    AV.assertEqual(path, "A>B>D");
  });

  AV.test(DFS, "maintains a visible stack", function () {
    var g = graphFrom({ labels: ["A", "B", "C"], edges: [["A", "B", 1], ["A", "C", 1]] });
    var def = AV.algorithms.get("dfs");
    var timeline = AV.viz.buildTimeline(def, { graph: g, start: g.nodes[0].id });
    var pushes = timeline.events.filter(function (e) { return e.type === "push"; }).length;
    var pops = timeline.events.filter(function (e) { return e.type === "pop"; }).length;
    AV.assertEqual(pushes, 3, "every node pushed once");
    AV.assertEqual(pops, 3, "every node popped once");
  });

  /* ------------------------------------------------------------------ */
  /* Dijkstra                                                            */
  /* ------------------------------------------------------------------ */

  var DIJ = "algorithms/graphs/dijkstra";

  function dijkstraResult(graph, start, target) {
    var out = run("dijkstra", { graph: graph, start: start, target: target });
    return out;
  }

  AV.test(DIJ, "is registered with metadata", function () {
    var def = AV.algorithms.get("dijkstra");
    AV.assert(def, "should exist");
    AV.assertEqual(def.category, "graphs");
    AV.assert(def.complexity.average.indexOf("log") >= 0, "logarithmic factor expected");
  });

  AV.test(DIJ, "computes weighted shortest distances", function () {
    var g = graphFrom({
      labels: ["A", "B", "C", "D"],
      edges: [["A", "B", 9], ["A", "C", 1], ["C", "B", 1], ["B", "D", 1], ["A", "D", 20]]
    });
    var out = dijkstraResult(g, g.nodes[0].id, AV.graphModel.idFor(g, "D"));
    AV.assertEqual(out.state.result, 3, "A->C->B->D costs 1 + 1 + 1");
    var path = out.state.path
      .map(function (id) { return AV.graphModel.labelOf(g, id); })
      .join(">");
    AV.assertEqual(path, "A>C>B>D");
  });

  AV.test(DIJ, "matches a reference implementation on random graphs", function () {
    for (var seed = 1; seed <= 6; seed++) {
      var g = AV.graphModel.randomGraph({ count: 8, seed: seed, weighted: true });
      var start = g.nodes[0].id;
      var expected = referenceDijkstra(g, start);
      var out = run("dijkstra", { graph: g, start: start });

      g.nodes.forEach(function (n) {
        var got = out.state.distances[n.id];
        if (got === undefined) got = Infinity;
        var want = expected[n.id] === undefined ? Infinity : expected[n.id];
        AV.assertEqual(got, want, "seed " + seed + " node " + n.label);
      });
    }
  });

  AV.test(DIJ, "reports infinity for unreachable nodes", function () {
    var g = graphFrom({
      labels: ["A", "B", "C"],
      edges: [["A", "B", 2]]
    });
    var out = dijkstraResult(g, g.nodes[0].id, AV.graphModel.idFor(g, "C"));
    AV.assertEqual(out.state.result, "\u221E");
    AV.assert(out.state.hasFound);
  });

  AV.test(DIJ, "emits distance improvements monotonically per node", function () {
    var g = AV.graphModel.randomGraph({ count: 9, seed: 21, weighted: true });
    var def = AV.algorithms.get("dijkstra");
    var timeline = AV.viz.buildTimeline(def, { graph: g, start: g.nodes[0].id });
    var lastByNode = {};
    timeline.events.forEach(function (e) {
      if (e.type !== "distance") return;
      if (lastByNode[e.node] !== undefined) {
        AV.assert(
          e.distance <= lastByNode[e.node],
          "distance for " + e.node + " must never increase"
        );
      }
      lastByNode[e.node] = e.distance;
    });
    AV.assert(Object.keys(lastByNode).length > 0, "distances recorded");
  });

  function referenceDijkstra(graph, start) {
    var adj = AV.graphModel.buildAdjacency(graph);
    var dist = {};
    var done = {};
    graph.nodes.forEach(function (n) { dist[n.id] = Infinity; });
    dist[start] = 0;

    for (var step = 0; step < graph.nodes.length; step++) {
      var u = null;
      var best = Infinity;
      graph.nodes.forEach(function (n) {
        if (!done[n.id] && dist[n.id] < best) {
          best = dist[n.id];
          u = n.id;
        }
      });
      if (u === null) break;
      done[u] = true;
      (adj.get(u) || []).forEach(function (e) {
        if (dist[u] + e.weight < dist[e.to]) dist[e.to] = dist[u] + e.weight;
      });
    }
    return dist;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
