/**
 * AlgoVisualizer — validation utilities
 * Every validator returns { ok: true, value } or { ok: false, error }.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function fail(error) {
    return { ok: false, error: error };
  }

  function pass(value) {
    return { ok: true, value: value };
  }

  var MAX_ARRAY_LENGTH = 150;
  var MIN_ARRAY_LENGTH = 2;

  /**
   * Parse a custom array literal such as "[42, 17, 8]" or "42,17,8".
   * Accepts integers and decimals; rejects anything else.
   */
  function parseArrayLiteral(text, opts) {
    var o = opts || {};
    var maxLen = o.max || MAX_ARRAY_LENGTH;
    var minLen = o.min === undefined ? 1 : o.min;

    if (typeof text !== "string") return fail("Enter an array such as [42, 17, 8].");

    var trimmed = text.trim();
    if (!trimmed) return fail("Enter an array such as [42, 17, 8].");

    var body = trimmed;
    if (body.charAt(0) === "[") {
      if (body.charAt(body.length - 1) !== "]") return fail("Missing closing bracket ].");
      body = body.slice(1, -1);
    }

    body = body.replace(/\[|\]/g, " ").trim();
    if (!body) return fail("The array is empty. Provide at least " + minLen + " value(s).");

    var tokens = body.split(/[\s,]+/).filter(function (t) { return t.length > 0; });
    var values = [];

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (!/^-?\d+(\.\d+)?$/.test(token)) {
        return fail('"' + token + '" is not a number. Use only digits, "-" and ".".');
      }
      var n = Number(token);
      if (!isFinite(n)) return fail('"' + token + '" is not a finite number.');
      if (Math.abs(n) > 1e9) return fail("Values must be between -1,000,000,000 and 1,000,000,000.");
      values.push(n);
    }

    if (values.length > maxLen) {
      return fail("Too many values: " + values.length + " (maximum " + maxLen + ").");
    }
    if (values.length < minLen) {
      return fail("Provide at least " + minLen + " " + AV.format.plural(minLen, "value") + ".");
    }

    return pass(values);
  }

  /** Validate an already-typed number. */
  function parseNumber(text, opts) {
    var o = opts || {};
    if (typeof text === "number") {
      if (!isFinite(text)) return fail("Enter a finite number.");
    } else if (typeof text === "string") {
      var t = text.trim();
      if (!t) return fail(o.required || "This value is required.");
      if (!/^-?\d+(\.\d+)?$/.test(t)) return fail('"' + t + '" is not a number.');
      var n = Number(t);
      if (!isFinite(n)) return fail("Enter a finite number.");
      text = n;
    } else {
      return fail(o.required || "This value is required.");
    }

    if (o.min !== undefined && text < o.min) return fail(o.minMessage || "Minimum allowed value is " + o.min + ".");
    if (o.max !== undefined && text > o.max) return fail(o.maxMessage || "Maximum allowed value is " + o.max + ".");
    return pass(text);
  }

  function parseInteger(text, opts) {
    var res = parseNumber(text, opts);
    if (!res.ok) return res;
    if (!Number.isInteger(res.value)) return fail("Enter a whole number.");
    return pass(res.value);
  }

  /** Positive integer used for benchmark input sizes. */
  function parseBenchmarkSize(text) {
    return parseInteger(text, {
      min: 1,
      max: 200000,
      minMessage: "Size must be at least 1.",
      maxMessage: "Size must be 200,000 or less to keep the browser responsive."
    });
  }

  /** Ensure the array is usable as a visualization input. */
  function sanitizeArray(arr) {
    if (!Array.isArray(arr)) return fail("Expected an array.");
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = Number(arr[i]);
      if (!isFinite(v)) return fail("Position " + i + " is not a finite number.");
      out.push(v);
    }
    if (out.length === 0) return fail("The array is empty.");
    if (out.length > MAX_ARRAY_LENGTH) {
      return fail("Array is too large to visualize (" + out.length + " > " + MAX_ARRAY_LENGTH + ").");
    }
    return pass(out);
  }

  /**
   * Graph validation helpers. A graph is:
   * { nodes: [{id, label, x, y}], edges: [{id, from, to, weight}] }
   */
  function isValidNodeId(graph, id) {
    if (!graph || !Array.isArray(graph.nodes)) return false;
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].id === id) return true;
    }
    return false;
  }

  function findNode(graph, id) {
    if (!graph || !Array.isArray(graph.nodes)) return null;
    for (var i = 0; i < graph.nodes.length; i++) {
      if (graph.nodes[i].id === id) return graph.nodes[i];
    }
    return null;
  }

  function findEdge(graph, a, b, directed) {
    if (!graph || !Array.isArray(graph.edges)) return null;
    for (var i = 0; i < graph.edges.length; i++) {
      var e = graph.edges[i];
      if (e.from === a && e.to === b) return e;
      if (!directed && e.from === b && e.to === a) return e;
    }
    return null;
  }

  function validateEdge(graph, from, to, opts) {
    var o = opts || {};
    if (from === to) return fail("An edge must connect two different nodes.");
    if (!isValidNodeId(graph, from)) return fail("Start node no longer exists.");
    if (!isValidNodeId(graph, to)) return fail("End node no longer exists.");
    if (findEdge(graph, from, to, o.directed)) return fail("These nodes are already connected.");
    return pass(true);
  }

  function validateNodeLabel(graph, label, exceptId) {
    var text = String(label === undefined || label === null ? "" : label).trim();
    if (!text) return fail("Enter a label for the node.");
    if (text.length > 8) return fail("Keep labels to 8 characters or fewer.");
    for (var i = 0; i < graph.nodes.length; i++) {
      var n = graph.nodes[i];
      if (n.id !== exceptId && n.label === text) return fail('A node labelled "' + text + '" already exists.');
    }
    return pass(text);
  }

  function validateWeight(text) {
    return parseNumber(text, {
      min: 0,
      max: 10000,
      minMessage: "Weights must be 0 or greater.",
      maxMessage: "Weights must be 10,000 or less."
    });
  }

  AV.validate = {
    parseArrayLiteral: parseArrayLiteral,
    parseNumber: parseNumber,
    parseInteger: parseInteger,
    parseBenchmarkSize: parseBenchmarkSize,
    sanitizeArray: sanitizeArray,
    isValidNodeId: isValidNodeId,
    findNode: findNode,
    findEdge: findEdge,
    validateEdge: validateEdge,
    validateNodeLabel: validateNodeLabel,
    validateWeight: validateWeight,
    MAX_ARRAY_LENGTH: MAX_ARRAY_LENGTH,
    MIN_ARRAY_LENGTH: MIN_ARRAY_LENGTH
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
