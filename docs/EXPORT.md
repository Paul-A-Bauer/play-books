# Export and how Storyteller sees your game

## Two ways to get an ePUB

1. **Build ePUB** (Project tab): the build server runs Storyteller for you and returns the `.epub`. Nothing to install.
   Custom Pug templates are ignored unless the server sets `ALLOW_CUSTOM_TEMPLATES=1` ([DEPLOYMENT.md](DEPLOYMENT.md)).
2. **Storyteller project export / build kit** (zip): the files described below, for building yourself or customising
   the template.

Both run the same code on the same files.

## What gets exported

```
engine.js                  Game class (exact source of src/engine/game.js)
game.json                  the whole project: sprites, levels, variables, global rules, Pug template
main.js                    configures Game and calls Storyteller.generate('level0', new Game())
templates/level<N>.pug     one location template per level
package.json, README.md    build kit only
```

`npm install && npm run build` runs `main.js`, which writes XHTML pages to `out/` and bundles them into `game.epub`.

## Importing projects

On the **Project** tab, *Import* accepts:

- a `game.json` or a JSON saved with *Save project JSON*,
- a project or build-kit `.zip` exported from this tool (its `game.json` is used).

The file goes through `normalizeProject()` (`src/data/project.js`), which repairs what it can and reports it:
unknown sprite ids in a grid become `floor`, a missing `floor` sprite is added, duplicate sprite ids are skipped,
duplicate level names are suffixed `(2)`, start positions are clamped into the grid, invalid variables are dropped,
and a missing template falls back to the default (older exports did not include it). Unusable files (no levels,
no grid, sizes outside 2x2-30x30) are rejected and the current project is left untouched. After a successful import
you can press **Undo import** once to get the previous project back.

Edits made by hand to `templates/*.pug` are not read back: only `game.json` is imported, and the template stored
in it is the one from the Global tab.

## Pages = templates x reachable states

Storyteller renders a page for every (template, state) pair it can reach by following `goto()` links.
Here the state is the player position, level, variables, changed tiles, current message and win/lose flag.
Each link is `goto(state.next(dx, dy), s => s.move(dx, dy))`, where `next()` picks the template of the level the move
lands in. The links come from `state.actions()`, which returns only the moves that actually change the state, labelled for
the level's mode (4-way arrows in grid levels; walk and jump options in platformer levels). The default export renders
these as separate ASCII-labelled links in a stable order. Non-ASCII player and tile glyphs fall back to `@` and the
sprite's initial, respectively, without changing project data. The grid uses percentage widths and basic HTML table
attributes rather than depending on CSS. Reader link-focus behavior and page-turn behavior still vary by firmware; test
on the target device before relying on them.

Use **Preview > Estimate page count** to see the number of reachable states (it stops at 5000).

## Keeping the state small

- Fewer open cells: 100 floor tiles with one pickup is ~200 pages; a 20x20 open room with three pickups is far more.
- Consume pickups (`tile floor`) rather than tracking them in many variables.
- Prefer booleans (`has_key`) to counters when you only need "at least one".
- Avoid global step counters unless you need them: every distinct value multiplies the state space.
- Split big games into levels; `goto` starts a level with its own tiles, and levels share only variables.
- Re-use a few `say` messages.

## Customising the page look

Edit the **Level template** on the Global tab. It is Pug, rendered by Storyteller with `state` and `goto` in scope.
`{{TITLE}}` becomes the level name. The state exposes `L()`, `tileAt(x, y)`, `sprite(id)`, `cfg()`,
`x`, `y`, `vars`, `msg`, `over`, `actions()` and `next(dx, dy)`.

Projects keep their own copy of the template. After upgrading the builder, use **Reset template to default** on the Global
tab to pick up the newer default (needed for platformer links; templates from v0.2 and earlier still work for grid levels).

Sprite images are embedded as data URIs; keep them small, as they are repeated on every page.
