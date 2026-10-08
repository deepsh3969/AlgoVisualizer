/**
 * AlgoVisualizer — DOM helpers
 *
 * A four-function markup layer plus an inline icon set. Everything here is
 * deliberately tiny: views build plain objects, this module turns them into
 * elements, and no template engine or framework is involved.
 *
 *   AV.dom.el("div", { class: "card", text: "Hi" })
 *   AV.dom.el("button", { class: "btn", on: { click: fn } }, "Press")
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var SVG_NS = "http://www.w3.org/2000/svg";

  function appendChild(target, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      for (var i = 0; i < child.length; i++) appendChild(target, child[i]);
      return;
    }
    if (child && typeof child === "object" && child.nodeType) {
      target.appendChild(child);
      return;
    }
    target.appendChild(document.createTextNode(String(child)));
  }

  function applyAttrs(node, attrs) {
    if (!attrs) return node;
    for (var key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      var value = attrs[key];
      if (value === null || value === undefined || value === false) continue;

      if (key === "class" || key === "className") {
        node.setAttribute("class", value);
      } else if (key === "text") {
        node.textContent = String(value);
      } else if (key === "html") {
        node.innerHTML = String(value);
      } else if (key === "style") {
        if (typeof value === "string") node.setAttribute("style", value);
        else {
          for (var prop in value) {
            if (Object.prototype.hasOwnProperty.call(value, prop)) {
              node.style[prop] = value[prop];
            }
          }
        }
      } else if (key === "data") {
        for (var dk in value) {
          if (Object.prototype.hasOwnProperty.call(value, dk)) {
            node.setAttribute("data-" + dk, value[dk]);
          }
        }
      } else if (key === "on") {
        for (var type in value) {
          if (Object.prototype.hasOwnProperty.call(value, type)) {
            node.addEventListener(type, value[type]);
          }
        }
      } else if (key === "attrs") {
        for (var ak in value) {
          if (Object.prototype.hasOwnProperty.call(value, ak)) {
            node.setAttribute(ak, value[ak]);
          }
        }
      } else if (value === true) {
        node.setAttribute(key, "");
      } else {
        node.setAttribute(key, String(value));
      }
    }
    return node;
  }

  function create(tag, attrs, children) {
    var node = document.createElement(tag);
    applyAttrs(node, attrs);
    if (children !== undefined) appendChild(node, children);
    return node;
  }

  function createSvg(tag, attrs, children) {
    var node = document.createElementNS(SVG_NS, tag);
    applyAttrs(node, attrs);
    if (children !== undefined) appendChild(node, children);
    return node;
  }

  function frag(children) {
    var f = document.createDocumentFragment();
    appendChild(f, children);
    return f;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /** Replace the children of `node` only when the content actually changed. */
  function fill(node, children) {
    if (!node) return node;
    clear(node);
    appendChild(node, children);
    return node;
  }

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    return function off() {
      target.removeEventListener(type, handler, options);
    };
  }

  /** Listen for `type` on any descendant matching `selector`. */
  function delegate(rootEl, selector, type, handler) {
    return on(rootEl, type, function (event) {
      var match = event.target && event.target.closest
        ? event.target.closest(selector)
        : null;
      if (match && rootEl.contains(match)) handler.call(match, event, match);
    });
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function setText(node, text) {
    if (!node) return node;
    var next = text === null || text === undefined ? "" : String(text);
    if (node.textContent !== next) node.textContent = next;
    return node;
  }

  function setAttr(node, name, value) {
    if (!node) return node;
    if (value === null || value === undefined || value === false) node.removeAttribute(name);
    else node.setAttribute(name, value === true ? "" : String(value));
    return node;
  }

  function toggleClass(node, name, on1) {
    if (!node) return node;
    if (on1) node.classList.add(name);
    else node.classList.remove(name);
    return node;
  }

  function replaceClass(node, name, active) {
    if (!node) return node;
    var list = node.className ? String(node.className).split(/\s+/) : [];
    var idx = list.indexOf(name);
    if (active && idx < 0) list.push(name);
    if (!active && idx >= 0) list.splice(idx, 1);
    node.className = list.filter(Boolean).join(" ");
    return node;
  }

  /* ------------------------------------------------------------------------
   * Icons — 24x24 stroke paths, coloured by the button's own `color`.
   * ---------------------------------------------------------------------- */

  var ICONS = {
    play: '<polygon points="7 4 20 12 7 20 7 4"></polygon>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>',
    stepForward: '<polyline points="6 4 15 12 6 20"></polyline><line x1="18" y1="4" x2="18" y2="20"></line>',
    stepBack: '<polyline points="18 4 9 12 18 20"></polyline><line x1="6" y1="4" x2="6" y2="20"></line>',
    skipForward: '<polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>',
    skipBack: '<polygon points="19 4 9 12 19 20 19 4"></polygon><line x1="5" y1="5" x2="5" y2="19"></line>',
    restart: '<polyline points="3 4 3 10 9 10"></polyline><path d="M3.5 15a9 9 0 1 0 2.1-9.4L3 10"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line>',
    sun: '<circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4.5"></line><line x1="12" y1="19.5" x2="12" y2="22"></line><line x1="2" y1="12" x2="4.5" y2="12"></line><line x1="19.5" y1="12" x2="22" y2="12"></line><line x1="5" y1="5" x2="6.8" y2="6.8"></line><line x1="17.2" y1="17.2" x2="19" y2="19"></line><line x1="5" y1="19" x2="6.8" y2="17.2"></line><line x1="17.2" y1="6.8" x2="19" y2="5"></line>',
    moon: '<path d="M21 13.2A8.6 8.6 0 0 1 10.8 3 8.6 8.6 0 1 0 21 13.2z"></path>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line>',
    close: '<line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line>',
    check: '<polyline points="4 12.5 9.5 18 20 6"></polyline>',
    chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
    chevronRight: '<polyline points="9 6 15 12 9 18"></polyline>',
    chevronLeft: '<polyline points="15 6 9 12 15 18"></polyline>',
    arrowRight: '<line x1="4" y1="12" x2="20" y2="12"></line><polyline points="14 6 20 12 14 18"></polyline>',
    code: '<polyline points="8 6 3 12 8 18"></polyline><polyline points="16 6 21 12 16 18"></polyline><line x1="13.5" y1="4" x2="10.5" y2="20"></line>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"></path><line x1="4" y1="20.5" x2="4" y2="5.5"></line>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"></rect><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"></rect><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"></rect><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"></rect>',
    layers: '<polygon points="12 3 21 7.5 12 12 3 7.5 12 3"></polygon><polyline points="3 12.5 12 17 21 12.5"></polyline><polyline points="3 16.5 12 21 21 16.5"></polyline>',
    zap: '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2"></polygon>',
    help: '<circle cx="12" cy="12" r="9"></circle><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .9-1 1.6v.4"></path><line x1="12" y1="17" x2="12" y2="17.01"></line>',
    chart: '<line x1="4" y1="20" x2="20" y2="20"></line><rect x="6" y="11" width="3.5" height="6"></rect><rect x="11" y="6" width="3.5" height="11"></rect><rect x="16" y="13" width="3.5" height="4"></rect>',
    branch: '<circle cx="7" cy="5" r="2.2"></circle><circle cx="7" cy="19" r="2.2"></circle><circle cx="17" cy="9" r="2.2"></circle><path d="M7 7.2v9.6"></path><path d="M17 11.2c0 3.5-3 4.4-7 4.6"></path>',
    target: '<circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="4.5"></circle><circle cx="12" cy="12" r="1"></circle>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    shuffle: '<polyline points="17 3 21 7 17 11"></polyline><path d="M3 7h4.5a4 4 0 0 1 3.3 1.8l3.4 5.4A4 4 0 0 0 17.5 16H21"></path><polyline points="17 15 21 19 17 23" transform="translate(0 -4)"></polyline><path d="M3 17h4.5a4 4 0 0 0 3.3-1.8"></path>',
    trash: '<polyline points="4 7 20 7"></polyline><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M12 2.8v2.4M12 18.8v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"></path>',
    info: '<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="11" x2="12" y2="16.5"></line><line x1="12" y1="7.8" x2="12" y2="7.81"></line>',
    home: '<path d="M4 11l8-7 8 7"></path><path d="M6.5 9.5V20h11V9.5"></path>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"></path><path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4"></path><path d="M17 6h2.5a2.5 2.5 0 0 1-2.5 4"></path><line x1="12" y1="14" x2="12" y2="18"></line><path d="M8.5 20h7"></path>',
    list: '<line x1="8" y1="6" x2="20" y2="6"></line><line x1="8" y1="12" x2="20" y2="12"></line><line x1="8" y1="18" x2="20" y2="18"></line><line x1="4" y1="6" x2="4.01" y2="6"></line><line x1="4" y1="12" x2="4.01" y2="12"></line><line x1="4" y1="18" x2="4.01" y2="18"></line>',
    eye: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"></path><circle cx="12" cy="12" r="2.6"></circle>',
    save: '<path d="M5 4h11l3 3v13H5z"></path><path d="M8 4v5h7V4"></path><rect x="8" y="13" width="8" height="7"></rect>',
    filter: '<polygon points="3 5 21 5 14 12.5 14 20 10 17.5 10 12.5 3 5"></polygon>'
  };

  function icon(name, size) {
    var body = ICONS[name];
    if (!body) return document.createComment("icon:" + name);
    var node = document.createElementNS(SVG_NS, "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "currentColor");
    node.setAttribute("stroke-width", "2");
    node.setAttribute("stroke-linecap", "round");
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    if (size) {
      node.setAttribute("width", size);
      node.setAttribute("height", size);
    }
    node.innerHTML = body;
    return node;
  }

  /** Build an <svg> icon from raw markup — used by the favicon and logos. */
  function iconSvg(body, attrs) {
    var node = document.createElementNS(SVG_NS, "svg");
    applyAttrs(node, attrs || {});
    node.innerHTML = body;
    return node;
  }

  /** Escape text for safe interpolation into innerHTML. */
  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  AV.dom = {
    el: create,
    svg: createSvg,
    frag: frag,
    clear: clear,
    fill: fill,
    append: appendChild,
    on: on,
    delegate: delegate,
    qs: qs,
    qsa: qsa,
    setText: setText,
    setAttr: setAttr,
    toggleClass: toggleClass,
    replaceClass: replaceClass,
    icon: icon,
    iconSvg: iconSvg,
    esc: esc,
    ICONS: ICONS
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
