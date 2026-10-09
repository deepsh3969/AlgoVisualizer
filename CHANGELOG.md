# Changelog

All notable changes to AlgoVisualizer are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [v1.0.0] - Initial Release - 2026-10-09

First complete release.

### Added

**Core**

- Event-driven visualization engine: algorithms emit compact events, the engine
  builds a checkpointed timeline (every 64 steps), and renderers paint state.
  Rewinding to any step restores the nearest checkpoint instead of re-running.
- Execution engine with play / pause / step / seek / finish, six playback speeds
  (0.25x - 4x), and a frame loop that never blocks the main thread.
- Observable store (`AV.createStore`) with shallow-merge writes, batching, and
  a durable preferences mirror to localStorage under `av:prefs`.
- Hash router (`#/algorithm/quickSort`) with stale-link fallback, so a broken
  deep link degrades to the section index instead of blanking the page.
- Category and definition registries with duplicate-id protection.
- Seeded PRNG so every array and graph is reproducible in tests and demos.

**Algorithms - 16**

- Sorting: bubble, selection, insertion, merge, quick, heap
- Searching: linear, binary
- Array patterns: two pointer, sliding window, prefix sum
- Graphs: BFS, DFS, Dijkstra
- Recursion: factorial, Fibonacci (visualized as a real call stack)

**Data structures - 5**

- Array, stack, queue, linked list, binary search tree - each with its own
  operation set, validation and renderer.

**Visualization - 9 kinds**

- Bar chart (array / search / pattern), stack, queue, linked list, tree,
  graph with draggable nodes, call stack with depth meter, plus an auxiliary
  column for frontier / stack / distance tables.

**Analysis**

- `AV.metrics` - live counters, symbolic Big-O evaluation, complexity ranking
  and head-to-head verdicts.
- `AV.benchmark` - size-ladder measurement with warm-up and adaptive repeats,
  measured-vs-predicted plotting, and run history in localStorage.

**UI**

- Responsive shell: sticky header, catalogue sidebar (drawer under 960px),
  workspace with stage + info panel, footer.
- Playback controls with seekable progress, status bar and speed selector.
- Input builder: array shape / size / seed / custom values, search targets,
  window sizes, graph size and start/target nodes, structure operations.
- Information panel: metric chips, complexity bars and table, pseudocode with
  active-line highlighting, written explanation.
- Command palette search over algorithms, structures and lessons
  (<kbd>/</kbd> or <kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd>).
- Toasts, accessible modal dialogs with focus trap, settings dialog.
- Compare view (two synchronized workspaces + head-to-head verdict),
  benchmark view, quiz runner with per-answer explanations, lesson reader
  with reading progress.

**Design system**

- 5 stylesheets, ~330 classes, zero CSS element IDs.
- Light and dark themes via `data-theme`, reduced motion via
  `data-reduced-motion` and `prefers-reduced-motion`.

**Documentation and tests**

- `README.md`, `LICENSE` (MIT), `CHANGELOG.md`, `.gitignore`.
- 430 tests across 22 test files (36 groups), running identically in Node and
  the browser (`tests/run-tests.js` and `tests/test.html`).

### Fixed

- `js/renderers/aux.js` renamed to `auxiliary.js` - `aux` is a reserved
  Windows device name, which made `Test-Path`, Explorer, zip tools and some
  git operations skip the file.
- Structure events carry `node` for `dequeue`/`pop`, so the status line names
  the node instead of showing an empty payload.
- `removeRoleEverywhere` clears the role before recomputing the mark, so a
  cleared index no longer keeps a stale highlight.
- `formatEvent` handles empty `indices` and prefers `event.node` for
  queue/stack operations.
- `complexityGrade` unwraps `O(...)` payloads so annotated bounds such as
  `O(n) read` and `O((V + E) log V)` grade on their payload.
- Store subscribers now receive the real previous state, including across
  batches and resets.
- Router treats `#/algorithm`, `#/algorithm/a/b/c` and `#/123` as stale links
  and falls back safely; `buildHash` falls back to `#/` for unknown routes and
  encodes ids.
