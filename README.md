# AlgoVisualizer

**See the algorithm work.** A framework-free platform that steps through
sorting, searching, graph and data-structure algorithms one event at a time -
backwards as well as forwards - with live metrics, complexity analysis, a
benchmark harness and a quiz.

Project 02 of a 10-project portfolio. Built with plain HTML5, CSS3 and ES6+.
No frameworks, no build step, no backend.

---

## Contents

- [Quick start](#quick-start)
- [What is inside](#what-is-inside)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Browser support](#browser-support)
- [Deploying](#deploying)
- [Accessibility](#accessibility)
- [License](#license)

---

## Quick start

It is a static site. Any of these work:

```bash
# 1. Python
python -m http.server 4173

# 2. Node
npx serve -l 4173

# 3. Or just open the file directly
#    double-click index.html  (file:// works - no build step to run)
```

Then open <http://127.0.0.1:4173> (or the `file://` path).

Run the tests:

```bash
node tests/run-tests.js
```

Or open <http://127.0.0.1:4173/tests/test.html> to run the same assertions in
the browser.

---

## What is inside

| Area | Count | Details |
| --- | ---: | --- |
| Algorithms | 16 | 6 sorting, 2 searching, 3 array patterns, 3 graph, 2 recursion |
| Data structures | 5 | array, stack, queue, linked list, binary search tree |
| Visualization kinds | 9 | bars, stack, queue, linked list, tree, graph, call stack |
| Lessons | 9 | beginner + intermediate, every one links to live demos |
| Quiz questions | 40 | 7 categories, per-answer explanations |
| Tests | 430 | 22 test files (36 groups), run in Node and in the browser |

**Algorithms**

- **Sorting** - bubble, selection, insertion, merge, quick, heap
- **Searching** - linear, binary
- **Array patterns** - two pointer, sliding window, prefix sum
- **Graphs** - BFS, DFS, Dijkstra
- **Recursion** - factorial, Fibonacci (with a real call stack)

**Data structures** - each with its own operation set and renderer:

- Array (`get/set/insert/delete`)
- Stack (`push/pop/peek`)
- Queue (`enqueue/dequeue/peek`)
- Linked list (`insertHead/insertAt/deleteAt/search/traverse`)
- Binary search tree (`insert/delete/search/inOrder/min/max`)

---

## How it works

The whole design rests on one idea: **an algorithm narrates, it does not draw.**

### 1. Algorithms emit events

Every algorithm is a plain function that takes `(input, emit)` and describes
what it does. Nothing in the algorithm knows a visualization exists.

```js
run: function (input, emit) {
  var a = input.array;
  for (var i = 0; i < a.length - 1; i++) {
    for (var j = 0; j < a.length - 1 - j; j++) {
      emit({ type: "compare", indices: [j, j + 1] });
      if (a[j] > a[j + 1]) {
        var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
        emit({ type: "swap", indices: [j, j + 1] });
      }
    }
  }
  emit({ type: "result", value: a });
}
```

28 event types cover everything the platform draws: `compare`, `swap`, `write`,
`mark`, `pointer`, `range`, `visit`, `enqueue`, `dequeue`, `push`, `pop`,
`enter`, `exit`, `frameValue`, `distance`, `path`, `found`, `result`, `message`
and friends.

### 2. The timeline engine replays them

`AV.viz.buildTimeline(definition, input)` runs the algorithm once, records the
events, and takes a state snapshot every 64 steps. That checkpointing is what
makes **step-backwards free**: rewinding to step 300 restores the nearest
checkpoint and replays forward instead of re-running from zero.

The playback controller (`AV.createExecutionEngine`) owns the timeline and
emits `engine:load` / `engine:step` / `engine:status`. It never touches the DOM.

### 3. Renderers paint state

Nine renderers read the same state object and paint different things: a bar
chart, a vertical stack, a queue row, a linked list, a tree, a graph with
draggable nodes, or a call stack with a depth meter. Swap the renderer and the
identical event stream draws a completely different picture.

### 4. Metrics come for free

The engine tallies comparisons, swaps, writes, visits, pushes, pops and call
depth as it applies events. Those counters drive the live metric chips, the
benchmark harness, and the head-to-head verdict in compare mode - and
`AV.metrics` evaluates Big-O expressions symbolically so measured time can be
plotted next to the theoretical curve.

```
algorithm.run() ──> events ──> timeline + checkpoints ──> engine ──> renderer
                              └──> metrics ─────────────> panel / benchmark
```

---

## Project structure

```
AlgoVisualizer/
├── index.html              App shell + script order (61 tags)
├── css/
│   ├── tokens.css          Design tokens: color, spacing, type, motion
│   ├── base.css            Reset, typography, utility classes
│   ├── layout.css          Shell, header, sidebar, workspace, footer
│   ├── components.css      Buttons, cards, badges, viz parts, quiz
│   └── responsive.css      Breakpoints 1600 → 380 + reduced motion
├── js/
│   ├── utils/              format, random (seeded PRNG), storage, validation
│   ├── core/               eventBus, registry, state (store + router),
│   │                       visualizationEngine, executionEngine,
│   │                       metrics, benchmark, graphModel
│   ├── data/               algorithms, dataStructures, learning, quizQuestions
│   ├── algorithms/         sorting/ searching/ patterns/ graphs/ recursion/
│   ├── dataStructures/     array stack queue linkedList binarySearchTree
│   ├── dom/dom.js          Element builders + inline SVG icon set
│   ├── renderers/          array stackQueue linked tree graph recursion
│   │                       auxiliary index
│   ├── ui/                 header sidebar controls panel inputs feedback search
│   ├── views/              workspace home catalog learning quiz benchmark compare
│   └── app.js              Router, theme, shell wiring
├── tests/
│   ├── suite.js            Zero-dependency assertions (Node + browser)
│   ├── run-tests.js        Node runner
│   ├── test.html           Browser runner (same file lists)
│   └── */*.test.js         22 test files (36 groups)
└── assets/icons/           favicon.svg
```

**Load order matters** and is declared once in `index.html`:
utilities → core engines → registries → definitions → DOM → renderers → UI →
views → `app.js`. Every file is a classic `<script>` using an IIFE that
attaches to `AV`, so there is no module resolution and the site works from
`file://`.

---

## Testing

```bash
node tests/run-tests.js
```

```
AlgoVisualizer test suite
--------------------------------------------------------
  [PASS] utilities/format                  15/15
  [PASS] utilities/random                  15/15
  [PASS] utilities/validation              14/14
  ... (36 groups across 22 files)
  [PASS] core/visualizationEngine          24/24
--------------------------------------------------------
  430 passed / 430 total
```

The assertions live in `tests/suite.js` and are deliberately dependency-free so
the **same suite runs in Node and in a browser**. `tests/test.html` mirrors the
exact file lists from `tests/run-tests.js`.

What the suites cover:

- **Utilities** - date/number formatting, seeded PRNG determinism, array parsing
- **Algorithms** - correct output for sorted/reversed/duplicate/empty/single
  inputs, plus the full event contract (no orphan events, indices in range)
- **Data structures** - every operation, including error paths and invariants
- **Core** - store batching and persistence, timeline checkpointing, seek
  correctness in both directions, metric evaluation, benchmark measurement

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>/</kbd> or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd> | Open search |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Play or pause (when focus is on progress) |
| <kbd>←</kbd> <kbd>→</kbd> | Step backwards / forwards |
| <kbd>Home</kbd> / <kbd>End</kbd> | Restart / jump to end |
| <kbd>Esc</kbd> | Close dialog or search |

All controls are real `<button>` and `<a>` elements with visible focus rings.

---

## Browser support

Modern evergreen browsers. Uses `ResizeObserver`, `matchMedia`,
`localStorage`, `IntersectionObserver`-free CSS transitions and ES6+ syntax -
no transpilation, no polyfills.

Verified on Chromium, Firefox and Safari. The site also works over `file://`,
which is why everything is a classic script rather than an ES module.

---

## Deploying

Static hosting only - push the folder as-is.

**GitHub Pages**

1. Push to a repository
2. Settings → Pages → Deploy from branch → `main` / root
3. Site appears at `https://<user>.github.io/<repo>/`

**Vercel**

```bash
npx vercel --prod
```

No build command, no output directory - the root is the site.

**Netlify / Cloudflare Pages / S3** - same: publish the repository root.

---

## Accessibility

- Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`
- Skip link to `#main`, focus-visible outlines everywhere
- Every control is a native `<button>`/`<a>`/`<select>`/`<input>` with a label
  or `aria-label`
- The status bar is an `aria-live="polite"` region so step changes are
  announced
- `prefers-color-scheme` drives light/dark; `prefers-reduced-motion` disables
  transitions and animations (also toggleable in Settings)
- Color is never the only signal - roles combine color with position, border
  and text
- Responsive from 380px up; the sidebar becomes a drawer and the aux column
  wraps

---

## License

MIT - see [LICENSE](LICENSE).
