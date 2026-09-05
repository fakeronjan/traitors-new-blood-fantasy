// Shared scoring config + calculations for The Traitors: New Blood fantasy league.
// Single source of truth: rules.html renders this table, index.html/log.html/history pages use it to score.

export const OWNERS = [
  { id: 'damon', name: 'Damon' },
  { id: 'em', name: 'Em' },
  { id: 'ronjan', name: 'Ronjan' },
];

// Fixed repeating pick order (not snake): Damon, Em, Ronjan, Damon, Em, Ronjan...
export const DRAFT_ORDER = ['damon', 'em', 'ronjan'];

// The winning side splits this pool evenly, same as the real prize pot - a solo winner
// takes it all, a 4-way Faithful split gets a quarter each. Deliberately NOT a flat
// per-person bonus: a rare solo win should outscore a large group split.
export const WINNER_POOL = 20;

// traitor_from_start and recruited are both pure role-timeline markers (a player is a
// Traitor from that episode on) - only "recruited" carries a point bonus, since that's
// the mid-season-flip drama the bonus is meant to reward. banished/murdered/traitor_from_start
// are 0-point structural markers, hidden from the rules table.
export const EVENT_TYPES = {
  survive:            { label: 'Survived the episode',                              points:  1 },
  mission_won:        { label: "Team's daily mission succeeded",                    points:  1 },
  advantage_won:      { label: 'Won an individual mission advantage',               points:  2 },
  murder_credit:      { label: 'Was a Traitor when the Traitors murdered someone',  points:  1 },
  banish_credit:      { label: 'Was a Faithful when a Traitor got banished',        points:  3 },
  recruited:          { label: 'Recruited as a new Traitor',                        points:  5 },
  banished:           { label: 'Banished at Roundtable',                            points:  0 },
  murdered:           { label: 'Murdered by the Traitors',                          points:  0 },
  traitor_from_start: { label: 'Started the season as a Traitor',                   points:  0 },
  final_roundtable:   { label: 'Reached the Final Roundtable',                      points:  5 },
  winner:             { label: 'Ended up on the winning side at the end',           points: null }, // dynamic: WINNER_POOL / number of winners
};

// Event types that end a player's run in the game.
const ELIMINATING_TYPES = new Set(['murdered', 'banished']);

// Event types that mark someone as a Traitor from that episode onward.
const TRAITOR_MARKER_TYPES = new Set(['traitor_from_start', 'recruited']);

export function ownerName(ownerId) {
  return OWNERS.find(o => o.id === ownerId)?.name ?? ownerId;
}

// Every currently-active Traitor gets credit for a murder (it's a collective Turret
// decision, not attributed to one person), and every currently-active Faithful gets
// credit when the house successfully banishes a Traitor. Both are derived automatically
// from role-timeline + elimination events, so nobody has to hand-log 15+ events every
// time something happens to the whole remaining cast.
export function deriveTeamCredits(players, events) {
  const traitorSinceEp = {};
  events.forEach(e => {
    if (TRAITOR_MARKER_TYPES.has(e.type)) {
      if (traitorSinceEp[e.player] === undefined || e.episode < traitorSinceEp[e.player]) {
        traitorSinceEp[e.player] = e.episode;
      }
    }
  });
  const isTraitorAt = (pid, ep) => traitorSinceEp[pid] !== undefined && ep >= traitorSinceEp[pid];

  const elimEp = {};
  events.forEach(e => {
    if (ELIMINATING_TYPES.has(e.type)) elimEp[e.player] = e.episode;
  });
  const isActiveAt = (pid, ep) => elimEp[pid] === undefined || elimEp[pid] >= ep;

  const credits = [];
  events.forEach(e => {
    if (e.type === 'murdered') {
      players.forEach(p => {
        if (p.id !== e.player && isActiveAt(p.id, e.episode) && isTraitorAt(p.id, e.episode)) {
          credits.push({ episode: e.episode, player: p.id, type: 'murder_credit' });
        }
      });
    } else if (e.type === 'banished' && isTraitorAt(e.player, e.episode)) {
      players.forEach(p => {
        if (p.id !== e.player && isActiveAt(p.id, e.episode) && !isTraitorAt(p.id, e.episode)) {
          credits.push({ episode: e.episode, player: p.id, type: 'banish_credit' });
        }
      });
    }
  });
  return credits;
}

function winnerShare(events) {
  const winnerCount = events.filter(e => e.type === 'winner').length;
  return winnerCount ? WINNER_POOL / winnerCount : 0;
}

// The point value a single logged event is actually worth, accounting for the dynamic
// winner-pool split. Used by log.html to show the right number per event.
export function pointsFor(event, events) {
  if (event.type === 'winner') return winnerShare(events);
  return EVENT_TYPES[event.type]?.points ?? 0;
}

export function computePlayerTotals(players, events) {
  const allEvents = events.concat(deriveTeamCredits(players, events));
  const share = winnerShare(allEvents);
  const totals = {};
  players.forEach(p => { totals[p.id] = 0; });
  allEvents.forEach(e => {
    const pts = e.type === 'winner' ? share : (EVENT_TYPES[e.type]?.points ?? 0);
    totals[e.player] = (totals[e.player] ?? 0) + pts;
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

export function roleLabel(playerId, events) {
  if (events.some(e => e.player === playerId && e.type === 'traitor_from_start')) return 'Traitor';
  if (events.some(e => e.player === playerId && e.type === 'recruited')) return 'Recruited Traitor';
  return 'Faithful';
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
