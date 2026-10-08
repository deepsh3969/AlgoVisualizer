/**
 * AlgoVisualizer — metrics, complexity math and verdicts
 *
 * Three jobs:
 *   1. Turn a viz state's counters into labelled chips for the UI.
 *   2. Evaluate Big-O expressions so complexity curves and head-to-head
 *      predictions can be drawn without hard-coding formulas.
 *   3. Score two runs against each other so comparison mode can name a winner.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  /* ------------------------------------------------------------------------
   * Counters
   * ---------------------------------------------------------------------- */

  var COUNTERS = [
    { key: "steps", label: "Steps", hint: "Events applied so far", primary: true },
    { key: "comparisons", label: "Comparisons", hint: "Elements inspected against each other or a key" },
    { key: "swaps", label: "Swaps", hint: "Two cells exchanged places" },
    { key: "writes", label: "Writes", hint: "Cells assigned a new value" },
    { key: "accesses", label: "Accesses", hint: "Total reads and writes" },
    { key: "visited", label: "Visited", hint: "Nodes taken off the frontier" },
    { key: "enqueued", label: "Enqueued", hint: "Nodes added to the queue" },
    { key: "dequeued", label: "Dequeued", hint: "Nodes removed from the queue" },
    { key: "pushes", label: "Pushes", hint: "Entries added to the stack" },
    { key: "pops", label: "Pops", hint: "Entries removed from the stack" },
    { key: "relaxations", label: "Relaxations", hint: "Distance labels improved" },
    { key: "calls", label: "Calls", hint: "Function frames pushed" },
    { key: "maxDepth", label: "Max depth", hint: "Deepest chain of live frames" }
  ];

  var COUNTER_BY_KEY = Object.create(null);
  COUNTERS.forEach(function (c) { COUNTER_BY_KEY[c.key] = c; });

  /** Which counters are meaningful for each visualization kind. */
  var VIZ_KEYS = {
    array: ["steps", "comparisons", "swaps", "writes", "accesses"],
    search: ["steps", "comparisons", "accesses"],
    pattern: ["steps", "comparisons", "accesses"],
    stack: ["steps", "comparisons", "writes", "accesses"],
    queue: ["steps", "comparisons", "writes", "accesses"],
    linked: ["steps", "comparisons", "writes", "accesses"],
    tree: ["steps", "comparisons", "writes", "accesses"],
    graph: ["steps", "comparisons", "visited", "enqueued", "dequeued", "relaxations"],
    recursion: ["steps", "calls", "maxDepth"]
  };

  function keysForViz(viz) {
    return (VIZ_KEYS[viz] || VIZ_KEYS.array).slice();
  }

  function counter(key) {
    return COUNTER_BY_KEY[key] || { key: key, label: key, hint: "" };
  }

  /**
   * Build display chips for the current state.
   * Only counters relevant to the visualization kind are shown, so the panel
   * never fills with zeroes for counters an algorithm cannot touch.
   */
  function summarize(state, definition) {
    var viz = (definition && definition.viz) || (state && state.viz) || "array";
    var metrics = (state && state.metrics) || {};
    return keysForViz(viz).map(function (key) {
      var meta = counter(key);
      var raw = metrics[key] === undefined ? 0 : metrics[key];
      return {
        key: key,
        label: meta.label,
        hint: meta.hint,
        primary: !!meta.primary,
        value: raw,
        text: AV.format.count(raw)
      };
    });
  }

  /* ------------------------------------------------------------------------
   * Big-O evaluation
   * ---------------------------------------------------------------------- */

  var KIND_LABEL = {
    const: "constant",
    log: "logarithmic",
    n: "linear",
    nlogn: "linearithmic",
    n2: "quadratic",
    n3: "cubic",
    exp: "exponential",
    factorial: "factorial",
    unknown: "unrecognised"
  };

  /**
   * Pull the text out of an O(...) wrapper using balanced parentheses, so
   * nested forms such as O((V + E) log V) are read whole instead of being
   * cut at the first closing bracket.
   */
  function extractInner(raw) {
    var open = -1;
    var i;
    for (i = 0; i < raw.length - 1; i++) {
      if ((raw[i] === "O" || raw[i] === "o") && raw[i + 1] === "(") {
        open = i + 1;
        break;
      }
    }
    if (open < 0) return raw;
    var depth = 0;
    for (var j = open; j < raw.length; j++) {
      if (raw[j] === "(") depth += 1;
      else if (raw[j] === ")") {
        depth -= 1;
        if (depth === 0) return raw.slice(open + 1, j);
      }
    }
    return raw;
  }

  /**
   * Parse the inner text of an O(...) expression into a shape we can plot.
   * Handles every string the catalog uses: 1, n, n², n log n, log n,
   * V + E, (V + E) log V, 2^n and friends.
   */
  function parseComplexity(expr) {
    var raw = String(expr === undefined || expr === null ? "" : expr);
    var inner = extractInner(raw);
    var s = inner.toLowerCase().replace(/\s+/g, "");

    var shape = { kind: "unknown", weight: 1 };

    if (s === "1") shape = { kind: "const", weight: 1 };
    else if (s === "logn" || s === "log2n" || s === "log_2_n") shape = { kind: "log", weight: 1 };
    else if (s === "n" || s === "v" || s === "e") shape = { kind: "n", weight: 1 };
    else if (s === "n²" || s === "n^2" || s === "n*n" || s === "n2") shape = { kind: "n2", weight: 1 };
    else if (s === "n³" || s === "n^3" || s === "n*n*n" || s === "n3") shape = { kind: "n3", weight: 1 };
    else if (s === "nlogn") shape = { kind: "nlogn", weight: 1 };
    else if (s === "v+e") shape = { kind: "n", weight: 2 };
    else if (s === "(v+e)logv" || s === "v+elogn" || s === "(v+e)logn") {
      shape = { kind: "nlogn", weight: 2 };
    } else if (s === "2^n") shape = { kind: "exp", weight: 1 };
    else if (s === "n!") shape = { kind: "factorial", weight: 1 };

    return {
      raw: raw.trim(),
      kind: shape.kind,
      weight: shape.weight,
      label: KIND_LABEL[shape.kind] || KIND_LABEL.unknown
    };
  }

  function log2(x) {
    return Math.log(x) / Math.LN2;
  }

  function factorialOf(n) {
    var out = 1;
    for (var i = 2; i <= n; i++) {
      out *= i;
      if (!isFinite(out)) return Infinity;
    }
    return out;
  }

  /** Estimated operation count for a parsed expression at size n. */
  function evaluateParsed(parsed, n) {
    if (!parsed || parsed.kind === "unknown") return NaN;
    var x = Math.max(1, Number(n) || 1);
    var out;
    switch (parsed.kind) {
      case "const": out = 1; break;
      case "log": out = log2(x); break;
      case "n": out = x; break;
      case "nlogn": out = x * log2(x); break;
      case "n2": out = x * x; break;
      case "n3": out = x * x * x; break;
      case "exp": out = Math.pow(2, x); break;
      case "factorial": out = factorialOf(x); break;
      default: return NaN;
    }
    if (!isFinite(out)) return Infinity;
    return out * parsed.weight;
  }

  /** Estimated operation count for a raw Big-O string at size n. */
  function value(expr, n) {
    return evaluateParsed(parseComplexity(expr), n);
  }

  /** Sample points for drawing a complexity curve. */
  function series(expr, opts) {
    opts = opts || {};
    var min = Number(opts.min) > 0 ? Number(opts.min) : 4;
    var max = Number(opts.max) > min ? Number(opts.max) : 1024;
    var steps = Number(opts.steps) > 1 ? Math.floor(Number(opts.steps)) : 12;
    var scale = opts.scale === "linear" ? "linear" : "log";
    var parsed = parseComplexity(expr);
    var out = [];

    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1);
      var n = scale === "log"
        ? Math.round(min * Math.pow(max / min, t))
        : Math.round(min + (max - min) * t);
      if (out.length && n <= out[out.length - 1].n) n = out[out.length - 1].n + 1;
      out.push({ n: n, ops: evaluateParsed(parsed, n) });
    }
    return out;
  }

  /**
   * Predict which of two complexity expressions does less work at size n.
   * A 10% margin keeps the verdict from flipping on rounding noise.
   */
  function compareExpressions(a, b, n) {
    var va = value(a, n);
    var vb = value(b, n);
    if (isNaN(va) || isNaN(vb)) {
      return { n: n, a: { expr: a, ops: va }, b: { expr: b, ops: vb }, winner: "unknown", ratio: NaN };
    }
    var winner = "tie";
    if (va < vb * 0.9) winner = "a";
    else if (vb < va * 0.9) winner = "b";
    return {
      n: n,
      a: { expr: a, ops: va },
      b: { expr: b, ops: vb },
      winner: winner,
      ratio: vb === 0 ? Infinity : va / vb
    };
  }

  /** Predicted cost of a definition at a given size. */
  function estimate(definition, n, which) {
    if (!definition || !definition.complexity) return NaN;
    var field = which || "worst";
    var expr = definition.complexity[field] || definition.complexity.worst ||
      definition.complexity.average;
    return value(expr, n);
  }

  /** Rank definitions from cheapest to most expensive at size n. */
  function rank(definitions, n, which) {
    return (definitions || [])
      .map(function (def) {
        var parsed = parseComplexity((def.complexity || {})[which || "worst"]);
        return {
          definition: def,
          expr: parsed.raw,
          kind: parsed.kind,
          grade: AV.format.complexityGrade(parsed.raw),
          ops: evaluateParsed(parsed, n)
        };
      })
      .sort(function (a, b) {
        if (isNaN(a.ops)) return 1;
        if (isNaN(b.ops)) return -1;
        return a.ops - b.ops;
      });
  }

  /* ------------------------------------------------------------------------
   * Run-to-run verdicts
   * ---------------------------------------------------------------------- */

  /**
   * Compare two sets of counters. Every counter is "lower is better",
   * so the winner is whoever scores better on more counters.
   */
  function verdict(a, b, keys) {
    var left = a || {};
    var right = b || {};
    var usable = keys || COUNTERS.map(function (c) { return c.key; }).filter(function (k) {
      return left[k] !== undefined || right[k] !== undefined;
    });

    var scoreA = 0;
    var scoreB = 0;
    var differences = [];

    usable.forEach(function (key) {
      var av = left[key] === undefined ? 0 : left[key];
      var bv = right[key] === undefined ? 0 : right[key];
      if (av === bv) return;
      var better = av < bv ? "a" : "b";
      if (better === "a") scoreA += 1;
      else scoreB += 1;
      differences.push({ key: key, label: counter(key).label, a: av, b: bv, better: better });
    });

    var winner = scoreA === scoreB ? "tie" : (scoreA > scoreB ? "a" : "b");
    return {
      winner: winner,
      score: { a: scoreA, b: scoreB },
      differences: differences
    };
  }

  /** The single counter that best summarises a visualization kind. */
  var HEADLINE = {
    array: "comparisons",
    search: "comparisons",
    pattern: "comparisons",
    stack: "comparisons",
    queue: "comparisons",
    linked: "comparisons",
    tree: "comparisons",
    graph: "visited",
    recursion: "calls"
  };

  /** Pick a single "headline" metric for a definition's viz kind. */
  function headlineKey(viz) {
    if (HEADLINE[viz]) return HEADLINE[viz];
    var keys = keysForViz(viz);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== "steps") return keys[i];
    }
    return "steps";
  }

  AV.metrics = {
    COUNTERS: COUNTERS,
    VIZ_KEYS: VIZ_KEYS,
    counter: counter,
    keysForViz: keysForViz,
    summarize: summarize,
    parse: parseComplexity,
    evaluate: evaluateParsed,
    value: value,
    series: series,
    compareExpressions: compareExpressions,
    estimate: estimate,
    rank: rank,
    verdict: verdict,
    headlineKey: headlineKey
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
