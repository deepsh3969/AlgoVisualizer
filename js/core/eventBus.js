/**
 * AlgoVisualizer — event bus
 * Minimal pub/sub with wildcard support and safe error isolation.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function createEventBus() {
    var listeners = new Map();

    function on(type, handler) {
      if (typeof type !== "string" || !type) {
        throw new TypeError("EventBus.on requires an event name");
      }
      if (typeof handler !== "function") {
        throw new TypeError("EventBus.on requires a handler function");
      }
      var list = listeners.get(type);
      if (!list) {
        list = [];
        listeners.set(type, list);
      }
      list.push(handler);
      return function off() {
        unsubscribe(type, handler);
      };
    }

    function unsubscribe(type, handler) {
      var list = listeners.get(type);
      if (!list) return false;
      var idx = list.indexOf(handler);
      if (idx >= 0) {
        list.splice(idx, 1);
        if (list.length === 0) listeners.delete(type);
        return true;
      }
      return false;
    }

    function emit(type, payload) {
      var list = listeners.get(type);
      if (list) {
        for (var i = 0; i < list.length; i++) {
          try {
            list[i](payload, type);
          } catch (err) {
            reportListenerError(err, type);
          }
        }
      }
      var wild = listeners.get("*");
      if (wild) {
        for (var j = 0; j < wild.length; j++) {
          try {
            wild[j](payload, type);
          } catch (err2) {
            reportListenerError(err2, "*");
          }
        }
      }
      return payload;
    }

    function once(type, handler) {
      var off = on(type, function wrapped(payload, t) {
        off();
        handler(payload, t);
      });
      return off;
    }

    function clear(type) {
      if (type === undefined) {
        listeners.clear();
      } else {
        listeners.delete(type);
      }
    }

    function listenerCount(type) {
      var list = listeners.get(type);
      return list ? list.length : 0;
    }

    return {
      on: on,
      off: unsubscribe,
      once: once,
      emit: emit,
      clear: clear,
      listenerCount: listenerCount
    };
  }

  function reportListenerError(err, type) {
    if (typeof console !== "undefined" && console.error) {
      console.error("[AlgoVisualizer] listener for \"" + type + "\" threw:", err);
    }
  }

  AV.createEventBus = createEventBus;
  AV.bus = createEventBus();
})(typeof globalThis !== "undefined" ? globalThis : window);
