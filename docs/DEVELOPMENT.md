# Development

Requires Node 18+ (the container uses Node 22).

```bash
npm install
npm run build        # dist/storyteller-level-builder.html
npm test             # unit tests for the engine
npm run test:e2e     # builds the demo project into a real ePUB (needs the dev dependencies)
```

`npm run dev` rebuilds the page and starts the server with auto-restart on http://localhost:8080. Opening
`dist/storyteller-level-builder.html` directly also works, without the build button.

Server code lives in `server/`; tests for it use real builds (`test/server.test.js`). To check ePUB validity with
[EPUBCheck](https://github.com/w3c/epubcheck), download a build with `curl` (see DEPLOYMENT.md) and run
`java -jar epubcheck.jar game.epub`.

## Adding a rule action

1. Add a branch in `Game.act()` in `src/engine/game.js`.
2. Add its pattern to `ACT` and a line to `HELP` in `src/ui/rules-help.js` (lint + cheat sheet).
3. Document it in `docs/RULES.md` and add a test in `test/engine.test.js`.

## Adding an event

Add the event name to the lint check in `src/ui/tabs/rules.js`, call `this.run(..., '<event>', ...)` from the engine,
and keep the call order consistent with `docs/RULES.md`.

## Adding a tab

Create `src/ui/tabs/<name>.js` with a `v<Name>()` function, list the file in `scripts/sources.js`, and register it in
`TABS` in `src/ui/app.js`.

## Changing the exported Pug template

Edit `src/export/templates/level.pug` (the default shipped with new projects). Run `npm run build` to regenerate
`src/generated/templates.js`. Existing projects keep their own copy in the Global tab.

## Conventions

- Anything the exported game needs belongs in `engine/game.js`, never in `ui/`.
- Keep the engine free of `Math.random`, dates, and unbounded counters (see `docs/EXPORT.md`).

## Changing the project format

Update `normalizeProject()` (default new fields, repair old ones), `docs/ARCHITECTURE.md`'s data model, and the round-trip test in `test/project.test.js`.

## Adding a level mode

Implement the movement in `Game.move()` (dispatch on `level.mode`), keep rest positions few so the state space stays small,
extend `actions()`, the preview pad (`ui/tabs/preview.js`), `normalizeProject()`, and add tests like `test/platformer.test.js`.
