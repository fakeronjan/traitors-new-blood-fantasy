// Which league season a page is showing, plus the shared page chrome that changes
// by season (show title, footer, season switcher, champion badge).
// data/league.json lists every real family-league season; "current" is the default.
// ?season=N on any page shows that season instead.

export async function loadLeague() {
  const league = await fetch('data/league.json').then(r => r.json());
  const requested = Number(new URLSearchParams(location.search).get('season'));
  const season = league.seasons.find(s => s.id === requested)
    ?? league.seasons.find(s => s.id === league.current);
  return { league, season };
}

// Points nav links at the same season, fills in the title/footer, and draws the
// season switcher (only on pages that have a #league-season-tabs slot).
export function applySeasonChrome(league, season) {
  const isCurrent = season.id === league.current;
  document.documentElement.dataset.season = season.id;
  const suffix = isCurrent ? '' : `?season=${season.id}`;

  document.querySelectorAll('nav.main-nav a').forEach(a => {
    a.setAttribute('href', a.getAttribute('href').split('?')[0] + suffix);
  });

  const title = document.querySelector('h1.site-title');
  if (title) title.textContent = season.show;
  document.title = `${season.show} - Fantasy League`;

  const footer = document.querySelector('.site-footer');
  if (footer) footer.textContent = `${season.premiere} ${season.footer_credit}`;

  const tabs = document.getElementById('league-season-tabs');
  if (tabs) {
    const page = location.pathname.split('/').pop() || 'index.html';
    tabs.innerHTML = league.seasons.map(s => {
      const href = s.id === league.current ? page : `${page}?season=${s.id}`;
      return `<a href="${href}" class="${s.id === season.id ? 'active' : ''}">${s.label}</a>`;
    }).join('');
  }
}

// Small "👑 S5" badge next to the reigning champion's name in the following season.
export function champBadge(ownerId, season) {
  const c = season.prior_champion;
  if (!c || c.owner !== ownerId) return '';
  return ` <span class="champ-badge" title="Season ${c.season} champion">👑 S${c.season}</span>`;
}

export function champBadgeText(ownerId, season) {
  const c = season.prior_champion;
  return c && c.owner === ownerId ? ` 👑 S${c.season}` : '';
}

// Reference lines under a player's name. Civilian casts (Season 5) have age,
// job, and hometown; celebrity casts have what they're known for.
export function metaLines(p) {
  if (p.known_for) return [p.known_for];
  return [`${p.age} &middot; ${p.profession}`, p.hometown];
}

// How a player's run ended, in the same words as the backtest data's fate_summary.
export function fateSummary(playerId, events) {
  const mine = events.filter(e => e.player === playerId);
  if (mine.some(e => e.type === 'winner')) return 'Made the finale (winner)';
  const out = mine.find(e => ['murdered', 'banished', 'left'].includes(e.type));
  if (out) {
    const verb = { murdered: 'Murdered', banished: 'Banished', left: 'Left the game' }[out.type];
    return `${verb} Episode ${out.episode}`;
  }
  if (mine.some(e => e.type === 'final_roundtable')) return 'Made the finale (runner-up)';
  return 'Still in the game';
}
