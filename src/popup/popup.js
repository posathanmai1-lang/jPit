// jPit Popup Toolbar Logic
document.addEventListener('DOMContentLoaded', async () => {
  const masterToggle = document.getElementById('master-toggle');
  const domainDisplay = document.getElementById('domain-display');
  const domainStatus = document.getElementById('domain-status');
  
  const pillPaste = document.getElementById('pill-paste');
  const pillCopy = document.getElementById('pill-copy');
  const pillContext = document.getElementById('pill-context');
  const pillSelect = document.getElementById('pill-select');
  const pillDevTools = document.getElementById('pill-devtools');
  const stateDevTools = document.getElementById('state-devtools');

  const activityList = document.getElementById('activity-list');
  const activityCount = document.getElementById('activity-count');

  const statPastes = document.getElementById('stat-pastes');
  const statCopies = document.getElementById('stat-copies');

  const openOptions = document.getElementById('open-options');

  let currentTab = null;
  let currentConfig = {
    active: true,
    unblockPaste: true,
    unblockCopy: true,
    unblockContextMenu: false,
    unblockSelection: false,
    unblockDevTools: false,
    devToolsShield: false
  };

  // Fetch active tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    currentTab = tabs[0];
    try {
      const urlObj = new URL(currentTab.url);
      domainDisplay.textContent = urlObj.hostname || currentTab.url;
    } catch {
      domainDisplay.textContent = 'Current Page';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  function renderActivity(detections = []) {
    if (!activityList || !activityCount) return;
    activityCount.textContent = detections.length;
    if (detections.length === 0) {
      activityList.innerHTML = '<div class="activity-empty">No DevTools blocks detected</div>';
      return;
    }

    activityList.innerHTML = '';
    const reversed = [...detections].reverse();
    reversed.forEach(item => {
      const el = document.createElement('div');
      el.className = 'activity-item';
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '';
      el.innerHTML = `
        <div><strong>${escapeHtml(item.detail)}</strong></div>
        <div class="activity-item-time">${timeStr} • ${escapeHtml(item.technique)}</div>
      `;
      activityList.appendChild(el);
    });
  }

  // Request tab configuration and detections
  if (currentTab) {
    browser.runtime.sendMessage({
      type: 'GET_TAB_CONFIG',
      url: currentTab.url
    }, (response) => {
      if (response && response.config) {
        currentConfig = response.config;
        updateUIState();
      }
      if (response && response.detections) {
        renderActivity(response.detections);
      }
    });
  }

  // Fetch stats from storage
  const storageData = await browser.storage.sync.get(['stats']);
  if (storageData.stats) {
    statPastes.textContent = storageData.stats.totalPastesUnblocked || 0;
    statCopies.textContent = storageData.stats.totalCopiesUnblocked || 0;
  }

  function updateUIState() {
    masterToggle.checked = currentConfig.active;
    domainStatus.textContent = currentConfig.active ? 'Protection Active' : 'Protection Disabled';

    updatePill(pillPaste, document.getElementById('state-paste'), currentConfig.unblockPaste);
    updatePill(pillCopy, document.getElementById('state-copy'), currentConfig.unblockCopy);
    updatePill(pillContext, document.getElementById('state-context'), currentConfig.unblockContextMenu);
    updatePill(pillSelect, document.getElementById('state-select'), currentConfig.unblockSelection);
    if (pillDevTools && stateDevTools) {
      updatePill(pillDevTools, stateDevTools, currentConfig.unblockDevTools || currentConfig.devToolsShield);
    }
  }

  function updatePill(pillEl, stateEl, isEnabled) {
    if (!pillEl || !stateEl) return;
    if (isEnabled && currentConfig.active) {
      pillEl.classList.add('active');
      stateEl.textContent = 'Enabled';
    } else {
      pillEl.classList.remove('active');
      stateEl.textContent = 'Disabled';
    }
  }

  function sendConfigChange() {
    if (!currentTab) return;
    browser.runtime.sendMessage({
      type: 'TOGGLE_TAB_MODE',
      tabId: currentTab.id,
      url: currentTab.url,
      newConfig: currentConfig
    });
  }

  // Event Listeners
  masterToggle.addEventListener('change', (e) => {
    currentConfig.active = e.target.checked;
    updateUIState();
    sendConfigChange();
  });

  pillPaste.addEventListener('click', () => {
    currentConfig.unblockPaste = !currentConfig.unblockPaste;
    updateUIState();
    sendConfigChange();
  });

  pillCopy.addEventListener('click', () => {
    currentConfig.unblockCopy = !currentConfig.unblockCopy;
    updateUIState();
    sendConfigChange();
  });

  pillContext.addEventListener('click', () => {
    currentConfig.unblockContextMenu = !currentConfig.unblockContextMenu;
    updateUIState();
    sendConfigChange();
  });

  pillSelect.addEventListener('click', () => {
    currentConfig.unblockSelection = !currentConfig.unblockSelection;
    updateUIState();
    sendConfigChange();
  });

  if (pillDevTools) {
    pillDevTools.addEventListener('click', () => {
      const nextState = !(currentConfig.unblockDevTools || currentConfig.devToolsShield);
      currentConfig.unblockDevTools = nextState;
      currentConfig.devToolsShield = nextState;
      updateUIState();
      sendConfigChange();
    });
  }

  openOptions.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
});
