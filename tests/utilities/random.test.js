/**
 * Random utility tests — seeding, distributions, clamping
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var R = AV.random;
  var GROUP = "utilities/random";

  function sortCopy(arr) {
    return arr.slice().sort(function (a, b) { return a - b; });
  }

  function inversions(arr) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) {
      for (var j = i + 1; j < arr.length; j++) {
        if (arr[i] > arr[j]) n += 1;
      }
    }
    return n;
  }

  AV.test(GROUP, "createRng is deterministic for a seed", function () {
    var a = R.createRng(42);
    var b = R.createRng(42);
    for (var i = 0; i < 20; i++) {
      AV.assertEqual(a(), b(), "seed 42 must replay at step " + i);
    }
  });

  AV.test(GROUP, "createRng produces a different stream per seed", function () {
    var a = R.createRng(42);
    var b = R.createRng(43);
    var same = true;
    for (var i = 0; i < 10; i++) {
      if (a() !== b()) { same = false; break; }
    }
    AV.assert(!same, "different seeds must diverge");
  });

  AV.test(GROUP, "rng values stay in [0, 1)", function () {
    var rng = R.createRng(7);
    for (var i = 0; i < 500; i++) {
      var v = rng();
      AV.assert(v >= 0 && v < 1, "got " + v);
    }
  });

  AV.test(GROUP, "createRng without a seed still runs", function () {
    var rng = R.createRng();
    AV.assert(typeof rng === "function");
    var v = rng();
    AV.assert(v >= 0 && v < 1);
    AV.assertNotEqual(rng(), rng(), "the stream must advance");
  });

  AV.test(GROUP, "intBetween respects inclusive bounds", function () {
    var rng = R.createRng(11);
    AV.assertEqual(R.intBetween(rng, 5, 5), 5, "a single value range is stable");
    for (var i = 0; i < 300; i++) {
      var v = R.intBetween(rng, -3, 4);
      AV.assert(v >= -3 && v <= 4, "got " + v);
    }
  });

  AV.test(GROUP, "generateArray honours size exactly", function () {
    AV.assertEqual(R.generateArray({ size: 40, seed: 1 }).length, 40);
    AV.assertEqual(R.generateArray({ size: 5000, seed: 1 }).length, 500, "clamped high");
    AV.assertEqual(R.generateArray({ size: 1, seed: 1 }).length, 2, "clamped low");
    AV.assertEqual(R.generateArray({ seed: 1 }).length, 25, "default size");
    AV.assertEqual(R.generateArray({ size: NaN, seed: 1 }).length, 25, "bad size falls back");
  });

  AV.test(GROUP, "generateArray is reproducible", function () {
    var a = R.generateArray({ size: 30, seed: 99 });
    var b = R.generateArray({ size: 30, seed: 99 });
    AV.assertDeepEqual(a, b);
    var c = R.generateArray({ size: 30, seed: 100 });
    AV.assert(!AV.deepEqual(a, c), "a different seed changes the data");
  });

  AV.test(GROUP, "generateArray stays inside min and max", function () {
    var values = R.generateArray({ size: 200, min: -20, max: 20, seed: 5 });
    values.forEach(function (v) {
      AV.assert(v >= -20 && v <= 20, "got " + v);
    });
  });

  AV.test(GROUP, "generateArray swaps min and max when reversed", function () {
    var values = R.generateArray({ size: 50, min: 900, max: -900, seed: 6 });
    values.forEach(function (v) {
      AV.assert(v >= -900 && v <= 900, "got " + v);
    });
  });

  AV.test(GROUP, "generateArray can emit sorted and reversed runs", function () {
    var sorted = R.generateArray({ size: 40, seed: 8, sorted: true });
    for (var i = 1; i < sorted.length; i++) {
      AV.assert(sorted[i - 1] <= sorted[i], "must ascend at " + i);
    }
    var reversed = R.generateArray({ size: 40, seed: 8, reversed: true });
    for (var k = 1; k < reversed.length; k++) {
      AV.assert(reversed[k - 1] >= reversed[k], "must descend at " + k);
    }
    AV.assertDeepEqual(sortCopy(sorted), sortCopy(reversed), "same values, other order");
  });

  AV.test(GROUP, "duplicates false removes repeats", function () {
    var values = R.generateArray({
      size: 40, min: 0, max: 400, seed: 12, duplicates: false
    });
    var unique = {};
    values.forEach(function (v) { unique[v] = true; });
    AV.assertEqual(Object.keys(unique).length, values.length, "every value should be unique");
  });

  AV.test(GROUP, "few-unique draws from a tiny pool", function () {
    var values = R.generateArray({ size: 60, seed: 4, distribution: "few-unique" });
    AV.assertEqual(values.length, 60);
    var unique = {};
    values.forEach(function (v) { unique[v] = true; });
    var count = Object.keys(unique).length;
    AV.assert(count >= 2 && count <= 5, "expected a pool of 2 to 5, saw " + count);
  });

  AV.test(GROUP, "nearly-sorted reuses the same values but orders them", function () {
    var plain = R.generateArray({ size: 40, seed: 7 });
    var nearly = R.generateArray({ size: 40, seed: 7, distribution: "nearly-sorted" });
    AV.assertEqual(nearly.length, plain.length);
    AV.assertDeepEqual(sortCopy(nearly), sortCopy(plain), "same multiset, only reordered");
    AV.assert(
      inversions(nearly) < (40 * 39) / 4,
      "nearly-sorted must stay far below random disorder"
    );
  });

  AV.test(GROUP, "clampInt bounds, rounds and falls back", function () {
    AV.assertEqual(R.clampInt(7, 0, 10, 3), 7);
    AV.assertEqual(R.clampInt(-5, 0, 10, 3), 0);
    AV.assertEqual(R.clampInt(99, 0, 10, 3), 10);
    AV.assertEqual(R.clampInt(4.6, 0, 10, 3), 5, "rounds to the nearest integer");
    AV.assertEqual(R.clampInt("abc", 0, 10, 3), 3, "non-numeric falls back");
    AV.assertEqual(R.clampInt(NaN, 0, 10, 3), 3);
    AV.assertEqual(R.clampInt(undefined, 2, 500, 25), 25);
  });

  AV.test(GROUP, "ARRAY_SIZES offers an ascending set of presets", function () {
    AV.assert(R.ARRAY_SIZES.length >= 4);
    for (var i = 1; i < R.ARRAY_SIZES.length; i++) {
      AV.assert(R.ARRAY_SIZES[i] > R.ARRAY_SIZES[i - 1], "presets must ascend");
    }
    AV.assert(R.ARRAY_SIZES.every(function (n) { return n >= 2 && n <= 500; }),
      "presets must stay inside the clamp range");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
