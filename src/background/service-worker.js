// jPit Manifest V3 Background Service Worker
importScripts('../lib/browser-polyfill.js');
importScripts('../lib/rule-evaluator.js');

const DEFAULT_SETTINGS = {
  globalMode: 'smart_auto', // 'smart_auto', 'aggressive', 'disabled'
  hotkeyShield: true,
  frameworkSynthesizer: true,
  domainRules: [],
  stats: {
    totalPastesUnblocked: 0,
    totalCopiesUnblocked: 0
  }
};

// In-memory tab configuration cache to persist toggles while tab is active
const activeTabConfigs = new Map();

// Initialize default storage settings on extension installation
browser.runtime.onInstalled.addListener(async () => {
  const current = await browser.storage.sync.get(['globalMode', 'domainRules', 'stats']);
  if (!current.globalMode) {
    await browser.storage.sync.set(DEFAULT_SETTINGS);
  }
});

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Helper to get active configuration for a given URL
async function getConfigForUrl(url) {
  const hostname = getHostname(url);
  
  // Return active session toggle override if present
  if (hostname && activeTabConfigs.has(hostname)) {
    return activeTabConfigs.get(hostname);
  }

  const data = await browser.storage.sync.get(['globalMode', 'domainRules', 'hotkeyShield', 'frameworkSynthesizer']);
  const globalMode = data.globalMode || 'smart_auto';
  const domainRules = data.domainRules || [];

  const evalResult = RuleEvaluator.evaluateUrl(url, domainRules, globalMode);
  const config = {
    ...evalResult,
    hotkeyShield: data.hotkeyShield ?? true,
    frameworkSynthesizer: data.frameworkSynthesizer ?? true
  };

  if (hostname) {
    activeTabConfigs.set(hostname, config);
  }

  return config;
}

// Update Extension Action Badge based on active status
function updateBadge(tabId, active) {
  if (!tabId) return;
  if (active) {
    browser.action.setBadgeText({ tabId, text: 'ON' });
    browser.action.setBadgeBackgroundColor({ tabId, color: '#0D9488' }); // Teal
  } else {
    browser.action.setBadgeText({ tabId, text: 'OFF' });
    browser.action.setBadgeBackgroundColor({ tabId, color: '#64748B' }); // Slate
  }
}

// Handle message communication bridge
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_CONFIG') {
    const targetUrl = message.url || (sender.tab ? sender.tab.url : '');
    getConfigForUrl(targetUrl).then(config => {
      if (sender.tab && sender.tab.id) {
        updateBadge(sender.tab.id, config.active);
      }
      sendResponse({ config });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'TOGGLE_TAB_MODE') {
    const { url, tabId, newConfig } = message;
    const hostname = getHostname(url);

    if (hostname) {
      activeTabConfigs.set(hostname, newConfig);
    }

    // Broadcast config update to active tab
    if (tabId) {
      browser.tabs.sendMessage(tabId, {
        type: 'JPIT_CONFIG_CHANGED',
        config: newConfig
      }).catch(() => {});
      updateBadge(tabId, newConfig.active);
    }

    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'INCREMENT_STAT') {
    browser.storage.sync.get(['stats']).then(data => {
      const stats = data.stats || { totalPastesUnblocked: 0, totalCopiesUnblocked: 0 };
      if (message.statKey === 'paste') stats.totalPastesUnblocked++;
      if (message.statKey === 'copy') stats.totalCopiesUnblocked++;
      browser.storage.sync.set({ stats });
    });
    sendResponse({ success: true });
    return true;
  }
});
