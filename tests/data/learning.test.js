/**
 * Learning module tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var GROUP = "data/learning";

  AV.test(GROUP, "module catalog validates cleanly", function () {
    var report = AV.validateLearning();
    AV.assert(report.ok, "problems: " + report.problems.join("; "));
    AV.assert(AV.learningModules.length >= 9, "a real curriculum");
  });

  AV.test(GROUP, "covers every algorithm category plus foundations", function () {
    var expected = [
      "foundations",
      "sorting",
      "searching",
      "patterns",
      "graphs",
      "recursion",
      "structures"
    ];
    expected.forEach(function (cat) {
      AV.assert(
        AV.learningByCategory(cat).length > 0,
        "category " + cat + " needs at least one module"
      );
    });
    AV.assertEqual(
      AV.learningByCategory("all").length,
      AV.learningModules.length,
      "'all' returns everything"
    );
  });

  AV.test(GROUP, "every module is complete", function () {
    AV.learningModules.forEach(function (m) {
      AV.assert(m.id && m.title && m.summary, m.id + " has headline fields");
      AV.assert(m.sections.length >= 2, m.id + " has enough sections");
      AV.assert(m.keyPoints.length >= 3, m.id + " has enough key points");
      AV.assert(
        ["beginner", "intermediate", "advanced"].indexOf(m.level) >= 0,
        m.id + " declares a level"
      );
      m.sections.forEach(function (s) {
        AV.assert(s.heading && s.body, m.id + " section is complete");
        AV.assert(s.body.length > 60, m.id + " section body is substantive");
      });
    });
  });

  AV.test(GROUP, "lookup helpers work", function () {
    var first = AV.learningModules[0];
    AV.assert(AV.getLearningModule(first.id), "known id resolves");
    AV.assertEqual(AV.getLearningModule("nope"), null, "unknown id is null");
    AV.assert(AV.learningByLevel("beginner").length > 0, "level filter works");
    AV.assertEqual(AV.learningByLevel("impossible").length, 0, "empty level is empty");
  });

  AV.test(GROUP, "related links resolve to real definitions", function () {
    AV.learningModules.forEach(function (m) {
      var defs = AV.learningRelatedDefinitions(m.id);
      AV.assert(defs.length > 0, m.id + " links at least one definition");
      defs.forEach(function (def) {
        AV.assert(def.id && def.name, m.id + " link resolves to a named definition");
      });
    });
  });

  AV.test(GROUP, "every registry entry is reachable from some module", function () {
    var covered = Object.create(null);
    AV.learningModules.forEach(function (m) {
      m.related.forEach(function (id) { covered[id] = true; });
    });

    var unreachable = [];
    AV.algorithms.all().concat(AV.structures.all()).forEach(function (def) {
      if (!covered[def.id]) unreachable.push(def.id);
    });
    AV.assertEqual(unreachable.join(","), "", "uncovered: " + unreachable.join(", "));
  });

  AV.test(GROUP, "graph modules link the graph algorithms", function () {
    var traversal = AV.getLearningModule("bfs-vs-dfs");
    AV.assert(traversal, "module exists");
    var ids = traversal.related.join(",");
    AV.assert(ids.indexOf("bfs") >= 0 && ids.indexOf("dfs") >= 0, "links bfs and dfs");
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
