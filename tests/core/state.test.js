/**
 * State tests — store notifications, hash router, preferences
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var GROUP = "core/state";

  /* ------------------------------------------------------------------ store */

  AV.test(GROUP, "get returns the live state, snapshot a copy", function () {
    var store = AV.createStore({ a: 1, b: 2 });
    AV.assertEqual(store.get().a, 1);
    var snap = store.snapshot();
    AV.assertDeepEqual(snap, { a: 1, b: 2 });
    snap.a = 99;
    AV.assertEqual(store.get().a, 1, "mutating the snapshot must not touch the store");
  });

  AV.test(GROUP, "set shallow-merges and reports next, prev and meta", function () {
    var store = AV.createStore({ a: 1, keep: "x" }, { name: "t" });
    var seen = [];
    store.subscribe(function (next, prev, meta) {
      seen.push({ next: next, prev: prev, meta: meta });
    });
    var returned = store.set({ a: 2 }, { reason: "test" });
    AV.assertEqual(seen.length, 1, "one notification");
    AV.assertEqual(seen[0].next.a, 2);
    AV.assertEqual(seen[0].prev.a, 1, "prev is the state before the write");
    AV.assertNotEqual(seen[0].next, seen[0].prev, "next and prev are distinct objects");
    AV.assertEqual(seen[0].meta.reason, "test");
    AV.assertEqual(returned.a, 2, "set returns the resulting state");
    AV.assertEqual(store.get().keep, "x", "unrelated keys survive the merge");
    AV.assertEqual(store.name, "t");
  });

  AV.test(GROUP, "a write that changes nothing does not notify", function () {
    var store = AV.createStore({ a: 1 });
    var hits = 0;
    store.subscribe(function () { hits += 1; });
    store.set({ a: 1 });
    AV.assertEqual(hits, 0, "identical values are ignored");
    store.set({ a: 2 });
    AV.assertEqual(hits, 1);
    store.set({ a: 2, b: undefined });
    AV.assertEqual(hits, 2, "a new key counts as a change");
    store.set(null);
    store.set(undefined);
    store.set("");
    AV.assertEqual(hits, 2, "falsy patches are ignored");
  });

  AV.test(GROUP, "set accepts a function patch derived from current state", function () {
    var store = AV.createStore({ count: 0 });
    store.set(function (s) { return { count: s.count + 1 }; });
    store.set(function (s) { return { count: s.count + 1 }; });
    AV.assertEqual(store.get().count, 2);
  });

  AV.test(GROUP, "unsubscribe stops delivery and keeps other listeners", function () {
    var store = AV.createStore({ a: 0 });
    var a = 0;
    var b = 0;
    var offA = store.subscribe(function () { a += 1; });
    store.subscribe(function () { b += 1; });
    AV.assertEqual(store.listenerCount(), 2);
    store.set({ a: 1 });
    offA();
    store.set({ a: 2 });
    AV.assertEqual(a, 1, "the first listener stopped");
    AV.assertEqual(b, 2, "the second listener kept running");
    offA();
    AV.assertEqual(store.listenerCount(), 1, "unsubscribing twice is a no-op");
  });

  AV.test(GROUP, "subscribe rejects anything that is not a function", function () {
    var store = AV.createStore({});
    AV.assertThrows(function () { store.subscribe(null); }, "null handler");
    AV.assertThrows(function () { store.subscribe("render"); }, "string handler");
    AV.assertEqual(store.listenerCount(), 0);
  });

  AV.test(GROUP, "batch collapses several writes into one notification", function () {
    var store = AV.createStore({ a: 1, b: 1, c: 1 });
    var seen = [];
    store.subscribe(function (next, prev, meta) {
      seen.push({ a: next.a, b: next.b, c: next.c, prev: prev, meta: meta });
    });
    store.batch(function (set) {
      set({ a: 2 });
      set({ b: 2 });
      AV.assertEqual(seen.length, 0, "nothing is delivered mid-batch");
      set({ c: 2 });
    });
    AV.assertEqual(seen.length, 1, "exactly one notification");
    AV.assertEqual(seen[0].a, 2);
    AV.assertEqual(seen[0].b, 2);
    AV.assertEqual(seen[0].c, 2);
    AV.assertEqual(seen[0].prev.a, 1, "prev is the state before the batch");
    AV.assertEqual(seen[0].prev.b, 1);
    AV.assertEqual(seen[0].meta.batch, true);
    AV.assertEqual(store.get().a, 2, "the state itself is fully applied");
  });

  AV.test(GROUP, "a batch with no real change notifies nobody", function () {
    var store = AV.createStore({ a: 1 });
    var hits = 0;
    store.subscribe(function () { hits += 1; });
    store.batch(function (set) { set({ a: 1 }); });
    AV.assertEqual(hits, 0);
    store.batch(function () { /* no writes at all */ });
    AV.assertEqual(hits, 0);
  });

  AV.test(GROUP, "a throwing batch callback still closes the batch", function () {
    var store = AV.createStore({ a: 1 });
    var hits = 0;
    store.subscribe(function () { hits += 1; });
    AV.assertThrows(function () {
      store.batch(function (set) {
        set({ a: 2 });
        throw new Error("boom");
      });
    }, "the callback error propagates");
    AV.assertEqual(store.get().a, 2, "writes before the throw were kept");
    AV.assertEqual(hits, 1, "the deferred notification was flushed");
    store.set({ a: 3 });
    AV.assertEqual(hits, 2, "the store is usable again");
  });

  AV.test(GROUP, "reset replaces state and reports a reset", function () {
    var store = AV.createStore({ a: 1, b: 2 });
    var seen = [];
    store.subscribe(function (next, prev, meta) { seen.push([next, prev, meta]); });
    store.set({ a: 9 });
    store.reset();
    AV.assertEqual(store.get().a, 1, "reset() restores the initial state");
    AV.assertEqual(store.get().b, 2);
    AV.assertEqual(seen.length, 2);
    AV.assertEqual(seen[1][1].a, 9, "prev is the state before the reset");
    AV.assertEqual(seen[1][2].reset, true);

    store.reset({ only: 5 });
    AV.assertDeepEqual(store.snapshot(), { only: 5 }, "reset(next) swaps the whole state");
  });

  /* ----------------------------------------------------------------- routes */

  AV.test(GROUP, "the route table covers the main sections", function () {
    AV.assert(AV.ROUTES.length >= 7, "at least the core routes");
    AV.assertEqual(AV.ROUTES[0].name, "home");
    AV.assertEqual(AV.ROUTES[0].path, "");
    var names = AV.ROUTES.map(function (r) { return r.name; });
    ["algorithms", "structures", "learning", "quiz", "benchmark", "compare"].forEach(function (n) {
      AV.assert(names.indexOf(n) >= 0, "route " + n + " is registered");
    });
    AV.assertEqual(AV.routeByName("quiz").label, "Quiz");
    AV.assertEqual(AV.routeByName("nope"), null, "unknown names resolve to null");
  });

  AV.test(GROUP, "normalizeHash trims slashes, queries and hashes", function () {
    AV.assertEqual(AV.normalizeHash(""), "");
    AV.assertEqual(AV.normalizeHash(null), "");
    AV.assertEqual(AV.normalizeHash(undefined), "");
    AV.assertEqual(AV.normalizeHash("#"), "");
    AV.assertEqual(AV.normalizeHash("#/"), "");
    AV.assertEqual(AV.normalizeHash("/"), "");
    AV.assertEqual(AV.normalizeHash("#/algorithms"), "algorithms");
    AV.assertEqual(AV.normalizeHash("algorithms"), "algorithms");
    AV.assertEqual(AV.normalizeHash("#//algorithms//"), "algorithms");
    AV.assertEqual(AV.normalizeHash("#/algorithms?filter=sort"), "algorithms");
    AV.assertEqual(AV.normalizeHash("#/algorithm/bubbleSort"), "algorithm/bubbleSort");
  });

  AV.test(GROUP, "parseHash classifies the main routes", function () {
    AV.assertEqual(AV.parseHash("").name, "home");
    AV.assertEqual(AV.parseHash("#/").name, "home");
    AV.assertEqual(AV.parseHash("#/algorithms").name, "algorithms");
    AV.assertEqual(AV.parseHash("#/structures").name, "structures");
    AV.assertEqual(AV.parseHash("#/learning").name, "learning");
    AV.assertEqual(AV.parseHash("#/quiz").name, "quiz");
    AV.assertEqual(AV.parseHash("#/benchmark").name, "benchmark");
    AV.assertEqual(AV.parseHash("#/compare").name, "compare");
  });

  AV.test(GROUP, "parseHash carries the definition id", function () {
    var algo = AV.parseHash("#/algorithm/bubbleSort");
    AV.assertEqual(algo.name, "algorithm");
    AV.assertEqual(algo.id, "bubbleSort");
    AV.assertDeepEqual(algo.segments, ["algorithm", "bubbleSort"]);
    AV.assertEqual(algo.path, "algorithm/bubbleSort");

    var structure = AV.parseHash("#/structure/linkedList");
    AV.assertEqual(structure.name, "structure");
    AV.assertEqual(structure.id, "linkedList");

    var lesson = AV.parseHash("#/learning/bigOnotation");
    AV.assertEqual(lesson.name, "lesson", "a learning/id pair is a lesson");
    AV.assertEqual(lesson.id, "bigOnotation");

    var bare = AV.parseHash("#/algorithm");
    AV.assertEqual(bare.name, "home", "a detail route without an id is stale");
    AV.assertEqual(bare.id, null);
  });

  AV.test(GROUP, "an unknown hash falls back to home", function () {
    ["#/nowhere", "#/algorithm/a/extra/deep", "#/algorithm", "#/structure", "#/COMPARED", "#/123"].forEach(function (hash) {
      AV.assertEqual(AV.parseHash(hash).name, "home", hash + " should land on home");
    });
    AV.assertDeepEqual(AV.parseHash("#/nowhere").segments, ["nowhere"]);
  });

  AV.test(GROUP, "buildHash and parseHash round trip", function () {
    [
      ["home", null, "#/"],
      ["algorithms", null, "#/algorithms"],
      ["structures", null, "#/structures"],
      ["learning", null, "#/learning"],
      ["quiz", null, "#/quiz"],
      ["benchmark", null, "#/benchmark"],
      ["compare", null, "#/compare"],
      ["algorithm", "bubbleSort", "#/algorithm/bubbleSort"],
      ["structure", "stack", "#/structure/stack"],
      ["lesson", "bigOnotation", "#/learning/bigOnotation"]
    ].forEach(function (row) {
      var hash = AV.buildHash(row[0], row[1]);
      AV.assertEqual(hash, row[2], "buildHash(" + row[0] + ")");
      var parsed = AV.parseHash(hash);
      AV.assertEqual(parsed.name, row[0] === "lesson" ? "lesson" : row[0], "round trip name for " + hash);
      if (row[1]) AV.assertEqual(parsed.id, row[1], "round trip id for " + hash);
    });
  });

  AV.test(GROUP, "buildHash escapes ids and never emits a broken hash", function () {
    AV.assertEqual(AV.buildHash("algorithm", "a b/c"), "#/algorithm/a%20b%2Fc");
    AV.assertEqual(AV.buildHash("algorithm", ""), "#/algorithm", "an empty id is dropped");
    AV.assertEqual(AV.buildHash("algorithm", null), "#/algorithm");
    AV.assertEqual(AV.buildHash("doesNotExist", "x"), "#/", "unknown routes fall back to home");
    AV.assertEqual(AV.buildHash("home"), "#/");
  });

  /* --------------------------------------------------------------- prefs */

  AV.test(GROUP, "loadPrefs returns a full default set", function () {
    AV.resetPrefs();
    var prefs = AV.loadPrefs();
    AV.assertEqual(prefs.theme, AV.DEFAULT_PREFS.theme);
    AV.assertEqual(prefs.speed, AV.DEFAULT_PREFS.speed);
    AV.assertEqual(prefs.arraySize, AV.DEFAULT_PREFS.arraySize);
    AV.assert(Array.isArray(prefs.recentIds));
    AV.assertEqual(prefs.lastAlgorithmId, null);
  });

  AV.test(GROUP, "savePrefs round trips through storage", function () {
    AV.savePrefs({ theme: "dark", speed: 4, arraySize: 120, recentIds: ["mergeSort"] });
    var prefs = AV.loadPrefs();
    AV.assertEqual(prefs.theme, "dark");
    AV.assertEqual(prefs.speed, 4);
    AV.assertEqual(prefs.arraySize, 120);
    AV.assertDeepEqual(prefs.recentIds, ["mergeSort"]);
    AV.resetPrefs();
  });

  AV.test(GROUP, "loadPrefs repairs values that were stored broken", function () {
    AV.storage.set("prefs", { theme: "dark", speed: 99, recentIds: "nope" });
    var prefs = AV.loadPrefs();
    AV.assertEqual(prefs.theme, "dark", "valid keys are kept");
    AV.assertEqual(prefs.speed, 1, "an unknown speed falls back to 1");
    AV.assert(Array.isArray(prefs.recentIds), "a corrupt recentIds list is replaced");
    AV.assertEqual(prefs.arraySize, AV.DEFAULT_PREFS.arraySize, "missing keys are filled in");

    AV.storage.set("prefs", "not json at all");
    AV.assertDeepEqual(AV.loadPrefs(), AV.DEFAULT_PREFS, "garbage falls back to defaults");
    AV.resetPrefs();
  });

  AV.test(GROUP, "resetPrefs clears the persisted key", function () {
    AV.savePrefs({ theme: "dark" });
    var prefs = AV.resetPrefs();
    AV.assertEqual(prefs.theme, AV.DEFAULT_PREFS.theme);
    AV.assertDeepEqual(AV.storage.get("prefs", null), null);
  });

  AV.test(GROUP, "rememberRecent keeps the newest first, without duplicates", function () {
    AV.assertDeepEqual(AV.rememberRecent(null, null), [], "nothing in, nothing out");
    var list = [];
    list = AV.rememberRecent({ recentIds: list }, "a");
    list = AV.rememberRecent({ recentIds: list }, "b");
    list = AV.rememberRecent({ recentIds: list }, "a");
    AV.assertDeepEqual(list, ["a", "b"], "a repeat moves back to the front");
    list = AV.rememberRecent({ recentIds: list }, "c");
    AV.assertDeepEqual(list, ["c", "a", "b"]);
  });

  AV.test(GROUP, "rememberRecent respects its cap", function () {
    var list = [];
    for (var i = 0; i < 20; i++) list = AV.rememberRecent({ recentIds: list }, "id" + i);
    AV.assertEqual(list.length, 8, "the default cap is 8");
    AV.assertEqual(list[0], "id19", "the newest entry leads");
    var small = AV.rememberRecent({ recentIds: list }, "fresh", 3);
    AV.assertEqual(small.length, 3);
    AV.assertEqual(small[0], "fresh");
    AV.assertDeepEqual(AV.rememberRecent({ recentIds: small }, ""), small, "an empty id is ignored");
  });

  /* ------------------------------------------------------- default state */

  AV.test(GROUP, "defaultInput covers every control the workspace reads", function () {
    var input = AV.defaultInput();
    AV.assertDeepEqual(input, {
      mode: "random",
      size: 25,
      seed: 20260101,
      values: [],
      target: "",
      windowSize: 4,
      operation: null,
      index: 0,
      value: "",
      graphSize: 7,
      recursionValue: 6,
      custom: ""
    });
    var first = AV.defaultInput().values;
    var second = AV.defaultInput().values;
    AV.assertNotEqual(first, second, "values is a fresh array each call");
  });

  AV.test(GROUP, "defaultState starts on the home route with sane flags", function () {
    var state = AV.defaultState();
    AV.assertEqual(state.route.name, "home");
    AV.assertEqual(state.theme, "system");
    AV.assertEqual(state.speed, 1);
    AV.assertEqual(state.showMetrics, true);
    AV.assertEqual(state.showPseudocode, true);
    AV.assertEqual(state.sidebarOpen, false);
    AV.assertEqual(state.searchOpen, false);
    AV.assertEqual(state.dialog, null);
    AV.assertDeepEqual(state.compareIds, []);
    AV.assertEqual(state.benchmarkCategory, "sorting");
    AV.assertEqual(state.quizCategory, "all");
    AV.assert(Array.isArray(state.recentIds));
    AV.assertEqual(state.input.size, 25);
    AV.assertNotEqual(AV.defaultState().input, state.input, "nested input is fresh per call");
  });

  /* ------------------------------------------------------------ app store */

  AV.test(GROUP, "AV.app boots from persisted preferences", function () {
    AV.assert(AV.app, "the shared app store exists");
    AV.assert(typeof AV.app.set === "function");
    AV.assert(typeof AV.app.subscribe === "function");
    var state = AV.app.snapshot();
    AV.assert(state.route, "a route is present");
    AV.assert(state.input, "an input model is present");
    AV.assertEqual(typeof state.showMetrics, "boolean");
    AV.assertEqual(typeof state.speed, "number");
  });

  AV.test(GROUP, "createAppStore seeds from preferences and a seed patch", function () {
    AV.savePrefs({ theme: "dark", speed: 2, arraySize: 40, lastAlgorithmId: "quickSort" });
    var store = AV.createAppStore();
    var state = store.snapshot();
    AV.assertEqual(state.theme, "dark");
    AV.assertEqual(state.speed, 2);
    AV.assertEqual(state.algorithmId, "quickSort", "the last algorithm is restored");
    AV.assertEqual(state.input.size, 40);
    AV.assertEqual(state.input.seed, 20260101);

    var seeded = AV.createAppStore({ theme: "light", algorithmId: null });
    AV.assertEqual(seeded.snapshot().theme, "light", "the seed patch wins");
    AV.assertEqual(seeded.snapshot().speed, 2, "preferences still apply to the rest");
    AV.resetPrefs();
  });

  AV.test(GROUP, "the app store mirrors durable changes into preferences", function () {
    AV.resetPrefs();
    var store = AV.createAppStore();
    store.set({ theme: "dark", showPseudocode: false });
    store.set(function (s) { return { input: AV.defaultInput() }; });
    store.set(function (s) {
      var input = Object.assign({}, s.input, { size: 77 });
      return { input: input };
    });

    var prefs = AV.loadPrefs();
    AV.assertEqual(prefs.theme, "dark");
    AV.assertEqual(prefs.showPseudocode, false);
    AV.assertEqual(prefs.arraySize, 77, "input.size is persisted as arraySize");

    store.set({ theme: "light", showPseudocode: true });
    prefs = AV.loadPrefs();
    AV.assertEqual(prefs.theme, "light");
    AV.resetPrefs();
  });

  AV.test(GROUP, "suspendPersistence freezes preference writes", function () {
    AV.resetPrefs();
    var store = AV.createAppStore();
    store.suspendPersistence = true;
    store.set({ theme: "dark", speed: 4 });
    AV.assertDeepEqual(AV.loadPrefs(), AV.DEFAULT_PREFS, "nothing was written");

    store.suspendPersistence = false;
    store.set({ theme: "light" });
    AV.assertEqual(AV.loadPrefs().theme, "light", "writes resume after the flag clears");
    AV.resetPrefs();
  });

  AV.test(GROUP, "transient UI flags are never persisted", function () {
    AV.resetPrefs();
    var store = AV.createAppStore();
    store.set({ searchOpen: true, sidebarOpen: true, dialog: { title: "hi" }, toast: "x" });
    var prefs = AV.loadPrefs();
    AV.assertEqual(prefs.theme, AV.DEFAULT_PREFS.theme);
    AV.assertEqual(prefs.recentIds.length, 0);
    AV.assertEqual("searchOpen" in prefs, false, "UI-only keys stay out of storage");
    AV.resetPrefs();
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
