/**
 * AlgoVisualizer — test harness
 * Dependency-free. Works in Node (tests/run-tests.js) and in the browser
 * (tests/test.html), so the same assertions cover both environments.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var tests = [];

  function test(group, name, fn) {
    if (typeof name === "function") {
      fn = name;
      name = group;
      group = "general";
    }
    tests.push({ group: group, name: name, fn: fn });
  }

  function fail(message) {
    throw new Error(message || "Assertion failed");
  }

  function assert(condition, message) {
    if (!condition) fail(message || "Expected a truthy value");
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      fail(
        (message ? message + " - " : "") +
          "expected " + format(expected) + " but received " + format(actual)
      );
    }
  }

  function assertNotEqual(actual, expected, message) {
    if (actual === expected) {
      fail((message ? message + " - " : "") + "expected a value different from " + format(expected));
    }
  }

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      var ka = Object.keys(a);
      var kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (var j = 0; j < ka.length; j++) {
        if (!Object.prototype.hasOwnProperty.call(b, ka[j])) return false;
        if (!deepEqual(a[ka[j]], b[ka[j]])) return false;
      }
      return true;
    }
    return false;
  }

  function assertDeepEqual(actual, expected, message) {
    if (!deepEqual(actual, expected)) {
      fail(
        (message ? message + " - " : "") +
          "expected " + format(expected) + " but received " + format(actual)
      );
    }
  }

  function assertThrows(fn, message) {
    var threw = false;
    try {
      fn();
    } catch (err) {
      threw = true;
    }
    if (!threw) fail(message || "Expected the function to throw");
  }

  function assertNoThrow(fn, message) {
    try {
      fn();
    } catch (err) {
      fail((message ? message + " - " : "") + "Unexpected error: " + (err && err.message));
    }
  }

  function format(value) {
    if (typeof value === "string") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return "[" + value.slice(0, 12).map(format).join(", ") + (value.length > 12 ? ", ..." : "") + "]";
    }
    if (value === undefined) return "undefined";
    if (value && typeof value === "object") {
      try {
        var s = JSON.stringify(value);
        return s.length > 160 ? s.slice(0, 157) + "..." : s;
      } catch (err) {
        return String(value);
      }
    }
    return String(value);
  }

  function runAll() {
    var results = [];
    for (var i = 0; i < tests.length; i++) {
      var t = tests[i];
      try {
        t.fn();
        results.push({ group: t.group, name: t.name, ok: true });
      } catch (err) {
        results.push({
          group: t.group,
          name: t.name,
          ok: false,
          message: err && err.message ? err.message : String(err),
          stack: err && err.stack ? err.stack : ""
        });
      }
    }
    return results;
  }

  AV.test = test;
  AV.assert = assert;
  AV.assertEqual = assertEqual;
  AV.assertNotEqual = assertNotEqual;
  AV.assertDeepEqual = assertDeepEqual;
  AV.assertThrows = assertThrows;
  AV.assertNoThrow = assertNoThrow;
  AV.deepEqual = deepEqual;
  AV.getTests = function () { return tests.slice(); };
  AV.runTests = runAll;
})(typeof globalThis !== "undefined" ? globalThis : window);
