/**
 * AlgoVisualizer - application controller
 *
 * Boots the shell (header, sidebar, main region, footer), owns the hash
 * router, and swaps the active view whenever the route changes. All state
 * lives in the store from js/core/state.js; this file only wires it to the
 * DOM and the DOM back to the store.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  /* ------------------------------------------------------------------------
   * Theme
   * ---------------------------------------------------------------------- */

  function applyTheme(theme) {
    var resolved = theme;
    if (theme === "system") {
      resolved = (typeof matchMedia === "function" &&
        matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function applyReducedMotion(on) {
    document.documentElement.setAttribute("data-reduced-motion", on ? "true" : "false");
  }

  /* ------------------------------------------------------------------------
   * View rendering
   * ---------------------------------------------------------------------- */

  var activeView = null;
  var mainEl = null;
  var header = null;
  var sidebar = null;

  function destroyActiveView() {
    if (activeView && typeof activeView.destroy === "function") {
      try { activeView.destroy(); } catch (e) { /* view already gone */ }
    }
    activeView = null;
    if (mainEl) dom.clear(mainEl);
  }

  function renderRoute(state, meta) {
    if (!mainEl) return;
    var route = state.route || { name: "home" };
    var viewModule = null;
    var ctx = {
      state: state,
      route: route,
      meta: meta || {},
      onQuizCategory: function (c) { AV.app.set({ quizCategory: c }); },
      onBenchmarkCategory: function (c) { AV.app.set({ benchmarkCategory: c }); },
      onCompareIds: function (ids) { AV.app.set({ compareIds: ids }); },
      onInput: function (input) { AV.app.set({ input: input }); }
    };

    switch (route.name) {
      case "home": viewModule = AV.views.home; break;
      case "algorithms": viewModule = AV.views.algorithms; break;
      case "structures": viewModule = AV.views.structures; break;
      case "learning": viewModule = AV.views.learning; break;
      case "lesson": viewModule = AV.views.lesson; break;
      case "quiz": viewModule = AV.views.quiz; break;
      case "benchmark": viewModule = AV.views.benchmark; break;
      case "compare": viewModule = AV.views.compare; break;
      case "algorithm":
      case "structure":
        viewModule = AV.views.workspaceRoute;
        break;
      default:
        viewModule = AV.views.home;
    }

    destroyActiveView();

    if (!viewModule || typeof viewModule.create !== "function") {
      mainEl.appendChild(dom.el("section", { class: "section" }, [
        dom.el("div", { class: "empty-state" }, [
          dom.icon("info", 40),
          dom.el("h1", { class: "empty-title", text: "View unavailable" })
        ])
      ]));
      return;
    }

    try {
      activeView = viewModule.create(ctx);
    } catch (err) {
      activeView = null;
      mainEl.appendChild(dom.el("section", { class: "section" }, [
        dom.el("div", { class: "empty-state" }, [
          dom.icon("info", 40),
          dom.el("h1", { class: "empty-title", text: "Something went wrong" }),
          dom.el("div", { text: String(err && err.message || err) })
        ])
      ]));
      return;
    }

    var pageClass = "view" + (activeView.wide ? " view-wide" : "");
    var viewRoot = dom.el("div", { class: pageClass }, [activeView.el]);
    mainEl.appendChild(viewRoot);
    mainEl.scrollTop = 0;
    if (mainEl.parentNode) mainEl.parentNode.scrollTop = 0;

    if (activeView.title) {
      document.title = activeView.title + " - AlgoVisualizer";
    }
  }

  /* ------------------------------------------------------------------------
   * Shell
   * ---------------------------------------------------------------------- */

  function mountShell(state) {
    var appEl = dom.qs(".app");
    var bodyEl = dom.qs(".app-body");
    if (!appEl || !bodyEl) return;

    header = AV.ui.header.create({
      onSearch: function () {
        AV.ui.search.open({ onSelect: function (entry) {
          if (entry.kind === "algorithm") AV.app.set({ route: AV.parseHash(AV.buildHash("algorithm", entry.id)) });
          else if (entry.kind === "structure") AV.app.set({ route: AV.parseHash(AV.buildHash("structure", entry.id)) });
          else if (entry.kind === "lesson") AV.app.set({ route: AV.parseHash(AV.buildHash("lesson", entry.id)) });
        } });
      },
      onTheme: function () {
        var cur = AV.app.get().theme;
        AV.app.set({ theme: cur === "dark" ? "light" : cur === "light" ? "system" : "dark" });
      },
      onSettings: function () { openSettings(); },
      onMenu: function () {
        var open = !AV.app.get().sidebarOpen;
        AV.app.set({ sidebarOpen: open });
        sidebar.setOpen(open);
        header.setMenuOpen(open);
      }
    });
    appEl.insertBefore(header.el, bodyEl);

    sidebar = AV.ui.sidebar.create({
      onNavigate: function () {
        AV.app.set({ sidebarOpen: false });
        header.setMenuOpen(false);
      }
    });
    bodyEl.insertBefore(sidebar.el, bodyEl.firstChild);
    bodyEl.insertBefore(sidebar.scrim, bodyEl.firstChild);

    mainEl = dom.qs("#main", bodyEl) || dom.el("main", { class: "main", id: "main" });
    if (!mainEl.parentNode) bodyEl.appendChild(mainEl);
  }

  function openSettings() {
    var prefs = AV.app.get();
    var body = dom.el("div", {}, [
      dom.el("div", { class: "setting-row" }, [
        dom.el("div", {}, [
          dom.el("div", { class: "setting-name", text: "Theme" }),
          dom.el("div", { class: "setting-desc", text: "Light, dark, or follow your system." })
        ]),
        (function () {
          var sel = dom.el("select", { class: "select", attrs: { "aria-label": "Theme" } }, [
            dom.el("option", { value: "system", text: "System" }),
            dom.el("option", { value: "light", text: "Light" }),
            dom.el("option", { value: "dark", text: "Dark" })
          ]);
          sel.value = prefs.theme || "system";
          sel.addEventListener("change", function () { AV.app.set({ theme: sel.value }); });
          return sel;
        })()
      ]),
      dom.el("div", { class: "setting-row" }, [
        dom.el("div", {}, [
          dom.el("div", { class: "setting-name", text: "Reduced motion" }),
          dom.el("div", { class: "setting-desc", text: "Minimise transitions and animations." })
        ]),
        (function () {
          var btn = dom.el("button", {
            class: "btn btn-sm" + (prefs.reducedMotion ? " btn-primary" : ""),
            type: "button", text: prefs.reducedMotion ? "On" : "Off"
          });
          btn.addEventListener("click", function () {
            var next = !AV.app.get().reducedMotion;
            AV.app.set({ reducedMotion: next });
            dom.setText(btn, next ? "On" : "Off");
            btn.className = "btn btn-sm" + (next ? " btn-primary" : "");
          });
          return btn;
        })()
      ]),
      dom.el("div", { class: "setting-row" }, [
        dom.el("div", {}, [
          dom.el("div", { class: "setting-name", text: "Default array size" }),
          dom.el("div", { class: "setting-desc", text: "Used when you open an algorithm." })
        ]),
        (function () {
          var num = dom.el("input", {
            class: "input input-sm", type: "number", min: "2", max: "500",
            value: String(prefs.input && prefs.input.size ? prefs.input.size : 25),
            attrs: { style: "width:110px", "aria-label": "Array size" }
          });
          num.addEventListener("change", function () {
            var v = AV.random.clampInt(num.value, 2, 500, 25);
            num.value = String(v);
            var cur = AV.app.get().input;
            AV.app.set({ input: Object.assign({}, cur, { size: v }) });
          });
          return num;
        })()
      ])
    ]);

    AV.ui.dialog({
      title: "Settings",
      body: body,
      actions: [
        { label: "Reset to defaults", value: "reset", kind: "ghost" },
        { label: "Done", value: "done", kind: "primary" }
      ]
    }).then(function (value) {
      if (value === "reset") {
        AV.resetPrefs();
        AV.app.reset(AV.defaultState());
        AV.ui.toast({ title: "Settings reset", message: "Back to defaults.", kind: "success" });
      }
    });
  }

  /* ------------------------------------------------------------------------
   * Routing
   * ---------------------------------------------------------------------- */

  function navigateFromHash() {
    var route = AV.parseHash(location.hash);
    AV.app.set({ route: route });
    if (route.name === "algorithm" && route.id) {
      AV.app.set({ algorithmId: route.id });
      AV.app.set(function (s) {
        return { recentIds: AV.rememberRecent({ recentIds: s.recentIds }, route.id, 8) };
      });
    }
    if (route.name === "structure" && route.id) {
      AV.app.set(function (s) {
        return { recentIds: AV.rememberRecent({ recentIds: s.recentIds }, route.id, 8) };
      });
    }
    if (route.name === "lesson" && route.id) AV.app.set({ lessonId: route.id });
  }

  function onKeydown(event) {
    var tag = event.target && event.target.tagName;
    var editable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
      (event.target && event.target.isContentEditable);

    if (event.key === "/" && !editable && !AV.ui.search.isOpen()) {
      event.preventDefault();
      AV.ui.search.open({ onSelect: function (entry) {
        if (entry.kind === "algorithm") location.hash = AV.buildHash("algorithm", entry.id);
        else if (entry.kind === "structure") location.hash = AV.buildHash("structure", entry.id);
        else if (entry.kind === "lesson") location.hash = AV.buildHash("lesson", entry.id);
      } });
    } else if ((event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K")) {
      event.preventDefault();
      if (!AV.ui.search.isOpen()) {
        AV.ui.search.open({ onSelect: function (entry) {
          if (entry.kind === "algorithm") location.hash = AV.buildHash("algorithm", entry.id);
          else if (entry.kind === "structure") location.hash = AV.buildHash("structure", entry.id);
          else if (entry.kind === "lesson") location.hash = AV.buildHash("lesson", entry.id);
        } });
      }
    } else if (event.key === "Escape" && !AV.ui.search.isOpen()) {
      var dialog = dom.qs(".dialog");
      if (!dialog) AV.ui.closeOverlay();
    }
  }

  /* ------------------------------------------------------------------------
   * Boot
   * ---------------------------------------------------------------------- */

  function boot() {
    var store = AV.app;
    var initial = store.get();

    applyTheme(initial.theme);
    applyReducedMotion(initial.reducedMotion);
    header = null;
    sidebar = null;
    mainEl = dom.qs("#main");

    mountShell(initial);

    header.update(initial.route);
    header.setTheme(initial.theme);
    sidebar.update(initial.route);

    renderRoute(initial, { boot: true });

    store.subscribe(function (next, prev, meta) {
      if (next.theme !== prev.theme) {
        applyTheme(next.theme);
        if (header) header.setTheme(next.theme);
      }
      if (next.reducedMotion !== prev.reducedMotion) applyReducedMotion(next.reducedMotion);

      var routeChanged = !prev.route || !next.route ||
        next.route.name !== prev.route.name || next.route.id !== prev.route.id;
      if (routeChanged) {
        if (header) header.update(next.route);
        if (sidebar) sidebar.update(next.route);
        renderRoute(next, meta);
      }
    });

    window.addEventListener("hashchange", navigateFromHash);
    document.addEventListener("keydown", onKeydown);

    if (typeof matchMedia === "function") {
      var mq = matchMedia("(prefers-color-scheme: dark)");
      var onScheme = function () {
        if (AV.app.get().theme === "system") applyTheme("system");
      };
      if (mq.addEventListener) mq.addEventListener("change", onScheme);
      else if (mq.addListener) mq.addListener(onScheme);
    }

    // Normalise the hash once so a bare load gets a real route.
    if (!location.hash || location.hash === "#" || location.hash === "#/") {
      location.replace("#/");
    } else {
      navigateFromHash();
    }
  }

  /* ------------------------------------------------------------------------
   * Workspace route view
   *
   * A thin wrapper so the router can treat algorithm and structure detail
   * pages the same way. Resolves the definition, seeds the input, and hands
   * the shared workspace view the result.
   * ---------------------------------------------------------------------- */

  AV.views = AV.views || {};
  AV.views.workspaceRoute = {
    create: function (ctx) {
      var state = ctx.state || {};
      var route = state.route || {};
      var id = route.id;
      var def = route.name === "structure"
        ? AV.structures.get(id)
        : AV.algorithms.get(id);

      if (!def) {
        return {
          title: "Not found",
          wide: false,
          el: dom.el("section", { class: "section" }, [
            dom.el("div", { class: "empty-state" }, [
              dom.icon("info", 44),
              dom.el("h1", { class: "empty-title", text: "That definition does not exist" }),
              dom.el("a", { class: "btn", href: AV.buildHash(route.name === "structure" ? "structures" : "algorithms") },
                "Back to the catalogue")
            ])
          ])
        };
      }

      var workspace = AV.views.workspace.create({
        definition: def,
        input: state.input || AV.defaultInput(),
        speed: state.speed || 1,
        onInput: ctx.onInput
      });

      var head = dom.el("div", { class: "page-head" }, [
        dom.el("div", {}, [
          dom.el("div", { class: "row gap-2", style: { marginBottom: "var(--av-space-2)" } }, [
            dom.el("span", { class: "badge badge-brand", text: def.category }),
            def.complexity && def.complexity.worst
              ? dom.el("span", { class: "badge", text: "Worst " + def.complexity.worst })
              : null
          ]),
          dom.el("h1", { class: "page-title", text: def.name }),
          dom.el("p", { class: "page-sub", text: def.tagline || "" })
        ]),
        dom.el("div", { class: "row gap-2" }, [
          dom.el("a", {
            class: "btn btn-sm", href: AV.buildHash("compare")
          }, [dom.icon("branch", 14), "Compare"]),
          dom.el("a", {
            class: "btn btn-sm", href: AV.buildHash("benchmark")
          }, [dom.icon("chart", 14), "Benchmark"])
        ])
      ]);

      var page = dom.el("div", { class: "page page-wide", style: { paddingBottom: 0 } }, [head, workspace.el]);

      return {
        title: def.name,
        wide: true,
        el: page,
        destroy: function () { workspace.destroy(); }
      };
    }
  };

  // Expose a tiny bootstrap the HTML can call.
  AV.boot = boot;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
