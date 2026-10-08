/**
 * AlgoVisualizer - linked list renderer
 *
 * `state.array` is a node table ({ id, value, next }). The renderer walks the
 * chain from the head pointer so that a removed node simply drops out of the
 * picture, while any node the algorithm still highlights (a detached entry,
 * say) is drawn greyed out instead of disappearing mid-step.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;
  var fmt = AV.renderers.formatValue;

  var NODE_W = 62;
  var NODE_H = 42;
  var GAP = 40;

  var CLASS_FOR_ROLE = {
    compare: "is-active",
    swap: "is-new",
    active: "is-active",
    found: "is-found",
    pivot: "is-active",
    candidate: "is-active",
    "new": "is-new"
  };

  function indexById(table, id) {
    for (var i = 0; i < table.length; i++) {
      if (table[i].id === id) return i;
    }
    return -1;
  }

  function createLinkedRenderer() {
    var host = null;
    var rootEl = null;
    var svg = null;
    var lastKey = "";

    function build() {
      rootEl = dom.el("div", { class: "ll-stage" });
      svg = dom.svg("svg", { role: "img" });
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      rootEl.appendChild(svg);
      host.appendChild(rootEl);
    }

    function walk(table, headIndex) {
      var order = [];
      var guard = 0;
      var idx = headIndex;
      while (idx >= 0 && idx < table.length && guard <= table.length) {
        order.push(idx);
        idx = indexById(table, table[idx].next);
        guard += 1;
      }
      return order;
    }

    function render(state) {
      if (!rootEl) build();
      var table = state.array || [];
      var mark = state.mark || {};
      var pointers = state.pointers || {};

      var headIndex = pointers.head;
      if (headIndex === undefined || headIndex === null) {
        headIndex = indexById(table, state.input ? state.input.headId : null);
      }
      if (headIndex < 0 && table.length && pointers.head === undefined) headIndex = 0;

      var key = table.map(function (n) { return n.id + ":" + n.value + ":" + n.next; }).join("|") +
        "#" + Object.keys(mark).join(",") +
        "#" + headIndex + "#" + (pointers.current === undefined ? "-" : pointers.current);
      if (key === lastKey) return;
      lastKey = key;

      var order = walk(table, headIndex);
      var painted = {};
      order.forEach(function (i, position) { painted[i] = position; });

      // Any highlighted node that fell off the chain is still worth showing.
      Object.keys(mark).forEach(function (k) {
        var i = Number(k);
        if (!painted[i] && painted[i] !== 0 && table[i]) painted[i] = -1;
      });

      var slots = [];
      Object.keys(painted).forEach(function (k) {
        slots.push({ index: Number(k), position: painted[k] });
      });
      slots.sort(function (a, b) {
        if (a.position >= 0 && b.position >= 0) return a.position - b.position;
        if (a.position >= 0) return -1;
        if (b.position >= 0) return 1;
        return a.index - b.index;
      });

      var n = slots.length;
      var width = Math.max(200, n * (NODE_W + GAP) - GAP + 40);
      var height = 120;
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      dom.clear(svg);

      var nodes = [];
      var arrows = [];
      var slotOf = {};
      slots.forEach(function (slot, i) { slotOf[slot.index] = i; });

      slots.forEach(function (slot, i) {
        var node = table[slot.index];
        var x = 20 + i * (NODE_W + GAP);
        var y = 40;
        var detached = slot.position < 0;
        var role = mark[slot.index];
        var cls = "ll-node" + (role && CLASS_FOR_ROLE[role] ? " " + CLASS_FOR_ROLE[role] : "");
        var current = pointers.current === slot.index;
        if (current) cls += " is-active";

        var group = dom.svg("g", { class: cls, transform: "translate(" + x + "," + y + ")" });
        group.appendChild(dom.svg("rect", {
          x: 0, y: 0, width: NODE_W, height: NODE_H, rx: 7
        }));
        group.appendChild(dom.svg("text", {
          x: NODE_W / 2, y: NODE_H / 2 - 2, "text-anchor": "middle",
          "dominant-baseline": "central"
        }, String(fmt(node.value))));
        group.appendChild(dom.svg("text", {
          class: "ll-idx", x: NODE_W / 2, y: NODE_H + 14, "text-anchor": "middle"
        }, slot.position >= 0 ? "#" + slot.position : "removed"));
        if (detached) group.setAttribute("opacity", "0.45");
        nodes.push(group);

        if (!detached && node.next) {
          var nextSlot = slotOf[indexById(table, node.next)];
          if (nextSlot !== undefined && nextSlot === i + 1) {
            var x1 = x + NODE_W;
            var x2 = x + NODE_W + GAP;
            var arrowCls = "ll-arrow" + (current ? " is-active" : "");
            arrows.push(dom.svg("line", {
              class: arrowCls, x1: x1, y1: y + NODE_H / 2, x2: x2 - 6, y2: y + NODE_H / 2
            }));
            arrows.push(dom.svg("path", {
              class: arrowCls,
              d: "M" + (x2 - 8) + " " + (y + NODE_H / 2 - 5) + " L" + (x2 - 1) + " " +
                (y + NODE_H / 2) + " L" + (x2 - 8) + " " + (y + NODE_H / 2 + 5)
            }));
          }
        }
      });

      var last = slots.length ? slots[slots.length - 1] : null;
      if (last && !table[last.index].next && last.position >= 0) {
        nodes.push(dom.svg("text", {
          class: "ll-null",
          x: 20 + slots.length * (NODE_W + GAP) + 4,
          y: 40 + NODE_H / 2 + 4
        }, "null"));
      }

      arrows.forEach(function (a) { svg.appendChild(a); });
      nodes.forEach(function (nd) { svg.appendChild(nd); });

      if (!n) {
        svg.setAttribute("viewBox", "0 0 240 90");
        svg.appendChild(dom.svg("text", {
          class: "ll-null", x: 120, y: 48, "text-anchor": "middle"
        }, "empty list - head points at null"));
      }
    }

    function destroy() {
      if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      rootEl = svg = null;
      host = null;
      lastKey = "";
    }

    return {
      kind: "linked",
      mount: function (target) { host = target; build(); },
      render: render,
      destroy: destroy
    };
  }

  AV.renderers.factories.linked = createLinkedRenderer;
})(typeof globalThis !== "undefined" ? globalThis : window);
