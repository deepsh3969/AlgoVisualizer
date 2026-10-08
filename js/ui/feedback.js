/**
 * AlgoVisualizer - toasts and dialogs
 *
 * Both live inside a shared `.overlay` scrim that is toggled with the hidden
 * attribute, matching the stylesheets. Dialogs resolve a promise so callers
 * can simply `await AV.ui.confirm(...)`.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  var toastRegion = null;
  var overlay = null;
  var activeClose = null;

  function ensureToastRegion() {
    if (toastRegion && toastRegion.isConnected) return toastRegion;
    toastRegion = dom.el("div", { class: "toast-region", attrs: { "aria-live": "polite" } });
    document.body.appendChild(toastRegion);
    return toastRegion;
  }

  /**
   * Show a toast. opts: { title, message, kind, duration }
   * kind: brand (default) | success | warning | error
   */
  function toast(opts) {
    var o = opts || {};
    var region = ensureToastRegion();
    var duration = o.duration === undefined ? 4200 : o.duration;
    var node = dom.el("div", { class: "toast" + (o.kind && o.kind !== "brand" ? " t-" + o.kind : "") }, [
      dom.el("div", {}, [
        o.title ? dom.el("div", { class: "toast-title", text: o.title }) : null,
        dom.el("div", { class: "toast-msg", text: o.message || "" })
      ]),
      dom.el("button", {
        class: "toast-close", type: "button", attrs: { "aria-label": "Dismiss" },
        on: { click: function () { dismiss(); } }
      }, "\u00D7")
    ]);

    var timer = null;
    function dismiss() {
      if (timer) clearTimeout(timer);
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    region.appendChild(node);
    if (duration > 0) timer = setTimeout(dismiss, duration);
    return { dismiss: dismiss, node: node };
  }

  function ensureOverlay() {
    if (overlay && overlay.isConnected) return overlay;
    overlay = dom.el("div", { class: "overlay", hidden: true });
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeOverlay() {
    if (activeClose) {
      var fn = activeClose;
      activeClose = null;
      fn();
    }
  }

  /**
   * Open a modal dialog.
   * opts: { title, body, actions: [{ label, kind, value }], dismissValue }
   * Resolves with the chosen action's value, or `dismissValue` when cancelled.
   */
  function dialog(opts) {
    var o = opts || {};
    var scrim = ensureOverlay();
    var restoreFocus = document.activeElement;
    var resolveFn = null;
    var promise = new Promise(function (resolve) { resolveFn = resolve; });

    var box = dom.el("div", { class: "dialog", attrs: { role: "dialog", "aria-modal": "true" } });
    var titleId = "dlg-title-" + Math.random().toString(36).slice(2, 8);
    box.setAttribute("aria-labelledby", titleId);

    function finish(value) {
      activeClose = null;
      if (scrim.firstChild) dom.clear(scrim);
      scrim.hidden = true;
      document.removeEventListener("keydown", onKey, true);
      if (restoreFocus && restoreFocus.focus) restoreFocus.focus();
      resolveFn(value);
    }
    activeClose = function () { finish(o.dismissValue === undefined ? null : o.dismissValue); };

    function onKey(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(o.dismissValue === undefined ? null : o.dismissValue);
      } else if (event.key === "Tab") {
        var focusables = dom.qsa("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", box);
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    box.appendChild(dom.el("div", { class: "dialog-head" }, [
      dom.el("h2", { class: "dialog-title", id: titleId, text: o.title || "Confirm" }),
      dom.el("button", {
        class: "icon-btn", type: "button", attrs: { "aria-label": "Close" },
        on: { click: function () { finish(o.dismissValue === undefined ? null : o.dismissValue); } }
      }, dom.icon("close"))
    ]));

    var body = dom.el("div", { class: "dialog-body" });
    if (typeof o.body === "string") body.appendChild(dom.el("p", { text: o.body }));
    else if (o.body) body.appendChild(o.body);
    box.appendChild(body);

    var actions = o.actions && o.actions.length
      ? o.actions
      : [{ label: "Close", kind: "primary", value: true }];
    var foot = dom.el("div", { class: "dialog-foot" });
    actions.forEach(function (action) {
      foot.appendChild(dom.el("button", {
        class: "btn" + (action.kind ? " btn-" + action.kind : ""),
        type: "button",
        on: { click: function () { finish(action.value === undefined ? true : action.value); } }
      }, action.label));
    });
    box.appendChild(foot);

    dom.clear(scrim);
    scrim.appendChild(box);
    scrim.hidden = false;
    scrim.addEventListener("click", function onScrimClick(event) {
      if (event.target === scrim) {
        scrim.removeEventListener("click", onScrimClick);
        finish(o.dismissValue === undefined ? null : o.dismissValue);
      }
    });
    document.addEventListener("keydown", onKey, true);

    var focusTarget = dom.qs(".btn-primary", foot) || dom.qs("button", foot);
    if (focusTarget) focusTarget.focus();
    return promise;
  }

  function confirm(opts) {
    var o = opts || {};
    return dialog({
      title: o.title || "Are you sure?",
      body: o.message || "",
      confirmLabel: o.confirmLabel || "Confirm",
      cancelLabel: o.cancelLabel || "Cancel",
      danger: !!o.danger,
      actions: [
        { label: o.cancelLabel || "Cancel", kind: "ghost", value: false },
        { label: o.confirmLabel || "Confirm", kind: o.danger ? "danger" : "primary", value: true }
      ],
      dismissValue: false
    });
  }

  AV.ui = AV.ui || {};
  AV.ui.toast = toast;
  AV.ui.dialog = dialog;
  AV.ui.confirm = confirm;
  AV.ui.closeOverlay = closeOverlay;
})(typeof globalThis !== "undefined" ? globalThis : window);
