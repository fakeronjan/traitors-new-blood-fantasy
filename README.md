# The Traitors - Family Fantasy League

Family fantasy draft league for NBC/Peacock's *The Traitors*. Every castmate gets drafted across three owners (Damon, Em, RJ) before the premiere, then scores points episode by episode based on what happens to them in the game. The site follows NBC's numbering: *The Traitors: New Blood* (fall 2026, Em won) is unnumbered, and Season 5 is the next celebrity season (early 2027).

**Season ids vs. labels:** each league season has an internal numeric `id` (the folder under `data/seasons/` and `img/seasons/`), a `label` shown on the site, and a `slug` used in `?season=` links. New Blood = id 5, slug `new-blood`. Season 5 = id 6, slug `5`.

Static site, no backend. Deployed via GitHub Pages from `main`.

## Structure

- `data/league.json` - every league season: show name, draft order, premiere/credit text, draft rules copy, and the champion. `current` (an id) is the season pages show by default; `?season=<slug>` shows another one.
- `data/seasons/N/players.json` - that season's cast and draft assignment (`owner`, `pick`). Every `owner` is `null` until the live draft happens. Photos live in `img/seasons/N/`.
- `data/seasons/N/events.json` - that season's episode-by-episode event log. Append new events after each episode airs, then commit and push.
- `js/scoring.js` - owners and the point value of every event type (one ruleset for all seasons so far). `rules.html` renders its table straight from this file.
- `js/season.js` - season lookup, the season switcher, and the reigning-champion badge.
- `js/theme-boot.js` - sets each page's season colors before first paint. Its `CURRENT` and `SLUG_TO_ID` must match `data/league.json`; per-season colors live at the top of `style.css`.
- `draft.html` - the live draft tool. Runs entirely in the browser (state saved to `localStorage`, per season); use "Download Results" when the draft is done and commit the downloaded file over `data/seasons/N/players.json`.
- `data/history/` - the Season 1-4 backtests on the Past Seasons page (not real family leagues).

## Logging an episode

Add one object per event to `data/seasons/N/events.json`:

```json
{ "episode": 1, "player": "abbey-benjamin", "type": "survive" }
```

Valid `type` values are the keys in `EVENT_TYPES` in `js/scoring.js`. Optional `"note"` field shows up in the episode log for context.

## Draft scouting tiers

The A/B/C pills on Season 5 draft cards are a for-fun extra, not a vetted projection. `analysis/tags.json` tags every Season 1-4 player and Season 5 castmate by where they came from; `node analysis/analyze.mjs` scores the backtests by category (and shows category didn't predict scores out of sample); `node analysis/scouting.mjs` writes `data/seasons/N/scouting.json`, splitting the cast into thirds by category average without splitting a category. A season shows tiers only when `data/league.json` sets `"scouting": true`.
