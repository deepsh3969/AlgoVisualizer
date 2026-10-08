/**
 * AlgoVisualizer - application header
 *
 * Brand, primary navigation, the search trigger, the theme toggle and the
 * mobile menu button. Navigation uses real anchors so the hash router and the
 * browser's own history stay in step.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var NAV_ICONS = {
    home: "home",
    algorithms: "layers",
    structures: "grid",
    learning: "book",
    quiz: "help",
    benchmark: "chart",
    compare: "branch"
  };

  function create(opts) {
    var o = opts || {};
    var themeBtn = null;
    var menuBtn = null;
    var navEl = null;
    var onMenu = o.onMenu || function () {};

    function buildBrand() {
      return dom.el("a", { class: "brand", href: "#/" }, [
        dom.el("span", { class: "brand-mark", text: "AV" }),
        dom.el("span", { class: "brand-text" }, [
          dom.el("span", { class: "brand-name", text: "AlgoVisualizer" }),
          dom.el("span", { class: "brand-sub", text: "See the algorithm work" })
        ])
      ]);
    }

    function buildNav() {
      var links = AV.ROUTES.map(function (route) {
        return dom.el("a", {
          class: "nav-link", href: AV.buildHash(route.name),
          attrs: { "data-route": route.name }
        }, [
          dom.icon(NAV_ICONS[route.name] || "chevronRight"),
          route.label,
          route.name === "algorithms"
            ? dom.el("span", { class: "nav-count", text: AV.algorithms.size() })
            : null,
          route.name === "structures"
            ? dom.el("span", { class: "nav-count", text: AV.structures.size() })
            : null
        ]);
      });
      return dom.el("nav", { class: "header-nav", attrs: { "aria-label": "Sections" } }, links);
    }

    navEl = buildNav();

    themeBtn = dom.el("button", {
      class: "icon-btn", type: "button", attrs: { "aria-label": "Switch theme", "data-act": "theme" }
    }, dom.icon("moon"));

    var searchBtn = dom.el("button", {
      class: "header-search-btn", type: "button", attrs: { "data-act": "search" }
    }, [
      dom.icon("search"),
      dom.el("span", { text: "Search" }),
      dom.el("kbd", { text: "/" })
    ]);

    var settingsBtn = dom.el("button", {
      class: "icon-btn", type: "button", attrs: { "aria-label": "Settings", "data-act": "settings" }
    }, dom.icon("settings"));

    menuBtn = dom.el("button", {
      class: "icon-btn menu-btn", type: "button",
      attrs: { "aria-label": "Menu", "aria-expanded": "false", "data-act": "menu" }
    }, dom.icon("menu"));

    var rootEl = dom.el("header", { class: "site-header" }, [
      dom.el("div", { class: "header-inner" }, [
        buildBrand(),
        navEl,
        dom.el("div", { class: "header-spacer" }),
        dom.el("div", { class: "header-actions" }, [searchBtn, themeBtn, settingsBtn, menuBtn])
      ])
    ]);

    rootEl.addEventListener("click", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-act]") : null;
      if (!btn || !rootEl.contains(btn)) return;
      var act = btn.getAttribute("data-act");
      if (act === "search" && o.onSearch) o.onSearch();
      else if (act === "theme" && o.onTheme) o.onTheme();
      else if (act === "settings" && o.onSettings) o.onSettings();
      else if (act === "menu") onMenu();
    });

    // Closing on navigation keeps the mobile drawer from covering the page.
    navEl.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest(".nav-link") : null;
      if (link) navEl.classList.remove("is-open");
    });

    function update(route) {
      var name = route && route.name ? route.name : "home";
      var active = name;
      if (name === "algorithm") active = "algorithms";
      if (name === "structure") active = "structures";
      if (name === "lesson") active = "learning";
      dom.qsa(".nav-link", navEl).forEach(function (link) {
        if (link.getAttribute("data-route") === active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }

    function setTheme(theme) {
      var isDark = theme === "dark" ||
        (theme === "system" && typeof matchMedia === "function" &&
          matchMedia("(prefers-color-scheme: dark)").matches);
      dom.fill(themeBtn, dom.icon(isDark ? "sun" : "moon"));
      themeBtn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }

    function setMenuOpen(isOpen) {
      if (isOpen) navEl.classList.add("is-open");
      else navEl.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", String(!!isOpen));
    }

    return {
      el: rootEl,
      update: update,
      setTheme: setTheme,
      setMenuOpen: setMenuOpen,
      destroy: function () {
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      }
    };
  }

  AV.ui = AV.ui || {};
  AV.ui.header = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
