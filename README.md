# The Traitors: New Blood - Fantasy League

Family fantasy draft league for NBC's *The Traitors: New Blood* (Season 1, premieres Sept 17, 2026). All 22 castmates get drafted across three owners (Damon, Em, Ronjan) before the premiere, then score points episode by episode based on what happens to them in the game.

Static site, no backend. Deployed via GitHub Pages from `main`.

## Structure

- `data/players.json` - the 22 castmates and their draft assignment (`owner`, `pick`). Starts with every `owner` as `null` until the live draft happens.
- `data/events.json` - the episode-by-episode event log that drives scoring. Append new events here after each episode airs, then commit and push.
- `js/scoring.js` - single source of truth for owners, draft order, and the point value of every event type. `rules.html` renders its table straight from this file.
- `draft.html` - the live draft tool. Runs entirely in the browser (state saved to `localStorage`); use "Download Results" when the draft is done and commit the downloaded file over `data/players.json`.

## Logging an episode

Add one object per event to `data/events.json`:

```json
{ "episode": 1, "player": "abbey-benjamin", "type": "survive" }
```

Valid `type` values are the keys in `EVENT_TYPES` in `js/scoring.js`. Optional `"note"` field shows up in the episode log for context.
