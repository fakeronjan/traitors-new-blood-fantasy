import fs from 'fs';
import { computePlayerTotals, deriveTeamCredits, roleLabel, EVENT_TYPES, WINNER_POOL } from '../js/scoring.js';
const tags = JSON.parse(fs.readFileSync(new URL('./tags.json', import.meta.url)));
const rows = [];
for (const s of [1,2,3,4]) {
  const players = JSON.parse(fs.readFileSync(`../data/history/season-${s}/players.json`));
  const events = JSON.parse(fs.readFileSync(`../data/history/season-${s}/events.json`));
  const all = events.concat(deriveTeamCredits(players, events));
  const totals = computePlayerTotals(players, events);
  const nW = all.filter(e=>e.type==='winner').length;
  for (const p of players) {
    const prop = tags.players[p.name]; if (!prop) throw new Error('untagged '+p.name);
    const mine = all.filter(e=>e.player===p.id);
    const sum = types => mine.filter(e=>types.includes(e.type)).reduce((a,e)=>a+(e.type==='winner'?WINNER_POOL/nW:EVENT_TYPES[e.type].points),0);
    rows.push({ season:s, name:p.name, prop, group:tags.groups[prop], role:roleLabel(p.id,events),
      total:totals[p.id],
      longevity: sum(['survive','mission_won','advantage_won','final_roundtable']),
      roleBased: sum(['murder_credit','banish_credit','recruited']),
      winner: sum(['winner']),
      episodes: mine.filter(e=>e.type==='survive').length });
  }
}
fs.writeFileSync('backtest_rows.json', JSON.stringify(rows,null,1));
const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
const overall = mean(rows.map(r=>r.total));
const sd = a => { const m=mean(a); return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1)); };
console.log('players', rows.length, 'overall mean', overall.toFixed(1), 'sd', sd(rows.map(r=>r.total)).toFixed(1));
function table(key){
  const g={}; rows.forEach(r=>(g[r[key]]??=[]).push(r));
  // empirical-Bayes shrinkage: k = within-var / between-var
  const within = mean(Object.values(g).filter(x=>x.length>1).map(x=>sd(x.map(r=>r.total))**2));
  const gm = Object.values(g).map(x=>mean(x.map(r=>r.total)));
  const between = Math.max(1e-6, sd(gm)**2 - within/ mean(Object.values(g).map(x=>x.length)));
  const k = within/between;
  console.log(`\n== by ${key}  (shrink k=${k.toFixed(1)})`);
  const out = Object.entries(g).map(([name,x])=>{const m=mean(x.map(r=>r.total)); const n=x.length;
    return {name,n,mean:m,shrunk:(n*m+k*overall)/(n+k),med:x.map(r=>r.total).sort((a,b)=>a-b)[Math.floor(n/2)],
      longev:mean(x.map(r=>r.longevity)),role:mean(x.map(r=>r.roleBased)),win:mean(x.map(r=>r.winner)),
      traitorRate:x.filter(r=>r.role!=='Faithful').length/n, eps:mean(x.map(r=>r.episodes)),
      best:x.sort((a,b)=>b.total-a.total)[0]}}).sort((a,b)=>b.shrunk-a.shrunk);
  out.forEach(o=>console.log(`${o.name.padEnd(30)} n=${String(o.n).padStart(2)} mean=${o.mean.toFixed(1).padStart(5)} shrunk=${o.shrunk.toFixed(1).padStart(5)} med=${o.med.toFixed(1).padStart(5)} | longev ${o.longev.toFixed(1).padStart(5)} role ${o.role.toFixed(1).padStart(4)} win ${o.win.toFixed(1).padStart(4)} | eps ${o.eps.toFixed(1)} traitor ${(o.traitorRate*100).toFixed(0)}% | best ${o.best.name} ${o.best.total.toFixed(1)}`));
  return {k,out};
}
const G = table('group'); const P = table('prop');
// leave-one-season-out: does knowing the group beat just guessing the average?
for (const key of ['group','prop']) {
  let errBase=0, errGrp=0; const pairs=[];
  for (const s of [1,2,3,4]) {
    const train=rows.filter(r=>r.season!==s), test=rows.filter(r=>r.season===s);
    const om=mean(train.map(r=>r.total)); const g={}; train.forEach(r=>(g[r[key]]??=[]).push(r.total));
    const k = key==='group'?G.k:P.k;
    for (const r of test){ const x=g[r[key]]||[]; const pred=x.length?(x.length*mean(x)+k*om)/(x.length+k):om;
      errBase+=Math.abs(r.total-om); errGrp+=Math.abs(r.total-pred); pairs.push([pred,r.total]); }
  }
  const px=pairs.map(p=>p[0]), py=pairs.map(p=>p[1]); const mx=mean(px),my=mean(py);
  const corr=pairs.reduce((a,[x,y])=>a+(x-mx)*(y-my),0)/Math.sqrt(px.reduce((a,x)=>a+(x-mx)**2,0)*py.reduce((a,y)=>a+(y-my)**2,0));
  console.log(`\nLOSO ${key}: MAE baseline ${(errBase/rows.length).toFixed(2)} vs by-${key} ${(errGrp/rows.length).toFixed(2)}  corr ${corr.toFixed(2)}`);
}
// excluding civilians (Season 5 / id 6 has none)
const celeb = rows.filter(r=>r.group!=='Civilians');
console.log('\ncelebs only mean', mean(celeb.map(r=>r.total)).toFixed(1), 'n', celeb.length, '| civilians mean', mean(rows.filter(r=>r.group==='Civilians').map(r=>r.total)).toFixed(1));
fs.writeFileSync('group_stats.json', JSON.stringify({overall, group:G, prop:P},null,1));
