/**
 * AlgoVisualizer - binary tree renderer
 *
 * `state.array` is a node table ({ id, value, left, right }) and the root comes
 * from the root pointer (falling back to the input's rootId). Layout is a
 * tidy-ish recursive pass: in-order x positions, depth-driven y.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;
  var fmt = AV.renderers.formatValue;

  var R = 17;
  var LEVEL_H = 56;
  var SLOT_W = 40;

  var CLASS_FOR_ROLE = {
    compare: "is-compare",
    swap: "is-active",
    active: "is-active",
    pivot: "is-current",
    candidate: "is-path",
    found: "is-found",
    sorted: "is-visited",
    "new": "is-active"
  };

  function indexById(table, id) {
    for (var i = 0; i < table.length; i++) {
      if (table[i].id === id) return i;
    }
    return -1;
  }

  function layoutTree(table, rootIndex) {
    var positions = {};
    var slot = 0;
    var maxDepth = 0;
    var guard = 0;

    function place(idx, depth) {
      if (idx < 0 || idx >= table.length) return;
      if (guard > table.length + 2) return;
      guard += 1;
      var node = table[idx];
      if (node.left) place(indexById(table, node.left), depth + 1);
      positions[idx] = { slot: slot, depth: depth };
      slot += 1;
      if (depth > maxDepth) maxDepth = depth;
      if (node.right) place(indexById(table, node.right), depth + 1);
    }

    place(rootIndex, 0);
    return { positions: positions, slots: Math.max(slot, 1), depth: Math.max(maxDepth, 0) };
  }

  function createTreeRenderer() {
    var host = null;
    var rootEl = null;
    var svg = null;
    var lastKey = "";

    function build() {
      rootEl = dom.el("div", { class: "tree-stage" });
      svg = dom.svg("svg", { role: "img", "aria-label": "Tree visualization" });
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      rootEl.appendChild(svg);
      host.appendChild(rootEl);
    }

    function render(state) {
      if (!rootEl) build();
      var table = state.array || [];
      var mark = state.mark || {};
      var pointers = state.pointers || {};

      var rootIndex = pointers.root;
      if (rootIndex === undefined || rootIndex === null) {
        rootIndex = indexById(table, state.input ? state.input.rootId : null);
      }

      var key = table.map(function (n) { return n.id + ":" + n.value + ":" + n.left + ":" + n.right; }).join("|") +
        "#" + Object.keys(mark).join(",") + "#" + rootIndex + "#" + (state.current || "-") +
        "#" + Object.keys(state.visited || {}).join(",");
      if (key === lastKey) return;
      lastKey = key;

      if (rootIndex === undefined || rootIndex === null || rootIndex < 0) {
        svg.setAttribute("viewBox", "0 0 260 120");
        svg.setAttribute("aria-label", "Tree visualization - the tree is empty");
        dom.clear(svg);
        svg.appendChild(dom.svg("text", {
          class: "ll-null", x: 130, y: 64, "text-anchor": "middle"
        }, "the tree is empty"));
        return;
      }

      var laid = layoutTree(table, rootIndex);
      var width = Math.max(240, laid.slots * SLOT_W + 40);
      var height = Math.max(160, (laid.depth + 1) * LEVEL_H + 40);
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("aria-label",
        "Tree visualization with " + Object.keys(laid.positions).length +
        " nodes, depth " + (laid.depth + 1));
      dom.clear(svg);

      var xOf = {};
      Object.keys(laid.positions).forEach(function (k) {
        var p = laid.positions[k];
        xOf[Number(k)] = 20 + p.slot * SLOT_W + SLOT_W / 2;
      });
      var yOf = {};
      Object.keys(laid.positions).forEach(function (k) {
        var p = laid.positions[k];
        yOf[Number(k)] = 24 + p.depth * LEVEL_H + R;
      });

      var edges = [];
      var nodes = [];
      var pathEdges = {};
      if (state.path && state.path.length > 1) {
        for (var pi = 0; pi + 1 < state.path.length; pi++) {
          pathEdges[state.path[pi] + ">" + state.path[pi + 1]] = true;
        }
      }

      Object.keys(laid.positions).forEach(function (k) {
        var idx = Number(k);
        var node = table[idx];
        var x = xOf[idx];
        var y = yOf[idx];

        [["left", node.left], ["right", node.right]].forEach(function (pair) {
          var childId = pair[1];
          if (!childId) return;
          var childIdx = indexById(table, childId);
          if (childIdx < 0 || laid.positions[childIdx] === undefined) return;
          var cx = xOf[childIdx];
          var cy = yOf[childIdx];
          var cls = "tree-edge";
          if (pathEdges[node.id + ">" + childId]) cls += " is-path";
          else if (state.current && (state.current === node.id || state.current === childId)) cls += " is-active";
          edges.push(dom.svg("line", { class: cls, x1: x, y1: y + R, x2: cx, y2: cy - R }));
        });

        var role = mark[idx];
        var cls2 = "tree-node";
        if (role && CLASS_FOR_ROLE[role]) cls2 += " " + CLASS_FOR_ROLE[role];
        if (!role && state.current === node.id) cls2 += " is-current";
        if (state.visited && state.visited[node.id] && cls2.indexOf("is-visited") < 0) cls2 += " is-visited";

        var g = dom.svg("g", { class: cls2, transform: "translate(" + x + "," + y + ")" });
        g.appendChild(dom.svg("circle", { class: "node-shape", cx: 0, cy: 0, r: R }));
        g.appendChild(dom.svg("text", { x: 0, y: 1 }, String(fmt(node.value))));
        nodes.push(g);
      });

      edges.forEach(function (e) { svg.appendChild(e); });
      nodes.forEach(function (nd) { svg.appendChild(nd); });
    }

    function destroy() {
      if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      rootEl = svg = null;
      host = null;
      lastKey = "";
    }

    return {
      kind: "tree",
      mount: function (target) { host = target; build(); },
      render: render,
      destroy: destroy
    };
  }

  AV.renderers.factories.tree = createTreeRenderer;
})(typeof globalThis !== "undefined" ? globalThis : window);
