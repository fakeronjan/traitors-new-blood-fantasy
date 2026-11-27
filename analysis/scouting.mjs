// Builds data/seasons/6/scouting.json: a for-fun A/B/C tier per Season 5 player (internal id 6), from how
// their category scored in the Season 1-4 backtests under the league's rules.
// Tiers are cast thirds by category average; a category is never split across tiers,
// so sizes land as close to equal as the ties allow. Run: node analysis/scouting.mjs
import fs from 'fs';
const here = new URL('.', import.meta.url);
const tags = JSON.parse(fs.readFileSync(new URL('tags.json', here)));
const rows = JSON.parse(fs.readFileSync(new URL('backtest_rows.json', here)));
const SHORT = { 'Other reality & personalities': 'Other reality' };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

const stats = {};
for (const r of rows) (stats[r.group] ??= []).push(r);
const catOf = id => tags.groups[tags.season6[id]];
const cast = Object.keys(tags.season6).map(id => ({ id, cat: catOf(id), avg: mean(stats[catOf(id)].map(r => r.total)) }));

// Category blocks in score order, then pick the two cut points closest to equal thirds.
const blocks = [...new Set(cast.map(c => c.cat))]
  .map(cat => ({ cat, avg: cast.find(c => c.cat === cat).avg, n: cast.filter(c => c.cat === cat).length }))
  .sort((a, b) => b.avg - a.avg);
const cum = []; blocks.reduce((s, b) => { cum.push(s + b.n); return s + b.n; }, 0);
const N = cast.length; let best;
for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length - 1; j++) {
  const sizes = [cum[i], cum[j] - cum[i], N - cum[j]];
  const dev = Math.max(...sizes.map(s => Math.abs(s - N / 3)));
  if (!best || dev < best.dev) best = { i, j, dev, sizes };
}
const tierOf = cat => { const k = blocks.findIndex(b => b.cat === cat); return k <= best.i ? 'A' : k <= best.j ? 'B' : 'C'; };

// Plain facts beside the tier (Ronjan 2026-11-27): a past Survivor/Big Brother/Challenge/Amazing Race
// win, and castmates from the same show or a real-life tie (analysis/variables.json). Facts only:
// neither predicted scores in the held-out test (analysis/variables.mjs)
const V = JSON.parse(fs.readFileSync(new URL('variables.json', here)));
const cast6 = JSON.parse(fs.readFileSync(new URL('../data/seasons/6/players.json', here)));
const nameOf = id => cast6.find(p => p.id === id).name;
const first = n => n.split(' ')[0];
const castmatesOf = id => {
  const n = nameOf(id), mine = V.shows[n] || [];
  return cast6.map(p => p.name).filter(o => o !== n &&
    ((V.shows[o] || []).some(s => mine.includes(s)) || V.ties.some(t => t.includes(n) && t.includes(o)))).map(first);
};

const out = {};
for (const c of cast) {
  const top = stats[c.cat].slice().sort((a, b) => b.total - a.total)[0];
  out[c.id] = { tier: tierOf(c.cat), category: SHORT[c.cat] ?? c.cat, avg: Math.round(c.avg), best: { name: top.name, score: Math.round(top.total) },
    past_winner: V.winner.includes(nameOf(c.id)), castmates: castmatesOf(c.id) };
}
fs.writeFileSync(new URL('../data/seasons/6/scouting.json', here), JSON.stringify(out, null, 2) + '\n');
console.log('tier sizes', best.sizes.join('/'));
blocks.forEach(b => console.log(tierOf(b.cat), b.cat, b.avg.toFixed(1), b.n));
