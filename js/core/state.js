/**
 * AlgoVisualizer — application state
 *
 * A tiny observable store plus the hash router helpers the views share.
 * Deliberately dependency-free and DOM-free so the whole thing can be tested
 * in Node: views subscribe, the router writes, preferences persist.
 *
 *   var store = AV.createStore({ count: 0 });
 *   var off = store.subscribe(function (next, prev) { render(next, prev); });
 *   store.set({ count: 1 });
 *
 * Routes are hash based ("#/algorithm/bubbleSort") so the app works from
 * file:// as well as from any static host.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  /* ------------------------------------------------------------------------
   * Store
   * ---------------------------------------------------------------------- */

  /**
   * Create an observable store.
   * `set` performs a shallow merge; subscribers receive (next, prev, meta).
   * The state object handed out by get() is a live reference - callers that
   * need a stable copy should call snapshot().
   */
  function createStore(initialState, options) {
    var opts = options || {};
    var name = opts.name || "store";
    var state = assign({}, initialState || {});
    var listeners = [];
    var batchDepth = 0;
    var pending = false;
    var pendingPrev = null;

    function get() { return state; }

    function snapshot() { return assign({}, state); }

    function subscribe(fn) {
      if (typeof fn !== "function") {
        throw new TypeError(name + ".subscribe requires a function");
      }
      listeners.push(fn);
      return function unsubscribe() {
        var idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }

    /**
     * Dispatch (next, prev, meta). Inside a batch the notification is
     * deferred and `prev` is the state as it stood before the batch started.
     */
    function emit(prev, meta) {
      if (batchDepth > 0) {
        pending = true;
        if (pendingPrev === null) pendingPrev = prev;
        return;
      }
      var current = state;
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](current, prev, meta);
      }
    }

    /**
     * Shallow-merge a patch and notify. Returns the resulting state.
     * Passing a function lets a caller derive the patch from the current
     * state without racing against other writers.
     */
    function set(patch, meta) {
      var next = typeof patch === "function" ? patch(state) : patch;
      if (!next) return state;
      var prev = state;
      var merged = assign({}, state, next);

      var changed = false;
      for (var k in merged) {
        if (!Object.prototype.hasOwnProperty.call(prev, k) || prev[k] !== merged[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return state;

      state = merged;
      emit(prev, meta || {});
      return state;
    }

    /** Run several writes as a single notification. */
    function batch(fn) {
      var error = null;
      batchDepth += 1;
      try {
        fn(set);
      } catch (err) {
        error = err;
      } finally {
        batchDepth -= 1;
      }
      if (batchDepth === 0 && pending) {
        pending = false;
        var prev = pendingPrev;
        pendingPrev = null;
        emit(prev, { batch: true });
      }
      if (error) throw error;
      return state;
    }

    function reset(next, meta) {
      var prev = state;
      state = assign({}, next === undefined ? initialState : next);
      emit(prev, meta || { reset: true });
      return state;
    }

    return {
      name: name,
      get: get,
      snapshot: snapshot,
      subscribe: subscribe,
      set: set,
      batch: batch,
      reset: reset,
      listenerCount: function () { return listeners.length; }
    };
  }

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
      }
    }
    return target;
  }

  /* ------------------------------------------------------------------------
   * Routes
   * ---------------------------------------------------------------------- */

  /**
   * Every route the app knows about, in navigation order.
   * `hash` is the path after "#/", `label` is the header link text.
   */
  var ROUTES = [
    { name: "home", path: "", label: "Home" },
    { name: "algorithms", path: "algorithms", label: "Algorithms" },
    { name: "structures", path: "structures", label: "Structures" },
    { name: "learning", path: "learning", label: "Learn" },
    { name: "quiz", path: "quiz", label: "Quiz" },
    { name: "benchmark", path: "benchmark", label: "Benchmarks" },
    { name: "compare", path: "compare", label: "Compare" }
  ];

  function routeByName(name) {
    for (var i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].name === name) return ROUTES[i];
    }
    return null;
  }

  function normalizeHash(hash) {
    var raw = String(hash === undefined || hash === null ? "" : hash);
    var cut = raw.split("?")[0];
    if (cut.charAt(0) === "#") cut = cut.slice(1);
    if (cut.charAt(0) === "/") cut = cut.slice(1);
    while (cut.charAt(0) === "/") cut = cut.slice(1);
    while (cut.charAt(cut.length - 1) === "/") cut = cut.slice(0, -1);
    return cut;
  }

  /**
   * Parse a location hash into a route descriptor.
   *   "#/algorithm/bubbleSort" -> { name: "algorithm", segments: ["algorithm","bubbleSort"], id: "bubbleSort" }
   * Detail routes always carry exactly one id; anything else is treated as a
   * stale link and falls back to the section index, so a broken deep link
   * never blanks the page.
   */
  function parseHash(hash) {
    var path = normalizeHash(hash);
    var segments = path ? path.split("/").filter(function (s) { return s.length > 0; }) : [];
    var head = segments.length ? segments[0] : "";
    var detail = segments.length === 2 && (head === "algorithm" || head === "structure" || head === "learning");

    var match = null;
    if (detail && head === "learning") match = { name: "lesson" };
    else if (detail) match = { name: head };
    else {
      for (var i = 0; i < ROUTES.length; i++) {
        if (ROUTES[i].path && ROUTES[i].path === head) {
          match = { name: ROUTES[i].name };
          break;
        }
      }
    }
    if (!match) match = { name: "home" };

    return {
      name: match.name,
      segments: segments,
      id: segments.length > 1 ? segments[1] : null,
      path: path
    };
  }

  /** Build a hash from a route name and optional id. */
  function buildHash(name, id) {
    var route = routeByName(name);
    var base = route ? route.path : "";
    if (name === "algorithm" || name === "structure") base = name;
    if (name === "lesson") base = "learning";
    if (base && id !== undefined && id !== null && id !== "") {
      return "#/" + base + "/" + encodeURIComponent(String(id));
    }
    return base ? "#/" + base : "#/";
  }

  /* ------------------------------------------------------------------------
   * Preferences (persisted)
   * ---------------------------------------------------------------------- */

  var PREFS_KEY = "prefs";

  var DEFAULT_PREFS = {
    theme: "system",
    speed: 1,
    reducedMotion: false,
    showMetrics: true,
    showPseudocode: true,
    arraySize: 25,
    seed: 20260101,
    recentIds: [],
    customArray: "",
    lastAlgorithmId: null
  };

  function loadPrefs() {
    var stored = AV.storage.get(PREFS_KEY, null);
    if (!stored || typeof stored !== "object") return assign({}, DEFAULT_PREFS);
    var merged = assign({}, DEFAULT_PREFS, stored);
    if (AV.SPEEDS && AV.SPEEDS.indexOf(merged.speed) < 0) merged.speed = 1;
    if (!Array.isArray(merged.recentIds)) merged.recentIds = [];
    return merged;
  }

  function savePrefs(prefs) {
    AV.storage.set(PREFS_KEY, assign({}, DEFAULT_PREFS, prefs));
    return prefs;
  }

  function resetPrefs() {
    AV.storage.remove(PREFS_KEY);
    return assign({}, DEFAULT_PREFS);
  }

  /** Record a recently opened definition, most recent first, capped. */
  function rememberRecent(prefs, id, cap) {
    if (!id) return prefs ? prefs.recentIds : [];
    var max = cap || 8;
    var list = (prefs && prefs.recentIds ? prefs.recentIds : []).slice();
    var at = list.indexOf(id);
    if (at >= 0) list.splice(at, 1);
    list.unshift(id);
    if (list.length > max) list.length = max;
    return list;
  }

  /* ------------------------------------------------------------------------
   * Default application state
   * ---------------------------------------------------------------------- */

  function defaultInput() {
    return {
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
    };
  }

  function defaultState() {
    return {
      route: parseHash(""),
      theme: "system",
      speed: 1,
      reducedMotion: false,
      showMetrics: true,
      showPseudocode: true,
      sidebarOpen: false,
      searchOpen: false,
      searchQuery: "",
      dialog: null,
      toast: null,
      algorithmId: null,
      structureId: null,
      lessonId: null,
      compareIds: [],
      benchmarkCategory: "sorting",
      quizCategory: "all",
      input: defaultInput(),
      recentIds: []
    };
  }

  /** Build the app store, optionally seeded with persisted preferences. */
  function createAppStore(seed) {
    var prefs = loadPrefs();
    var initial = defaultState();
    initial.theme = prefs.theme;
    initial.speed = prefs.speed;
    initial.reducedMotion = prefs.reducedMotion;
    initial.showMetrics = prefs.showMetrics;
    initial.showPseudocode = prefs.showPseudocode;
    initial.recentIds = prefs.recentIds;
    initial.input.size = prefs.arraySize;
    initial.input.seed = prefs.seed;
    initial.algorithmId = prefs.lastAlgorithmId;

    var store = createStore(assign({}, initial, seed || {}), { name: "app" });

    // Mirror the durable subset of the state into preferences on every change.
    store.subscribe(function (next) {
      if (store.suspendPersistence) return;
      savePrefs({
        theme: next.theme,
        speed: next.speed,
        reducedMotion: next.reducedMotion,
        showMetrics: next.showMetrics,
        showPseudocode: next.showPseudocode,
        arraySize: next.input.size,
        seed: next.input.seed,
        recentIds: next.recentIds,
        lastAlgorithmId: next.algorithmId
      });
    });

    store.suspendPersistence = false;
    return store;
  }

  AV.createStore = createStore;
  AV.createAppStore = createAppStore;
  AV.ROUTES = ROUTES;
  AV.routeByName = routeByName;
  AV.parseHash = parseHash;
  AV.buildHash = buildHash;
  AV.normalizeHash = normalizeHash;
  AV.defaultInput = defaultInput;
  AV.defaultState = defaultState;
  AV.DEFAULT_PREFS = DEFAULT_PREFS;
  AV.loadPrefs = loadPrefs;
  AV.savePrefs = savePrefs;
  AV.resetPrefs = resetPrefs;
  AV.rememberRecent = rememberRecent;
  AV.app = createAppStore();
})(typeof globalThis !== "undefined" ? globalThis : window);
