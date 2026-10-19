# Storyteller Level Builder

A browser-based level builder for **2D tile games** that compile to interactive ePUBs with the
[Storyteller](https://github.com/eit6609/storyteller) engine. Paint levels with sprites, attach rules to
sprites and levels, play the result in a live preview, then export a Storyteller project or a ready-to-build kit.

> Storyteller does not run a game loop. It pre-plays every reachable game state and writes each one as a static
> XHTML page; the reader just follows links. That makes **turn-based, tile-grid** games (mazes, key/door puzzles,
> Sokoban-style levels, turn-based platformers) a good fit, and real-time games impossible.
> See [docs/EXPORT.md](docs/EXPORT.md) for how to keep the state space small.

## Quick start

```bash
docker compose up --build     # then open http://localhost:8080
```

That is all you need: the container runs the editor **and** builds `.epub` files with Storyteller, so nothing else has to
be installed. Without Docker: `npm install && npm run build && npm start` (Node 18+). Work autosaves to the browser's
`localStorage`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for settings, the API and the security model.

## Using the builder

| Tab | What it does |
| --- | --- |
| **Levels** | Add/delete levels (grid or **platformer**), resize grids (2-30), paint tiles by tap or drag, set the player start and jump settings. |
| **Sprites** | Per-sprite glyph, color, optional image, `solid` flag, and **sprite rules**. |
| **Global** | Title, author, player glyph, starting variables, **global rules**, editable Pug level template. |
| **Rules** | **Level rules** for the selected level, with live syntax checking and a cheat sheet. |
| **Preview** | Play from any level (defaults to the one you are editing), optionally with starting variables; "Next level" skips ahead. On-screen pad or arrow keys. "Estimate page count" explores all reachable states. |
| **Project** | **Build ePUB** on the server; export a Storyteller project zip or build kit zip; **import** a `game.json`, saved project JSON, or exported zip; save project JSON; load the example project. |

Rule language reference: [docs/RULES.md](docs/RULES.md). The starting project is documented in [docs/EXAMPLE.md](docs/EXAMPLE.md). Importing and round-tripping: [docs/EXPORT.md](docs/EXPORT.md#importing-projects).

## From level to ePUB

On the **Project** tab press **Build ePUB**. The server builds it with Storyteller and your browser downloads the `.epub`.
If the page is opened without the server (for example the copy hosted on claude.ai), the button is replaced by the
**Storyteller project** export: a zip you can build yourself with `npm install && npm run build`.

## Repository layout

```
src/
  engine/game.js          Game state class (shared by preview and export)
  data/demo.js            Level factory + demo project ("Key Quest", 3 linked levels)
  data/project.js         normalizeProject(): validates/repairs imported projects
  export/exporter.js      buildFiles(project, kit) -> { path: contents }
  export/templates/       Pug level template, main.js, package.json, README for the kit
  engine/estimate.js      Page-count estimator (Preview tab and server limits)
  ui/                     State, DOM helpers, one file per tab, app shell
  styles.css, index.template.html
server/                   Node build server: HTTP app, Storyteller worker process, config, shared core loader
scripts/                  build.js (single-file bundler), sources.js (file order)
Dockerfile, docker-compose.yml
test/                     engine unit tests + end-to-end ePUB build
docs/                     Architecture, rule reference, export guide, development, roadmap
dist/                     Built page (generated)
```

## Development

```bash
npm run build       # bundle
npm test            # engine unit tests (node:test)
npm run test:e2e    # export demo project and build a real ePUB with Storyteller
npm run test:all    # all of the above
```

More in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Status

v0.4. Tile-grid and turn-based platformer levels, variables, doors/keys/pickups, multi-level `goto`, win/lose, project import.
Includes project import (see docs/EXPORT.md). Planned work is in [docs/ROADMAP.md](docs/ROADMAP.md). No license file is included; add one before publishing.
