/**
 * Quiz question bank tests
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var GROUP = "data/quiz";

  AV.test(GROUP, "question bank validates cleanly", function () {
    var report = AV.validateQuiz();
    AV.assert(report.ok, "problems: " + report.problems.join("; "));
    AV.assert(AV.quizQuestions.length >= 30, "a real bank");
  });

  AV.test(GROUP, "every question has four distinct options and one answer", function () {
    AV.quizQuestions.forEach(function (q) {
      AV.assertEqual(q.options.length, 4, q.id + " option count");
      AV.assertEqual(
        new Set(q.options).size,
        4,
        q.id + " options must be distinct"
      );
      AV.assert(q.answer >= 0 && q.answer <= 3, q.id + " answer in range");
      AV.assert(q.explain && q.explain.length > 30, q.id + " explains itself");
    });
  });

  AV.test(GROUP, "lookup helpers filter correctly", function () {
    AV.assert(AV.getQuestion("q-bfs-frontier") || AV.getQuestion("q-graph-bfs-frontier"),
      "known id resolves");
    AV.assertEqual(AV.getQuestion("does-not-exist"), null, "unknown id is null");

    var sorting = AV.questionsByCategory("sorting");
    AV.assert(sorting.length >= 3, "sorting has enough questions");
    sorting.forEach(function (q) { AV.assertEqual(q.category, "sorting"); });

    AV.assertEqual(
      AV.questionsByCategory("all").length,
      AV.quizQuestions.length,
      "'all' returns everything"
    );

    var easy = AV.questionsByDifficulty("easy");
    easy.forEach(function (q) { AV.assertEqual(q.difficulty, "easy"); });
    AV.assert(easy.length > 0, "some easy questions exist");
  });

  AV.test(GROUP, "checkAnswer grades right and wrong", function () {
    var q = AV.questionsByCategory("sorting")[0];
    var right = AV.checkAnswer(q, q.answer);
    AV.assertEqual(right.correct, true);
    AV.assertEqual(right.answer, q.answer);
    AV.assert(right.explain, "explains the answer");

    var wrongIndex = (q.answer + 1) % 4;
    var wrong = AV.checkAnswer(q, wrongIndex);
    AV.assertEqual(wrong.correct, false);
    AV.assertEqual(wrong.selected, wrongIndex);

    var unknown = AV.checkAnswer(null, 0);
    AV.assertEqual(unknown.correct, false);
  });

  AV.test(GROUP, "buildQuiz honours count, category and seed", function () {
    var round = AV.buildQuiz({ category: "graphs", count: 4, seed: 42 });
    AV.assertEqual(round.length, 4, "exactly four questions");
    round.forEach(function (q) { AV.assertEqual(q.category, "graphs"); });
    AV.assertEqual(
      new Set(round.map(function (q) { return q.id; })).size,
      4,
      "no repeats"
    );

    var same = AV.buildQuiz({ category: "graphs", count: 4, seed: 42 });
    AV.assertEqual(
      round.map(function (q) { return q.id; }).join(","),
      same.map(function (q) { return q.id; }).join(","),
      "the same seed replays the same round"
    );

    var other = AV.buildQuiz({ category: "graphs", count: 4, seed: 7 });
    var otherIds = other.map(function (q) { return q.id; }).join(",");
    var baseIds = round.map(function (q) { return q.id; }).join(",");
    var reshuffled = false;
    for (var seed = 1; seed <= 12 && !reshuffled; seed++) {
      var attempt = AV.buildQuiz({ category: "graphs", count: 4, seed: seed });
      if (attempt.map(function (q) { return q.id; }).join(",") !== baseIds) {
        reshuffled = true;
      }
    }
    AV.assert(reshuffled, "some seed must produce a different round");
  });

  AV.test(GROUP, "buildQuiz never exceeds its pool", function () {
    var hard = AV.questionsByDifficulty("hard");
    var round = AV.buildQuiz({ difficulty: "hard", count: 999, seed: 1 });
    AV.assertEqual(round.length, hard.length, "capped at the pool size");
    round.forEach(function (q) { AV.assertEqual(q.difficulty, "hard"); });
  });

  AV.test(GROUP, "buildQuiz defaults to the whole bank", function () {
    var round = AV.buildQuiz({ seed: 3 });
    AV.assertEqual(round.length, AV.quizQuestions.length, "everything included");
    AV.assertEqual(
      new Set(round.map(function (q) { return q.id; })).size,
      round.length,
      "still no repeats"
    );
  });

  AV.test(GROUP, "scoreQuiz computes the percentage", function () {
    var qs = AV.buildQuiz({ count: 4, seed: 11 });
    var perfect = qs.map(function (q) { return { id: q.id, selected: q.answer }; });
    var result = AV.scoreQuiz(perfect);
    AV.assertEqual(result.correct, 4);
    AV.assertEqual(result.total, 4);
    AV.assertEqual(result.percent, 100);

    var half = qs.map(function (q, i) {
      return { id: q.id, selected: i % 2 === 0 ? q.answer : (q.answer + 1) % 4 };
    });
    var partial = AV.scoreQuiz(half);
    AV.assertEqual(partial.correct, 2);
    AV.assertEqual(partial.percent, 50);

    var empty = AV.scoreQuiz([]);
    AV.assertEqual(empty.percent, 0, "an empty round is not a divide by zero");
  });

  AV.test(GROUP, "every question links to a learning module", function () {
    AV.quizQuestions.forEach(function (q) {
      var links = AV.questionLinks(q);
      AV.assert(links.module, q.id + " has a module to read");
      if (q.definition) {
        AV.assert(links.definition, q.id + " has a definition to open");
      }
    });
  });

  AV.test(GROUP, "every learning module is referenced by at least one question", function () {
    var used = Object.create(null);
    AV.quizQuestions.forEach(function (q) {
      if (q.related) used[q.related] = true;
    });
    var missing = AV.learningModules
      .filter(function (m) { return !used[m.id]; })
      .map(function (m) { return m.id; });
    AV.assertEqual(missing.join(","), "", "untested modules: " + missing.join(", "));
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
