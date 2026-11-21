// Runs in <head> before anything paints: tags <html> with the season being viewed so
// the per-season colors in style.css apply from the first frame. CURRENT and SLUG_TO_ID
// must match data/league.json (season.js also re-sets this after loading it).
(function () {
  var CURRENT = 6;
  var SLUG_TO_ID = { 'new-blood': 5, '5': 6 };  // mirrors "slug" in data/league.json
  var s = SLUG_TO_ID[new URLSearchParams(location.search).get('season')];
  document.documentElement.dataset.season = s || CURRENT;
})();
