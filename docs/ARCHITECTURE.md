# Architecture

## System overview

```
 Browser (single-page editor)                      Container
 ┌─────────────────────────────┐   POST /api/build   ┌───────────────────────────────────────────┐
 │ levels, sprites, rules,     │ ──────────────────▶ │ server/app.js  (HTTP, limits, CSP)        │
 │ preview, import/export      │ ◀────────────────── │   │ normalizeProject + estimatePages      │
 │ (src/ui, shared core)       │      game.epub      │   ▼                                       │
 └─────────────────────────────┘                     │ server/build.js  temp dir + exported files │
        ▲ GET /  (static page)                       │   ▼  spawn (heap cap, timeout)             │
        └────────────────────────────────────────────│ server/worker.js  Storyteller + Pug        │
                                                     └───────────────────────────────────────────┘
```

- **Editor** (`src/`): a static page bundled by `scripts/build.js`. It owns authoring, the live preview and project
  import/export. It can run without the server (the Storyteller project export still works).
- **Core** (`src/engine`, `src/data`, `src/export`): DOM-free code shared by the browser and the server: the game engine,
  the page estimator, the project normalizer and the exporter. `server/core.js` loads it exactly as the browser does, so
  the editor, the tests and the build server cannot drift apart.
- **Server** (`server/`): plain `node:http`, no framework. It serves the page, validates and size-checks projects, and
  runs each build in a separate worker process. See [DEPLOYMENT.md](DEPLOYMENT.md) for limits and security.
- **Storyteller** runs only inside the worker, on the same exported files a user would get from the Storyteller project
  export, so both routes produce identical ePUBs.

Why a server instead of building in the browser: Storyteller is a Node library (filesystem, Pug compiler, ePUB packaging).
Re-implementing it in the browser would duplicate its behavior and the Pug compiler needs `eval`, which restrictive hosting
contexts block. A container keeps one implementation and one behavior everywhere.

## One engine, two uses

`src/engine/game.js` defines the `Game` class. The browser preview instantiates it directly. The exporter writes
`'module.exports = ' + Game.toString()` to `engine.js`, so Storyteller runs exactly the code you previewed.
Constraints that follow from this:

- `Game` must be self-contained (no references to outer variables or DOM).
- All persistent state lives in plain instance properties (`lv, x, y, vars, mods, msg, over`) because Storyteller
  hashes and clones them. Project data is held in the static `Game.D`, like Storyteller's own Hanoi example.
- Transient flags (e.g. `blocked`) are deleted before a move finishes so they never enter the hash.

## Movement model

`Game.move(dx, dy)` is the single entry point used by links and the preview. Grid levels allow one orthogonal step.
Platformer levels (`level.mode === 'platformer'`) interpret it as walk (`dy = 0`) or jump (`dy < 0`, optional `dx`),
run the motion as a sequence of single-cell `step()` calls (each fires `enter` rules), then apply `fall()`.
`actions()` lists the moves that change the state; `next()` returns the template of the resulting level.

## Data model (`game.json`)

```
{ title, author, vars: {name: n}, rules: "...", template: "...pug...",
  sprites: [{ id, glyph, color, solid, rules, img? }],
  levels:  [{ name, w, h, grid: [[spriteId]], start: {x,y}, rules,
             mode?: 'platformer', jumpHeight?, jumpReach? }] }
```

Imports pass through `normalizeProject()` (`src/data/project.js`, DOM-free and unit-tested) before replacing `P`.
The reserved `player` sprite supplies the player marker's appearance and is not a placeable tile; older top-level
`player` glyphs migrate into it during import. Its collision and rule fields are always disabled.

`mods` in game state is `{ "level:x,y": spriteId }`, overrides to the base grid created by the `tile` action.

## Build

There is no bundler. `scripts/build.js` regenerates `src/generated/templates.js` from `src/export/templates/`,
concatenates the files listed in `scripts/sources.js` (CORE then UI) into one script, and inlines it and the CSS into
`src/index.template.html`. Files share one global scope, in this order:

```
CORE  generated templates -> engine -> demo data -> project normalizer -> exporter    (DOM-free, unit-testable)
UI    rules help -> state -> helpers -> tabs/* -> app            (needs the DOM)
```

Tests load CORE only (`test/load.js`).

## UI

Each tab is a function returning a DOM node (`vLevels`, `vSprites`, ...), registered in `TABS` in `ui/app.js`.
`render()` rebuilds the active tab; text inputs update the project in place and call `save()` without re-rendering so
focus is kept. The tile grid paints through pointer events and swaps only the touched cell.

## Export download

`saveBlob()` uses the claude.ai `downloads` capability when the page runs there, and a plain anchor download elsewhere.
