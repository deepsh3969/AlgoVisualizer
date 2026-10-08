/**
 * AlgoVisualizer - playback controls
 *
 * The bar under the stage: restart, step back, play/pause, step forward,
 * jump to the end, a seekable progress track, the speed selector and the
 * current-operation readout.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var dom = AV.dom;

  function create(bus, opts) {
    var o = opts || {};
    var engine = o.engine;
    var els = {};
    var offs = [];
    var currentStep = 0;
    var currentTotal = 0;

    function iconButton(act, iconName, label, cls) {
      return dom.el("button", {
        class: cls || "step-btn", type: "button", attrs: { "aria-label": label, "data-act": act }
      }, dom.icon(iconName));
    }

    var playBtn = iconButton("toggle", "play", "Play", "play-btn");
    var prevBtn = iconButton("prev", "stepBack", "Step back");
    var nextBtn = iconButton("next", "stepForward", "Step forward");
    var resetBtn = iconButton("reset", "restart", "Restart");
    var finishBtn = iconButton("finish", "skipForward", "Jump to the end");

    var stepText = dom.el("span", { class: "progress-step", text: "Step 0 of 0" });
    var pctText = dom.el("span", { class: "progress-pct", text: "0%" });
    var fill = dom.el("div", { class: "progress-fill", style: { width: "0%" } });
    var track = dom.el("div", {
      class: "progress-track", attrs: { role: "slider", tabindex: "0",
        "aria-label": "Seek", "aria-valuemin": "0", "aria-valuenow": "0", "aria-valuemax": "0" }
    }, [fill]);

    var speed = dom.el("select", { class: "select", attrs: { "aria-label": "Playback speed" } },
      (AV.SPEEDS || [1]).map(function (s) {
        return dom.el("option", { value: s, text: s + "\u00D7" + (s === 1 ? " (normal)" : "") });
      }));
    speed.value = "1";

    var opLabel = dom.el("span", { class: "op-label", text: "Step" });
    var opText = dom.el("span", { class: "op-text", text: "Ready" });

    var rootEl = dom.el("div", { class: "controls" }, [
      dom.el("div", { class: "controls-group" }, [resetBtn, prevBtn, playBtn, nextBtn, finishBtn]),
      dom.el("div", { class: "progress-wrap" }, [
        dom.el("div", { class: "progress-meta" }, [stepText, pctText]),
        track
      ]),
      dom.el("div", { class: "speed-control" }, [speed]),
      dom.el("div", { class: "op-readout" }, [opLabel, opText])
    ]);

    function act(name) {
      if (!engine) return;
      if (name === "toggle") engine.toggle();
      else if (name === "prev") engine.stepPrev();
      else if (name === "next") engine.stepNext();
      else if (name === "reset") engine.reset();
      else if (name === "finish") engine.finish();
    }

    rootEl.addEventListener("click", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-act]") : null;
      if (btn && rootEl.contains(btn)) act(btn.getAttribute("data-act"));
    });

    function seekFromEvent(event) {
      if (!engine || !engine.total) return;
      var rect = track.getBoundingClientRect();
      var ratio = AV.format.clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      engine.seek(Math.round(ratio * engine.total));
    }
    track.addEventListener("pointerdown", function (event) {
      seekFromEvent(event);
      track.setPointerCapture && track.setPointerCapture(event.pointerId);
    });
    track.addEventListener("keydown", function (event) {
      if (!engine) return;
      if (event.key === "ArrowRight") { event.preventDefault(); engine.stepNext(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); engine.stepPrev(); }
      else if (event.key === "Home") { event.preventDefault(); engine.reset(); }
      else if (event.key === "End") { event.preventDefault(); engine.finish(); }
      else if (event.key === " " || event.key === "Enter") { event.preventDefault(); engine.toggle(); }
    });

    speed.addEventListener("change", function () {
      var value = Number(speed.value);
      if (engine) engine.setSpeed(value);
      if (o.onSpeed) o.onSpeed(value);
    });

    function updateStatus(payload) {
      if (!payload) return;
      currentStep = payload.step || 0;
      currentTotal = payload.total || 0;
      playBtn.setAttribute("aria-label", payload.playing ? "Pause" : "Play");
      dom.fill(playBtn, dom.icon(payload.playing ? "pause" : "play"));

      var disabled = !currentTotal;
      [prevBtn, nextBtn, finishBtn, resetBtn].forEach(function (b) {
        b.disabled = disabled;
      });
      prevBtn.disabled = disabled || currentStep <= 0;
      nextBtn.disabled = disabled || currentStep >= currentTotal;
      finishBtn.disabled = disabled || currentStep >= currentTotal;
      track.setAttribute("aria-valuenow", String(currentStep));
      track.setAttribute("aria-valuemax", String(currentTotal));

      var pct = currentTotal ? Math.round((currentStep / currentTotal) * 100) : 0;
      fill.style.width = pct + "%";
      dom.setText(stepText, "Step " + AV.format.count(currentStep) + " of " + AV.format.count(currentTotal));
      dom.setText(pctText, pct + "%");
    }

    function updateStep(payload) {
      if (!payload) return;
      updateStatus(payload);
      dom.setText(opText, payload.message || "Ready");
    }

    offs.push(bus.on("engine:status", updateStatus));
    offs.push(bus.on("engine:step", updateStep));

    return {
      el: rootEl,
      setEngine: function (next) { engine = next; },
      setSpeed: function (value) { speed.value = String(value); },
      destroy: function () {
        offs.forEach(function (off) { off(); });
        offs = [];
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
      }
    };
  }

  AV.ui = AV.ui || {};
  AV.ui.controls = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
