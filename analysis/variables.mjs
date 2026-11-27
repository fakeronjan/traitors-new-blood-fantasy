// Tests draft-scouting variables (analysis/variables.json) against past scores: Seasons 1-4 backtests
// (analysis/backtest_rows.json) plus New Blood. Leave-one-season-out: predict each held-out season from
// the others and compare the error with guessing the average. Run: node analysis/variables.mjs
import fs from 'fs';
import { computePlayerTotals } from '../js/scoring.js';
const here = new URL('.', import.meta.url);
const V = JSON.parse(fs.readFileSync(new URL('variables.json', here)));
const rows = JSON.parse(fs.readFileSync(new URL('backtest_rows.json', here))).map(r => ({ season: r.season, name: r.name, total: r.total, role: r.role }));
const nbP = JSON.parse(fs.readFileSync(new URL('../data/seasons/5/players.json', here)));
const nbE = JSON.parse(fs.readFileSync(new URL('../data/seasons/5/events.json', here)));
const nbT = computePlayerTotals(nbP, nbE);
nbP.forEach(p => rows.push({ season: 5, name: p.name, total: nbT[p.id], age: p.age }));

const F = new Set(V.F), W = new Set(V.winner);
const tied = n => V.ties.some(t => t.includes(n));
for (const r of rows) {
  const mates = rows.filter(o => o.season === r.season && o.name !== r.name);
  const mine = V.shows[r.name] || [];
  r.gender = F.has(r.name) ? 'F' : 'M';
  r.winner = W.has(r.name) ? 'yes' : 'no';
  r.ally = tied(r.name) || mates.some(o => (V.shows[o.name] || []).some(s => mine.includes(s))) ? 'yes' : 'no';
  r.traitor = r.role ? (r.role === 'Faithful' ? 'no' : 'yes') : null;
}
// season-relative score: share of the season's mean, so long and short seasons compare
const seasons = [...new Set(rows.map(r => r.season))];
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
for (const s of seasons) { const m = mean(rows.filter(r => r.season === s).map(r => r.total)); rows.filter(r => r.season === s).forEach(r => r.rel = r.total / m); }

function report(key, pool, label) {
  const g = {}; pool.forEach(r => (g[r[key]] ??= []).push(r));
  const parts = Object.entries(g).map(([k, x]) => `${k}: n=${x.length} avg ${mean(x.map(r => r.total)).toFixed(1)} rel ${mean(x.map(r => r.rel)).toFixed(2)}`);
  let eb = 0, ev = 0, wins = 0;
  const ss = [...new Set(pool.map(r => r.season))];
  for (const s of ss) {
    const tr = pool.filter(r => r.season !== s), te = pool.filter(r => r.season === s);
    const om = mean(tr.map(r => r.rel)); const gm = {}; tr.forEach(r => (gm[r[key]] ??= []).push(r.rel));
    let b = 0, v = 0;
    for (const r of te) { const x = gm[r[key]]; const p = x ? mean(x) : om; b += Math.abs(r.rel - om); v += Math.abs(r.rel - p); }
    eb += b; ev += v; if (v < b) wins++;
  }
  console.log(`${label.padEnd(26)} ${parts.join(' | ')}\n${''.padEnd(26)} held-out error: average ${(eb / pool.length).toFixed(3)} vs variable ${(ev / pool.length).toFixed(3)} (${ev < eb ? 'BETTER' : 'worse'}; better in ${wins} of ${ss.length} seasons)`);
}
const celeb = rows.filter(r => r.season <= 4 && !['Civilian'].includes(r.name) );
console.log('players', rows.length);
report('gender', rows, 'gender (all 5 seasons)');
report('winner', rows.filter(r => r.season <= 4), 'winner (S1-4)');
report('ally', rows.filter(r => r.season <= 4), 'ally (S1-4)');
const tr = rows.filter(r => r.traitor);
for (const k of ['gender', 'winner', 'ally']) {
  const g = {}; tr.forEach(r => (g[r[k]] ??= []).push(r));
  console.log(`Traitor rate by ${k}:`, Object.entries(g).map(([v, x]) => `${v} ${x.filter(r => r.traitor === 'yes').length}/${x.length}`).join(' | '));
}
fs.writeFileSync(new URL('variable_rows.json', here), JSON.stringify(rows, null, 1));
