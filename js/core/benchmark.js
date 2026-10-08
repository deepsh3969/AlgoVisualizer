/**
 * AlgoVisualizer — benchmark and head-to-head comparison
 *
 * Benchmarks run each definition with emit = null so no event objects are
 * allocated, which keeps the measurement about the algorithm rather than
 * about the visualization. A separate untimed pass collects the counters
 * through applyEvent, giving honest metrics without storing a timeline.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var SIZE_LADDERS = {
    sorting: [40, 80, 160, 320, 500],
    searching: [500, 1000, 2000, 3500, 5000],
    patterns: [500, 1000, 2000, 3500, 5000],
    graphs: [6, 10, 14, 18, 22],
    recursion: [4, 6, 8, 10, 12],
    structures: [100, 500, 1000, 2000, 4000]
  };

  var STORAGE_KEY = "benchmark.history";

  function now() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }

  function median(list) {
    if (!list.length) return 0;
    var sorted = list.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function sizesFor(category) {
    return (SIZE_LADDERS[category] || SIZE_LADDERS.sorting).slice();
  }

  /* ------------------------------------------------------------------------
   * Input construction
   * ---------------------------------------------------------------------- */

  /**
   * Benchmark arrays are generated locally instead of through
   * AV.random.generateArray, whose size is clamped to 500. A benchmark that
   * silently reports n = 8000 for a 500 element array would be a lie.
   */
  function makeArray(size, seed) {
    var rng = AV.random.createRng(seed);
    var out = [];
    for (var i = 0; i < size; i++) out.push(Math.floor(rng() * 1999) - 999);
    return out;
  }

  function sortedValues(size, seed) {
    return makeArray(size, seed).sort(function (a, b) { return a - b; });
  }

  function graphInput(def, size, seed) {
    var graph = AV.graphModel.randomGraph({
      count: Math.max(2, size),
      seed: seed,
      density: 0.25,
      weighted: def.id === "dijkstra"
    });
    var start = graph.nodes[0] ? graph.nodes[0].id : null;
    var target = graph.nodes[graph.nodes.length - 1] || null;
    return {
      graph: graph,
      start: start,
      target: target && target.id !== start ? target.id : undefined
    };
  }

  function structureInput(def, size, seed) {
    var values = makeArray(size, seed);
    var op = def.defaultOperation || (def.operations[0] && def.operations[0].id);

    if (def.viz === "linked") {
      var list = AV.linkedListInput(values);
      list.operation = op;
      if (op === "prepend" || op === "append" || op === "insertAt") list.value = 4242;
      if (op === "insertAt" || op === "removeAt" || op === "get") list.index = Math.floor(values.length / 2);
      if (op === "search") list.value = values[values.length - 1];
      return list;
    }

    if (def.viz === "tree") {
      var tree = AV.binarySearchTreeInput(values);
      tree.operation = op;
      if (op === "insert" || op === "remove" || op === "search") {
        tree.value = op === "search" ? tree.value : 4242;
      }
      return tree;
    }

    var input = { operation: op, array: values };
    if (op === "append" || op === "push" || op === "enqueue" || op === "prepend") input.value = 4242;
    if (op === "indexOf" || op === "search") input.value = values[values.length - 1];
    if (op === "insert" || op === "insertAt" || op === "removeAt" || op === "read" || op === "get") {
      input.index = Math.floor(values.length / 2);
      if (op === "insert" || op === "insertAt") input.value = 4242;
    }
    return input;
  }

  /**
   * Build a deterministic input for a definition at a given size.
   * Returns null when the definition cannot be benchmarked.
   */
  function buildInput(def, size, seed) {
    if (!def) return null;
    if (def.operations) return structureInput(def, size, seed);

    switch (def.category) {
      case "sorting":
        return { array: makeArray(size, seed) };
      case "searching":
        return {
          array: sortedValues(size, seed),
          target: 99999
        };
      case "patterns":
        if (def.id === "slidingWindow") {
          return {
            array: makeArray(size, seed),
            window: Math.max(2, Math.round(size / 20))
          };
        }
        if (def.id === "prefixSum") {
          var arr = makeArray(size, seed);
          return {
            array: arr,
            queryStart: 0,
            queryEnd: Math.max(0, arr.length - 1)
          };
        }
        return { array: makeArray(size, seed), target: 4242 };
      case "graphs":
        return graphInput(def, size, seed);
      case "recursion":
        return { value: size };
      default:
        return null;
    }
  }

  /* ------------------------------------------------------------------------
   * Measurement
   * ---------------------------------------------------------------------- */

  /** Untimed pass that replays events into a state to harvest counters. */
  function collectMetrics(def, input) {
    var state = AV.viz.createState(def, input);
    state.definition = def;
    try {
      def.run(AV.viz.cloneInput(def, input), function (event) {
        AV.viz.applyEvent(state, event);
      });
    } catch (err) {
      return { error: err && err.message ? err.message : String(err) };
    }
    return { metrics: state.metrics, result: state.result, message: state.message };
  }

  /**
   * Time a definition on one input.
   * Returns { ms, repeats, min, max, metrics, steps } or { skipped: true }.
   */
  function measure(def, input, opts) {
    opts = opts || {};
    var harvested = collectMetrics(def, input);
    if (harvested.error) return { skipped: true, reason: harvested.error };
    if (harvested.result === "error") {
      return { skipped: true, reason: harvested.message || "rejected the input" };
    }

    var clone = function () { return AV.viz.cloneInput(def, input); };

    var warmStart = now();
    def.run(clone(), null);
    var single = now() - warmStart;

    var repeats = Math.max(
      opts.repeats === undefined ? 3 : opts.repeats,
      Math.ceil((opts.minMs === undefined ? 25 : opts.minMs) / Math.max(single, 0.001))
    );
    repeats = Math.min(repeats, opts.maxRepeats === undefined ? 250 : opts.maxRepeats);

    var samples = [];
    for (var i = 0; i < repeats; i++) {
      var data = clone();
      var t0 = now();
      def.run(data, null);
      samples.push(now() - t0);
    }

    return {
      ms: median(samples),
      min: Math.min.apply(null, samples),
      max: Math.max.apply(null, samples),
      repeats: repeats,
      metrics: harvested.metrics,
      steps: harvested.metrics.steps,
      result: harvested.result
    };
  }

  /**
   * Sweep a set of definitions across a ladder of sizes.
   * options: { ids | category, sizes, seed, repeats, minMs }
   */
  function run(options) {
    options = options || {};
    var seed = options.seed === undefined ? 20260101 : options.seed;
    var defs = resolveDefinitions(options);
    var category = defs.length ? defs[0].category : options.category;
    var sizes = options.sizes && options.sizes.length ? options.sizes.slice() : sizesFor(category);

    var series = defs.map(function (def) {
      var points = [];
      sizes.forEach(function (size) {
        var input = buildInput(def, size, seed);
        if (!input) return;
        var sample = measure(def, input, options);
        points.push({
          n: size,
          ms: sample.skipped ? null : sample.ms,
          repeats: sample.skipped ? null : sample.repeats,
          steps: sample.skipped ? null : sample.steps,
          metrics: sample.skipped ? null : sample.metrics,
          predicted: AV.metrics.estimate(def, size),
          complexity: (def.complexity && def.complexity.worst) || "",
          skipped: !!sample.skipped,
          reason: sample.reason || null
        });
      });
      return {
        id: def.id,
        name: def.name,
        category: def.category,
        complexity: def.complexity || {},
        points: points
      };
    });

    return {
      options: {
        seed: seed,
        sizes: sizes,
        repeats: options.repeats === undefined ? 3 : options.repeats,
        minMs: options.minMs === undefined ? 25 : options.minMs
      },
      series: series,
      recordedAt: Date.now()
    };
  }

  function resolveDefinitions(options) {
    if (options.ids && options.ids.length) {
      return options.ids
        .map(function (id) { return AV.algorithms.get(id) || AV.structures.get(id); })
        .filter(Boolean);
    }
    if (options.category) {
      var list = AV.algorithms.byCategory(options.category);
      if (!list.length) list = AV.structures.byCategory(options.category);
      return list.slice();
    }
    return [];
  }

  /**
   * Run two definitions on the same input and report a verdict.
   * Works for algorithms and structures alike.
   */
  function compare(idA, idB, input, opts) {
    var a = AV.algorithms.get(idA) || AV.structures.get(idA);
    var b = AV.algorithms.get(idB) || AV.structures.get(idB);
    if (!a || !b) return { error: "Unknown algorithm or structure" };

    var shared = input === undefined || input === null ? buildInput(a, 400, 7) : input;
    var sampleA = measure(a, shared, opts);
    var sampleB = measure(b, shared, opts);

    var metricsVerdict = sampleA.skipped || sampleB.skipped
      ? null
      : AV.metrics.verdict(sampleA.metrics, sampleB.metrics);

    var timeWinner = "tie";
    if (!sampleA.skipped && !sampleB.skipped) {
      if (sampleA.ms < sampleB.ms * 0.9) timeWinner = "a";
      else if (sampleB.ms < sampleA.ms * 0.9) timeWinner = "b";
    }

    return {
      input: shared,
      a: { id: a.id, name: a.name, complexity: a.complexity, sample: sampleA },
      b: { id: b.id, name: b.name, complexity: b.complexity, sample: sampleB },
      timeWinner: timeWinner,
      metrics: metricsVerdict
    };
  }

  /* ------------------------------------------------------------------------
   * History
   * ---------------------------------------------------------------------- */

  /** Keep a short, summarised history so the benchmark page can show runs. */
  function save(result) {
    if (!result || !result.series) return null;
    var entry = {
      recordedAt: result.recordedAt || Date.now(),
      sizes: result.options.sizes,
      runs: result.series.map(function (s) {
        return {
          id: s.id,
          name: s.name,
          fastestMs: fastestPoint(s),
          largest: lastPoint(s)
        };
      })
    };
    AV.storage.append(STORAGE_KEY, entry, 8);
    return entry;
  }

  function fastestPoint(s) {
    var best = null;
    s.points.forEach(function (p) {
      if (p.ms === null) return;
      if (best === null || p.ms < best.ms) best = p;
    });
    return best;
  }

  function lastPoint(s) {
    for (var i = s.points.length - 1; i >= 0; i--) {
      if (s.points[i].ms !== null) return s.points[i];
    }
    return null;
  }

  function history() {
    return AV.storage.get(STORAGE_KEY, []) || [];
  }

  function clearHistory() {
    AV.storage.remove(STORAGE_KEY);
  }

  AV.benchmark = {
    SIZE_LADDERS: SIZE_LADDERS,
    sizesFor: sizesFor,
    buildInput: buildInput,
    measure: measure,
    run: run,
    compare: compare,
    save: save,
    history: history,
    clearHistory: clearHistory
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
