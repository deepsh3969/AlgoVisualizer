/**
 * AlgoVisualizer — registries
 * Algorithms and data structures register themselves here so that views,
 * search, learning mode and tests can discover them without hard-coding lists.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function createRegistry(kind) {
    var map = new Map();

    function register(def) {
      if (!def || typeof def !== "object") {
        throw new TypeError(kind + " definition must be an object");
      }
      if (!def.id || typeof def.id !== "string") {
        throw new TypeError(kind + " definition needs a string id");
      }
      if (map.has(def.id)) {
        throw new Error("Duplicate " + kind + " id: " + def.id);
      }
      var normalized = Object.assign({}, def);
      map.set(def.id, normalized);
      return normalized;
    }

    function get(id) {
      return map.get(id) || null;
    }

    function has(id) {
      return map.has(id);
    }

    function all() {
      return Array.from(map.values());
    }

    function byCategory(category) {
      return all().filter(function (d) {
        return d.category === category;
      });
    }

    function ids() {
      return Array.from(map.keys());
    }

    return {
      kind: kind,
      register: register,
      get: get,
      has: has,
      all: all,
      byCategory: byCategory,
      ids: ids,
      size: function () { return map.size; }
    };
  }

  AV.createRegistry = createRegistry;
  AV.algorithms = createRegistry("algorithm");
  AV.structures = createRegistry("structure");
})(typeof globalThis !== "undefined" ? globalThis : window);
