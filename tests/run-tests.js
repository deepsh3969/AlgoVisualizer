/**
 * AlgoVisualizer — Node test runner
 * Usage: node tests/run-tests.js
 * Zero dependencies: loads the browser sources as plain scripts, then runs
 * every test registered through AV.test(group, name, fn).
 */
"use strict";

var path = require("path");

var ROOT = path.join(__dirname, "..");

var SOURCES = [
  "js/utils/format.js",
  "js/utils/random.js",
  "js/utils/storage.js",
  "js/utils/validation.js",
  "js/core/eventBus.js",
  "js/core/registry.js",
  "js/core/graphModel.js",
  "js/core/state.js",
  "js/core/visualizationEngine.js",
  "js/core/executionEngine.js",
  "js/data/algorithms.js",
  "js/data/dataStructures.js",
  "js/data/learning.js",
  "js/data/quizQuestions.js",
  "js/algorithms/sorting/bubbleSort.js",
  "js/algorithms/sorting/selectionSort.js",
  "js/algorithms/sorting/insertionSort.js",
  "js/algorithms/sorting/mergeSort.js",
  "js/algorithms/sorting/quickSort.js",
  "js/algorithms/sorting/heapSort.js",
  "js/algorithms/searching/linearSearch.js",
  "js/algorithms/searching/binarySearch.js",
  "js/algorithms/patterns/twoPointer.js",
  "js/algorithms/patterns/slidingWindow.js",
  "js/algorithms/patterns/prefixSum.js",
  "js/algorithms/graphs/bfs.js",
  "js/algorithms/graphs/dfs.js",
  "js/algorithms/graphs/dijkstra.js",
  "js/algorithms/recursion/factorial.js",
  "js/algorithms/recursion/fibonacci.js",
  "js/dataStructures/array.js",
  "js/dataStructures/stack.js",
  "js/dataStructures/queue.js",
  "js/dataStructures/linkedList.js",
  "js/dataStructures/binarySearchTree.js",
  "js/core/metrics.js",
  "js/core/benchmark.js"
];

var TEST_SUITES = [
  "tests/utilities/format.test.js",
  "tests/utilities/random.test.js",
  "tests/utilities/validation.test.js",
  "tests/algorithms/sorting.test.js",
  "tests/algorithms/searching.test.js",
  "tests/algorithms/patterns.test.js",
  "tests/algorithms/graphs.test.js",
  "tests/algorithms/recursion.test.js",
  "tests/algorithms/events.test.js",
  "tests/data/learning.test.js",
  "tests/data/quiz.test.js",
  "tests/dataStructures/stack.test.js",
  "tests/dataStructures/queue.test.js",
  "tests/dataStructures/linkedList.test.js",
  "tests/dataStructures/binarySearchTree.test.js",
  "tests/dataStructures/array.test.js",
  "tests/core/state.test.js",
  "tests/core/metrics.test.js",
  "tests/core/benchmark.test.js",
  "tests/core/executionEngine.test.js",
  "tests/core/eventBus.test.js",
  "tests/core/visualizationEngine.test.js"
];

function load(file) {
  var full = path.join(ROOT, file);
  try {
    require(full);
  } catch (err) {
    console.error("  ! failed to load " + file);
    throw err;
  }
}

var missingSources = [];
SOURCES.forEach(function (file) {
  var full = path.join(ROOT, file);
  if (!require("fs").existsSync(full)) {
    missingSources.push(file);
    return;
  }
  try {
    load(file);
  } catch (err) {
    console.error("Failed while loading source: " + file);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
});

load("tests/suite.js");

var missingSuites = [];
TEST_SUITES.forEach(function (file) {
  var full = path.join(ROOT, file);
  if (require("fs").existsSync(full)) {
    load(file);
  } else {
    missingSuites.push(file);
  }
});

var AV = globalThis.AV;
var results = AV.runTests();

var groups = new Map();
results.forEach(function (r) {
  if (!groups.has(r.group)) groups.set(r.group, { passed: 0, failed: 0, failures: [] });
  var g = groups.get(r.group);
  if (r.ok) g.passed += 1;
  else {
    g.failed += 1;
    g.failures.push(r);
  }
});

var totalPassed = 0;
var totalFailed = 0;

console.log("\nAlgoVisualizer test suite\n" + "-".repeat(56));

groups.forEach(function (g, name) {
  totalPassed += g.passed;
  totalFailed += g.failed;
  var status = g.failed === 0 ? "PASS" : "FAIL";
  console.log(
    "  [" + status + "] " + padEnd(name, 34) + g.passed + "/" + (g.passed + g.failed)
  );
  g.failures.forEach(function (f) {
    console.log("         x " + f.name);
    console.log("           " + f.message);
  });
});

console.log("-".repeat(56));
console.log("  " + totalPassed + " passed / " + (totalPassed + totalFailed) + " total");

if (missingSuites.length) {
  console.log("\n  Missing suite files:");
  missingSuites.forEach(function (f) { console.log("   - " + f); });
}

if (totalFailed > 0) {
  process.exitCode = 1;
}

function padEnd(str, len) {
  var out = String(str);
  while (out.length < len) out += " ";
  return out;
}
