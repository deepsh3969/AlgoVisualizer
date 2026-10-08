/**
 * AlgoVisualizer - recursion renderer
 *
 * Two views of the same run: the live call stack (deepest frame first, so it
 * reads like a real stack) and, once the tree has a few nodes, a call tree
 * showing every frame that has run along with its return value.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;
  var fmt = AV.renderers.formatValue;

  var R = 15;
  var LEVEL_H = 48;
  var SLOT_W = 34;

  function createRecursionRenderer() {
    var host = null;
    var rootEl = null;
    var stackEl = null;
    var meterEl = null;
    var meterFill = null;
    var meterText = null;
    var treeWrap = null;
    var svg = null;
    var lastKey = "";

    function build() {
      meterText = dom.el("span");
      meterFill = dom.el("div", { class: "depth-fill", style: { width: "0%" } });
      meterEl = dom.el("div", { class: "depth-meter" }, [
        dom.el("span", { text: "Depth" }),
        dom.el("div", { class: "depth-track" }, [meterFill]),
        meterText
      ]);
      stackEl = dom.el("div", { class: "callstack" });
      svg = dom.svg("svg", { role: "img", "aria-label": "Call tree visualization" });
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      treeWrap = dom.el("div", { class: "tree-stage", style: { minHeight: "120px" } }, [svg]);
      rootEl = dom.el("div", { class: "stack", style: { width: "100%", gap: "12px" } }, [
        stackEl, meterEl, treeWrap
      ]);
      host.appendChild(rootEl);
    }

    function renderStack(state) {
      var frames = state.frames || [];
      var nodes = [];
      for (var i = frames.length - 1; i >= 0; i--) {
        var f = frames[i];
        var isTop = i === frames.length - 1;
        var cls = "call-frame" + (isTop ? " is-current" : "");
        nodes.push(dom.el("div", { class: cls }, [
          dom.el("div", { class: "cf-head" }, [
            dom.el("span", { text: f.label + "(" + (f.args || []).join(", ") + ")" }),
            dom.el("span", { class: "muted", text: "#" + (i + 1) })
          ]),
          dom.el("div", { class: "cf-meta" }, [
            dom.el("span", { text: "depth " + f.depth }),
            dom.el("span", { text: f.value === null || f.value === undefined ? "computing" : "value " + fmt(f.value) })
          ])
        ]));
      }
      if (state.lastReturned) {
        var lr = state.lastReturned;
        nodes.push(dom.el("div", { class: "call-frame is-returning" }, [
          dom.el("div", { class: "cf-head" }, [
            dom.el("span", { text: lr.label + " returned" }),
            dom.el("span", { class: "muted", text: "depth " + lr.depth })
          ]),
          dom.el("div", { class: "cf-result", text: "= " + fmt(lr.value) })
        ]));
      }
      if (!nodes.length) {
        nodes.push(dom.el("div", { class: "aux-empty", text: "no live frames yet" }));
      }
      dom.fill(stackEl, nodes);

      var depth = frames.length ? frames[frames.length - 1].depth + 1 : 0;
      var maxDepth = Math.max(state.metrics ? state.metrics.maxDepth : 0, depth, 1);
      meterFill.style.width = Math.round((depth / maxDepth) * 100) + "%";
      dom.setText(meterText, depth + " / " + maxDepth);
    }

    function renderTree(state) {
      var calls = state.callNodes || {};
      var ids = Object.keys(calls);
      if (ids.length < 2) {
        treeWrap.style.display = "none";
        return;
      }
      treeWrap.style.display = "";

      // Depth-first order gives a stable left-to-right slot assignment.
      var order = [];
      var seen = Object.create(null);
      function visit(id) {
        if (seen[id] || !calls[id]) return;
        seen[id] = true;
        var node = calls[id];
        var children = (state.callEdges || [])
          .filter(function (e) { return e.from === id; })
          .map(function (e) { return e.to; });
        children.forEach(visit);
        order.push(id);
      }
      var roots = ids.filter(function (id) { return !calls[id].parent; });
      if (!roots.length) roots = [ids[0]];
      roots.forEach(visit);
      ids.forEach(function (id) { if (!seen[id]) visit(id); });

      var slotOf = {};
      order.forEach(function (id, i) { slotOf[id] = i; });
      var maxDepth = 0;
      ids.forEach(function (id) { maxDepth = Math.max(maxDepth, calls[id].depth || 0); });

      var width = Math.max(240, order.length * SLOT_W + 40);
      var height = Math.max(120, (maxDepth + 1) * LEVEL_H + 30);
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("aria-label",
        "Call tree visualization with " + order.length + " frames, depth " + (maxDepth + 1));
      dom.clear(svg);

      var edges = [];
      var nodes = [];
      order.forEach(function (id) {
        var node = calls[id];
        var x = 20 + slotOf[id] * SLOT_W + SLOT_W / 2;
        var y = 20 + node.depth * LEVEL_H + R;

        if (node.parent && slotOf[node.parent] !== undefined) {
          var px = 20 + slotOf[node.parent] * SLOT_W + SLOT_W / 2;
          var py = 20 + calls[node.parent].depth * LEVEL_H + R;
          var cls = "tree-edge";
          if (state.current === id || state.current === node.parent) cls += " is-active";
          edges.push(dom.svg("line", { class: cls, x1: px, y1: py + R, x2: x, y2: y - R }));
        }

        var ncls = "tree-node";
        if (state.current === id) ncls += " is-current";
        else if (node.status === "returned") ncls += " is-visited";
        if (state.found !== null && state.found !== undefined && state.found === id) ncls += " is-found";

        var g = dom.svg("g", { class: ncls, transform: "translate(" + x + "," + y + ")" });
        g.appendChild(dom.svg("circle", { class: "node-shape", cx: 0, cy: 0, r: R }));
        g.appendChild(dom.svg("text", { x: 0, y: 1 }, String(fmt(node.value !== null && node.value !== undefined ? node.value : (node.args || [])[0]))));
        nodes.push(g);
      });

      edges.forEach(function (e) { svg.appendChild(e); });
      nodes.forEach(function (n) { svg.appendChild(n); });
    }

    function render(state) {
      if (!rootEl) build();
      var key = (state.frames || []).map(function (f) { return f.id + ":" + f.value; }).join("|") +
        "#" + Object.keys(state.callNodes || {}).join(",") +
        "#" + (state.current || "-") + "#" + (state.lastReturned ? state.lastReturned.id + ":" + state.lastReturned.value : "-");
      renderStack(state);
      if (key !== lastKey) {
        lastKey = key;
        renderTree(state);
      }
    }

    function destroy() {
      if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      rootEl = stackEl = meterEl = meterFill = meterText = treeWrap = svg = null;
      host = null;
      lastKey = "";
    }

    return {
      kind: "recursion",
      mount: function (target) { host = target; build(); },
      render: render,
      destroy: destroy
    };
  }

  AV.renderers.factories.recursion = createRecursionRenderer;
})(typeof globalThis !== "undefined" ? globalThis : window);
