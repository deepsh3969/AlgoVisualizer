/**
 * Depth-First Search
 * Explores as far as possible along each branch using an explicit LIFO stack.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  AV.registerAlgorithm({
    id: "dfs",
    name: "Depth-First Search",
    category: "graphs",
    viz: "graph",
    tagline: "Dive down one branch at a time with a last-in-first-out stack.",
    keywords: ["dfs", "depth", "stack", "backtracking", "traversal"],

    complexity: {
      best: "O(V + E)",
      average: "O(V + E)",
      worst: "O(V + E)",
      space: "O(V)"
    },
    stable: false,
    inPlace: false,

    explanation: {
      what:
        "Depth-First Search keeps an explicit stack of nodes to explore. It pops the most recently discovered node and keeps descending until it hits a dead end, then backtracks.",
      how:
        "Because the stack is last-in-first-out, the algorithm commits to one branch as deeply as possible before backtracking. Using an explicit stack avoids recursion and makes the frontier visible.",
      steps: [
        "Push the start node onto the stack.",
        "Pop the top node; skip it if it has already been visited.",
        "Mark it visited.",
        "Push every undiscovered neighbour onto the stack.",
        "Repeat until the stack is empty or the target is reached."
      ],
      useCases: [
        "Detecting cycles in directed and undirected graphs.",
        "Topological sorting and strongly connected components.",
        "Maze generation and solving, and puzzle state-space search."
      ]
    },

    example:
      "Stack: [A] \u2192 pop A, push B and C \u2192 pop C, push E and D \u2192 depth is explored before breadth.",

    pseudocode: [
      "procedure DFS(graph, start, target):",
      "    stack \u2190 [start];   discovered \u2190 {start}",
      "    parent[start] \u2190 \u2212",
      "    while stack is not empty:",
      "        u \u2190 pop(stack)",
      "        visit u",
      "        if u = target:  rebuild path;  return",
      "        for each neighbour v of u:",
      "            if v not in discovered:",
      "                discovered \u2190 discovered \u222A {v}",
      "                parent[v] \u2190 u",
      "                push(stack, v)",
      "    return no path"
    ],

    readyMessage: "Press Play to dive down one branch at a time.",

    run: function (input, emit) {
      var graph = input.graph;
      var start = input.start;
      var target = input.target;

      if (!graph || !graph.nodes.length) {
        emit && emit({ type: "message", text: "The graph has no nodes to search", line: 13 });
        emit && emit({ type: "result", value: "no path", line: 13 });
        return;
      }
      if (!AV.graphModel.findNode(graph, start)) {
        emit && emit({ type: "message", text: "Choose a start node first", line: 1 });
        emit && emit({ type: "result", value: "no path", line: 13 });
        return;
      }

      var adj = AV.graphModel.buildAdjacency(graph);
      var discovered = Object.create(null);
      var parent = Object.create(null);
      var stack = [];
      var i;

      stack.push(start);
      discovered[start] = true;
      parent[start] = null;
      emit && emit({ type: "push", node: start, line: 1 });
      emit && emit({
        type: "message",
        text: "Seed the stack with " + AV.graphModel.labelOf(graph, start),
        line: 1
      });

      while (stack.length > 0) {
        var u = stack.pop();
        emit && emit({ type: "pop", node: u, line: 4 });
        emit && emit({
          type: "visit",
          node: u,
          line: 5,
          text: "Visit " + AV.graphModel.labelOf(graph, u)
        });

        if (target && u === target) {
          emit && emit({ type: "found", node: u, line: 6 });
          var path = rebuildPath(parent, target);
          emit && emit({
            type: "path",
            nodes: path,
            line: 6,
            text: "Target reached; path is " +
              path.map(function (id) { return AV.graphModel.labelOf(graph, id); }).join(" \u2192 ")
          });
          emit && emit({ type: "result", value: path.length - 1, line: 6 });
          return;
        }

        var neighbours = adj.get(u) || [];
        // Push in reverse so the alphabetically first neighbour is explored first.
        for (i = neighbours.length - 1; i >= 0; i--) {
          var v = neighbours[i].to;
          emit && emit({
            type: "edge",
            from: u,
            to: v,
            edgeState: "traversed",
            line: 7,
            text: "Inspect neighbour " + AV.graphModel.labelOf(graph, v) +
              " of " + AV.graphModel.labelOf(graph, u)
          });

          if (discovered[v]) {
            emit && emit({
              type: "message",
              text: AV.graphModel.labelOf(graph, v) + " is already discovered, skip it",
              line: 8
            });
            continue;
          }

          discovered[v] = true;
          parent[v] = u;
          stack.push(v);
          emit && emit({ type: "push", node: v, line: 11 });
        }
      }

      emit && emit({
        type: "message",
        text: target
          ? "The stack emptied - " + AV.graphModel.labelOf(graph, target) + " is unreachable"
          : "The stack emptied - the traversal is complete",
        line: 13
      });
      emit && emit({ type: "notFound", line: 13 });
      emit && emit({ type: "result", value: "no path", line: 13 });
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
