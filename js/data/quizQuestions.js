/**
 * AlgoVisualizer — quiz question bank
 *
 * One correct answer per question, always with an explanation so a wrong
 * click turns into a lesson instead of a dead end.
 *
 * Fields:
 *   related    - id of the learning module that covers this idea
 *   definition - id of the algorithm / structure to open for a live demo
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var DIFFICULTIES = ["easy", "medium", "hard"];
  var CATEGORIES = [
    "foundations",
    "sorting",
    "searching",
    "patterns",
    "graphs",
    "recursion",
    "structures"
  ];

  var QUESTIONS = [
    /* ------------------------------------------------------------ */
    {
      id: "q-bigo-growth",
      category: "foundations",
      difficulty: "easy",
      prompt: "What does O(n) actually describe?",
      options: [
        "The exact number of milliseconds a run takes",
        "How the work grows as the input size grows",
        "How many lines of code the algorithm has",
        "That the algorithm is slow in practice"
      ],
      answer: 1,
      explain:
        "Big-O is a growth rate. It deliberately drops constants and lower-order terms, so it says nothing about a single measured run.",
      related: "reading-complexity",
      definition: null
    },
    {
      id: "q-bigo-drop-constant",
      category: "foundations",
      difficulty: "easy",
      prompt: "Why is 3n + 50 written as O(n)?",
      options: [
        "Because 3n + 50 is never measured accurately",
        "Because constant factors and additive terms are ignored when describing growth",
        "Because the algorithm is really O(1)",
        "Because n is always larger than 50"
      ],
      answer: 1,
      explain:
        "Doubling n doubles the 3n term while the 50 stays fixed, so the 3n term dominates the growth story.",
      related: "reading-complexity",
      definition: null
    },
    {
      id: "q-bigo-worst-case",
      category: "foundations",
      difficulty: "medium",
      prompt: "Quick sort averages O(n log n) but is O(n\u00b2) in the worst case. Which statement is correct?",
      options: [
        "The worst-case claim is a mistake",
        "Both are true; they describe different input distributions",
        "O(n\u00b2) only applies to huge inputs",
        "Average and worst case are always equal for comparison sorts"
      ],
      answer: 1,
      explain:
        "Poor pivot choices on adversarial input produce unbalanced partitions, which is genuinely quadratic. Both bounds are real.",
      related: "choosing-a-sort",
      definition: "quickSort"
    },
    {
      id: "q-bigo-amortised",
      category: "foundations",
      difficulty: "hard",
      prompt: "Appending to a dynamic array is called amortised O(1). What does that mean?",
      options: [
        "Every single append takes exactly the same time",
        "The occasional O(n) reallocation is spread across many cheap appends",
        "Appends are never O(n) at all",
        "Amortised cost only applies to memory, not time"
      ],
      answer: 1,
      explain:
        "Doubling the backing block costs O(n) but happens rarely enough that the averaged cost per append stays constant.",
      related: "reading-complexity",
      definition: "array"
    },
    {
      id: "q-bigo-space",
      category: "foundations",
      difficulty: "medium",
      prompt: "A recursive traversal with depth d uses O(d) extra space. Where does that space live?",
      options: [
        "In a separately allocated output array",
        "On the call stack, one frame per active call",
        "In the input, which gets rewritten",
        "Nowhere - recursion is always free"
      ],
      answer: 1,
      explain:
        "Each pending call holds its own parameters and locals until it returns, so the maximum simultaneous depth is the space cost.",
      related: "recursion-and-calls",
      definition: "factorial"
    },

    /* ------------------------------------------------------------ */
    {
      id: "q-sort-complexity",
      category: "sorting",
      difficulty: "easy",
      prompt: "Bubble sort, insertion sort and selection sort all have which worst case?",
      options: ["O(n)", "O(n log n)", "O(n\u00b2)", "O(2^n)"],
      answer: 2,
      explain:
        "All three use nested loops over the collection, so the comparison count grows with the square of n.",
      related: "choosing-a-sort",
      definition: "bubbleSort"
    },
    {
      id: "q-sort-stable",
      category: "sorting",
      difficulty: "medium",
      prompt: "What does it mean for a sort to be stable?",
      options: [
        "It never runs out of memory",
        "Equal elements keep their original relative order",
        "It always runs in O(n log n)",
        "It works on linked lists only"
      ],
      answer: 1,
      explain:
        "Stability matters when sorting by several keys in sequence: an unstable second pass would scramble the first ordering.",
      related: "choosing-a-sort",
      definition: "insertionSort"
    },
    {
      id: "q-sort-merge",
      category: "sorting",
      difficulty: "medium",
      prompt: "What is merge sort's main advantage over quick sort?",
      options: [
        "It sorts in place with no extra memory",
        "It guarantees O(n log n) regardless of input order",
        "It never compares the same pair twice",
        "It is faster on nearly-sorted data"
      ],
      answer: 1,
      explain:
        "Merge sort's split point is the middle, so partitions stay balanced by construction. Quick sort's guarantee depends on pivot quality.",
      related: "choosing-a-sort",
      definition: "mergeSort"
    },
    {
      id: "q-sort-insertion-best",
      category: "sorting",
      difficulty: "medium",
      prompt: "Insertion sort runs in O(n) on which input?",
      options: [
        "Randomly ordered data",
        "Reverse-ordered data",
        "Already-sorted data",
        "All elements equal"
      ],
      answer: 2,
      explain:
        "On sorted input each element compares once against its predecessor and stops, so the inner loop never runs.",
      related: "choosing-a-sort",
      definition: "insertionSort"
    },
    {
      id: "q-sort-heap",
      category: "sorting",
      difficulty: "hard",
      prompt: "Heap sort is in place and O(n log n) worst case. What does it give up compared to merge sort?",
      options: [
        "Its O(n log n) bound",
        "The ability to handle duplicate values",
        "Stability - heap sort is not stable",
        "In-place operation - heap sort is not in place"
      ],
      answer: 2,
      explain:
        "Sifting elements around inside the heap can reorder equal keys, so heap sort is in place but unstable.",
      related: "choosing-a-sort",
      definition: "heapSort"
    },
    {
      id: "q-sort-lower-bound",
      category: "sorting",
      difficulty: "hard",
      prompt: "Why can't a comparison sort beat O(n log n) in the worst case?",
      options: [
        "Computers are not fast enough yet",
        "Each comparison only rules out part of the n! possible orderings",
        "All sorting algorithms share one implementation",
        "Memory bandwidth limits comparisons to log n per element"
      ],
      answer: 1,
      explain:
        "Distinguishing n! orderings with binary questions needs at least log2(n!) comparisons, which grows as n log n.",
      related: "choosing-a-sort",
      definition: null
    },

    /* ------------------------------------------------------------ */
    {
      id: "q-search-linear",
      category: "searching",
      difficulty: "easy",
      prompt: "Linear search on an unsorted array of n elements is:",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answer: 2,
      explain:
        "With no ordering to exploit, the target could be anywhere, so in the worst case every element is inspected once.",
      related: "searching-models",
      definition: "linearSearch"
    },
    {
      id: "q-search-binary-precondition",
      category: "searching",
      difficulty: "easy",
      prompt: "What must be true before binary search is allowed to run?",
      options: [
        "The array must contain no duplicates",
        "The array must be sorted",
        "The array must have an even length",
        "The target must exist"
      ],
      answer: 1,
      explain:
        "Binary search's invariant is that the target lies inside the current interval, which only holds when the data is ordered.",
      related: "searching-models",
      definition: "binarySearch"
    },
    {
      id: "q-search-binary-complexity",
      category: "searching",
      difficulty: "easy",
      prompt: "Binary search is O(log n) because each comparison:",
      options: [
        "Checks two elements at once",
        "Eliminates half of the remaining interval",
        "Sorts the remaining elements",
        "Reuses a cached result"
      ],
      answer: 1,
      explain:
        "Halving the interval repeatedly means the interval reaches size 1 after about log2(n) steps.",
      related: "searching-models",
      definition: "binarySearch"
    },
    {
      id: "q-search-sort-then-search",
      category: "searching",
      difficulty: "medium",
      prompt: "You will run 10,000 lookups on the same 1,000-element array. What is the sensible plan?",
      options: [
        "Run linear search every time: 10,000 \u00d7 1,000 comparisons",
        "Sort once, then binary search each query",
        "Sort before every single query",
        "Neither sort nor search - use a hash table only"
      ],
      answer: 1,
      explain:
        "One O(n log n) sort followed by 10,000 O(log n) lookups is vastly cheaper than 10,000 O(n) scans.",
      related: "searching-models",
      definition: "binarySearch"
    },
    {
      id: "q-search-not-found",
      category: "searching",
      difficulty: "medium",
      prompt: "Binary search fails to find a target. What does that prove?",
      options: [
        "The array is unsorted",
        "The target is absent from the array",
        "The search started at the wrong index",
        "Nothing - binary search always reports failure incorrectly"
      ],
      answer: 1,
      explain:
        "If the ordering holds, an empty interval at the end is a correct proof that the value is not present.",
      related: "searching-models",
      definition: "binarySearch"
    },

    /* ------------------------------------------------------------ */
    {
      id: "q-pattern-quadratic",
      category: "patterns",
      difficulty: "medium",
      prompt: "A nested loop that restarts its inner index at every outer index usually costs:",
      options: ["O(n)", "O(n log n)", "O(n\u00b2)", "O(log n)"],
      answer: 2,
      explain:
        "The inner loop performs roughly 1 + 2 + ... + n iterations, which sums to n(n+1)/2 - quadratic growth.",
      related: "pattern-toolkit",
      definition: null
    },
    {
      id: "q-pattern-two-pointer",
      category: "patterns",
      difficulty: "medium",
      prompt: "Why does the two-pointer technique stay O(n)?",
      options: [
        "Each pointer only ever moves forward, so total movement is bounded by n",
        "Pointers skip elements without reading them",
        "It uses hash tables internally",
        "It only works on sorted data"
      ],
      answer: 0,
      explain:
        "Neither pointer ever backtracks, so between them they perform at most n steps across the whole run.",
      related: "pattern-toolkit",
      definition: "twoPointer"
    },
    {
      id: "q-pattern-window",
      category: "patterns",
      difficulty: "medium",
      prompt: "In a sliding window, when does the left edge move?",
      options: [
        "After every expansion, unconditionally",
        "When the window's invariant is violated and must be repaired",
        "Only when the window reaches the end of the array",
        "Never - only the right edge moves"
      ],
      answer: 1,
      explain:
        "The right edge admits new values; the left edge shrinks only to restore whatever condition the window promises.",
      related: "pattern-toolkit",
      definition: "slidingWindow"
    },
    {
      id: "q-pattern-prefix",
      category: "patterns",
      difficulty: "easy",
      prompt: "A prefix sum array lets you compute any range sum in:",
      options: ["O(1)", "O(log n)", "O(n)", "O(range length)"],
      answer: 0,
      explain:
        "The range sum becomes prefix[end] - prefix[start-1], a single subtraction independent of how wide the range is.",
      related: "pattern-toolkit",
      definition: "prefixSum"
    },
    {
      id: "q-pattern-window-failure",
      category: "patterns",
      difficulty: "hard",
      prompt: "A sliding window stops being O(n) when:",
      options: [
        "The array contains duplicates",
        "Removing an element requires recomputing the whole aggregate",
        "The window size is greater than 2",
        "The array is already sorted"
      ],
      answer: 1,
      explain:
        "If shrinking the window costs a full recount, each step is no longer constant and the linear guarantee disappears.",
      related: "pattern-toolkit",
      definition: "slidingWindow"
    },

    /* ------------------------------------------------------------ */
    {
      id: "q-graph-bfs-frontier",
      category: "graphs",
      difficulty: "easy",
      prompt: "BFS uses which kind of frontier?",
      options: ["A stack", "A queue", "A priority queue", "A hash set"],
      answer: 1,
      explain:
        "First-in-first-out order is what makes BFS expand one whole level before the next.",
      related: "bfs-vs-dfs",
      definition: "bfs"
    },
    {
      id: "q-graph-dfs-frontier",
      category: "graphs",
      difficulty: "easy",
      prompt: "DFS dives down one branch because its frontier is:",
      options: ["A queue", "A stack", "A sorted array", "A min-heap"],
      answer: 1,
      explain:
        "Last-in-first-out order means the most recently discovered node is always the next one processed.",
      related: "bfs-vs-dfs",
      definition: "dfs"
    },
    {
      id: "q-graph-bfs-shortest",
      category: "graphs",
      difficulty: "medium",
      prompt: "BFS finds the shortest path by what measure?",
      options: [
        "Total edge weight",
        "Number of edges",
        "Number of vertices visited",
        "Sum of vertex degrees"
      ],
      answer: 1,
      explain:
        "BFS discovers nodes in non-decreasing hop count, so its first arrival uses the fewest edges. It ignores weights entirely.",
      related: "bfs-vs-dfs",
      definition: "bfs"
    },
    {
      id: "q-graph-complexity",
      category: "graphs",
      difficulty: "medium",
      prompt: "BFS and DFS are both O(V + E) because:",
      options: [
        "They sort the vertices first",
        "Each vertex and each edge is processed a constant number of times",
        "V and E are always roughly equal",
        "They use an adjacency matrix"
      ],
      answer: 1,
      explain:
        "Marking nodes discovered on enqueue guarantees each is queued once, and each edge is examined from its endpoints.",
      related: "graph-vocabulary",
      definition: "bfs"
    },
    {
      id: "q-graph-dijkstra-negative",
      category: "graphs",
      difficulty: "hard",
      prompt: "Why does Dijkstra fail with negative edge weights?",
      options: [
        "Negative numbers overflow the distance array",
        "A settled node's distance could still be improved later, breaking the greedy assumption",
        "Negative edges cannot be stored in an adjacency list",
        "The priority queue rejects negative keys"
      ],
      answer: 1,
      explain:
        "Dijkstra assumes once a node is settled its distance is final. A later negative edge can violate that.",
      related: "graph-vocabulary",
      definition: "dijkstra"
    },
    {
      id: "q-graph-discovery-time",
      category: "graphs",
      difficulty: "hard",
      prompt: "When should a node be marked discovered during BFS?",
      options: [
        "When it is dequeued and processed",
        "When it is first added to the queue",
        "When its last neighbour is checked",
        "Only when it equals the target"
      ],
      answer: 1,
      explain:
        "Marking on enqueue prevents the same node from being queued by several neighbours at once, which keeps the traversal linear.",
      related: "bfs-vs-dfs",
      definition: "bfs"
    },

    /* ------------------------------------------------------------ */
    {
      id: "q-recursion-base-case",
      category: "recursion",
      difficulty: "easy",
      prompt: "What does the base case of a recursive function do?",
      options: [
        "Calls itself with a larger input",
        "Returns a value without making another recursive call",
        "Allocates memory for the call stack",
        "Sorts the remaining input"
      ],
      answer: 1,
      explain:
        "The base case is the case that does not recurse; without it the calls never stop and the stack overflows.",
      related: "recursion-and-calls",
      definition: "factorial"
    },
    {
      id: "q-recursion-space",
      category: "recursion",
      difficulty: "medium",
      prompt: "A recursion of depth d uses how much stack space?",
      options: ["O(1)", "O(log d)", "O(d)", "O(2^d)"],
      answer: 2,
      explain:
        "Only one branch is active at a time, so the space is the number of frames on the stack: the maximum depth.",
      related: "recursion-and-calls",
      definition: "factorial"
    },
    {
      id: "q-recursion-fib-work",
      category: "recursion",
      difficulty: "medium",
      prompt: "Naive recursive Fibonacci has exponential time because it:",
      options: [
        "Allocates a new array each call",
        "Recomputes the same subproblems over and over",
        "Uses a loop instead of a base case",
        "Sorts its intermediate results"
      ],
      answer: 1,
      explain:
        "fib(n) calls fib(n-1) and fib(n-2), which overlap heavily. Caching each result collapses the work to O(n).",
      related: "recursion-and-calls",
      definition: "fibonacci"
    },
    {
      id: "q-recursion-frame-isolation",
      category: "recursion",
      difficulty: "medium",
      prompt: "Two simultaneous calls to the same function share:",
      options: [
        "Their local variables",
        "Their parameters and locals, but not each other's",
        "Only the code being executed, not variables",
        "Nothing at all - they are separate programs"
      ],
      answer: 2,
      explain:
        "Each frame owns its own parameters and locals. The only thing shared is the function code itself.",
      related: "recursion-and-calls",
      definition: null
    },

    /* ------------------------------------------------------------ */
    {
      id: "q-struct-array-access",
      category: "structures",
      difficulty: "easy",
      prompt: "Reading array element i costs:",
      options: ["O(1)", "O(log i)", "O(i)", "O(n)"],
      answer: 0,
      explain:
        "Contiguous storage means the address is base + i \u00d7 element size, computed without visiting anything.",
      related: "storage-shapes",
      definition: "array"
    },
    {
      id: "q-struct-array-insert",
      category: "structures",
      difficulty: "easy",
      prompt: "Inserting at the front of an array of n elements costs:",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answer: 2,
      explain:
        "Every one of the n existing cells has to shift one slot right to keep the block contiguous.",
      related: "storage-shapes",
      definition: "array"
    },
    {
      id: "q-struct-stack-order",
      category: "structures",
      difficulty: "easy",
      prompt: "Push A, push B, push C, pop. Which value comes back?",
      options: ["A", "B", "C", "The oldest value"],
      answer: 2,
      explain:
        "A stack is last-in-first-out, so the most recently pushed value is the first one out.",
      related: "storage-shapes",
      definition: "stack"
    },
    {
      id: "q-struct-queue-order",
      category: "structures",
      difficulty: "easy",
      prompt: "Enqueue A, enqueue B, dequeue. Which value comes back?",
      options: ["A", "B", "The newest value", "Whichever is easier to reach"],
      answer: 0,
      explain:
        "A queue is first-in-first-out, so the value that waited longest leaves first.",
      related: "storage-shapes",
      definition: "queue"
    },
    {
      id: "q-struct-linked-prepend",
      category: "structures",
      difficulty: "medium",
      prompt: "Prepending to a singly linked list is O(1) because:",
      options: [
        "The list is always short",
        "Only two pointers change - the new node's next and the head",
        "The head is stored in a hash table",
        "Nothing needs to move because the list is contiguous"
      ],
      answer: 1,
      explain:
        "The new node points at the old head and the head pointer moves to the new node. No existing node is touched.",
      related: "storage-shapes",
      definition: "linkedList"
    },
    {
      id: "q-struct-linked-access",
      category: "structures",
      difficulty: "medium",
      prompt: "Reaching element i of a singly linked list costs:",
      options: ["O(1)", "O(log i)", "O(i)", "O(n)"],
      answer: 2,
      explain:
        "There is no arithmetic shortcut - you follow i links from the head, one at a time.",
      related: "storage-shapes",
      definition: "linkedList"
    },
    {
      id: "q-struct-bst-invariant",
      category: "structures",
      difficulty: "medium",
      prompt: "In a binary search tree, values smaller than the current node live:",
      options: [
        "Anywhere in the tree",
        "In the left subtree only",
        "In the right subtree only",
        "In whichever subtree was filled first"
      ],
      answer: 1,
      explain:
        "Small left, large right is the invariant that lets every comparison discard an entire subtree.",
      related: "tree-invariants",
      definition: "binarySearchTree"
    },
    {
      id: "q-struct-bst-worst",
      category: "structures",
      difficulty: "hard",
      prompt: "Inserting ascending values into an unbalanced BST gives which cost?",
      options: [
        "O(log n) - trees are always balanced",
        "O(n) - the tree degenerates into a chain",
        "O(1) - the last node is always a leaf",
        "O(n log n) - each insert re-sorts"
      ],
      answer: 1,
      explain:
        "Every insert goes right, so height grows to n and each operation walks the whole chain.",
      related: "tree-invariants",
      definition: "binarySearchTree"
    },
    {
      id: "q-struct-bst-delete-two",
      category: "structures",
      difficulty: "hard",
      prompt: "Deleting a BST node with two children replaces it with:",
      options: [
        "Any leaf in the tree",
        "Its in-order successor - the smallest value in its right subtree",
        "Its parent's value",
        "The root of the left subtree"
      ],
      answer: 1,
      explain:
        "The successor has at most one child, so the deletion then reduces to one of the simpler cases.",
      related: "tree-invariants",
      definition: "binarySearchTree"
    }
  ];

  var byId = Object.create(null);
  QUESTIONS.forEach(function (q) { byId[q.id] = q; });

  function getQuestion(id) {
    return byId[id] || null;
  }

  function byCategory(category) {
    if (!category || category === "all") return QUESTIONS.slice();
    return QUESTIONS.filter(function (q) { return q.category === category; });
  }

  function byDifficulty(level) {
    return QUESTIONS.filter(function (q) { return q.difficulty === level; });
  }

  /** Resolve a question's module and demo definition, tolerating either being absent. */
  function linksFor(question) {
    if (!question) return { module: null, definition: null };
    return {
      module: AV.getLearningModule(question.related) || null,
      definition: question.definition
        ? (AV.algorithms.get(question.definition) || AV.structures.get(question.definition) || null)
        : null
    };
  }

  function checkAnswer(question, selectedIndex) {
    if (!question) {
      return { correct: false, selected: selectedIndex, answer: -1, explain: "Unknown question" };
    }
    return {
      correct: selectedIndex === question.answer,
      selected: selectedIndex,
      answer: question.answer,
      explain: question.explain
    };
  }

  function shuffle(list, rng) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = AV.random.intBetween(rng, 0, i);
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /**
   * Build a playable quiz round.
   * Options: category, difficulty, count, seed.
   * The seed makes rounds reproducible, which is what the tests rely on.
   */
  function buildQuiz(opts) {
    opts = opts || {};
    var pool = QUESTIONS.filter(function (q) {
      if (opts.category && opts.category !== "all" && q.category !== opts.category) return false;
      if (opts.difficulty && opts.difficulty !== "all" && q.difficulty !== opts.difficulty) return false;
      return true;
    });
    var seed = opts.seed === undefined ? Date.now() : opts.seed;
    var rng = AV.random.createRng(seed);
    var picked = shuffle(pool, rng);
    var count = typeof opts.count === "number" && opts.count > 0 ? opts.count : picked.length;
    return picked.slice(0, Math.min(count, picked.length));
  }

  function score(answers) {
    var correct = 0;
    (answers || []).forEach(function (entry) {
      if (!entry) return;
      var q = byId[entry.id];
      if (q && entry.selected === q.answer) correct += 1;
    });
    var total = (answers || []).length;
    return {
      correct: correct,
      total: total,
      percent: total ? Math.round((correct / total) * 100) : 0
    };
  }

  function validate() {
    var problems = [];
    var seen = Object.create(null);
    QUESTIONS.forEach(function (q) {
      if (seen[q.id]) problems.push("duplicate question id: " + q.id);
      seen[q.id] = true;
      if (CATEGORIES.indexOf(q.category) < 0) {
        problems.push(q.id + " has unknown category " + q.category);
      }
      if (DIFFICULTIES.indexOf(q.difficulty) < 0) {
        problems.push(q.id + " has unknown difficulty " + q.difficulty);
      }
      if (!q.prompt) problems.push(q.id + " is missing a prompt");
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        problems.push(q.id + " needs exactly four options");
      }
      if (typeof q.answer !== "number" || q.answer < 0 || q.answer > 3) {
        problems.push(q.id + " has an out of range answer index");
      }
      if (!q.explain) problems.push(q.id + " is missing an explanation");
      if (q.related && !AV.getLearningModule(q.related)) {
        problems.push(q.id + " links unknown learning module " + q.related);
      }
      if (q.definition &&
          !AV.algorithms.get(q.definition) &&
          !AV.structures.get(q.definition)) {
        problems.push(q.id + " links unknown definition " + q.definition);
      }
    });
    CATEGORIES.forEach(function (cat) {
      if (byCategory(cat).length < 3) {
        problems.push("category " + cat + " has fewer than three questions");
      }
    });
    AV.learningModules.forEach(function (m) {
      if (!QUESTIONS.some(function (q) { return q.related === m.id; })) {
        problems.push("learning module " + m.id + " has no question pointing at it");
      }
    });
    return { ok: problems.length === 0, problems: problems };
  }

  AV.quizQuestions = QUESTIONS;
  AV.quizCategories = CATEGORIES;
  AV.quizDifficulties = DIFFICULTIES;
  AV.getQuestion = getQuestion;
  AV.questionsByCategory = byCategory;
  AV.questionsByDifficulty = byDifficulty;
  AV.questionLinks = linksFor;
  AV.checkAnswer = checkAnswer;
  AV.buildQuiz = buildQuiz;
  AV.scoreQuiz = score;
  AV.validateQuiz = validate;
})(typeof globalThis !== "undefined" ? globalThis : window);
