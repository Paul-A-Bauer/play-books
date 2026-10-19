# Example project: Key Quest

The project a new builder opens with. Three levels linked by transitions, covering both level modes, sprite rules,
level rules, variables that carry across levels, and a win condition.

```
Maze (grid) --exit--> Platforms (platformer) --exit--> Vault (grid) --goal--> win
```

| Level | Mode | Rules | What it demonstrates |
| --- | --- | --- | --- |
| **Maze** | grid | `on start: say ...` / `on enter exit: goto Platforms` | key and door sprites, `block`, transition to a platformer |
| **Platforms** | platformer | `on start: say ...` / `on enter exit: goto Vault` | jumping, a key you must stand on to progress, falling into the pit |
| **Vault** | grid | `on start: say ...` | the door consumes the key carried from the previous level; `goal` sprite: `next` on the last level wins |

Sprites: `floor`, `wall` (solid), `key` (`add keys 1; tile floor`), `door` (needs a key, otherwise `block`), `exit`
(no rules; each level decides where it leads), `goal` (`next`: advances to the next level, and wins on the last one).

## Walkthrough

1. **Maze:** down to the key at the bottom-left, back up, along the top corridor, down the right side through the door
   (it uses the key), onto the exit.
2. **Platforms:** walk right twice, then *jump right* onto the small platform (the key is on its right end, so you
   must stand there), *jump right* again onto the high ledge, walk right to the exit.
3. **Vault:** walk right through the door (it uses the key from level 2) to the goal.

`test/playthrough.test.js` plays exactly this route, so the example cannot silently break. The project exports to
about 150 pages.

## Using it as a pattern

- New exit: paint an `exit` tile and add `on enter exit: goto <Next Level>` to that level's rules.
- Carrying state between levels: use variables (`keys`, `has_lantern`, ...) rather than separate level copies.
- Keep the first level small; players meet the transition early and you notice mistakes sooner.
