/**
 * Execution engine tests — loading, stepping, seeking, speed, playback loop
 *
 * requestAnimationFrame is stubbed with a queue we drive by hand so playback
 * is deterministic in Node. The browser keeps its own rAF; this file only
 * installs the shim when one is missing.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var GROUP = "core/executionEngine";

  /* ---- deterministic frame pump ---------------------------------------- */

  var pending = [];
  var clock = null;

  // Always drive frames by hand so playback is identical in Node and in the
  // browser harness: real timers would make these assertions time-dependent.
  root.requestAnimationFrame = function (cb) {
    pending.push(cb);
    return pending.length;
  };
  root.cancelAnimationFrame = function () {
    pending.length = 0;
  };

  function realNow() {
    return (typeof performance !== "undefined" && performance.now)
      ? performance.now()
      : Date.now();
  }

  /**
   * Advance a virtual clock by deltaMs and hand the new timestamp to every
   * frame scheduled since the last pump. The clock never runs backwards
   * relative to performance.now(), so the engine sees a positive delta.
   */
  function pump(deltaMs) {
    var delta = deltaMs === undefined ? 700 : deltaMs;
    var real = realNow();
    if (clock === null || clock < real) clock = real;
    clock += delta;
    var list = pending.slice();
    pending.length = 0;
    list.forEach(function (cb) { cb(clock); });
  }

  function flush() {
    var guard = 0;
    while (pending.length && guard < 500) {
      pump(700);
      guard += 1;
    }
  }

  /* ---- helpers ---------------------------------------------------------- */

  function newEngine(name) {
    return AV.createExecutionEngine(AV.createEventBus(), { name: name || "suite" });
  }

  function sortInput() {
    return { array: [7, 3, 9, 1, 5] };
  }

  function loadEngine(engine) {
    engine.load(AV.algorithms.get("bubbleSort"), sortInput());
    return engine;
  }

  function track(bus, type, sink) {
    bus.on(type, function (payload) { sink.push(payload); });
  }

  AV.test(GROUP, "speeds and base delay are exposed", function () {
    AV.assert(Array.isArray(AV.SPEEDS) && AV.SPEEDS.length >= 4);
    AV.assert(AV.SPEEDS.indexOf(1) >= 0, "1x is the default pace");
    AV.assert(AV.SPEEDS.every(function (s) { return s > 0; }), "no zero speed");
    AV.assert(AV.BASE_DELAY_MS > 0);
  });

  AV.test(GROUP, "a fresh engine starts unloaded", function () {
    var engine = newEngine();
    AV.assert(!engine.isLoaded());
    AV.assertEqual(engine.step, 0);
    AV.assertEqual(engine.total, 0);
    AV.assertEqual(engine.playing, false);
    AV.assertEqual(engine.speed, 1);
    AV.assertEqual(engine.stepNext(), false, "nothing to step through yet");
    AV.assertEqual(engine.stepPrev(), false);
    AV.assertEqual(engine.reset(), false);
    AV.assert(engine.describe().length > 0, "an unloaded engine still answers");
  });

  AV.test(GROUP, "load builds the timeline and announces it", function () {
    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, { name: "loader" });
    var loads = [];
    var steps = [];
    var statuses = [];
    track(bus, "engine:load", loads);
    track(bus, "engine:step", steps);
    track(bus, "engine:status", statuses);

    engine.load(AV.algorithms.get("bubbleSort"), sortInput());

    AV.assert(engine.isLoaded());
    AV.assertEqual(engine.step, 0);
    AV.assert(engine.total > 0, "a timeline exists");
    AV.assertEqual(loads.length, 1);
    AV.assertEqual(loads[0].name, "loader");
    AV.assertEqual(loads[0].total, engine.total);
    AV.assertEqual(steps.length, 1, "load emits an initial step");
    AV.assertEqual(steps[0].step, 0);
    AV.assert(!!steps[0].state, "the renderer gets a state to paint");
    AV.assertEqual(statuses.length, 1);
    AV.assertEqual(statuses[0].playing, false);

    AV.assert(engine.describe().length > 0, "ready narration is available");
    AV.assert(engine.currentEvent() === null, "nothing has run yet");
  });

  AV.test(GROUP, "stepNext walks the timeline in order", function () {
    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, {});
    var steps = [];
    track(bus, "engine:step", steps);
    loadEngine(engine);

    AV.assert(engine.stepNext());
    AV.assertEqual(engine.step, 1);
    AV.assert(engine.currentEvent(), "an event is exposed after stepping");

    var seen = 1;
    while (engine.step < engine.total) {
      AV.assert(engine.stepNext(), "steps keep working until the end");
      seen += 1;
    }
    AV.assertEqual(seen, engine.total);
    AV.assertEqual(engine.step, engine.total);
    AV.assertEqual(engine.finished, true, "the run reports completion");
    AV.assertEqual(steps.length, engine.total + 1, "one message per step plus the load");
    AV.assertEqual(engine.stepNext(), false, "no step past the end");
  });

  AV.test(GROUP, "stepPrev rewinds", function () {
    var engine = newEngine();
    loadEngine(engine);
    AV.assertEqual(engine.stepPrev(), false, "already at the start");

    engine.seek(3);
    AV.assertEqual(engine.step, 3);
    AV.assert(engine.stepPrev());
    AV.assertEqual(engine.step, 2);
    AV.assertEqual(engine.finished, false, "rewinding un-finishes the run");
    engine.seek(0);
    AV.assertEqual(engine.stepPrev(), false);
  });

  AV.test(GROUP, "seek jumps and clamps", function () {
    var engine = newEngine();
    loadEngine(engine);
    AV.assert(engine.seek(2));
    AV.assertEqual(engine.step, 2);
    AV.assert(!engine.seek(2), "seeking to the same step is a no-op");

    engine.seek(9999);
    AV.assertEqual(engine.step, engine.total, "clamped to the end");
    AV.assertEqual(engine.finished, true);

    engine.seek(-5);
    AV.assertEqual(engine.step, 0, "clamped to the start");
    AV.assertEqual(engine.finished, false);
  });

  AV.test(GROUP, "finish jumps to the last event", function () {
    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, {});
    var steps = [];
    track(bus, "engine:step", steps);
    loadEngine(engine);

    engine.finish();
    AV.assertEqual(engine.step, engine.total);
    AV.assertEqual(engine.finished, true);
    AV.assertEqual(engine.playing, false);
    var last = steps[steps.length - 1];
    AV.assertEqual(last.step, engine.total);
    AV.assertEqual(last.finished, true);
    AV.assert(!!last.message, "the final message is narrated");
  });

  AV.test(GROUP, "reset returns to step zero and announces it", function () {
    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, {});
    var resets = [];
    track(bus, "engine:reset", resets);
    loadEngine(engine);
    engine.finish();

    AV.assert(engine.reset());
    AV.assertEqual(engine.step, 0);
    AV.assertEqual(engine.finished, false);
    AV.assertEqual(engine.elapsed, 0);
    AV.assertEqual(resets.length, 1);
    AV.assertEqual(resets[0].step, 0);
    AV.assertEqual(resets[0].total, engine.total);
    AV.assertDeepEqual(engine.state.array, sortInput().array, "back to the input");
    AV.assertEqual(engine.state.metrics.steps, 0);
  });

  AV.test(GROUP, "setSpeed accepts valid paces and rejects nonsense", function () {
    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, {});
    var statuses = [];
    track(bus, "engine:status", statuses);

    AV.assertEqual(engine.setSpeed(2), 2);
    AV.assertEqual(engine.speed, 2);
    AV.assertEqual(statuses.length, 1, "a speed change is announced");
    AV.assertEqual(engine.setSpeed(0.25), 0.25);
    AV.assertEqual(engine.setSpeed("4"), 4, "a numeric string is accepted");
    AV.assertEqual(engine.speed, 4);

    AV.assertEqual(engine.setSpeed(0), 4, "zero keeps the previous speed");
    AV.assertEqual(engine.setSpeed(-1), 4, "a negative pace is refused");
    AV.assertEqual(engine.setSpeed(NaN), 4, "a non-numeric pace is refused");
    AV.assertEqual(engine.speed, 4, "unchanged after a bad value");
  });

  AV.test(GROUP, "play, pause and toggle drive playback", function () {
    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, {});
    var statuses = [];
    track(bus, "engine:status", statuses);
    loadEngine(engine);

    AV.assert(engine.play(), "play starts");
    AV.assertEqual(engine.playing, true);
    AV.assert(engine.play(), "play while playing is a no-op that reports true");

    AV.assert(engine.pause());
    AV.assertEqual(engine.playing, false);
    AV.assertEqual(engine.pause(), false, "already paused");

    AV.assert(engine.toggle(), "toggle resumes");
    AV.assertEqual(engine.playing, true);
    AV.assert(engine.toggle());
    AV.assertEqual(engine.playing, false);

    var playing = statuses.filter(function (s) { return s.playing; }).length;
    var paused = statuses.filter(function (s) { return !s.playing; }).length;
    AV.assert(playing >= 2 && paused >= 2, "status messages track both transitions");

    engine.pause();
    pending.length = 0;
  });

  AV.test(GROUP, "the playback loop advances and then finishes", function () {
    var bus = AV.createEventBus();
    var engine = AV.createExecutionEngine(bus, {});
    var steps = [];
    track(bus, "engine:step", steps);
    loadEngine(engine);

    engine.setSpeed(4);
    engine.play();
    flush();

    AV.assertEqual(engine.step, engine.total, "played through to the end");
    AV.assertEqual(engine.finished, true);
    AV.assertEqual(engine.playing, false, "the loop stops itself");
    AV.assert(steps.length > 1, "several steps were reported");

    engine.destroy();
    pending.length = 0;
  });

  AV.test(GROUP, "replaying a finished run restarts from the beginning", function () {
    var engine = newEngine();
    loadEngine(engine);
    engine.finish();
    AV.assertEqual(engine.step, engine.total);

    engine.play();
    AV.assertEqual(engine.step, 0, "replay rewinds first");
    AV.assertEqual(engine.playing, true);
    AV.assertEqual(engine.finished, false);
    AV.assert(engine.pause());

    engine.destroy();
    pending.length = 0;
  });

  AV.test(GROUP, "speed changes shorten the delay", function () {
    var engine = newEngine();
    loadEngine(engine);
    engine.setSpeed(4);
    engine.play();

    // One frame of ~1000ms would move 7 steps at 4x (130ms each).
    pump(400);
    AV.assert(engine.step > 0, "the frame moved the run forward");
    var atFast = engine.step;

    engine.pause();
    engine.destroy();
    pending.length = 0;
    AV.assert(atFast <= engine.total);
  });

  AV.test(GROUP, "destroy tears the engine down", function () {
    var engine = newEngine();
    loadEngine(engine);
    engine.destroy();
    AV.assert(engine.destroyed);
    AV.assertEqual(engine.playing, false);
    AV.assertEqual(engine.timeline, null);
    AV.assertEqual(engine.state, null);
    AV.assertEqual(engine.definition, null);
    AV.assertEqual(engine.play(), false, "a destroyed engine cannot play");
    AV.assertEqual(engine.stepNext(), false);
    pending.length = 0;
  });

  AV.test(GROUP, "engines are independent of each other", function () {
    var a = newEngine("a");
    var b = newEngine("b");
    loadEngine(a);
    loadEngine(b);
    a.finish();
    AV.assertEqual(a.step, a.total);
    AV.assertEqual(b.step, 0, "the other engine is untouched");
    AV.assert(b.state.array !== a.state.array, "separate states");
    AV.assertDeepEqual(b.state.array, sortInput().array);
    a.destroy();
    b.destroy();
    pending.length = 0;
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
