/**
 * Breadth-First Search
 * Explores a graph level by level using a FIFO queue.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "bfs",
    name: "Breadth-First Search",
    category: "graphs",
    viz: "graph",
    tagline: "Explore a graph level by level with a first-in-first-out queue.",
    keywords: ["bfs", "breadth", "queue", "level order", "shortest path unweighted"],

    complexity: {
      best: "O(V + E)",
      average: "O(V + E)",
      worst: "O(V + E)",
      space: "O(V)"
    },
    stable: true,
    inPlace: false,

    explanation: {
      what:
        "Breadth-First Search starts at a source node and visits every node at distance 1 before any node at distance 2, using a first-in-first-out queue as its frontier.",
      how:
        "A node is marked as discovered the moment it is queued, never when it is processed. That guarantees each node enters the queue exactly once, so every edge is looked at a constant number of times.",
      steps: [
        "Push the start node into the queue and mark it discovered.",
        "Dequeue the node at the front of the queue.",
        "Visit it and, if it is the target, reconstruct the path.",
        "Look at each neighbour; queue any neighbour that has not been discovered.",
        "Repeat until the queue is empty or the target is reached."
      ],
      useCases: [
        "Shortest path between two nodes in an unweighted graph.",
        "Finding connected components and checking bipartiteness.",
        "Web crawlers and social 'degrees of separation' searches."
      ]
    },

    example:
      "A queue: A \u2192 dequeue A, queue B and C \u2192 dequeue B, queue D and E \u2192 nodes are discovered in non-decreasing distance order.",

    pseudocode: [
      "procedure BFS(graph, start, target):",
      "    queue \u2190 [start];   discovered \u2190 {start}",
      "    parent[start] \u2190 \u2212",
      "    while queue is not empty:",
      "        u \u2190 dequeue(queue)",
      "        if u = target:  rebuild path;  return",
      "        for each neighbour v of u:",
      "            if v not in discovered:",
      "                discovered \u2190 discovered \u222A {v}",
      "                parent[v] \u2190 u",
      "                enqueue(queue, v)",
      "    return no path"
    ],

    readyMessage: "Press Play to expand the graph one level at a time.",

    run: function (input, emit) {
      var graph = input.graph;
      var start = input.start;
      var target = input.target;

      if (!graph || !graph.nodes.length) {
        emit && emit({ type: "message", text: "The graph has no nodes to search", line: 12 });
        emit && emit({ type: "result", value: "no path", line: 12 });
        return;
      }
      if (!AV.graphModel.findNode(graph, start)) {
        emit && emit({ type: "message", text: "Choose a start node first", line: 1 });
        emit && emit({ type: "result", value: "no path", line: 12 });
        return;
      }

      var adj = AV.graphModel.buildAdjacency(graph);
      var discovered = Object.create(null);
      var parent = Object.create(null);
      var queue = [];
      var i;

      function neighboursOf(id) {
        return (adj.get(id) || []).map(function (e) { return e.to; });
      }

      queue.push(start);
      discovered[start] = true;
      parent[start] = null;
      emit && emit({ type: "enqueue", node: start, line: 1 });
      emit && emit({
        type: "message",
        text: "Seed the queue with " + AV.graphModel.labelOf(graph, start),
        line: 1
      });

      while (queue.length > 0) {
        var u = queue.shift();
        emit && emit({ type: "dequeue", node: u, line: 4 });
        emit && emit({
          type: "visit",
          node: u,
          line: 5,
          text: "Process " + AV.graphModel.labelOf(graph, u)
        });

        if (target && u === target) {
          emit && emit({ type: "found", node: u, line: 5 });
          var path = rebuildPath(parent, target);
          emit && emit({
            type: "path",
            nodes: path,
            line: 5,
            text: "Target reached; shortest path is " +
              path.map(function (id) { return AV.graphModel.labelOf(graph, id); }).join(" \u2192 ")
          });
          emit && emit({ type: "result", value: path.length - 1, line: 5 });
          return;
        }

        var neighbours = neighboursOf(u);
        for (i = 0; i < neighbours.length; i++) {
          var v = neighbours[i];
          emit && emit({
            type: "edge",
            from: u,
            to: v,
            edgeState: "traversed",
            line: 6,
            text: "Inspect neighbour " + AV.graphModel.labelOf(graph, v) +
              " of " + AV.graphModel.labelOf(graph, u)
          });

          if (discovered[v]) {
            emit && emit({
              type: "message",
              text: AV.graphModel.labelOf(graph, v) + " is already discovered, skip it",
              line: 7
            });
            continue;
          }

          discovered[v] = true;
          parent[v] = u;
          queue.push(v);
          emit && emit({ type: "enqueue", node: v, line: 10 });
        }
      }

      emit && emit({
        type: "message",
        text: target
          ? "The queue emptied - " + AV.graphModel.labelOf(graph, target) + " is unreachable"
          : "The queue emptied - every reachable node has been visited",
        line: 12
      });
      emit && emit({ type: "notFound", line: 12 });
      emit && emit({ type: "result", value: "no path", line: 12 });
    }
  });

  function rebuildPath(parent, target) {
    var path = [];
    var cur = target;
    var guard = 0;
    while (cur !== null && cur !== undefined && guard < 1000) {
      path.unshift(cur);
      cur = parent[cur];
      guard += 1;
    }
    return path;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
