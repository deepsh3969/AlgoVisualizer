/**
 * Validation utility tests — every validator returns { ok, value | error }
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var V = AV.validate;
  var GROUP = "utilities/validation";

  function ok(res, label) {
    AV.assert(res.ok === true, (label || "expected ok") + " - got " + res.error);
    return res.value;
  }

  function bad(res, label) {
    AV.assert(res.ok === false, (label || "expected a failure") + " - got " + JSON.stringify(res.value));
    AV.assert(typeof res.error === "string" && res.error.length > 0, "a failure explains itself");
    return res.error;
  }

  AV.test(GROUP, "parseArrayLiteral accepts common spellings", function () {
    AV.assertDeepEqual(ok(V.parseArrayLiteral("[42, 17, 8]")), [42, 17, 8]);
    AV.assertDeepEqual(ok(V.parseArrayLiteral("42,17,8")), [42, 17, 8]);
    AV.assertDeepEqual(ok(V.parseArrayLiteral("  42   17   8  ")), [42, 17, 8]);
    AV.assertDeepEqual(ok(V.parseArrayLiteral("[-3, 0.5, 12]")), [-3, 0.5, 12]);
    bad(V.parseArrayLiteral("[]"), "an empty body is reported as empty");
  });

  AV.test(GROUP, "parseArrayLiteral rejects junk", function () {
    bad(V.parseArrayLiteral("42, banana, 8"), "words are not numbers");
    bad(V.parseArrayLiteral(42), "a non-string is refused");
    bad(V.parseArrayLiteral("   "), "blank input is refused");
    bad(V.parseArrayLiteral("[42, 17"), "a missing bracket is caught");
    bad(V.parseArrayLiteral(""), "an empty string is refused");
    var message = bad(V.parseArrayLiteral("1e400"), "non-finite numbers are refused");
    AV.assert(message.indexOf("not") >= 0, "the message should name the problem");
  });

  AV.test(GROUP, "parseArrayLiteral enforces length limits", function () {
    var many = [];
    for (var i = 0; i < 30; i++) many.push(i);
    var err = bad(
      V.parseArrayLiteral(many.join(","), { max: 10 }),
      "more than the maximum is refused"
    );
    AV.assert(err.indexOf("maximum") >= 0, "the limit is named: " + err);

    var short = bad(V.parseArrayLiteral("7", { min: 3 }), "too few values is refused");
    AV.assert(short.indexOf("at least 3") >= 0, "the minimum is named: " + short);

    AV.assertDeepEqual(ok(V.parseArrayLiteral("1, 2, 3", { min: 3 })), [1, 2, 3]);
  });

  AV.test(GROUP, "parseArrayLiteral caps the value magnitude", function () {
    var err = bad(V.parseArrayLiteral("9999999999"), "an out-of-range value is refused");
    AV.assert(err.indexOf("-1,000,000,000") >= 0, "the bound is named: " + err);
  });

  AV.test(GROUP, "parseNumber accepts strings and numbers", function () {
    AV.assertEqual(ok(V.parseNumber("42")), 42);
    AV.assertEqual(ok(V.parseNumber(" -7 ")), -7);
    AV.assertEqual(ok(V.parseNumber(3.5)), 3.5);
    AV.assertEqual(ok(V.parseNumber(0)), 0, "zero is a valid number");
    bad(V.parseNumber("abc"));
    bad(V.parseNumber(""));
    bad(V.parseNumber("   "));
    bad(V.parseNumber(null), "null is not a value");
    bad(V.parseNumber(undefined));
    bad(V.parseNumber(Infinity));
    bad(V.parseNumber(NaN));
  });

  AV.test(GROUP, "parseNumber honours bounds and messages", function () {
    AV.assertEqual(ok(V.parseNumber("5", { min: 0, max: 10 })), 5);
    var low = bad(V.parseNumber("-1", { min: 0 }));
    AV.assert(low.indexOf("Minimum") >= 0, "default minimum message: " + low);
    var high = bad(V.parseNumber("11", { max: 10 }));
    AV.assert(high.indexOf("Maximum") >= 0, "default maximum message: " + high);
    var custom = bad(V.parseNumber("", { required: "Type a number first." }));
    AV.assertEqual(custom, "Type a number first.");
    var customMin = bad(V.parseNumber("-1", { min: 0, minMessage: "No negatives." }));
    AV.assertEqual(customMin, "No negatives.");
  });

  AV.test(GROUP, "parseInteger rejects fractions", function () {
    AV.assertEqual(ok(V.parseInteger("42")), 42);
    bad(V.parseInteger("4.5"), "a fraction is not an integer");
    bad(V.parseInteger("abc"));
  });

  AV.test(GROUP, "parseBenchmarkSize stays inside safe bounds", function () {
    AV.assertEqual(ok(V.parseBenchmarkSize("1000")), 1000);
    var low = bad(V.parseBenchmarkSize("0"));
    AV.assert(low.indexOf("at least 1") >= 0, low);
    var high = bad(V.parseBenchmarkSize("999999"));
    AV.assert(high.indexOf("200,000") >= 0, high);
    bad(V.parseBenchmarkSize("big"));
  });

  AV.test(GROUP, "sanitizeArray coerces and bounds", function () {
    AV.assertDeepEqual(ok(V.sanitizeArray([1, "2", 3])), [1, 2, 3], "values are coerced");
    bad(V.sanitizeArray("not an array"));
    bad(V.sanitizeArray([]), "an empty array is refused");
    bad(V.sanitizeArray([1, 2, "x"]), "a non-numeric entry is refused");
    bad(V.sanitizeArray([1, 2, Infinity]), "infinities are refused");

    var huge = [];
    for (var i = 0; i < V.MAX_ARRAY_LENGTH + 1; i++) huge.push(i);
    var err = bad(V.sanitizeArray(huge));
    AV.assert(err.indexOf("too large") >= 0, err);
  });

  AV.test(GROUP, "graph validators locate nodes and edges", function () {
    var graph = AV.graphModel.demoGraph();
    var first = graph.nodes[0];
    var second = graph.nodes[1];

    AV.assert(V.isValidNodeId(graph, first.id));
    AV.assert(!V.isValidNodeId(graph, "nope"));
    AV.assert(!V.isValidNodeId(null, "x"), "a missing graph is not valid");

    AV.assertEqual(V.findNode(graph, first.id).label, first.label);
    AV.assertEqual(V.findNode(graph, "nope"), null);
    AV.assertEqual(V.findNode(null, "x"), null);

    var edge = V.findEdge(graph, first.id, second.id, false);
    if (edge) {
      AV.assert(edge.from === first.id || edge.from === second.id);
    }
    AV.assertEqual(V.findEdge(null, "a", "b"), null);
  });

  AV.test(GROUP, "validateEdge refuses invalid connections", function () {
    var graph = { nodes: [{ id: "a" }, { id: "b" }], edges: [] };
    ok(V.validateEdge(graph, "a", "b"));
    bad(V.validateEdge(graph, "a", "a"), "a self loop is refused");
    bad(V.validateEdge(graph, "a", "zz"), "a missing endpoint is refused");
    bad(V.validateEdge(graph, "zz", "b"), "a missing start is refused");

    graph.edges.push({ from: "a", to: "b", weight: 1 });
    var dup = bad(V.validateEdge(graph, "a", "b"));
    AV.assert(dup.indexOf("already connected") >= 0, dup);
    ok(V.validateEdge(graph, "b", "a", { directed: true }),
      "the reverse direction is free on a directed graph");
  });

  AV.test(GROUP, "validateNodeLabel keeps labels short and unique", function () {
    var graph = { nodes: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }], edges: [] };
    ok(V.validateNodeLabel(graph, "Gamma"));
    bad(V.validateNodeLabel(graph, "   "), "a blank label is refused");
    bad(V.validateNodeLabel(graph, "Alpha"), "duplicate labels are refused");
    ok(V.validateNodeLabel(graph, "Alpha", "a"), "editing a node may keep its own label");
    bad(V.validateNodeLabel(graph, "WayTooLongLabel"), "labels are capped at 8 characters");
    ok(V.validateNodeLabel(graph, 123), "numeric labels are stringified");
  });

  AV.test(GROUP, "validateWeight bounds edge weights", function () {
    AV.assertEqual(ok(V.validateWeight("5")), 5);
    AV.assertEqual(ok(V.validateWeight("0")), 0, "zero weight is allowed");
    var low = bad(V.validateWeight("-1"));
    AV.assert(low.indexOf("0 or greater") >= 0, low);
    var high = bad(V.validateWeight("20000"));
    AV.assert(high.indexOf("10,000") >= 0, high);
    bad(V.validateWeight("heavy"));
  });

  AV.test(GROUP, "length constants stay sensible", function () {
    AV.assertEqual(V.MAX_ARRAY_LENGTH, 150);
    AV.assertEqual(V.MIN_ARRAY_LENGTH, 2);
    AV.assert(V.MIN_ARRAY_LENGTH <= V.MAX_ARRAY_LENGTH);
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
