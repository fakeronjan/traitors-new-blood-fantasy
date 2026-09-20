// Reports document height to the parent frame so fakeronjan.com can size its
// embedding iframe to fit (same 'fakeronjan-resize' postMessage convention
// used by the rest of the fleet). No-op when not embedded.
(function () {
  if (window.parent === window) return;
  function report() {
    window.parent.postMessage(
      { type: 'fakeronjan-resize', height: document.documentElement.scrollHeight },
      '*'
    );
  }
  new ResizeObserver(report).observe(document.body);
  window.addEventListener('load', report);
  report();
})();
