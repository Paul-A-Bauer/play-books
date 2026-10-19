// Counts the pages Storyteller would generate (reachable game states), stopping at `max`.
// Shared by the Preview tab and the build server's size limit.
function stableKey(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(stableKey).join(',') + ']';
  return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + stableKey(o[k])).join(',') + '}';
}
function estimatePages(P, max = 5000) {
  Game.configure(P);
  const s0 = new Game(), seen = new Set([stableKey(s0)]), q = [s0];
  while (q.length && seen.size < max) {
    const s = q.pop();
    for (const a of s.actions()) {
      const g = s.clone();
      g.move(a.dx, a.dy);
      const k = stableKey(g);
      if (!seen.has(k)) { seen.add(k); q.push(g); }
    }
  }
  return { n: seen.size, full: !q.length };
}
