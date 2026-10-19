// Rule-language help text and lint patterns (mirror the parser in engine/game.js).
const HELP=`on start: set keys = 0            level begins
on enter: <actions>               player steps onto this tile
on enter <sprite|x,y> if keys >= 1: ...   (level/global rules)
Level transition (the demo does this): on enter exit: goto Next Level
Sprite rules: no target, e.g.  on enter: add keys 1; tile floor
Conditions: var | !var | var >= n  (== != < > <=), join with "and"
Actions (;-separated): set v = n | add v n | tile <sprite> | block | goto <level name> | say text | next | win | lose
next = go to the next level (wins on the last one); win = end the whole game
Comments: lines starting with //`;
const RULE=/^on (\w+)(?:\s+(?!if\b)([^\s:]+))?(?:\s+if\s+([^:]+))?\s*:\s*(.*)$/;
const ACT=/^(set \w+\s*=\s*-?\d+|add \w+ -?\d+|tile \w+|block|win|lose|next|goto .+|say .+)$/;
