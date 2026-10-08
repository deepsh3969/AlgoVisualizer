/**
 * AlgoVisualizer — execution engine
 *
 * A reusable playback controller that owns a timeline and a live state.
 * Views subscribe to its events; the engine never touches the DOM itself.
 *
 * Emitted events:
 *   engine:load   { definition, input, total, step, state }
 *   engine:step   { step, total, event, message, metrics, state, finished }
 *   engine:status { playing, finished, speed, elapsed, step, total }
 *   engine:reset  { step, state }
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var BASE_DELAY_MS = 520;
  var MAX_STEPS_PER_FRAME = 60;

  var SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4];

  function now() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }

  function createExecutionEngine(bus, options) {
    var opts = options || {};
    var name = opts.name || "default";

    var engine = {
      name: name,
      timeline: null,
      state: null,
      definition: null,
      input: null,
      step: 0,
      total: 0,
      playing: false,
      finished: false,
      speed: 1,
      elapsed: 0,
      destroyed: false
    };

    var rafId = null;
    var lastFrame = 0;
    var accumulator = 0;

    function currentEvent() {
      if (!engine.timeline || engine.step === 0) return null;
      return engine.timeline.events[engine.step - 1];
    }

    function describe() {
      var ev = currentEvent();
      if (!ev) {
        return engine.definition && engine.definition.readyMessage
          ? engine.definition.readyMessage
          : "Ready - press Play or advance a step.";
      }
      return AV.viz.formatEvent(ev, engine.state);
    }

    function emitStatus() {
      bus.emit("engine:status", {
        name: name,
        playing: engine.playing,
        finished: engine.finished,
        speed: engine.speed,
        elapsed: engine.elapsed,
        step: engine.step,
        total: engine.total
      });
    }

    function emitStep() {
      bus.emit("engine:step", {
        name: name,
        step: engine.step,
        total: engine.total,
        event: currentEvent(),
        message: describe(),
        metrics: engine.state ? engine.state.metrics : null,
        state: engine.state,
        finished: engine.finished,
        playing: engine.playing
      });
    }

    function emitReset() {
      bus.emit("engine:reset", {
        name: name,
        step: engine.step,
        state: engine.state,
        total: engine.total
      });
    }

    /* ---- loading ------------------------------------------------------- */

    function load(definition, input) {
      stopLoop();
      engine.definition = definition;
      engine.input = AV.viz.cloneInput(definition, input);
      engine.timeline = AV.viz.buildTimeline(definition, engine.input);
      engine.state = AV.viz.createState(definition, engine.input);
      engine.state.definition = definition;
      engine.step = 0;
      engine.total = engine.timeline.total;
      engine.playing = false;
      engine.finished = false;
      engine.elapsed = 0;
      engine.destroyed = false;

      bus.emit("engine:load", {
        name: name,
        definition: definition,
        input: engine.input,
        total: engine.total,
        step: 0,
        state: engine.state
      });
      emitStep();
      emitStatus();
      return engine;
    }

    /* ---- stepping ------------------------------------------------------ */

    function advanceTo(target) {
      if (!engine.timeline) return false;
      var clamped = AV.format.clamp(target, 0, engine.total);
      if (clamped === engine.step) return false;
      AV.viz.advance(engine.state, engine.timeline, engine.step, clamped);
      engine.step = clamped;
      engine.finished = engine.step >= engine.total;
      return true;
    }

    function stepNext() {
      if (!engine.timeline || engine.step >= engine.total) return false;
      var moved = advanceTo(engine.step + 1);
      if (moved) {
        emitStep();
        if (engine.step >= engine.total) {
          pause();
          emitStatus();
        }
      }
      return moved;
    }

    function stepPrev() {
      if (!engine.timeline || engine.step <= 0) return false;
      var moved = advanceTo(engine.step - 1);
      if (moved) {
        engine.finished = false;
        emitStep();
        emitStatus();
      }
      return moved;
    }

    function seek(target) {
      if (!engine.timeline) return false;
      var moved = advanceTo(target);
      if (moved) {
        emitStep();
        emitStatus();
      }
      return moved;
    }

    function finish() {
      if (engine.step < engine.total) {
        AV.viz.advance(engine.state, engine.timeline, engine.step, engine.total);
        engine.step = engine.total;
      }
      engine.finished = true;
      pause();
      emitStep();
      emitStatus();
    }

    /* ---- playback loop -------------------------------------------------- */

    function play() {
      if (!engine.timeline || engine.destroyed) return false;
      if (engine.step >= engine.total) {
        // Restart from the beginning when replaying a finished run.
        engine.step = 0;
        AV.viz.resetState(engine.state, engine.timeline);
        engine.finished = false;
        emitStep();
      }
      if (engine.playing) return true;
      engine.playing = true;
      engine.finished = false;
      accumulator = 0;
      lastFrame = now();
      emitStatus();
      loop();
      return true;
    }

    function pause() {
      if (!engine.playing) return false;
      engine.playing = false;
      stopLoop();
      emitStatus();
      return true;
    }

    function toggle() {
      return engine.playing ? pause() : play();
    }

    function loop() {
      rafId = requestAnimationFrame(onFrame);
    }

    function onFrame(timestamp) {
      rafId = null;
      if (!engine.playing || engine.destroyed) return;

      var t = typeof timestamp === "number" ? timestamp : now();
      var delta = t - lastFrame;
      lastFrame = t;
      // Ignore pathological gaps (tab was backgrounded).
      if (delta > 1000) delta = 1000;
      accumulator += delta;

      var delay = BASE_DELAY_MS / engine.speed;
      var steps = Math.floor(accumulator / delay);
      if (steps > 0) {
        accumulator -= steps * delay;
        if (steps > MAX_STEPS_PER_FRAME) steps = MAX_STEPS_PER_FRAME;
        var moved = false;
        for (var i = 0; i < steps; i++) {
          if (engine.step >= engine.total) break;
          AV.viz.advance(engine.state, engine.timeline, engine.step, engine.step + 1);
          engine.step += 1;
          moved = true;
        }
        if (moved) emitStep();
      }

      if (engine.step >= engine.total) {
        engine.finished = true;
        engine.playing = false;
        emitStep();
        emitStatus();
        return;
      }

      var before = Math.floor(engine.elapsed / 400);
      engine.elapsed += delta;
      if (Math.floor(engine.elapsed / 400) !== before) emitStatus();
      loop();
    }

    function stopLoop() {
      if (rafId !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(rafId);
      }
      rafId = null;
    }

    /* ---- control -------------------------------------------------------- */

    function reset() {
      stopLoop();
      if (!engine.timeline) return false;
      AV.viz.resetState(engine.state, engine.timeline);
      engine.step = 0;
      engine.playing = false;
      engine.finished = false;
      engine.elapsed = 0;
      emitReset();
      emitStep();
      emitStatus();
      return true;
    }

    function setSpeed(value) {
      var s = Number(value);
      if (!isFinite(s) || s <= 0) return engine.speed;
      engine.speed = s;
      accumulator = 0;
      lastFrame = now();
      emitStatus();
      return engine.speed;
    }

    function destroy() {
      stopLoop();
      engine.destroyed = true;
      engine.playing = false;
      engine.timeline = null;
      engine.state = null;
      engine.definition = null;
    }

    engine.load = load;
    engine.stepNext = stepNext;
    engine.stepPrev = stepPrev;
    engine.seek = seek;
    engine.finish = finish;
    engine.play = play;
    engine.pause = pause;
    engine.toggle = toggle;
    engine.reset = reset;
    engine.setSpeed = setSpeed;
    engine.destroy = destroy;
    engine.describe = describe;
    engine.currentEvent = currentEvent;
    engine.isLoaded = function () { return !!engine.timeline; };

    return engine;
  }

  AV.createExecutionEngine = createExecutionEngine;
  AV.SPEEDS = SPEEDS;
  AV.BASE_DELAY_MS = BASE_DELAY_MS;
})(typeof globalThis !== "undefined" ? globalThis : window);
