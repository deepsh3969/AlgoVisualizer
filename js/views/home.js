/**
 * AlgoVisualizer - home view
 *
 * The landing page: what this is, why it exists, and a direct path into every
 * category plus the last thing the visitor had open.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  function stat(value, label) {
    return dom.el("div", { class: "stat-card" }, [
      dom.el("div", { class: "stat-value", text: value }),
      dom.el("div", { class: "stat-label", text: label })
    ]);
  }

  function categoryCard(cat) {
    var defs = cat.kind === "algorithm" ? AV.algorithms.byCategory(cat.id) : AV.structures.all();
    var href = cat.kind === "algorithm"
      ? AV.buildHash("algorithms")
      : AV.buildHash("structures");

    return dom.el("a", { class: "link-card", href: href }, [
      dom.el("div", { class: "link-card-title" }, [
        dom.el("span", { class: "cat-icon cat-" + cat.color, text: cat.icon }),
        cat.label
      ]),
      dom.el("div", { class: "link-card-desc", text: cat.description }),
      dom.el("div", { class: "link-card-foot" }, [
        dom.el("span", { class: "count-badge", text: defs.length + " " + (defs.length === 1 ? "entry" : "entries") }),
        cat.kind === "algorithm" ? dom.icon("arrowRight", 14) : dom.icon("arrowRight", 14)
      ])
    ]);
  }

  function recentCard(id) {
    var def = AV.algorithms.get(id) || AV.structures.get(id);
    if (!def) return null;
    var isStructure = AV.structures.has(id);
    return dom.el("a", {
      class: "topic-row",
      href: AV.buildHash(isStructure ? "structure" : "algorithm", id)
    }, [
      dom.el("span", { class: "check" }, dom.icon("check", 12)),
      dom.el("span", { class: "topic-name", text: def.name }),
      dom.el("span", { class: "badge", text: def.category })
    ]);
  }

  function create(ctx) {
    var state = ctx.state || {};
    var algoCount = AV.algorithms.size();
    var structCount = AV.structures.size();
    var lessonCount = (AV.learningModules || []).length;
    var questionCount = (AV.quizQuestions || []).length;

    var algorithmCats = (AV.categories || []).filter(function (c) { return c.kind === "algorithm"; });
    var structureCat = {
      id: "structures", label: "Data structures", short: "Structures", kind: "structure",
      color: "structures", icon: "DS",
      description: "Watch push, pop, enqueue, insert and traverse happen cell by cell."
    };

    var recents = (state.recentIds || []).slice(0, 6).map(recentCard).filter(Boolean);

    var hero = dom.el("section", { class: "hero" }, [
      dom.el("div", { class: "hero-inner" }, [
        dom.el("span", { class: "hero-eyebrow" }, [dom.icon("zap", 14), "Project 02 - portfolio build"]),
        dom.el("h1", { class: "hero-title", text: "Algorithms you can watch think." }),
        dom.el("p", { class: "hero-tagline", text: "Step through sorting, searching, graphs and data structures one event at a time." }),
        dom.el("p", {
          class: "hero-support",
          text: "Every comparison, swap, enqueue and call frame is an event. Press play, slow it down, or step backwards - the visualization is just a replay of that event stream."
        }),
        dom.el("div", { class: "hero-actions" }, [
          dom.el("a", { class: "btn btn-primary btn-lg", href: AV.buildHash("algorithm", "quickSort") },
            [dom.icon("play", 16), "Open Quick sort"]),
          dom.el("a", { class: "btn btn-lg", href: AV.buildHash("learning") },
            [dom.icon("book", 16), "Start learning"]),
          dom.el("a", { class: "btn btn-ghost btn-lg", href: AV.buildHash("compare") },
            [dom.icon("branch", 16), "Compare two"])
        ]),
        dom.el("div", { class: "hero-stats" }, [
          stat(algoCount, "Algorithms"),
          stat(structCount, "Data structures"),
          stat(lessonCount, "Lessons"),
          stat(questionCount, "Quiz questions")
        ])
      ])
    ]);

    var categories = algorithmCats.concat([structureCat]);

    var main = dom.el("div", {}, [
      hero,
      dom.el("section", { class: "section" }, [
        dom.el("div", { class: "section-head" }, [
          dom.el("h2", { class: "section-title", text: "Browse by category" }),
          dom.el("a", { class: "btn btn-sm btn-ghost", href: AV.buildHash("algorithms") }, "See all")
        ]),
        dom.el("div", { class: "card-grid" }, categories.map(categoryCard))
      ]),
      recents.length ? dom.el("section", { class: "section" }, [
        dom.el("div", { class: "section-head" }, [
          dom.el("h2", { class: "section-title", text: "Pick up where you left off" })
        ]),
        dom.el("div", { class: "card-grid" }, recents)
      ]) : null,
      dom.el("section", { class: "section" }, [
        dom.el("div", { class: "section-head" }, [
          dom.el("h2", { class: "section-title", text: "How it works" })
        ]),
        dom.el("div", { class: "two-col" }, [
          dom.el("div", { class: "card card-pad" }, [
            dom.el("h3", { class: "card-title", text: "1. Algorithms emit events" }),
            dom.el("p", {
              class: "link-card-desc",
              text: "Each algorithm is a plain function that narrates what it does: compare two indices, swap them, write a value, mark a range. Nothing about the algorithm knows it is being drawn."
            })
          ]),
          dom.el("div", { class: "card card-pad" }, [
            dom.el("h3", { class: "card-title", text: "2. Events become a timeline" }),
            dom.el("p", {
              class: "link-card-desc",
              text: "The visualization engine replays that stream, checkpointing every 64 steps so you can scrub backwards to any point without re-running from the start."
            })
          ]),
          dom.el("div", { class: "card card-pad" }, [
            dom.el("h3", { class: "card-title", text: "3. The renderer paints state" }),
            dom.el("p", {
              class: "link-card-desc",
              text: "Bars, stacks, linked nodes, trees and graphs all read the same state object. Swap the renderer and the same event stream draws a completely different picture."
            })
          ]),
          dom.el("div", { class: "card card-pad" }, [
            dom.el("h3", { class: "card-title", text: "4. Metrics come for free" }),
            dom.el("p", {
              class: "link-card-desc",
              text: "Comparisons, swaps, writes and visited counts are tallied by the engine, so every run reports its own cost - and benchmarks compare real measurements against Big-O predictions."
            })
          ])
        ])
      ]),
      dom.el("section", { class: "section" }, [
        dom.el("div", { class: "section-head" }, [
          dom.el("h2", { class: "section-title", text: "Go further" })
        ]),
        dom.el("div", { class: "card-grid" }, [
          dom.el("a", { class: "link-card", href: AV.buildHash("quiz") }, [
            dom.el("div", { class: "link-card-title" }, [dom.icon("help", 18), "Quiz yourself"]),
            dom.el("div", { class: "link-card-desc", text: questionCount + " questions across seven categories, with explanations for every answer." }),
            dom.el("div", { class: "link-card-foot" }, [dom.icon("arrowRight", 14)])
          ]),
          dom.el("a", { class: "link-card", href: AV.buildHash("benchmark") }, [
            dom.el("div", { class: "link-card-title" }, [dom.icon("chart", 18), "Benchmark"]),
            dom.el("div", { class: "link-card-desc", text: "Measure how wall-clock time grows with input size, then compare it against the theoretical curve." }),
            dom.el("div", { class: "link-card-foot" }, [dom.icon("arrowRight", 14)])
          ]),
          dom.el("a", { class: "link-card", href: AV.buildHash("learning") }, [
            dom.el("div", { class: "link-card-title" }, [dom.icon("book", 18), "Read the lessons"]),
            dom.el("div", { class: "link-card-desc", text: lessonCount + " short modules on Big-O, sorting trade-offs, graph vocabulary and tree invariants." }),
            dom.el("div", { class: "link-card-foot" }, [dom.icon("arrowRight", 14)])
          ])
        ])
      ])
    ]);

    return { title: "Home", el: main, wide: false };
  }

  AV.views = AV.views || {};
  AV.views.home = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
