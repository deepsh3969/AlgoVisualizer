/**
 * AlgoVisualizer — storage utility
 * Namespaced, failure-tolerant localStorage wrapper.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var PREFIX = "av:";
  var memoryFallback = Object.create(null);
  var available = null;

  function localStorageRef() {
    try {
      if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    } catch (err) {
      return null;
    }
    return null;
  }

  function storageAvailable() {
    if (available !== null) return available;
    var store = localStorageRef();
    if (!store) {
      available = false;
      return available;
    }
    try {
      var probe = PREFIX + "__probe__";
      store.setItem(probe, "1");
      store.removeItem(probe);
      available = true;
    } catch (err) {
      available = false;
    }
    return available;
  }

  function key(name) {
    return PREFIX + name;
  }

  function get(name, fallback) {
    var raw;
    var store = storageAvailable() ? localStorageRef() : null;
    if (store) {
      try {
        raw = store.getItem(key(name));
      } catch (err) {
        raw = memoryFallback[key(name)];
      }
    } else {
      raw = memoryFallback[key(name)];
    }
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function set(name, value) {
    var raw;
    try {
      raw = JSON.stringify(value);
    } catch (err) {
      return false;
    }
    memoryFallback[key(name)] = raw;
    var store = storageAvailable() ? localStorageRef() : null;
    if (!store) return false;
    try {
      store.setItem(key(name), raw);
      return true;
    } catch (err) {
      return false;
    }
  }

  function remove(name) {
    delete memoryFallback[key(name)];
    var store = storageAvailable() ? localStorageRef() : null;
    if (!store) return;
    try {
      store.removeItem(key(name));
    } catch (err) {
      /* no-op */
    }
  }

  function append(name, item, max) {
    var list = get(name, []);
    if (!Array.isArray(list)) list = [];
    list.unshift(item);
    if (max && list.length > max) list.length = max;
    return set(name, list);
  }

  AV.storage = {
    available: storageAvailable,
    get: get,
    set: set,
    remove: remove,
    append: append
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
