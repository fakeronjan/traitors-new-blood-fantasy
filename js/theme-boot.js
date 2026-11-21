// Runs in <head> before anything paints: tags <html> with the season being viewed so
// the per-season colors in style.css apply from the first frame. CURRENT must match
// "current" in data/league.json (season.js also re-sets this after loading it).
(function () {
  var CURRENT = 6;
  var s = Number(new URLSearchParams(location.search).get('season'));
  var page = location.pathname.split('/').pop();
  // Past Seasons (the S1-4 backtests) always uses the current season's look.
  document.documentElement.dataset.season = (page !== 'season.html' && s) ? s : CURRENT;
})();
