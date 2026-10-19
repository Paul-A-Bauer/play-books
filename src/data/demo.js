// Level factory and the demo project.
function mk(name,w,hh,rows){const m={'#':'wall','.':'floor',k:'key',d:'door',g:'goal',e:'exit'};let st={x:1,y:1};const grid=Array.from({length:hh},(_,y)=>Array.from({length:w},(_,x)=>{const ch=rows?rows[y][x]:(x==0||y==0||x==w-1||y==hh-1?'#':'.');if(ch==='@'){st={x,y};return 'floor'}return m[ch]}));return{name,w,h:hh,grid,start:st,rules:''}}
// Demo: "Key Quest", three linked levels.
//   Maze (grid)  --exit-->  Platforms (platformer)  --exit-->  Vault (grid, win)
// Transitions are level rules: `on enter exit: goto <level name>`. Variables (keys) carry across levels.
function demo() {
  const maze = mk('Maze', 9, 7, ['#########', '#@......#', '#.#####.#', '#.#...#.#', '#.#.#.#d#', '#k..#..e#', '#########']);
  maze.rules = 'on start: say Find the key and open the door.\non enter exit: goto Platforms';
  const plat = mkPlatformer('Platforms', 'exit');
  plat.grid[4][5] = 'key'; // on the small platform: you must stand here to reach the high ledge
  plat.rules = 'on start: say Jump the pit and grab the key on the platform.\non enter exit: goto Vault';
  const vault = mk('Vault', 9, 3, ['#########', '#@..d..g#', '#########']);
  vault.rules = 'on start: say The vault door needs the key you found.';
  return {
    title: 'Key Quest', author: '', vars: { keys: 0 }, rules: '', template: TEMPLATES.level,
    sprites: [
      { id: 'player', glyph: '\u{1F642}', color: '#e8e2d0', solid: false, rules: '' },
      { id: 'floor', glyph: '', color: '#e8e2d0', solid: false, rules: '' },
      { id: 'wall', glyph: '', color: '#44475a', solid: true, rules: '' },
      { id: 'key', glyph: '\u{1F511}', color: '#e8e2d0', solid: false, rules: 'on enter: add keys 1; tile floor; say Got a key!' },
      { id: 'door', glyph: '\u{1F6AA}', color: '#c98f4a', solid: false, rules: 'on enter if keys < 1: say Locked.; block\non enter if keys >= 1: add keys -1; tile floor' },
      { id: 'exit', glyph: '\u{1F300}', color: '#7aa6e8', solid: false, rules: '' },
      { id: 'goal', glyph: '\u2B50', color: '#f6d860', solid: false, rules: 'on enter: next' }
    ],
    levels: [maze, plat, vault]
  };
}

// Turn-based platformer starter level: ground with a pit, a small platform, and a goal on a high ledge.
function mkPlatformer(name, goal) {
  const L = mk(name, 12, 8, [
    '............',
    '............',
    '..........g.',
    '........####',
    '............',
    '....##......',
    '@...........',
    '######.#####'
  ]);
  L.grid[2][10] = goal || 'goal';
  L.mode = 'platformer'; L.jumpHeight = 2; L.jumpReach = 3;
  return L;
}
