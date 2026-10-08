/**
 * AlgoVisualizer - learning views
 *
 * Two shapes share this file: the module index (grouped by level, with a
 * progress ring per module) and the single-lesson reader. Both link back to
 * the concrete definitions a lesson talks about.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var STORAGE_KEY = "learning.completed";
  var LEVEL_ORDER = ["beginner", "intermediate", "advanced"];
  var LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

  function readCompleted() {
    var list = AV.storage.get(STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function writeCompleted(list) {
    AV.storage.set(STORAGE_KEY, list);
  }

  function isDone(id) {
    return readCompleted().indexOf(id) >= 0;
  }

  function toggleDone(id) {
    var list = readCompleted();
    var idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(id);
    writeCompleted(list);
    return idx < 0;
  }

  function progressFor(modules) {
    if (!modules.length) return 0;
    var done = modules.filter(function (m) { return isDone(m.id); }).length;
    return Math.round((done / modules.length) * 100);
  }

  function levelBadge(level) {
    var cls = level === "beginner" ? "badge-success"
      : level === "intermediate" ? "badge-info" : "badge-warning";
    return dom.el("span", { class: "badge " + cls, text: LEVEL_LABEL[level] || level });
  }

  /* ------------------------------------------------------------------------
   * Index
   * ---------------------------------------------------------------------- */

  function createIndex(ctx) {
    var state = ctx.state || {};
    var query = (state.searchQuery || "").trim().toLowerCase();
    var modules = AV.learningModules || [];

    var byLevel = LEVEL_ORDER.map(function (level) {
      return {
        level: level,
        modules: modules.filter(function (m) {
          if (m.level !== level) return false;
          if (!query) return true;
          return (m.title + " " + m.summary).toLowerCase().indexOf(query) >= 0;
        })
      };
    }).filter(function (g) { return g.modules.length; });

    var body = dom.el("div", {});
    body.appendChild(dom.el("h1", { class: "page-title", text: "Learning" }));
    byLevel.forEach(function (group, i) {
      var pct = progressFor(group.modules);
      body.appendChild(dom.el("section", { class: "section" }, [
        dom.el("div", { class: "section-head" }, [
          dom.el("h2", { class: "section-title", text: LEVEL_LABEL[group.level] || group.level }),
          dom.el("span", { class: "count-badge", text: pct + "% done" })
        ]),
        dom.el("div", { class: "level-card" }, [
          dom.el("div", { class: "level-head" }, [
            dom.el("span", { class: "level-num", text: i + 1 }),
            dom.el("div", {}, [
              dom.el("div", { class: "card-title", text: LEVEL_LABEL[group.level] || group.level }),
              dom.el("div", { class: "page-sub", text: group.modules.length + " modules" })
            ]),
            dom.el("div", { class: "level-progress" }, [
              dom.el("div", {
                class: "progress-ring", style: { "--p": pct }
              }, [dom.el("span", { text: pct + "%" })])
            ])
          ]),
          dom.el("div", { class: "level-body" }, group.modules.map(function (m) {
            var done = isDone(m.id);
            return dom.el("a", {
              class: "topic-row" + (done ? " is-done" : ""),
              href: AV.buildHash("lesson", m.id)
            }, [
              dom.el("span", { class: "check" }, dom.icon("check", 12)),
              dom.el("span", { class: "topic-name" }, [
                m.title,
                dom.el("div", { class: "page-sub", style: { marginTop: "2px" }, text: m.summary })
              ]),
              levelBadge(m.level)
            ]);
          }))
        ])
      ]));
    });

    if (!byLevel.length) {
      body.appendChild(dom.el("section", { class: "section" }, [
        dom.el("div", { class: "empty-state" }, [
          dom.icon("book", 44),
          dom.el("div", { class: "empty-title", text: "No lesson matches" }),
          dom.el("div", { text: "Try a different search term." })
        ])
      ]));
    }

    return { title: "Learning", el: body, wide: false };
  }

  /* ------------------------------------------------------------------------
   * Single lesson
   * ---------------------------------------------------------------------- */

  function relatedLink(id) {
    var def = AV.algorithms.get(id) || AV.structures.get(id);
    if (!def) return null;
    var isStructure = AV.structures.has(id);
    return dom.el("a", {
      class: "topic-row",
      href: AV.buildHash(isStructure ? "structure" : "algorithm", id)
    }, [
      dom.el("span", { class: "check" }, dom.icon("play", 11)),
      dom.el("span", { class: "topic-name", text: def.name }),
      dom.el("span", { class: "badge", text: def.category })
    ]);
  }

  function createLesson(ctx) {
    var state = ctx.state || {};
    var id = state.lessonId;
    var mod = id ? AV.getLearningModule(id) : null;

    if (!mod) {
      return {
        title: "Lesson not found",
        el: dom.el("section", { class: "section" }, [
          dom.el("div", { class: "empty-state" }, [
            dom.icon("book", 44),
            dom.el("h1", { class: "empty-title", text: "That lesson does not exist" }),
            dom.el("a", { class: "btn", href: AV.buildHash("learning") }, "Back to lessons")
          ])
        ]),
        wide: false
      };
    }

    var related = (mod.related || []).map(relatedLink).filter(Boolean);
    var modules = AV.learningModules || [];
    var idx = modules.findIndex(function (m) { return m.id === mod.id; });
    var prev = idx > 0 ? modules[idx - 1] : null;
    var next = idx >= 0 && idx < modules.length - 1 ? modules[idx + 1] : null;
    var done = isDone(mod.id);

    var markBtn = dom.el("button", {
      class: "btn" + (done ? " btn-primary" : ""),
      type: "button"
    }, [dom.icon("check", 15), done ? "Completed" : "Mark as read"]);

    markBtn.addEventListener("click", function () {
      var nowDone = toggleDone(mod.id);
      markBtn.className = "btn" + (nowDone ? " btn-primary" : "");
      dom.fill(markBtn, [dom.icon("check", 15), nowDone ? "Completed" : "Mark as read"]);
      AV.ui.toast({
        title: nowDone ? "Marked as read" : "Marked as unread",
        message: mod.title,
        kind: nowDone ? "success" : "info"
      });
    });

    var body = dom.el("div", {}, [
      dom.el("section", { class: "section" }, [
        dom.el("div", { class: "page-head" }, [
          dom.el("div", {}, [
            dom.el("div", { class: "row gap-2", style: { marginBottom: "var(--av-space-2)" } }, [
              levelBadge(mod.level),
              dom.el("span", { class: "badge", text: mod.category })
            ]),
            dom.el("h1", { class: "page-title", text: mod.title }),
            dom.el("p", { class: "page-sub", text: mod.summary })
          ]),
          markBtn
        ]),

        dom.el("div", { class: "prose" }, (mod.sections || []).map(function (s) {
          return dom.el("div", {}, [
            dom.el("h2", { class: "section-title", style: { marginTop: "var(--av-space-6)" }, text: s.heading }),
            dom.el("p", { text: s.body })
          ]);
        })),

        (mod.keyPoints && mod.keyPoints.length) ? dom.el("div", { class: "note", style: { marginTop: "var(--av-space-6)" } }, [
          dom.el("div", { class: "card-title", style: { marginBottom: "var(--av-space-2)" }, text: "Key points" }),
          dom.el("ul", { class: "step-list" }, mod.keyPoints.map(function (p) {
            return dom.el("li", { text: p });
          }))
        ]) : null,

        related.length ? dom.el("div", { style: { marginTop: "var(--av-space-6)" } }, [
          dom.el("h2", { class: "section-title", style: { marginBottom: "var(--av-space-2)" }, text: "Open these next" }),
          dom.el("div", { class: "two-col" }, related)
        ]) : null,

        dom.el("div", { class: "row gap-3", style: { marginTop: "var(--av-space-8)", justifyContent: "space-between" } }, [
          prev
            ? dom.el("a", { class: "btn", href: AV.buildHash("lesson", prev.id) },
              [dom.icon("chevronLeft", 15), prev.title])
            : dom.el("span"),
          next
            ? dom.el("a", { class: "btn btn-primary", href: AV.buildHash("lesson", next.id) },
              [next.title, dom.icon("chevronRight", 15)])
            : dom.el("a", { class: "btn", href: AV.buildHash("learning") }, "All lessons")
        ])
      ])
    ]);

    return { title: mod.title, el: body, wide: false };
  }

  AV.views = AV.views || {};
  AV.views.learning = { create: createIndex };
  AV.views.lesson = { create: createLesson };
  AV.views.learningProgress = {
    isDone: isDone,
    toggle: toggleDone,
    percent: progressFor,
    STORAGE_KEY: STORAGE_KEY
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
