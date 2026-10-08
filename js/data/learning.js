/**
 * AlgoVisualizer — learning modules
 *
 * Short, focused concept lessons that sit beside the interactive views.
 * Every module links back to concrete algorithms so the reading always
 * has somewhere to go next.
 */
(function (root) {
  "use strict";
  var AV = root.AV || (root.AV = {});

  var MODULES = [
    {
      id: "reading-complexity",
      title: "Reading Big-O honestly",
      category: "foundations",
      level: "beginner",
      summary:
        "Big-O describes how work grows, not how fast a single run is. Learn to read the growth rate before the constant.",
      sections: [
        {
          heading: "Growth, not stopwatch time",
          body:
            "O(n) does not mean 'slow' and O(n log n) does not mean 'fast'. It means the shape of the curve as the input doubles. A well-written O(n) pass beats any O(n log n) algorithm on small inputs simply because the constant in front is smaller."
        },
        {
          heading: "Best, average and worst",
          body:
            "Quick sort is O(n log n) on average and O(n²) in the worst case, which happens when every pivot choice is terrible. Always ask which case a claim refers to, because designs usually have to survive the worst one."
        },
        {
          heading: "Space is complexity too",
          body:
            "A recursive traversal that keeps a call frame per level spends O(height) space. Merge sort spends O(n) on the scratch buffer. Counting memory matters whenever the input is large or the machine is small."
        },
        {
          heading: "Amortised cost",
          body:
            "Appending to a dynamic array is usually O(1) even though occasionally the whole block has to be reallocated. That rare O(n) copy is spread across the many cheap appends that preceded it, giving an amortised O(1)."
        }
      ],
      keyPoints: [
        "Big-O describes growth rate, not elapsed time.",
        "Always name the case: best, average or worst.",
        "Recursive algorithms spend space on the call stack.",
        "Amortised cost spreads a rare expensive step across many cheap ones."
      ],
      related: ["bubbleSort", "quickSort", "mergeSort", "array"]
    },

    {
      id: "choosing-a-sort",
      title: "Choosing a sorting algorithm",
      category: "sorting",
      level: "intermediate",
      summary:
        "Comparison sorts converge on O(n log n), so the real decision is about memory, stability and how badly the data is already ordered.",
      sections: [
        {
          heading: "Why O(n log n) is the floor",
          body:
            "Any comparison sort must make roughly n log n comparisons in the worst case because each comparison only buys one bit of information among n! possible orderings. Beating that requires exploiting structure, such as counting sort exploiting a small key range."
        },
        {
          heading: "Stability changes everything",
          body:
            "A stable sort keeps equal elements in their original relative order. That matters when you sort by one key and then by another: an unstable second pass silently destroys the first."
        },
        {
          heading: "Memory and locality",
          body:
            "Insertion sort works in place with excellent cache behaviour, which is why library sorts switch to it for short runs. Merge sort needs extra memory but guarantees O(n log n) regardless of input order."
        },
        {
          heading: "The pivot decides quick sort",
          body:
            "Quick sort's reputation lives or dies on pivot selection. A middle-of-three or randomised pivot makes the balanced case likely, while a first-element pivot on already-sorted data degrades to O(n²)."
        }
      ],
      keyPoints: [
        "Comparison sorts cannot beat O(n log n) in the worst case.",
        "Stable sorts preserve the order of equal keys.",
        "Insertion sort wins on small or nearly-sorted inputs.",
        "Merge sort trades memory for a guaranteed bound; quick sort trades the guarantee for speed."
      ],
      related: ["bubbleSort", "selectionSort", "insertionSort", "mergeSort", "quickSort", "heapSort"]
    },

    {
      id: "searching-models",
      title: "Two searching models",
      category: "searching",
      level: "beginner",
      summary:
        "Linear search asks 'is it here?' one cell at a time. Binary search asks 'which half could it be in?' and throws the other away.",
      sections: [
        {
          heading: "Linear search makes no assumptions",
          body:
            "If the data is in no particular order, every element is equally likely to be the target, so you have to look at all of them. That is O(n) and it is the best you can do without extra structure."
        },
        {
          heading: "Binary search needs an invariant",
          body:
            "Binary search only works when the array is sorted, because its invariant is that the target must lie inside the current interval. Each comparison halves that interval, giving O(log n). Break the ordering and the invariant breaks with it."
        },
        {
          heading: "Sorting first can pay off",
          body:
            "If you will run many queries against the same data, paying O(n log n) once to sort turns every later lookup into O(log n). One sorted pass beats n unsorted ones once the query count crosses roughly n / log n."
        },
        {
          heading: "The boundary is the hard part",
          body:
            "Finding any matching element is easy; finding the first or last one is where off-by-one bugs live. Write the loop condition for the interval you actually mean, and test empty, single and all-equal inputs."
        }
      ],
      keyPoints: [
        "Unsorted data forces a linear scan.",
        "Binary search is an invariant: the target stays inside the interval.",
        "Sorting once pays off when queries outnumber the sort cost.",
        "Boundary searches need empty and all-equal test cases."
      ],
      related: ["linearSearch", "binarySearch"]
    },

    {
      id: "pattern-toolkit",
      title: "The pattern toolkit: pointers and windows",
      category: "patterns",
      level: "intermediate",
      summary:
        "Two pointers and sliding windows turn many O(n²) loops into a single O(n) pass by never revisiting an element.",
      sections: [
        {
          heading: "Two pointers move in concert",
          body:
            "Place one pointer at each end, or one behind the other, and move them according to a rule. Because each pointer only ever moves forward, the total work stays proportional to n even though nested logic suggests otherwise."
        },
        {
          heading: "A window is a movable interval",
          body:
            "A sliding window keeps a running answer for the current subarray. Expand the right edge to admit a new value, shrink the left edge while the invariant is violated, and the window never needs to be recomputed from scratch."
        },
        {
          heading: "When the pattern fails",
          body:
            "The trick collapses if the window's answer cannot be updated incrementally. Some aggregates are easy to add to but hard to subtract from; if removing an element requires a full recount, the window stops being O(n)."
        },
        {
          heading: "Prefix sums defer the arithmetic",
          body:
            "Precomputing running totals turns any range sum into one subtraction. The build costs O(n) once, and every later query becomes O(1) regardless of how wide the range is."
        }
      ],
      keyPoints: [
        "Each pointer moves monotonically, so total movement is O(n).",
        "Windows expand to admit and shrink to repair an invariant.",
        "Pattern fails when the aggregate is not incrementally updatable.",
        "Prefix sums convert range sums into a single subtraction."
      ],
      related: ["twoPointer", "slidingWindow", "prefixSum"]
    },

    {
      id: "graph-vocabulary",
      title: "Graph vocabulary that actually matters",
      category: "graphs",
      level: "beginner",
      summary:
        "Directed or weighted, dense or sparse: the shape of the graph decides which algorithm is even applicable.",
      sections: [
        {
          heading: "Direction changes the question",
          body:
            "In an undirected graph a path from A to B implies a path from B to A. In a directed one, reachability is asymmetric, and Dijkstra must follow edges the way they point rather than the way you wish they went."
        },
        {
          heading: "Weights carry meaning",
          body:
            "An edge weight can be cost, distance, time or risk. Dijkstra requires every weight to be non-negative; a single negative edge can break its assumption that a settled distance never improves."
        },
        {
          heading: "Representation is a trade-off",
          body:
            "An adjacency list costs O(V + E) and suits sparse graphs, which are the common case. An adjacency matrix costs O(V²) memory but answers 'is there an edge?' in O(1), which wins only when the graph is nearly complete."
        },
        {
          heading: "V and E dominate the reading",
          body:
            "Write complexity in terms of both vertices and edges. O(V + E) means every node and every edge is touched a constant number of times, which is the hallmark of a linear traversal."
        }
      ],
      keyPoints: [
        "Direction makes reachability asymmetric.",
        "Dijkstra needs non-negative weights.",
        "Adjacency lists suit sparse graphs, matrices suit dense ones.",
        "Read graph complexity in both V and E."
      ],
      related: ["bfs", "dfs", "dijkstra"]
    },

    {
      id: "bfs-vs-dfs",
      title: "BFS or DFS: pick by the question",
      category: "graphs",
      level: "intermediate",
      summary:
        "Same traversal skeleton, different frontier. The queue finds shortest unweighted paths; the stack reaches deep nodes first.",
      sections: [
        {
          heading: "The frontier is the difference",
          body:
            "BFS keeps a FIFO queue so nodes leave in the order they were discovered, expanding one level at a time. DFS keeps a LIFO stack so the most recent discovery is processed next, plunging down one branch until it dead-ends."
        },
        {
          heading: "Shortest path by hops",
          body:
            "Because BFS discovers nodes in non-decreasing distance from the source, the first time it reaches the target it has found a path with the fewest edges. It ignores edge weights entirely, so a heavy one-hop edge can beat a light three-hop route."
        },
        {
          heading: "Discovery time vs processing time",
          body:
            "Mark a node discovered when it enters the frontier, not when it is processed. That single rule guarantees each node is queued once, which is what keeps both traversals linear in V plus E."
        },
        {
          heading: "When DFS is the right tool",
          body:
            "Cycle detection, topological sort and finding connected components all fall out of DFS naturally, because the recursion tree exposes back edges and finishing times that BFS does not provide."
        }
      ],
      keyPoints: [
        "Queue means level order; stack means depth order.",
        "BFS gives fewest-edge paths and ignores weights.",
        "Mark discovered when queued, not when processed.",
        "DFS exposes cycles and finishing order."
      ],
      related: ["bfs", "dfs", "dijkstra"]
    },

    {
      id: "recursion-and-calls",
      title: "Recursion is just a stack",
      category: "recursion",
      level: "beginner",
      summary:
        "Every recursive call pushes a frame; every return pops one. Watch the call tree and the base case stops being mysterious.",
      sections: [
        {
          heading: "The base case stops the descent",
          body:
            "A recursive function must reach a case that returns without calling itself again. Without it the stack grows until it overflows. The base case is not an afterthought; it is the foundation the other cases build on."
        },
        {
          heading: "Each frame owns its own variables",
          body:
            "Two calls to the same function do not share parameters or locals. They share only the code. That is why recursion can hold several partially-solved subproblems at once without them colliding."
        },
        {
          heading: "Depth is space complexity",
          body:
            "A recursion that splits into two branches of depth d spends O(d) frames at any moment, because the second branch only starts after the first returns. Counting frames is counting space."
        },
        {
          heading: "Memoise to remove repeated work",
          body:
            "Naive Fibonacci recomputes the same subproblem exponentially often. Caching each result the first time it is computed collapses the tree from exponential to linear in the number of distinct states."
        }
      ],
      keyPoints: [
        "Base case returns without recursing.",
        "Frames are per-call, not shared.",
        "Maximum recursion depth equals space used.",
        "Memoisation turns repeated work into a table lookup."
      ],
      related: ["factorial", "fibonacci"]
    },

    {
      id: "storage-shapes",
      title: "Contiguous vs linked storage",
      category: "structures",
      level: "intermediate",
      summary:
        "Arrays give you speed at index i and pain at the middle. Linked lists give you cheap relinking and pain at index i.",
      sections: [
        {
          heading: "Indexing is arithmetic",
          body:
            "A contiguous block lets the machine compute the address of element i directly from the base address and the element size. That is why reads and writes at a known index are constant time."
        },
        {
          heading: "Shifting is the hidden cost",
          body:
            "Inserting into the middle of an array keeps the block contiguous by moving every following cell. The cost is proportional to the tail you displaced, which is exactly what the visualization makes visible."
        },
        {
          heading: "Relinking is cheap but walking is not",
          body:
            "A linked list changes shape with a handful of pointer writes, but reaching element i still requires following i links from the head. Nothing is free; the cost merely moves from moving data to moving through it."
        },
        {
          heading: "Queues pick their poison",
          body:
            "An array-backed queue pays O(n) on every dequeue to close the gap at the front. A linked list with head and tail pointers, or a circular buffer, makes both ends O(1)."
        }
      ],
      keyPoints: [
        "Contiguous storage makes indexing arithmetic.",
        "Array insertion pays for the tail it displaced.",
        "Linked lists relink in O(1) but walk in O(n).",
        "Queue implementation choice decides dequeue cost."
      ],
      related: ["array", "stack", "queue", "linkedList"]
    },

    {
      id: "tree-invariants",
      title: "The BST invariant and why balance matters",
      category: "structures",
      level: "intermediate",
      summary:
        "The ordering invariant buys you log-time search; losing balance silently degrades the tree into a linked list.",
      sections: [
        {
          heading: "Small left, large right",
          body:
            "Every node's left subtree holds only smaller values and its right subtree only larger ones. That invariant is what lets each comparison eliminate an entire subtree rather than a single element."
        },
        {
          heading: "Height decides the cost",
          body:
            "Search, insert and delete all follow one root-to-leaf path, so their cost is the tree's height. A balanced tree of n nodes has height about log n; a badly ordered insertion sequence makes height n."
        },
        {
          heading: "Deletion has three shapes",
          body:
            "A leaf simply unlinks. A node with one child is skipped over by its parent. A node with two children is replaced by its in-order successor, the smallest value in its right subtree, which is guaranteed to have at most one child."
        },
        {
          heading: "In-order reads sorted output",
          body:
            "Visiting left subtree, node, then right subtree emits the values in ascending order for free. That is the trick behind tree sort and the reason a BST doubles as a sorted container."
        }
      ],
      keyPoints: [
        "The ordering invariant eliminates subtrees, not just nodes.",
        "Operation cost equals tree height.",
        "Two-child deletion relinks the in-order successor.",
        "In-order traversal yields ascending values."
      ],
      related: ["binarySearchTree"]
    }
  ];

  var byId = Object.create(null);
  MODULES.forEach(function (m) { byId[m.id] = m; });

  function getModule(id) {
    return byId[id] || null;
  }

  function byCategory(category) {
    if (!category || category === "all") return MODULES.slice();
    return MODULES.filter(function (m) { return m.category === category; });
  }

  function byLevel(level) {
    return MODULES.filter(function (m) { return m.level === level; });
  }

  /** Resolve related ids to definitions, silently skipping unknown ids. */
  function relatedDefinitions(moduleId) {
    var m = byId[moduleId];
    if (!m) return [];
    var out = [];
    m.related.forEach(function (id) {
      var def = AV.algorithms.get(id) || AV.structures.get(id);
      if (def) out.push(def);
    });
    return out;
  }

  function validate() {
    var problems = [];
    var seen = Object.create(null);
    MODULES.forEach(function (m) {
      if (seen[m.id]) problems.push("duplicate module id: " + m.id);
      seen[m.id] = true;
      if (!m.title || !m.summary) problems.push("module " + m.id + " is missing title/summary");
      if (!Array.isArray(m.sections) || m.sections.length < 2) {
        problems.push("module " + m.id + " needs at least two sections");
      }
      if (!Array.isArray(m.keyPoints) || m.keyPoints.length < 3) {
        problems.push("module " + m.id + " needs at least three key points");
      }
      (m.related || []).forEach(function (id) {
        if (!AV.algorithms.get(id) && !AV.structures.get(id)) {
          problems.push("module " + m.id + " links unknown definition: " + id);
        }
      });
    });
    return { ok: problems.length === 0, problems: problems };
  }

  AV.learningModules = MODULES;
  AV.getLearningModule = getModule;
  AV.learningByCategory = byCategory;
  AV.learningByLevel = byLevel;
  AV.learningRelatedDefinitions = relatedDefinitions;
  AV.validateLearning = validate;
})(typeof globalThis !== "undefined" ? globalThis : window);
