/**
 * AlgoVisualizer — algorithm catalog metadata
 * Categories shared by the sidebar, search, learning mode and dashboards.
 * Individual algorithm definitions live next to their implementations.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var CATEGORIES = [
    {
      id: "sorting",
      label: "Sorting",
      short: "Sort",
      kind: "algorithm",
      color: "sorting",
      icon: "SO",
      description: "Reorder elements using comparison-based strategies."
    },
    {
      id: "searching",
      label: "Searching",
      short: "Search",
      kind: "algorithm",
      color: "searching",
      icon: "SE",
      description: "Locate a target value inside a collection."
    },
    {
      id: "patterns",
      label: "Array Patterns",
      short: "Pattern",
      kind: "algorithm",
      color: "patterns",
      icon: "PT",
      description: "Two pointer, sliding window and prefix sum techniques."
    },
    {
      id: "graphs",
      label: "Graph Algorithms",
      short: "Graph",
      kind: "algorithm",
      color: "graphs",
      icon: "GR",
      description: "Traverse networks and compute shortest paths."
    },
    {
      id: "recursion",
      label: "Recursion",
      short: "Recur",
      kind: "algorithm",
      color: "recursion",
      icon: "RC",
      description: "Watch calls, returns and the call stack grow and shrink."
    },
    {
      id: "structures",
      label: "Data Structures",
      short: "DS",
      kind: "structure",
      color: "structures",
      icon: "DS",
      description: "Interactive stack, queue, list, tree and array workspaces."
    }
  ];

  function getCategory(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  var REQUIRED_FIELDS = ["id", "name", "category", "run"];

  /**
   * Validate and register an algorithm definition.
   * Keeps malformed definitions from silently breaking the UI later.
   */
  function registerAlgorithm(def) {
    if (!def || typeof def !== "object") {
      throw new TypeError("Algorithm definition must be an object");
    }
    for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
      if (!def[REQUIRED_FIELDS[i]]) {
        throw new Error(
          "Algorithm \"" + (def.id || "?") + "\" is missing required field: " + REQUIRED_FIELDS[i]
        );
      }
    }
    if (typeof def.run !== "function") {
      throw new Error("Algorithm \"" + def.id + "\" must implement run(input, emit)");
    }
    if (!Array.isArray(def.pseudocode)) {
      throw new Error("Algorithm \"" + def.id + "\" must declare a pseudocode array");
    }
    if (!def.complexity) {
      throw new Error("Algorithm \"" + def.id + "\" must declare complexity information");
    }
    return AV.algorithms.register(def);
  }

  AV.categories = CATEGORIES;
  AV.getCategory = getCategory;
  AV.registerAlgorithm = registerAlgorithm;
})(typeof globalThis !== "undefined" ? globalThis : window);
