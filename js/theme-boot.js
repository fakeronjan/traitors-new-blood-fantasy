// Runs in <head> before anything paints: tags <html> with the season being viewed so
// the per-season colors in style.css apply from the first frame. CURRENT must match
// "current" in data/league.json (season.js also re-sets this after loading it).
(function () {
  var CURRENT = 6;
  var s = Number(new URLSearchParams(location.search).get('season'));
  document.documentElement.dataset.season = s || CURRENT;
})();
