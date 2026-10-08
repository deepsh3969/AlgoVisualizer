/**
 * AlgoVisualizer - algorithm catalogue
 *
 * Every registered algorithm grouped by category, each card linking straight
 * into its workspace. Cards carry the worst-case bound and the visualization
 * kind so a visitor can compare before opening anything.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var KIND_LABEL = {
    array: "Bars", search: "Bars", pattern: "Bars",
    stack: "Stack", queue: "Queue", linked: "Linked list",
    tree: "Tree", graph: "Graph", recursion: "Call stack"
  };

  function algorithmCard(def) {
    var c = def.complexity || {};
    return dom.el("a", {
      class: "link-card", href: AV.buildHash("algorithm", def.id),
      attrs: { "data-id": def.id }
    }, [
      dom.el("div", { class: "link-card-title" }, [
        def.icon ? dom.icon(def.icon, 16) : dom.icon("zap", 16),
        def.name
      ]),
      dom.el("div", { class: "link-card-desc", text: def.tagline || def.summary || "" }),
      dom.el("div", { class: "link-card-foot" }, [
        dom.el("span", { class: "badge", text: KIND_LABEL[def.viz] || def.viz }),
        c.worst ? dom.el("span", { class: "mono", text: "Worst " + c.worst }) : null,
        c.space ? dom.el("span", { class: "mono", text: "Space " + c.space }) : null
      ])
    ]);
  }

  function structureCard(def) {
    return dom.el("a", {
      class: "link-card", href: AV.buildHash("structure", def.id),
      attrs: { "data-id": def.id }
    }, [
      dom.el("div", { class: "link-card-title" }, [
        dom.icon(def.icon || "layers", 16),
        def.name
      ]),
      dom.el("div", { class: "link-card-desc", text: def.tagline || def.summary || "" }),
      dom.el("div", { class: "link-card-foot" }, [
        dom.el("span", { class: "badge", text: KIND_LABEL[def.viz] || def.viz }),
        def.operations && def.operations.length
          ? dom.el("span", { class: "mono", text: def.operations.length + " ops" })
          : null
      ])
    ]);
  }

  function emptyState(text) {
    return dom.el("div", { class: "empty-state" }, [
      dom.icon("filter", 44),
      dom.el("div", { class: "empty-title", text: "Nothing here yet" }),
      dom.el("div", { text: text })
    ]);
  }

  function create(ctx) {
    var state = ctx.state || {};
    var mode = ctx.mode || "algorithms"; // "algorithms" | "structures"
    var query = (state.searchQuery || "").trim().toLowerCase();

    var body = dom.el("div", {});

    if (mode === "structures") {
      var structures = AV.structures.all();
      if (query) {
        structures = structures.filter(function (def) {
          return (def.name + " " + (def.tagline || "")).toLowerCase().indexOf(query) >= 0;
        });
      }
      body.appendChild(dom.el("section", { class: "section" }, [
        dom.el("div", { class: "section-head" }, [
          dom.el("h1", { class: "section-title", text: "Data structures" }),
          dom.el("span", { class: "count-badge", text: structures.length })
        ]),
        structures.length
          ? dom.el("div", { class: "card-grid" }, structures.map(structureCard))
          : emptyState("No structure matches that search.")
      ]));
    } else {
      var algorithmCats = (AV.categories || []).filter(function (c) { return c.kind === "algorithm"; });
      var total = 0;

      body.appendChild(dom.el("h1", { class: "page-title", text: "Algorithms" }));

      algorithmCats.forEach(function (cat) {
        var defs = AV.algorithms.byCategory(cat.id);
        if (query) {
          defs = defs.filter(function (def) {
            return (def.name + " " + (def.tagline || "") + " " + def.id).toLowerCase().indexOf(query) >= 0;
          });
        }
        if (!defs.length) return;
        total += defs.length;

        body.appendChild(dom.el("section", { class: "section" }, [
          dom.el("div", { class: "section-head" }, [
            dom.el("h2", { class: "section-title" }, [
              dom.el("span", { class: "cat-icon cat-" + cat.color, text: cat.icon }),
              " " + cat.label
            ]),
            dom.el("span", { class: "count-badge", text: defs.length })
          ]),
          dom.el("p", { class: "page-sub", style: { marginBottom: "var(--av-space-4)" }, text: cat.description }),
          dom.el("div", { class: "card-grid" }, defs.map(algorithmCard))
        ]));
      });

      if (!total) {
        body.appendChild(dom.el("section", { class: "section" },
          emptyState("No algorithm matches that search.")));
      }
    }

    return {
      title: mode === "structures" ? "Data structures" : "Algorithms",
      el: body,
      wide: false
    };
  }

  AV.views = AV.views || {};
  AV.views.algorithms = { create: function (ctx) { return create(Object.assign({ mode: "algorithms" }, ctx)); } };
  AV.views.structures = { create: function (ctx) { return create(Object.assign({ mode: "structures" }, ctx)); } };
})(typeof globalThis !== "undefined" ? globalThis : window);
