/**
 * Dijkstra's Algorithm
 * Greedily settles the closest unvisited node and relaxes its edges.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "dijkstra",
    name: "Dijkstra's Algorithm",
    category: "graphs",
    viz: "graph",
    tagline: "Settle the closest node first to compute shortest paths on weighted graphs.",
    keywords: ["dijkstra", "shortest path", "weighted", "greedy", "priority queue"],

    complexity: {
      best: "O((V + E) log V)",
      average: "O((V + E) log V)",
      worst: "O((V + E) log V)",
      space: "O(V)"
    },
    stable: false,
    inPlace: false,

    explanation: {
      what:
        "Dijkstra's algorithm finds the shortest distance from a start node to every other node in a graph whose edge weights are non-negative. It maintains a distance label for each node and repeatedly settles the unsettled node with the smallest known distance.",
      how:
        "Once a node is settled its distance can never improve, because any alternative route would have to pass through a node that is at least as far away. Relaxing an edge means checking whether going through the current node gives a shorter route to a neighbour.",
      steps: [
        "Set the start node's distance to 0 and every other node's distance to infinity.",
        "Add the start node to the open set.",
        "Pick the node in the open set with the smallest distance and settle it.",
        "For each outgoing edge, try to relax the neighbour's distance.",
        "Repeat until the open set is empty or the target is settled.",
        "Rebuild the path by following parent pointers backwards from the target."
      ],
      useCases: [
        "GPS route planning and map navigation.",
        "Network routing protocols such as OSPF.",
        "Any system that models weighted connections between states."
      ]
    },

    example:
      "A(0) \u2192 relax B = 4, C = 5 \u2192 settle B(4) \u2192 relax D = 4 + 6 = 10, E = 4 + 2 = 6 \u2192 settle E(6)... each settle fixes one distance.",

    pseudocode: [
      "procedure Dijkstra(graph, start, target):",
      "    dist[start] \u2190 0;   all others \u2190 \u221E",
      "    open \u2190 {start}",
      "    while open is not empty:",
      "        u \u2190 node in open with the smallest dist",
      "        remove u from open",
      "        if u = target:  rebuild path;  return",
      "        for each edge (u, v, w):",
      "            alt \u2190 dist[u] + w",
      "            if alt < dist[v]:",
      "                dist[v] \u2190 alt;  parent[v] \u2190 u",
      "                add v to open if absent",
      "    return dist"
    ],

    readyMessage: "Press Play to settle nodes in order of their tentative distance.",

    run: function (input, emit) {
      var graph = input.graph;
      var start = input.start;
      var target = input.target;

      if (!graph || !graph.nodes.length) {
        emit && emit({ type: "message", text: "The graph has no nodes to search", line: 13 });
        emit && emit({ type: "result", value: "\u221E", line: 13 });
        return;
      }
      if (!AV.graphModel.findNode(graph, start)) {
        emit && emit({ type: "message", text: "Choose a start node first", line: 1 });
        emit && emit({ type: "result", value: "\u221E", line: 13 });
        return;
      }

      var check = AV.graphModel.isValid(graph);
      if (!check.ok) {
        emit && emit({ type: "message", text: check.error, line: 13 });
        emit && emit({ type: "result", value: "\u221E", line: 13 });
        return;
      }

      var adj = AV.graphModel.buildAdjacency(graph);
      var dist = Object.create(null);
      var parent = Object.create(null);
      var settled = Object.create(null);
      var open = [];
      var i;

      graph.nodes.forEach(function (n) {
        dist[n.id] = Infinity;
      });
      dist[start] = 0;

      open.push(start);
      emit && emit({ type: "enqueue", node: start, line: 2 });
      emit && emit({
        type: "distance",
        node: start,
        distance: 0,
        line: 1,
        text: "Distance to " + AV.graphModel.labelOf(graph, start) + " = 0 (source)"
      });
      emit && emit({
        type: "message",
        text: "Every distance starts at infinity except the source",
        line: 1
      });

      while (open.length > 0) {
        var bestId = null;
        var bestDist = Infinity;
        for (i = 0; i < open.length; i++) {
          if (dist[open[i]] < bestDist) {
            bestDist = dist[open[i]];
            bestId = open[i];
          }
        }
        if (bestId === null) break;

        var u = bestId;
        open.splice(open.indexOf(u), 1);
        emit && emit({ type: "remove", node: u, line: 5 });

        if (settled[u]) continue;
        settled[u] = true;

        emit && emit({
          type: "visit",
          node: u,
          line: 5,
          text: "Settle " + AV.graphModel.labelOf(graph, u) +
            " with distance " + (dist[u] === Infinity ? "\u221E" : dist[u])
        });

        if (target && u === target) {
          emit && emit({ type: "found", node: u, line: 6 });
          var path = rebuildPath(parent, target);
          emit && emit({
            type: "path",
            nodes: path,
            line: 6,
            text: "Target settled; shortest path is " +
              path.map(function (id) { return AV.graphModel.labelOf(graph, id); }).join(" \u2192 ")
          });
          emit && emit({ type: "result", value: dist[target], line: 6 });
          return;
        }

        var neighbours = adj.get(u) || [];
        for (i = 0; i < neighbours.length; i++) {
          var edge = neighbours[i];
          var v = edge.to;
          emit && emit({
            type: "edge",
            from: edge.dir === "back" ? v : u,
            to: edge.dir === "back" ? u : v,
            edgeState: "traversed",
            line: 7,
            text: "Relax the edge " + AV.graphModel.labelOf(graph, u) + " \u2192 " +
              AV.graphModel.labelOf(graph, v) + " (weight " + edge.weight + ")"
          });

          if (settled[v]) {
            emit && emit({
              type: "message",
              text: AV.graphModel.labelOf(graph, v) +
                " is already settled, its distance cannot improve",
              line: 9
            });
            continue;
          }

          var alt = dist[u] + edge.weight;
          emit && emit({
            type: "compare",
            indices: [],
            key: alt,
            line: 9,
            text: "Candidate distance to " + AV.graphModel.labelOf(graph, v) +
              " = " + (dist[u] === Infinity ? "\u221E" : dist[u]) + " + " + edge.weight +
              " = " + alt
          });

          if (alt < dist[v]) {
            var previous = dist[v];
            dist[v] = alt;
            parent[v] = u;
            emit && emit({
              type: "distance",
              node: v,
              distance: alt,
              from: u,
              line: 10,
              text: "Improve " + AV.graphModel.labelOf(graph, v) + ": " +
                (previous === Infinity ? "\u221E" : previous) + " \u2192 " + alt
            });
            if (open.indexOf(v) < 0) {
              open.push(v);
              emit && emit({ type: "enqueue", node: v, line: 11 });
            }
          } else {
            emit && emit({
              type: "message",
              text: alt + " is not better than " +
                (dist[v] === Infinity ? "\u221E" : dist[v]) + ", keep the old distance",
              line: 9
            });
          }
        }
      }

      if (target && !settled[target]) {
        emit && emit({
          type: "message",
          text: "The open set emptied - " + AV.graphModel.labelOf(graph, target) +
            " cannot be reached",
          line: 13
        });
        emit && emit({ type: "notFound", line: 13 });
      } else {
        emit && emit({
          type: "message",
          text: "The open set emptied - every reachable distance is final",
          line: 13
        });
      }
      emit && emit({ type: "result", value: target ? "\u221E" : "done", line: 13 });
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
