/**
 * AlgoVisualizer - graph renderer
 *
 * Reads `state.input.graph` (nodes with x/y, weighted edges) and paints the
 * traversal state: visited nodes, the current node, the frontier, the chosen
 * path and every traversed edge. Nodes can be dragged; positions are written
 * back onto the graph object so the layout survives re-renders.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var R = 19;

  function nodeById(graph, id) {
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].id === id) return graph.nodes[i];
    }
    return null;
  }

  function createGraphRenderer() {
    var host = null;
    var rootEl = null;
    var svg = null;
    var lastKey = "";
    var drag = null;
    var offs = [];

    function build() {
      rootEl = dom.el("div", { class: "graph-stage" });
      svg = dom.svg("svg", { role: "img", "aria-label": "Graph visualization" });
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      rootEl.appendChild(svg);
      host.appendChild(rootEl);
    }

    function bounds(graph) {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      graph.nodes.forEach(function (n) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });
      if (!graph.nodes.length) return { minX: 0, maxX: 640, minY: 0, maxY: 420 };
      return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    }

    function toSvgPoint(evt) {
      var rect = svg.getBoundingClientRect();
      var vb = (svg.getAttribute("viewBox") || "0 0 680 440").split(/\s+/).map(Number);
      var sx = vb[2] / Math.max(1, rect.width);
      var sy = vb[3] / Math.max(1, rect.height);
      return { x: (evt.clientX - rect.left) * sx, y: (evt.clientY - rect.top) * sy };
    }

    function startDrag(node, evt) {
      evt.preventDefault();
      var point = toSvgPoint(evt);
      drag = { node: node, dx: node.x - point.x, dy: node.y - point.y };
      offs = [
        dom.on(window, "pointermove", onDrag),
        dom.on(window, "pointerup", endDrag)
      ];
    }

    function onDrag(evt) {
      if (!drag) return;
      var point = toSvgPoint(evt);
      drag.node.x = Math.round(point.x + drag.dx);
      drag.node.y = Math.round(point.y + drag.dy);
      lastKey = "";
      if (svg.__state) render(svg.__state, svg.__ctx, true);
    }

    function endDrag() {
      drag = null;
      offs.forEach(function (off) { off(); });
      offs = [];
    }

    function render(state, ctx, force) {
      if (!rootEl) build();
      var graph = state.input ? state.input.graph : null;
      svg.__state = state;
      svg.__ctx = ctx;

      if (!graph || !graph.nodes || !graph.nodes.length) {
        svg.setAttribute("viewBox", "0 0 260 120");
        svg.setAttribute("aria-label", "Graph visualization - the graph is empty");
        dom.clear(svg);
        svg.appendChild(dom.svg("text", {
          class: "ll-null", x: 130, y: 64, "text-anchor": "middle"
        }, "the graph is empty"));
        return;
      }

      var frontier = {};
      (state.queue || []).forEach(function (id) { frontier[id] = "queue"; });
      (state.stack || []).forEach(function (id) { frontier[id] = "stack"; });
      var pathEdges = {};
      if (state.path && state.path.length > 1) {
        for (var i = 0; i + 1 < state.path.length; i++) {
          pathEdges[state.path[i] + ">" + state.path[i + 1]] = true;
          pathEdges[state.path[i + 1] + ">" + state.path[i]] = true;
        }
      }

      var key = graph.nodes.map(function (n) { return n.id + ":" + n.x + ":" + n.y; }).join("|") +
        "#" + graph.edges.map(function (e) { return e.from + ">" + e.to + ":" + e.weight; }).join("|") +
        "#" + Object.keys(state.visited || {}).join(",") +
        "#" + (state.current || "-") +
        "#" + Object.keys(frontier).join(",") +
        "#" + Object.keys(state.traversed || {}).join(",") +
        "#" + Object.keys(pathEdges).join(",") +
        "#" + (state.input.start || "-") + "#" + (state.input.target || "-");
      if (key === lastKey && !force) return;
      lastKey = key;

      var b = bounds(graph);
      var pad = 40;
      svg.setAttribute("viewBox",
        Math.max(0, b.minX - pad) + " " + Math.max(0, b.minY - pad) + " " +
        (b.maxX - b.minX + pad * 2) + " " + (b.maxY - b.minY + pad * 2));
      svg.setAttribute("aria-label",
        "Graph visualization with " + graph.nodes.length + " nodes and " +
        graph.edges.length + " edges");
      dom.clear(svg);

      var showWeights = false;
      graph.edges.forEach(function (e) {
        if (e.weight && e.weight !== 1) showWeights = true;
      });

      var edgeEls = [];
      var weightEls = [];
      graph.edges.forEach(function (e) {
        var from = nodeById(graph, e.from);
        var to = nodeById(graph, e.to);
        if (!from || !to) return;
        var key2 = e.from + ">" + e.to;
        var cls = "graph-edge";
        if (pathEdges[key2]) cls += " is-path";
        else if (state.traversed && state.traversed[key2]) cls += " is-visited";
        edgeEls.push(dom.svg("line", {
          class: cls, "data-edge": e.id || key2,
          x1: from.x, y1: from.y, x2: to.x, y2: to.y
        }));

        if (graph.directed) {
          var ang = Math.atan2(to.y - from.y, to.x - from.x);
          var tipX = to.x - Math.cos(ang) * (R + 3);
          var tipY = to.y - Math.sin(ang) * (R + 3);
          var wing = 7;
          edgeEls.push(dom.svg("path", {
            class: cls,
            d: "M" + tipX + " " + tipY +
              " L" + (tipX - Math.cos(ang - 0.4) * wing) + " " + (tipY - Math.sin(ang - 0.4) * wing) +
              " M" + tipX + " " + tipY +
              " L" + (tipX - Math.cos(ang + 0.4) * wing) + " " + (tipY - Math.sin(ang + 0.4) * wing)
          }));
        }

        if (showWeights && e.weight !== undefined && e.weight !== null) {
          var mx = (from.x + to.x) / 2;
          var my = (from.y + to.y) / 2;
          var label = String(e.weight);
          var w = label.length * 7 + 8;
          weightEls.push(dom.svg("rect", {
            class: "edge-weight-bg", x: mx - w / 2, y: my - 9, width: w, height: 18, rx: 4
          }));
          weightEls.push(dom.svg("text", { class: "edge-weight-text", x: mx, y: my + 1 }, label));
        }
      });

      var nodeEls = [];
      graph.nodes.forEach(function (node) {
        var cls = "graph-node";
        if (frontier[node.id] === "queue") cls += " is-queue";
        if (frontier[node.id] === "stack") cls += " is-stack";
        if (state.current === node.id) cls += " is-current";
        else if (state.visited && state.visited[node.id]) cls += " is-visited";
        if (state.input.target === node.id) cls += " is-target";
        if (state.input.start === node.id) cls += " is-start";

        var g = dom.svg("g", { class: cls, transform: "translate(" + node.x + "," + node.y + ")" });
        g.appendChild(dom.svg("circle", { class: "node-shape", cx: 0, cy: 0, r: R }));
        g.appendChild(dom.svg("text", { class: "node-label", x: 0, y: 1 }, String(node.label)));
        g.addEventListener("pointerdown", function (evt) { startDrag(node, evt); });
        nodeEls.push(g);
      });

      edgeEls.forEach(function (e) { svg.appendChild(e); });
      weightEls.forEach(function (e) { svg.appendChild(e); });
      nodeEls.forEach(function (n) { svg.appendChild(n); });
    }

    function destroy() {
      endDrag();
      if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      rootEl = svg = null;
      host = null;
      lastKey = "";
    }

    return {
      kind: "graph",
      mount: function (target) { host = target; build(); },
      render: render,
      destroy: destroy
    };
  }

  AV.renderers.factories.graph = createGraphRenderer;
})(typeof globalThis !== "undefined" ? globalThis : window);
