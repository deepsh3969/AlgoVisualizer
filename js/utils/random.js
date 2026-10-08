/**
 * AlgoVisualizer — random utilities
 * Seeded PRNG (mulberry32) so experiments are reproducible in tests and demos.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function normalizeSeed(seed) {
    if (seed === undefined || seed === null) {
      return (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
    }
    var n = Number(seed);
    if (!isFinite(n)) return 0;
    return (n >>> 0) || 0;
  }

  /** Returns a deterministic () => [0,1) generator. */
  function createRng(seed) {
    var a = normalizeSeed(seed);
    return function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function intBetween(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  /**
   * Generate an array of integers.
   * opts: { size, min, max, seed, duplicates, sorted, reversed, distribution }
   * distribution: 'uniform' | 'nearly-sorted' | 'few-unique'
   */
  function generateArray(opts) {
    var o = opts || {};
    var size = clampInt(o.size, 2, 500, 25);
    var min = clampInt(o.min, -999, 999, 5);
    var max = clampInt(o.max, -999, 999, 99);
    if (max < min) {
      var tmp = min;
      min = max;
      max = tmp;
    }
    var rng = createRng(o.seed);
    var distribution = o.distribution || "uniform";
    var out = [];
    var i;

    if (distribution === "few-unique") {
      var poolSize = Math.max(2, Math.min(5, size));
      var pool = [];
      for (i = 0; i < poolSize; i++) pool.push(intBetween(rng, min, max));
      for (i = 0; i < size; i++) out.push(pool[Math.floor(rng() * pool.length)]);
    } else if (distribution === "nearly-sorted") {
      for (i = 0; i < size; i++) out.push(intBetween(rng, min, max));
      out.sort(function (x, y) { return x - y; });
      var swaps = Math.max(1, Math.floor(size / 10));
      for (i = 0; i < swaps; i++) {
        var a = intBetween(rng, 0, size - 1);
        var b = intBetween(rng, 0, size - 1);
        var t2 = out[a];
        out[a] = out[b];
        out[b] = t2;
      }
    } else {
      for (i = 0; i < size; i++) out.push(intBetween(rng, min, max));
    }

    if (o.sorted) out.sort(function (x, y) { return x - y; });
    if (o.reversed) out.sort(function (x, y) { return y - x; });

    if (o.duplicates === false) out = dedupeKeepLength(out, rng, min, max);
    return out;
  }

  function dedupeKeepLength(arr, rng, min, max) {
    var seen = Object.create(null);
    for (var i = 0; i < arr.length; i++) {
      var guard = 0;
      while (seen[arr[i]] && guard < 60) {
        arr[i] = intBetween(rng, min, max);
        guard++;
      }
      seen[arr[i]] = true;
    }
    return arr;
  }

  function clampInt(value, min, max, fallback) {
    var n = Math.round(Number(value));
    if (!isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  /** Array of preset sizes offered by the UI. */
  var ARRAY_SIZES = [10, 25, 50, 75, 100, 150];

  AV.random = {
    createRng: createRng,
    intBetween: intBetween,
    generateArray: generateArray,
    clampInt: clampInt,
    ARRAY_SIZES: ARRAY_SIZES
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
