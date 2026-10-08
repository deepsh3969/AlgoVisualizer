/**
 * AlgoVisualizer — data structure catalog + registration
 *
 * Structure definitions mirror algorithm definitions: they expose
 * run(input, emit) so the same timeline / checkpoint / step-through
 * machinery drives every visualization. The only difference is the
 * input contract:
 *
 *   { operation, array, value, index, headId, rootId }
 *
 * `array` is the storage the renderer paints. For the list and tree the
 * storage is a node table of { id, value, next } / { id, value, left, right }
 * entries that the renderer walks from its head or root pointer, so inserts
 * and deletes never shift existing entries.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var REQUIRED_FIELDS = [
    "id",
    "name",
    "category",
    "viz",
    "run",
    "pseudocode",
    "complexity",
    "operations",
    "explanation"
  ];

  var KNOWN_VIZ = { array: 1, stack: 1, queue: 1, linked: 1, tree: 1 };

  /**
   * Validate and register a data structure definition.
   * Malformed definitions fail loudly here instead of breaking the UI later.
   */
  function registerStructure(def) {
    if (!def || typeof def !== "object") {
      throw new TypeError("Structure definition must be an object");
    }
    for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
      if (!def[REQUIRED_FIELDS[i]]) {
        throw new Error(
          "Structure \"" + (def.id || "?") + "\" is missing required field: " + REQUIRED_FIELDS[i]
        );
      }
    }
    if (typeof def.run !== "function") {
      throw new Error("Structure \"" + def.id + "\" must implement run(input, emit)");
    }
    if (!Array.isArray(def.pseudocode)) {
      throw new Error("Structure \"" + def.id + "\" must declare a pseudocode array");
    }
    if (!Array.isArray(def.operations) || def.operations.length === 0) {
      throw new Error("Structure \"" + def.id + "\" must declare at least one operation");
    }
    if (!KNOWN_VIZ[def.viz]) {
      throw new Error(
        "Structure \"" + def.id + "\" declares unknown viz \"" + def.viz +
        "\" (expected one of array, stack, queue, linked, tree)"
      );
    }
    if (def.category !== "structures") {
      throw new Error("Structure \"" + def.id + "\" must use the structures category");
    }
    for (var j = 0; j < def.operations.length; j++) {
      var op = def.operations[j];
      if (!op || !op.id || !op.label || !op.signature) {
        throw new Error(
          "Structure \"" + def.id + "\" operation #" + (j + 1) +
          " needs id, label and signature"
        );
      }
      if (!Array.isArray(op.fields)) op.fields = [];
    }
    return AV.structures.register(def);
  }

  /** Look up an operation descriptor on a structure definition. */
  function findOperation(def, operationId) {
    if (!def || !Array.isArray(def.operations)) return null;
    for (var i = 0; i < def.operations.length; i++) {
      if (def.operations[i].id === operationId) return def.operations[i];
    }
    return null;
  }

  /* ---------------------------------------------------------------------
   * Input builders
   * ------------------------------------------------------------------- */

  var nodeSeq = 0;

  function nextNodeId(prefix) {
    nodeSeq += 1;
    return prefix + nodeSeq;
  }

  /**
   * Build a linked-list input: a node table plus the id of the head node.
   * Values are linked in order so the renderer can walk head -> next.
   */
  function linkedListInput(values) {
    var list = Array.isArray(values) ? values : [];
    var nodes = [];
    for (var i = 0; i < list.length; i++) {
      nodes.push({ id: nextNodeId("l"), value: list[i], next: null });
    }
    for (var k = 0; k + 1 < nodes.length; k++) {
      nodes[k].next = nodes[k + 1].id;
    }
    return {
      operation: "search",
      array: nodes,
      headId: nodes.length ? nodes[0].id : null,
      value: list.length ? list[list.length - 1] : 0
    };
  }

  /**
   * Build a binary search tree input: a node table plus the id of the root.
   * Values are inserted in order so the shape matches a real insertion.
   */
  function binarySearchTreeInput(values) {
    var list = Array.isArray(values) ? values : [];
    var nodes = [];
    var rootId = null;

    for (var i = 0; i < list.length; i++) {
      var node = { id: nextNodeId("t"), value: list[i], left: null, right: null };
      if (!rootId) {
        rootId = node.id;
      } else {
        var parentId = rootId;
        var parent = null;
        var guard = 0;
        while (guard < 1000) {
          parent = findById(nodes, parentId);
          if (!parent) break;
          if (node.value < parent.value) {
            if (parent.left === null) { parent.left = node.id; break; }
            parentId = parent.left;
          } else {
            if (parent.right === null) { parent.right = node.id; break; }
            parentId = parent.right;
          }
          guard += 1;
        }
      }
      nodes.push(node);
    }

    return {
      operation: "search",
      array: nodes,
      rootId: rootId,
      value: list.length ? list[list.length - 1] : 0
    };
  }

  function findById(nodes, id) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes[i];
    }
    return null;
  }

  function indexOfId(nodes, id) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return i;
    }
    return -1;
  }

  AV.registerStructure = registerStructure;
  AV.findOperation = findOperation;
  AV.linkedListInput = linkedListInput;
  AV.binarySearchTreeInput = binarySearchTreeInput;
  AV.findNodeById = findById;
  AV.indexOfNodeId = indexOfId;
})(typeof globalThis !== "undefined" ? globalThis : window);
