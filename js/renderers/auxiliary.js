/**
 * AlgoVisualizer - auxiliary panels
 *
 * Small boxes that sit beside the stage: the BFS/DFS frontier, a stack, the
 * distance labels from Dijkstra and any algorithm-supplied rows (prefix sums
 * and friends). Boxes appear only when they have something to show, so the
 * column never fills with empty frames.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;
  var fmt = AV.renderers.formatValue;

  function createAuxRenderer() {
    var host = null;
    var column = null;
    var lastKey = "";

    function build() {
      column = dom.el("div", { class: "aux-column" });
      host.appendChild(column);
    }

    function box(title, count, body) {
      return dom.el("div", { class: "aux-box" }, [
        dom.el("div", { class: "aux-box-title" }, [
          dom.el("span", { text: title }),
          dom.el("span", { text: count })
        ]),
        dom.el("div", { class: "aux-box-body" }, [body])
      ]);
    }

    function chipList(values, headIndex, labelFor) {
      if (!values.length) return dom.el("span", { class: "aux-empty", text: "empty" });
      return dom.frag(values.map(function (v, i) {
        return dom.el("span", { class: "aux-node" + (i === headIndex ? " is-head" : "") },
          String(labelFor ? labelFor(v, i) : fmt(v)));
      }));
    }

    function distanceTable(state, labelFor) {
      var keys = Object.keys(state.distances).filter(function (k) {
        return k.indexOf("__from__") !== 0;
      });
      var rows = keys.map(function (k) {
        return dom.el("tr", {}, [
          dom.el("td", { text: labelFor ? labelFor(k) : String(k) }),
          dom.el("td", { text: fmt(state.distances[k]) })
        ]);
      });
      return dom.el("table", { class: "dist-table" }, [dom.el("tbody", {}, rows)]);
    }

    function render(state) {
      if (!rootEl()) build();
      var labelFor = null;
      var graph = state.input ? state.input.graph : null;
      if (graph && graph.nodes) {
        labelFor = function (id) {
          for (var i = 0; i < graph.nodes.length; i++) {
            if (graph.nodes[i].id === id) return graph.nodes[i].label;
          }
          return String(id);
        };
      }

      var boxes = [];
      if (state.queue && state.queue.length) {
        boxes.push(box("Frontier", String(state.queue.length),
          chipList(state.queue, 0, labelFor)));
      }
      if (state.stack && state.stack.length) {
        boxes.push(box("Stack", String(state.stack.length),
          chipList(state.stack, state.stack.length - 1, labelFor)));
      }

      var distKeys = Object.keys(state.distances).filter(function (k) {
        return k.indexOf("__from__") !== 0;
      });
      if (distKeys.length) {
        boxes.push(box("Distances", String(distKeys.length), distanceTable(state, labelFor)));
      }

      Object.keys(state.rows || {}).forEach(function (name) {
        var row = state.rows[name] || [];
        boxes.push(box(name, String(row.filter(function (v) { return v !== undefined; }).length),
          chipList(row, -1)));
      });

      if (state.resultReady && state.result !== undefined && state.result !== null &&
          !Array.isArray(state.result) && typeof state.result !== "object") {
        boxes.push(box("Result", "", dom.el("span", { class: "aux-node is-head" }, String(fmt(state.result)))));
      }

      var key = boxes.map(function (b) { return b.textContent; }).join("#");
      if (key !== lastKey) {
        lastKey = key;
        if (!boxes.length) column.style.display = "none";
        else {
          column.style.display = "";
          dom.fill(column, boxes);
        }
      }
    }

    function rootEl() { return column; }

    function destroy() {
      if (column && column.parentNode) column.parentNode.removeChild(column);
      column = null;
      host = null;
      lastKey = "";
    }

    return {
      kind: "aux",
      mount: function (target) { host = target; build(); },
      render: render,
      destroy: destroy
    };
  }

  AV.renderers.aux = { create: createAuxRenderer };
})(typeof globalThis !== "undefined" ? globalThis : window);
