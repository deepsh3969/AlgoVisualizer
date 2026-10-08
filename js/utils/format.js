/**
 * AlgoVisualizer — formatting utilities
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** Format milliseconds as a compact duration: 842ms, 1.42s, 2m 03s */
  function duration(ms) {
    if (!isFinite(ms) || ms < 0) return "0ms";
    if (ms < 1000) return Math.round(ms) + "ms";
    if (ms < 60000) return (ms / 1000).toFixed(2) + "s";
    var minutes = Math.floor(ms / 60000);
    var seconds = Math.round((ms % 60000) / 1000);
    return minutes + "m " + pad2(seconds) + "s";
  }

  function durationPrecise(ms) {
    if (!isFinite(ms) || ms < 0) return "0.00 ms";
    if (ms < 1) return ms.toFixed(3) + " ms";
    if (ms < 1000) return ms.toFixed(2) + " ms";
    return (ms / 1000).toFixed(3) + " s";
  }

  function count(n) {
    var v = Number(n);
    if (!isFinite(v)) return "0";
    return String(Math.round(v));
  }

  function percent(value, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((value / total) * 1000) / 10));
  }

  function plural(n, one, many) {
    return n === 1 ? one : many || one + "s";
  }

  function list(arr, conjunction) {
    var items = (arr || []).map(String);
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    var joiner = conjunction || "and";
    if (items.length === 2) return items[0] + " " + joiner + " " + items[1];
    return items.slice(0, -1).join(", ") + ", " + joiner + " " + items[items.length - 1];
  }

  function relativeTime(ts) {
    var diff = Date.now() - Number(ts);
    if (!isFinite(diff)) return "";
    var seconds = Math.round(diff / 1000);
    if (seconds < 45) return "just now";
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.round(hours / 24);
    if (days < 30) return days + "d ago";
    var months = Math.round(days / 30);
    if (months < 12) return months + "mo ago";
    return Math.round(months / 12) + "y ago";
  }

  function clockTime(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function dateTime(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() + " " +
      pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  /**
   * Map a complexity expression to a human grade.
   * Returns one of: excellent | good | moderate | expensive | unknown
   *
   * The expression is unwrapped first so annotated forms such as
   * "O(n) read" and graph forms such as "O(V + E)" grade on their payload
   * instead of falling through to the fallback.
   */
  function complexityGrade(expr) {
    var e = String(expr || "").replace(/\s+/g, "").toLowerCase();
    if (!e) return "unknown";
    return gradePayload(payloadOf(e));
  }

  function payloadOf(e) {
    var start = e.indexOf("(");
    if (start < 0) return e;
    var depth = 0;
    for (var i = start; i < e.length; i++) {
      if (e.charAt(i) === "(") depth += 1;
      else if (e.charAt(i) === ")") {
        depth -= 1;
        if (depth === 0) return e.slice(start + 1, i);
      }
    }
    return e.slice(start + 1);
  }

  function gradePayload(p) {
    if (!p) return "unknown";
    if (p === "1") return "excellent";
    if (p.indexOf("2^n") >= 0 || p.indexOf("n!") >= 0) return "expensive";
    if (
      p.indexOf("n^2") >= 0 || p.indexOf("n²") >= 0 || p.indexOf("n*n") >= 0 ||
      p.indexOf("n^3") >= 0 || p.indexOf("n³") >= 0
    ) return "expensive";
    if (p.indexOf("nlogn") >= 0 || p.indexOf("logv") >= 0 || p.indexOf("(v+e)log") >= 0) {
      return "good"; // linearithmic, in array or graph terms
    }
    if (p === "v" || p === "e" || p === "n" || p.indexOf("v+e") >= 0) return "good";
    if (p.indexOf("log") >= 0) return "excellent";
    if (p.indexOf("n") === 0) return "good";
    if (p.indexOf("n") >= 0) return "moderate";
    return "unknown";
  }

  var GRADE_LABEL = {
    excellent: "Excellent",
    good: "Good",
    moderate: "Moderate",
    expensive: "Expensive",
    unknown: "Unknown"
  };

  var GRADE_WEIGHT = {
    excellent: 25,
    good: 50,
    moderate: 75,
    expensive: 100,
    unknown: 40
  };

  function gradeLabel(grade) {
    return GRADE_LABEL[grade] || GRADE_LABEL.unknown;
  }

  function gradeWeight(grade) {
    return GRADE_WEIGHT[grade] !== undefined ? GRADE_WEIGHT[grade] : GRADE_WEIGHT.unknown;
  }

  /** Format an array as [42, 17, 8] with truncation for long inputs. */
  function arrayPreview(arr, limit) {
    var max = limit === undefined ? 12 : limit;
    if (!Array.isArray(arr)) return "[]";
    var slice = arr.slice(0, max);
    var text = "[" + slice.join(", ");
    if (arr.length > max) text += ", …";
    return text + "]";
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  AV.format = {
    duration: duration,
    durationPrecise: durationPrecise,
    count: count,
    percent: percent,
    plural: plural,
    list: list,
    relativeTime: relativeTime,
    clockTime: clockTime,
    dateTime: dateTime,
    complexityGrade: complexityGrade,
    gradeLabel: gradeLabel,
    gradeWeight: gradeWeight,
    arrayPreview: arrayPreview,
    clamp: clamp
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
