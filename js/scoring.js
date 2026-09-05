// Shared scoring config + calculations for The Traitors: New Blood fantasy league.
// Single source of truth: rules.html renders this table, index.html and log.html use it to score.

export const OWNERS = [
  { id: 'damon', name: 'Damon' },
  { id: 'em', name: 'Em' },
  { id: 'ronjan', name: 'Ronjan' },
];

// Fixed repeating pick order (not snake): Damon, Em, Ronjan, Damon, Em, Ronjan...
export const DRAFT_ORDER = ['damon', 'em', 'ronjan'];

export const EVENT_TYPES = {
  survive:           { label: 'Survived the episode',                    points:  1 },
  mission_won:       { label: "Team's daily mission succeeded",          points:  1 },
  advantage_won:     { label: 'Won an individual mission advantage',     points:  2 },
  murder_committed:  { label: 'Committed a murder undetected',          points:  3 },
  recruited:         { label: 'Recruited as a new Traitor',              points:  5 },
  banished:          { label: 'Banished at Roundtable',                  points: -3 },
  murdered:          { label: 'Murdered by the Traitors',                points: -5 },
  final_roundtable:  { label: 'Reached the Final Roundtable',            points: 10 },
  traitor_win_bonus: { label: 'Traitor who survived undetected and won', points: 10 },
  winner:            { label: 'Ended up on the winning side at the end', points: 20 },
};

// Event types that end a player's run in the game.
const ELIMINATING_TYPES = new Set(['murdered', 'banished']);

export function ownerName(ownerId) {
  return OWNERS.find(o => o.id === ownerId)?.name ?? ownerId;
}

export function computePlayerTotals(players, events) {
  const totals = {};
  players.forEach(p => { totals[p.id] = 0; });
  events.forEach(e => {
    const def = EVENT_TYPES[e.type];
    if (!def) return;
    totals[e.player] = (totals[e.player] ?? 0) + def.points;
  });
  return totals;
}

export function computeOwnerTotals(players, events) {
  const playerTotals = computePlayerTotals(players, events);
  const ownerTotals = {};
  OWNERS.forEach(o => { ownerTotals[o.id] = 0; });
  players.forEach(p => {
    if (p.owner && ownerTotals[p.owner] !== undefined) {
      ownerTotals[p.owner] += playerTotals[p.id] ?? 0;
    }
  });
  return { playerTotals, ownerTotals };
}

export function playerStatus(playerId, events) {
  const playerEvents = events
    .filter(e => e.player === playerId)
    .sort((a, b) => a.episode - b.episode);
  const elimination = playerEvents.find(e => ELIMINATING_TYPES.has(e.type));
  if (elimination) {
    return { eliminated: true, episode: elimination.episode, type: elimination.type };
  }
  return { eliminated: false };
}

export async function loadData() {
  const [players, events] = await Promise.all([
    fetch('data/players.json').then(r => r.json()),
    fetch('data/events.json').then(r => r.json()),
  ]);
  return { players, events };
}
