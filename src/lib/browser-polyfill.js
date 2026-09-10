// jPit Cross-Browser Polyfill Wrapper
(function () {
  if (typeof globalThis.browser === 'undefined') {
    globalThis.browser = globalThis.chrome;
  }
})();
