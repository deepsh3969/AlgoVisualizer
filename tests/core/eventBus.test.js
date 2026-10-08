/**
 * Event bus tests — subscribe, publish, wildcard, isolation
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});
  var GROUP = "core/eventBus";

  AV.test(GROUP, "delivers payload and event name to handlers", function () {
    var bus = AV.createEventBus();
    var seen = [];
    bus.on("ping", function (payload, type) { seen.push([type, payload]); });
    bus.emit("ping", { n: 1 });
    AV.assertEqual(seen.length, 1);
    AV.assertEqual(seen[0][0], "ping");
    AV.assertDeepEqual(seen[0][1], { n: 1 });
  });

  AV.test(GROUP, "on returns an unsubscribe function", function () {
    var bus = AV.createEventBus();
    var hits = 0;
    var off = bus.on("ping", function () { hits += 1; });
    bus.emit("ping");
    off();
    bus.emit("ping");
    AV.assertEqual(hits, 1, "the first emit only");
    AV.assertEqual(bus.listenerCount("ping"), 0);
  });

  AV.test(GROUP, "off removes a specific handler", function () {
    var bus = AV.createEventBus();
    var a = 0;
    var b = 0;
    var handlerA = function () { a += 1; };
    var handlerB = function () { b += 1; };
    bus.on("x", handlerA);
    bus.on("x", handlerB);
    AV.assertEqual(bus.off("x", handlerA), true, "removing a live handler succeeds");
    AV.assertEqual(bus.off("x", handlerA), false, "removing twice is a no-op");
    bus.emit("x");
    AV.assertEqual(a, 0);
    AV.assertEqual(b, 1, "the other listener still runs");
  });

  AV.test(GROUP, "handlers run in registration order", function () {
    var bus = AV.createEventBus();
    var order = [];
    bus.on("x", function () { order.push(1); });
    bus.on("x", function () { order.push(2); });
    bus.on("x", function () { order.push(3); });
    bus.emit("x");
    AV.assertDeepEqual(order, [1, 2, 3]);
  });

  AV.test(GROUP, "the wildcard listener sees every event", function () {
    var bus = AV.createEventBus();
    var seen = [];
    bus.on("*", function (payload, type) { seen.push(type + ":" + payload); });
    bus.emit("a", "1");
    bus.emit("b", "2");
    bus.emit("a", "3");
    AV.assertDeepEqual(seen, ["a:1", "b:2", "a:3"]);
    AV.assertEqual(bus.listenerCount("*"), 1);
  });

  AV.test(GROUP, "once fires exactly one time", function () {
    var bus = AV.createEventBus();
    var hits = 0;
    bus.once("ping", function () { hits += 1; });
    bus.emit("ping");
    bus.emit("ping");
    bus.emit("ping");
    AV.assertEqual(hits, 1);
    AV.assertEqual(bus.listenerCount("ping"), 0, "a once listener cleans itself up");
  });

  AV.test(GROUP, "clear drops listeners selectively", function () {
    var bus = AV.createEventBus();
    var a = 0;
    var b = 0;
    bus.on("a", function () { a += 1; });
    bus.on("b", function () { b += 1; });
    bus.clear("a");
    bus.emit("a");
    bus.emit("b");
    AV.assertEqual(a, 0);
    AV.assertEqual(b, 1);

    bus.clear();
    bus.emit("b");
    AV.assertEqual(b, 1, "clear() drops everything");
    AV.assertEqual(bus.listenerCount("b"), 0);
  });

  AV.test(GROUP, "a throwing listener cannot break the others", function () {
    var bus = AV.createEventBus();
    var reached = 0;
    var originalError = console.error;
    console.error = function () {}; // silence the isolation report during the test
    try {
      bus.on("x", function () { throw new Error("boom"); });
      bus.on("x", function () { reached += 1; });
      AV.assertNoThrow(function () { bus.emit("x"); });
    } finally {
      console.error = originalError;
    }
    AV.assertEqual(reached, 1, "the healthy listener still ran");
  });

  AV.test(GROUP, "emit returns the payload and tolerates no listeners", function () {
    var bus = AV.createEventBus();
    var payload = { keep: true };
    AV.assertEqual(bus.emit("nobody", payload), payload);
  });

  AV.test(GROUP, "invalid subscriptions are rejected", function () {
    var bus = AV.createEventBus();
    AV.assertThrows(function () { bus.on("", function () {}); }, "empty event name");
    AV.assertThrows(function () { bus.on(null, function () {}); }, "missing event name");
    AV.assertThrows(function () { bus.on("x", null); }, "missing handler");
    AV.assertThrows(function () { bus.on("x", "nope"); }, "handler must be a function");
    AV.assertEqual(bus.listenerCount("x"), 0, "nothing was registered");
  });

  AV.test(GROUP, "the shared bus is ready for the app", function () {
    AV.assert(AV.bus, "a default bus must exist");
    AV.assert(typeof AV.bus.on === "function");
    AV.assert(typeof AV.bus.emit === "function");
    var hits = 0;
    var off = AV.bus.on("suite:probe", function () { hits += 1; });
    AV.bus.emit("suite:probe");
    off();
    AV.assertEqual(hits, 1);
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
