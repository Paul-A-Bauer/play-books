# Roadmap

**Done:** project import / save JSON (v0.2), turn-based platformer mode (v0.3), linked example levels with transitions (v0.3.1), containerized build server that outputs ePUBs with Storyteller (v0.4).

## Design principle

The builder should not shape the games made with it. The engine provides state, rules and rendering primitives; the
**interface, controls and rules are authored content**. Anything the tool ships by default (arrows, a message line, a
variable readout, a "play again" link) must be a removable template, never hard-wired behavior.

Ideas in rough priority order. Items 1 and 2 decide whether games are playable on the e-ink readers this tool targets.
Items 3-5 are one design (author-owned interface) and should be built in that order; item 4 also determines how link order
and focus work for item 1, so the on-device link test in item 1 can happen first but its layout work should follow item 4.

## Target devices

Primary example: the **Xteink X3**, a pocket e-ink reader with a 3.7-inch screen (about 259 PPI), physical page-turn buttons
instead of a touchscreen, a gyroscope for shake/tilt page turns, no frontlight, and EPUB support. Its sibling, the
**Xteink X4** (4.3-inch, about 220 PPI), is also button-only. Both can run Xteink's own firmware or the open-source
CrossPoint Reader. Sources:
[Liliputing](https://liliputing.com/xteink-x3-is-an-even-smaller-ereader-3-7-inch-e-ink-device-for-79/),
[Six Colors](https://sixcolors.com/post/2026/07/review-xteink-x3-is-the-little-e-reader-the-worlds-not-quite-ready-for/),
[Xteink](https://www.xteink.com/s/amethystjuliet6). Details change with firmware; verify on a real device.

specifically to support as many ereader devices as possible we need to support
- maintaining layout integrity on verying screen sizes
- little to no css support on many devices
- limited fonts and character sets(asccii)

## Upcoming

1. **Proper support for devices without touch**
   - **Find out first how links work with buttons.** Games are navigated by following ePUB hyperlinks. On a button-only
     reader the link must be reachable by focus/next-link navigation or an equivalent firmware feature, and this differs between
     firmwares. Test the demo export on stock firmware and on CrossPoint Reader, record the behavior (link focus, selection key,
     link order, back navigation) in `docs/DEVICES.md`, and design around it. This needs on-device testing.
   - **Check what the page-turn buttons do.** Storyteller lists every generated page in the ePUB spine in generation order, so
     pressing page-turn on a button-only reader moves to an unrelated game state. The build server is the place to post-process
     this (for example mark non-start pages `linear="no"`), but readers differ, so test it on a device first.
   - **Predictable link order and few links.** Emit action links in a fixed order per page (same direction always in the same
     position), most common first, with no dead or duplicate links (already filtered by `state.actions()`). Once controls are
     sprites (item 4), the designer sets the focus order explicitly.
   - **One screen per page.** Page-turn buttons turn pages instead of scrolling, so a game page must fit on a single screen:
     device profiles (screen size and density) that set tile size, font size and layout, with no overflow or page breaks.
   - **Numbered or labelled choices** as an alternative layout, in case links cannot be focused directly.
   - **Button-only preview mode** that emulates the device: focus ring, next/previous link, select, and the device's aspect ratio.
   - **Builder access without a pointer**: keyboard-operable tabs, palette and grid editing.
2. **Grayscale and black & white preview** for e-ink
   - Preview display modes: full color, 16-level grayscale, 4-level, and 1-bit black & white (threshold or dithered),
     applied to the grid, sprites and images, in both the Levels editor and the Preview tab.
   - **Legibility lint**: warn when two tiles that matter (wall vs floor, key vs floor, exit vs goal) become nearly
     indistinguishable in grayscale or 1-bit, and suggest a contrast fix.
   - **Pattern and glyph fills** (hatch, dots, solid, outline) so tiles stay distinguishable in black & white.
   - **E-ink export option** that converts sprite colors and images to grayscale, patterns or 1-bit at export time.
   - Device frame presets (screen size and PPI) so the preview shows true physical size.
   - Keep layouts stable from page to page (controls in the same place) to limit visible change between pages.
3. **Sprite templates and a sprite library** (foundation for items 4 and 5)
   - A **template** is a reusable sprite definition: appearance (glyph, image, color, pattern), `solid`, rules, an optional
     control binding (item 4), and **parameters**, e.g. `door(key = keys, cost = 1)` or `exit(to = <level>)`.
   - **Default templates** ship as a standard library (floor, wall, key, door, exit, goal, and the control templates in item 4).
     They are copied into a project when chosen and are fully editable or deletable; nothing is hard-wired.
   - Create a sprite from a template (copy by default, with "reset to template"; decide whether to support linked templates
     with overrides), save templates at project level, and import/export **template packs** as JSON to share between projects.
   - **Per-instance properties**: a placed tile can carry parameters (this exit goes to "Platforms", that door needs 2 keys).
     This replaces today's pattern of per-level rules keyed on a shared sprite id or coordinates.
   - Lint for missing or invalid parameters; docs for authoring templates.
4. **Controls as sprites on the level / grid**
   - A **control sprite** is a tile that performs an action when followed. It is bound to a built-in action (`left`, `right`,
     `up`, `down`, `jump`, `jump-left`, `jump-right`, `wait`, `restart`, `next level`) or to custom rules through a new
     `on press` event.
   - Designers place controls in the level grid or on a dedicated **UI layer**: the same coordinate system, independent of the
     world view, not part of game state. A d-pad below the map, a single "continue" button, or a control inside the world are
     all just placement choices.
   - A control renders as a link only while its action would change the state, and otherwise shows an inert appearance
     (set per template). Positions stay identical on every page, which also gives a stable layout on e-ink.
   - **Key bindings** per control for the preview and keyboards (no baked-in arrow-key map) and designer-set **focus order**
     for button-only devices.
   - **Default control templates**: 4-way d-pad, platformer set (left, right, jump, jump-left, jump-right), restart,
     wait/skip, "tap to continue" and an action/interact button, plus **layout presets** that stamp a whole control cluster
     onto the UI layer in one step.
   - Lint: a level with no controls, or a built-in action with no control that triggers it.
   - Engine: a generic `do(action)` / `can(action)` pair replaces the fixed action list. Walking and jumping stay as the
     implementation of the built-in actions. The Pug template emits `goto(state.next(id), s => s.do(id))` per control sprite.
5. **Remove the baked-in UI and controls**
   - Today the exported level template hard-codes a title, message line, variable dump, arrow links, "Play again" and
     "No moves possible", and the preview hard-codes a d-pad.
   - Turn each into an optional authored element: **text/readout sprites** (message, variable display like `Keys: {keys}`,
     title, win/lose banner), restart and continue as controls, game-over screens as ordinary levels or state-driven sprites.
     The default Pug template shrinks to "render the layers".
   - The preview shows exactly the authored screen, with an optional author-only "debug pad" toggle.
   - **Migration**: projects from v0.x import with a generated "classic layout" (d-pad cluster, message, variables) so
     existing games look and play the same. "Classic UI" also stays available as a layout preset.
   - Builder-only tooling (page-count estimate, lint) is unaffected.
6. **Background images for levels**
   - Per-level backdrop image shown behind the tile grid (tiles can be transparent to reveal it) or in place of it.
   - Fit options (stretch / cover / contain / pixel-exact) and opacity.
   - Export as a shared file in the ePUB (`img/<level>.png` referenced by every page) instead of a data URI, since every
     generated page repeats its markup and the file size would multiply.
   - Optional per-level parallax-free "foreground" overlay image for decoration.
7. **Custom grid sizing** for more flexible level design
   - Sizes beyond 30x30 and non-square **tile dimensions** (width/height per level, not only square cells).
   - Resize from any edge or corner (add/remove rows and columns where you choose, keeping existing tiles in place).
   - A scrolling **viewport**: render only a window of N x M tiles around the player so large levels still fit an ePUB page.
     Note the page count is unaffected by what is drawn, only by reachable states.
   - Per-level tile pixel size, and a grid zoom control in the editor.
8. **Pushable blocks** (Sokoban) as a built-in action, with state-size warnings.
9. **Tile layers** (background, objects) and multi-tile sprites. The UI layer used for control sprites (item 4) is a layer type, so plan the two together.
10. **Movable entities** with simple deterministic patrol rules (state-size permitting).
11. **Platformer extras**: ladders and climbable tiles, one-way platforms, a configurable "what happens at the bottom edge"
   (lose / wrap / solid), `on fall` and `on land` events.
12. **Sprite sheet import** and per-sprite animation frames for ePUB readers that support them.
13. **CLI** (`npm run build:epub game.json`) that reuses `server/build.js`, for headless and CI builds.
14. **Undo/redo** and tile fill/rectangle tools in the Levels tab.
15. **Rule editor niceties**: syntax highlighting, variable autocomplete, jump-to-line from lint errors.
16. **Import niceties**: drag-and-drop files, merge a level from another project, read hand-edited `.pug` back.
17. **Server-side project storage**: save and list projects on the server volume, with autosave, instead of only browser storage.
18. **Multi-user hardening**: authentication, per-user quotas and rate limiting, for running the service for people who do not trust each other.
