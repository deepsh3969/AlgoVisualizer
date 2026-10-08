/**
 * AlgoVisualizer - sidebar
 *
 * The persistent catalogue on the left: every algorithm grouped by category,
 * every data structure, and a short list of recently opened definitions.
 * Items are plain links so the browser (and screen readers) treat them as
 * navigation.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  function create(opts) {
    var o = opts || {};
    var rootEl = dom.el("nav", { class: "sidebar", attrs: { "aria-label": "Catalogue" } });
    var scrim = dom.el("div", { class: "sidebar-scrim", hidden: true });
    var open = false;

    function sideItem(entry) {
      return dom.el("a", {
        class: "side-item", href: entry.href,
        attrs: { "data-id": entry.id, "data-kind": entry.kind }
      }, [
        dom.el("span", { class: "dot" }),
        dom.el("span", { class: "side-item-label", text: entry.label }),
        entry.meta ? dom.el("span", { class: "side-item-meta", text: entry.meta }) : null
      ]);
    }

    function block(title, children) {
      return dom.el("div", { class: "side-block" }, [
        dom.el("div", { class: "side-title", text: title }),
        dom.el("div", { class: "side-list" }, children)
      ]);
    }

    function render() {
      var sections = [];
      var algoCategories = (AV.categories || []).filter(function (c) { return c.kind === "algorithm"; });
      algoCategories.forEach(function (cat) {
        var defs = AV.algorithms.byCategory(cat.id);
        if (!defs.length) return;
        sections.push(block(cat.label, defs.map(function (def) {
          return sideItem({
            kind: "algorithm", id: def.id, label: def.name,
            href: AV.buildHash("algorithm", def.id),
            meta: (def.complexity && def.complexity.worst) || ""
          });
        })));
      });

      var structures = AV.structures.all();
      if (structures.length) {
        sections.push(block("Data structures", structures.map(function (def) {
          return sideItem({
            kind: "structure", id: def.id, label: def.name,
            href: AV.buildHash("structure", def.id),
            meta: def.viz
          });
        })));
      }

      var modules = AV.learningModules || [];
      if (modules.length) {
        sections.push(block("Learn", modules.slice(0, 6).map(function (m) {
          return sideItem({
            kind: "lesson", id: m.id, label: m.title,
            href: AV.buildHash("lesson", m.id),
            meta: m.level
          });
        })));
      }

      dom.fill(rootEl, sections);
      if (o.onNavigate) {
        dom.delegate(rootEl, ".side-item", "click", function (event) {
          o.onNavigate(event);
          setOpen(false);
        });
      }
    }

    function update(route) {
      var kind = route && route.name;
      var id = route && route.id;
      dom.qsa(".side-item", rootEl).forEach(function (item) {
        var match = false;
        if (id && item.getAttribute("data-id") === id) {
          match = (kind === "algorithm" && item.getAttribute("data-kind") === "algorithm") ||
            (kind === "structure" && item.getAttribute("data-kind") === "structure") ||
            (kind === "lesson" && item.getAttribute("data-kind") === "lesson");
        }
        if (match) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
    }

    function setOpen(next) {
      open = !!next;
      if (open) rootEl.classList.add("is-open");
      else rootEl.classList.remove("is-open");
      scrim.hidden = !open;
    }

    function isOpen() { return open; }

    render();

    return {
      el: rootEl,
      scrim: scrim,
      update: update,
      setOpen: setOpen,
      isOpen: isOpen,
      destroy: function () {
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
        if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
      }
    };
  }

  AV.ui = AV.ui || {};
  AV.ui.sidebar = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
