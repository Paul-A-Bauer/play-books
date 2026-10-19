# Rule language

Rules are plain text, one per line. They live in three places and run in this order when the player steps on a tile:

1. the **sprite rules** of the tile being entered,
2. the **level rules** of the current level,
3. the **global rules**.

Blank lines and lines starting with `//` are ignored.

## Syntax

```
on <event> [target] [if <conditions>]: <action>; <action>; ...
```

### Events

| Event | When |
| --- | --- |
| `start` | A level begins (level 0 at game start, or after `goto`). |
| `enter` | The player steps onto a tile. Fires before the move is committed, so `block` can cancel it. |

### Targets (level and global rules only)

`on enter key: ...` matches any tile whose sprite id is `key`; `on enter 3,4: ...` matches one coordinate.
Sprite rules never take a target: they apply to their own sprite.

### Conditions

`var`, `!var`, `var == n`, `var != n`, `var >= n`, `var <= n`, `var > n`, `var < n`. Join with `and`.
Unset variables read as `0`.

### Actions

| Action | Effect |
| --- | --- |
| `set v = n` | Set a variable. |
| `add v n` | Add `n` (may be negative). |
| `tile <sprite>` | Replace the tile under the player. Restoring the original sprite removes the override. |
| `block` | Cancel the move (player stays where they were). |
| `goto <level name>` | Start another level (name must match exactly). |
| `say <text>` | Message shown under the grid. Cleared on the next move. |
| `next` | Go to the next level in order (its `start` rules run). On the last level it wins the game. |
| `win` / `lose` | End the **whole game** immediately. |

## Examples

```
// sprite: key
on enter: add keys 1; tile floor; say Got a key!

// sprite: door
on enter if keys < 1: say Locked.; block
on enter if keys >= 1: add keys -1; tile floor

// sprite: goal
on enter: win

// level rule
on start: say Find the key
on enter 5,3: goto Level 2

// global rule: count steps
on enter: add steps 1
```

## Level transitions

A level ends and the next begins with `goto <level name>`. Because the destination differs per level, put the rule in the
**level rules** and mark the exit tile with a shared sprite (the demo uses `exit`):

```
// level "Maze" rules
on start: say Find the key and open the door.
on enter exit: goto Platforms
```

What carries over and what does not:

- **Variables** carry over (a key picked up in one level can open a door in another).
- **Tile changes** (`tile ...`) belong to the level they happened in and are kept if you come back.
- The new level's `start` rules run, and the player is placed at its start tile (platformer levels then fall to the ground).
- The default `goal` sprite uses `next`: it advances to the next level and wins on the last one, so a plain sequence of levels
  needs no `goto` rules. Use `win` only when finishing a level should end the entire game; the Rules tab warns about `win` in
  non-final levels and the Sprites tab offers a one-click **win → next** fix.
- `goto` after `win` would not clear the finished state; use `next` or `goto` alone.
- `goto` names must match the level name exactly. Renaming a level means updating the rules that point at it.

## Platformer levels

Set a level's **Mode** to *Platformer* on the Levels tab. Movement is still one choice per page, but the player now has
gravity:

| Action | Effect |
| --- | --- |
| walk left / right | Move one cell, then fall until standing on a `solid` tile. |
| jump | Rise up to **jump height** cells (stops at a ceiling), then fall. Only possible when standing on something. |
| jump left / right | Rise up to jump height, move up to **jump reach** cells sideways (stops at walls), then fall. |

Things to know:

- `enter` rules fire for **every cell crossed**, including cells passed while jumping or falling, in order. A pickup in
  mid-air is collected by jumping through it. `block` stops the motion at that point; `win`, `lose` and `goto` end it.
- Falling off the bottom edge of the grid loses the game ("You fell!"). Bottom-row non-solid cells are pits.
- The player always comes to rest on solid ground, so only grounded positions become pages. This keeps platformer levels small.
- Moves that would not change anything (e.g. jumping straight up under a ceiling) are not offered as links.
- Defaults: jump height 2, jump reach 2. The starter level (**+ Platformer**) uses reach 3.
- Preview keys: arrows, Up = jump, Q / E = jump left / right.

## Gotchas

- Every variable value and every changed tile multiplies the number of generated pages.
  Prefer booleans and small counters; see [EXPORT.md](EXPORT.md).
- `say` text is part of the game state, so many distinct messages also add pages.
- Rules run in a fixed order, so a level rule sees variables **before** global rules update them.
- `block` only matters in `enter` rules.
