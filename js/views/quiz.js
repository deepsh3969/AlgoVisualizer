/**
 * AlgoVisualizer - quiz view
 *
 * A single-question-at-a-time runner over the question bank. Category and
 * difficulty filters rebuild the deck; answers are revealed immediately with
 * the explanation, and the final screen scores the run.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var BEST_KEY = "quiz.best";

  var DIFFICULTY_BADGE = { easy: "badge-success", medium: "badge-info", hard: "badge-warning" };
  var OPTION_KEYS = ["A", "B", "C", "D"];

  function readBest() {
    return AV.storage.get(BEST_KEY, null);
  }

  function saveBest(entry) {
    var best = readBest();
    if (!best || entry.percent > best.percent ||
      (entry.percent === best.percent && entry.total > best.total)) {
      AV.storage.set(BEST_KEY, entry);
      return true;
    }
    return false;
  }

  function create(ctx) {
    var state = ctx.state || {};
    var container = dom.el("div", {});

    var quiz = null;
    var answers = [];
    var current = 0;
    var revealed = false;
    var finished = false;

    function start() {
      var category = state.quizCategory || "all";
      var pool = category === "all"
        ? AV.quizQuestions.slice()
        : AV.questionsByCategory(category);
      quiz = pool;
      answers = [];
      current = 0;
      revealed = false;
      finished = false;
      render();
    }

    function scoreNow() {
      return AV.scoreQuiz(answers);
    }

    function render() {
      dom.clear(container);
      if (!quiz || !quiz.length) {
        container.appendChild(dom.el("section", { class: "section" }, [
          dom.el("div", { class: "empty-state" }, [
            dom.icon("help", 44),
            dom.el("div", { class: "empty-title", text: "No questions in that category" }),
            dom.el("button", { class: "btn", type: "button", on: { click: start } }, "Show all questions")
          ])
        ]));
        return;
      }

      container.appendChild(renderFilters());

      if (finished) {
        container.appendChild(renderResults());
        return;
      }
      container.appendChild(renderQuestion());
    }

    function renderFilters() {
      var category = state.quizCategory || "all";
      var cats = ["all"].concat(AV.quizCategories || []);
      var seg = dom.el("div", { class: "segmented" }, cats.map(function (c) {
        return dom.el("button", {
          type: "button",
          attrs: { "aria-pressed": String(category === c) },
          on: {
            click: function () {
              if (ctx.onQuizCategory) ctx.onQuizCategory(c);
              else { state.quizCategory = c; start(); }
            }
          }
        }, c === "all" ? "All topics" : (c.charAt(0).toUpperCase() + c.slice(1)));
      }));

      var best = readBest();
      return dom.el("section", { class: "section", style: { paddingBottom: 0 } }, [
        dom.el("div", { class: "page-head" }, [
          dom.el("div", {}, [
            dom.el("h1", { class: "page-title", text: "Quiz" }),
            dom.el("p", { class: "page-sub", text: quiz.length + " questions in this deck. Answers are revealed one at a time." })
          ]),
          best ? dom.el("div", { class: "quiz-stats" }, [
            dom.el("span", { text: "Best: " + best.correct + "/" + best.total + " (" + best.percent + "%)" })
          ]) : null
        ]),
        seg
      ]);
    }

    function renderQuestion() {
      var q = quiz[current];
      var step = current + 1;
      var total = quiz.length;
      var answered = answers[current] !== undefined;
      var chosen = answered ? answers[current].selected : null;
      var check = answered ? AV.checkAnswer(q, chosen) : null;

      var options = dom.el("div", { class: "quiz-options" }, q.options.map(function (optText, i) {
        var cls = "quiz-option";
        if (check) {
          if (i === q.answer) cls += " is-correct";
          else if (i === chosen) cls += " is-wrong";
        }
        return dom.el("button", {
          class: cls, type: "button", disabled: check ? true : false,
          on: {
            click: function () {
              if (revealed) return;
              answers[current] = { id: q.id, selected: i };
              revealed = true;
              render();
            }
          }
        }, [
          dom.el("span", { class: "opt-key", text: OPTION_KEYS[i] || String(i + 1) }),
          optText
        ]);
      }));

      var explain = check ? dom.el("div", {
        class: "quiz-explain " + (check.correct ? "is-correct" : "is-wrong")
      }, [
        dom.el("strong", { text: check.correct ? "Correct. " : "Not quite. " }),
        check.explain
      ]) : null;

      var nav = dom.el("div", { class: "quiz-foot" }, [
        dom.el("span", { class: "mono", text: "Question " + step + " of " + total }),
        dom.el("div", { class: "row gap-2" }, [
          current > 0 ? dom.el("button", {
            class: "btn btn-sm", type: "button",
            on: { click: function () { current -= 1; revealed = answers[current] !== undefined; render(); } }
          }, [dom.icon("chevronLeft", 14), "Back"]) : null,
          check && current < total - 1 ? dom.el("button", {
            class: "btn btn-sm btn-primary", type: "button",
            on: { click: function () { current += 1; revealed = answers[current] !== undefined; render(); } }
          }, ["Next", dom.icon("chevronRight", 14)]) : null,
          check && current === total - 1 ? dom.el("button", {
            class: "btn btn-sm btn-primary", type: "button",
            on: { click: function () { finished = true; render(); } }
          }, ["See results", dom.icon("trophy", 14)]) : null
        ])
      ]);

      var links = AV.questionLinks ? AV.questionLinks(q) : {};
      var linkRows = [];
      if (links && links.definition) {
        var def = links.definition;
        var isStructure = AV.structures.has(def.id);
        linkRows.push(dom.el("a", {
          class: "topic-row",
          href: AV.buildHash(isStructure ? "structure" : "algorithm", def.id)
        }, [
          dom.el("span", { class: "check" }, dom.icon("play", 11)),
          dom.el("span", { class: "topic-name", text: def.name })
        ]));
      }
      if (links && links.module) {
        linkRows.push(dom.el("a", {
          class: "topic-row", href: AV.buildHash("lesson", links.module.id)
        }, [
          dom.el("span", { class: "check" }, dom.icon("book", 11)),
          dom.el("span", { class: "topic-name", text: links.module.title })
        ]));
      }

      return dom.el("section", { class: "section" }, [
        dom.el("div", { class: "quiz-card" }, [
          dom.el("div", { class: "quiz-head" }, [
            dom.el("div", { class: "row gap-2" }, [
              dom.el("span", { class: "badge badge-brand", text: q.category }),
              dom.el("span", { class: "badge " + (DIFFICULTY_BADGE[q.difficulty] || ""), text: q.difficulty })
            ]),
            dom.el("span", { class: "mono", text: step + "/" + total })
          ]),
          dom.el("div", { class: "quiz-body" }, [
            dom.el("div", { class: "quiz-question", text: q.prompt }),
            options,
            explain,
            linkRows.length ? dom.el("div", { class: "row gap-2", style: { marginTop: "var(--av-space-4)", flexWrap: "wrap" } }, linkRows) : null
          ]),
          nav
        ])
      ]);
    }

    function renderResults() {
      var result = scoreNow();
      var bestSaved = saveBest({
        correct: result.correct,
        total: result.total,
        percent: result.percent,
        at: Date.now()
      });

      var breakdown = dom.el("div", { class: "two-col" }, quiz.map(function (q, i) {
        var entry = answers[i];
        var ok = entry && entry.selected === q.answer;
        return dom.el("div", {
          class: "topic-row" + (ok ? " is-done" : ""),
          attrs: { title: q.prompt }
        }, [
          dom.el("span", { class: "check" }, dom.icon(ok ? "check" : "close", 12)),
          dom.el("span", { class: "topic-name", text: q.prompt }),
          dom.el("span", { class: "badge", text: q.category })
        ]);
      }));

      return dom.el("section", { class: "section" }, [
        dom.el("div", { class: "quiz-card" }, [
          dom.el("div", { class: "quiz-head" }, [
            dom.el("div", { class: "card-title" }, [dom.icon("trophy", 16), " Results"]),
            bestSaved ? dom.el("span", { class: "badge badge-success", text: "New best" }) : null
          ]),
          dom.el("div", { class: "quiz-body" }, [
            dom.el("div", { class: "hero-stats", style: { marginTop: 0, maxWidth: "none" } }, [
              dom.el("div", { class: "stat-card" }, [
                dom.el("div", { class: "stat-value", text: result.correct + "/" + result.total }),
                dom.el("div", { class: "stat-label", text: "Correct" })
              ]),
              dom.el("div", { class: "stat-card" }, [
                dom.el("div", { class: "stat-value", text: result.percent + "%" }),
                dom.el("div", { class: "stat-label", text: "Score" })
              ]),
              dom.el("div", { class: "stat-card" }, [
                dom.el("div", { class: "stat-value", text: result.total - result.correct }),
                dom.el("div", { class: "stat-label", text: "Missed" })
              ])
            ]),
            dom.el("h2", { class: "section-title", style: { margin: "var(--av-space-6) 0 var(--av-space-3)" }, text: "Question by question" }),
            breakdown
          ]),
          dom.el("div", { class: "quiz-foot" }, [
            dom.el("button", { class: "btn btn-primary", type: "button", on: { click: start } },
              [dom.icon("restart", 15), "Try another deck"])
          ])
        ])
      ]);
    }

    start();

    return {
      title: "Quiz",
      el: container,
      wide: false,
      destroy: function () { dom.clear(container); }
    };
  }

  AV.views = AV.views || {};
  AV.views.quiz = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
