/**
 * AlgoVisualizer - stack and queue renderers
 *
 * Both paint state.array as live cells, but the geometry differs: a stack
 * grows upward from a base plate, a queue reads left to right.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;
  var fmt = AV.renderers.formatValue;
  var roleClass = AV.renderers.roleClass;

  function buildStack() {
    var host = null;
    var rootEl = null;
    var capEl = null;
    var lastKey = "";

    function build() {
      rootEl = dom.el("div", { class: "stack-viz" });
      capEl = dom.el("div", { class: "stack-cap", text: "Top" });
      host.appendChild(rootEl);
    }

    function render(state) {
      if (!rootEl) build();
      var values = state.array || [];
      var mark = state.mark || {};
      var top = state.pointers && state.pointers.top !== undefined && state.pointers.top !== null
        ? state.pointers.top
        : values.length - 1;

      var key = values.join("|") + "#" + Object.keys(mark).join(",") + "#" + top;
      if (key !== lastKey) {
        lastKey = key;
        var nodes = [];
        for (var i = 0; i < values.length; i++) {
          var role = mark[i];
          nodes.push(dom.el("div", {
            class: "stack-item" + (i === top ? " is-top" : "") + (role ? " " + roleClass(role) : "")
          }, [
            document.createTextNode(fmt(values[i])),
            dom.el("span", { class: "item-idx", text: i })
          ]));
        }
        // column-reverse puts the first child at the bottom, so the cap is
        // appended last to sit above the top element.
        nodes.push(capEl);
        dom.fill(rootEl, nodes);
      }
      dom.setText(capEl, values.length ? "Top (" + values.length + ")" : "Top - empty");
    }

    function destroy() {
      if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      rootEl = capEl = null;
      host = null;
      lastKey = "";
    }

    return {
      kind: "stack",
      mount: function (target) { host = target; build(); },
      render: render,
      destroy: destroy
    };
  }

  function buildQueue() {
    var host = null;
    var rootEl = null;
    var itemsEl = null;
    var lastKey = "";

    function build() {
      itemsEl = dom.el("div", { class: "queue-items" });
      rootEl = dom.el("div", { class: "queue-viz" }, [
        dom.el("span", { class: "queue-end", text: "Front" }),
        itemsEl,
        dom.el("span", { class: "queue-end", text: "Rear" })
      ]);
      host.appendChild(rootEl);
    }

    function render(state) {
      if (!rootEl) build();
      var values = state.array || [];
      var mark = state.mark || {};

      var key = values.join("|") + "#" + Object.keys(mark).join(",");
      if (key !== lastKey) {
        lastKey = key;
        var nodes = [];
        for (var i = 0; i < values.length; i++) {
          var role = mark[i];
          var edge = i === 0 || i === values.length - 1;
          nodes.push(dom.el("div", {
            class: "queue-item" + (role ? " " + roleClass(role) : "") + (edge ? " is-top" : "")
          }, [
            document.createTextNode(fmt(values[i])),
            dom.el("span", {
              class: "item-idx",
              text: i === 0 ? "front" : i === values.length - 1 ? "rear" : String(i)
            })
          ]));
        }
        dom.fill(itemsEl, nodes);
      }
    }

    function destroy() {
      if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      rootEl = itemsEl = null;
      host = null;
      lastKey = "";
    }

    return {
      kind: "queue",
      mount: function (target) { host = target; build(); },
      render: render,
      destroy: destroy
    };
  }

  AV.renderers.factories.stack = buildStack;
  AV.renderers.factories.queue = buildQueue;
})(typeof globalThis !== "undefined" ? globalThis : window);
