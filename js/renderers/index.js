/**
 * AlgoVisualizer - renderer registry
 *
 * A view holds one renderer per stage and hands it (state, ctx) on every step.
 * The renderer for a definition is picked from `definition.viz`, with a safe
 * fallback so an unknown kind still draws something.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var factories = AV.renderers.factories || {};

  var FALLBACK = {
    array: "array", search: "array", pattern: "array",
    stack: "stack", queue: "queue", linked: "linked",
    tree: "tree", graph: "graph", recursion: "recursion"
  };

  function vizFor(definition) {
    var viz = definition && definition.viz ? definition.viz : "array";
    return factories[viz] ? viz : (factories[FALLBACK[viz]] ? FALLBACK[viz] : "array");
  }

  function create(definition) {
    var viz = vizFor(definition);
    var renderer = factories[viz]();
    renderer.viz = viz;
    return renderer;
  }

  /** Mount into `host`, paint once, and return a handle that can be destroyed. */
  function mount(host, definition, auxHost) {
    var primary = create(definition);
    primary.mount(host);
    var aux = null;
    if (auxHost) {
      aux = AV.renderers.aux.create();
      aux.mount(auxHost);
    }
    return {
      viz: primary.viz,
      render: function (state, ctx) {
        primary.render(state, ctx);
        if (aux) aux.render(state, ctx);
      },
      relayout: function () {
        if (primary.relayout) primary.relayout();
      },
      destroy: function () {
        primary.destroy();
        if (aux) aux.destroy();
      }
    };
  }

  AV.renderers.create = create;
  AV.renderers.mount = mount;
  AV.renderers.vizFor = vizFor;
  AV.renderers.factories = factories;
})(typeof globalThis !== "undefined" ? globalThis : window);
