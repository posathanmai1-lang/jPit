// jPit ISOLATED World Bridge Script
(function () {
  const runtime = browser.runtime;

  function syncConfigWithMainEngine(config) {
    window.dispatchEvent(new CustomEvent('jPit_ConfigUpdate', {
      detail: config
    }));
  }

  // Request tab rule configuration from background service worker
  runtime.sendMessage({ type: 'GET_TAB_CONFIG', url: window.location.href }, (response) => {
    if (response && response.config) {
      syncConfigWithMainEngine(response.config);
    }
  });

  // Listen for background state updates (e.g. user toggles popup options)
  runtime.onMessage.addListener((message) => {
    if (message.type === 'JPIT_CONFIG_CHANGED' && message.config) {
      syncConfigWithMainEngine(message.config);
    }
  });

  // Relay DevTools Shield detections from MAIN world engine to background service worker
  window.addEventListener('jPit_DevToolsDetection', (event) => {
    if (event.detail) {
      runtime.sendMessage({
        type: 'DEVTOOLS_DETECTION',
        url: window.location.href,
        detection: event.detail
      }).catch(() => {});
    }
  });
})();
