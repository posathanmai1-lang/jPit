// jPit Options Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
  const globalModeSelect = document.getElementById('global-mode-select');
  const saveModeBtn = document.getElementById('save-mode-btn');

  const rulePatternInput = document.getElementById('rule-pattern');
  const ruleTypeSelect = document.getElementById('rule-type');
  const addRuleBtn = document.getElementById('add-rule-btn');
  const rulesTableBody = document.getElementById('rules-table-body');

  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonBtn = document.getElementById('import-json-btn');
  const importJsonInput = document.getElementById('import-json-input');

  let domainRules = [];

  // Load saved settings
  const storageData = await browser.storage.sync.get(['globalMode', 'domainRules']);
  if (storageData.globalMode) {
    globalModeSelect.value = storageData.globalMode;
  }
  if (storageData.domainRules) {
    domainRules = storageData.domainRules;
    renderRules();
  }

  saveModeBtn.addEventListener('click', async () => {
    await browser.storage.sync.set({ globalMode: globalModeSelect.value });
    alert('Global mode preference saved successfully!');
  });

  addRuleBtn.addEventListener('click', async () => {
    const pattern = rulePatternInput.value.trim();
    if (!pattern) return;

    const newRule = {
      id: 'rule_' + Date.now(),
      pattern,
      matchType: ruleTypeSelect.value,
      unblockPaste: true,
      unblockCopy: true,
      unblockContextMenu: false,
      unblockSelection: false
    };

    domainRules.push(newRule);
    await browser.storage.sync.set({ domainRules });
    rulePatternInput.value = '';
    renderRules();
  });

  function renderRules() {
    rulesTableBody.innerHTML = '';
    if (domainRules.length === 0) {
      rulesTableBody.innerHTML = `<tr><td colspan="7" style="color: #64748B; text-align: center;">No custom domain rules added yet.</td></tr>`;
      return;
    }

    domainRules.forEach((rule, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${rule.pattern}</strong></td>
        <td>${rule.matchType}</td>
        <td><input type="checkbox" ${rule.unblockPaste ? 'checked' : ''} data-index="${index}" data-field="unblockPaste"></td>
        <td><input type="checkbox" ${rule.unblockCopy ? 'checked' : ''} data-index="${index}" data-field="unblockCopy"></td>
        <td><input type="checkbox" ${rule.unblockContextMenu ? 'checked' : ''} data-index="${index}" data-field="unblockContextMenu"></td>
        <td><input type="checkbox" ${rule.unblockSelection ? 'checked' : ''} data-index="${index}" data-field="unblockSelection"></td>
        <td><span class="delete-btn" data-index="${index}">Delete</span></td>
      `;
      rulesTableBody.appendChild(tr);
    });

    // Attach row event listeners
    rulesTableBody.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const idx = e.target.dataset.index;
        const field = e.target.dataset.field;
        domainRules[idx][field] = e.target.checked;
        await browser.storage.sync.set({ domainRules });
      });
    });

    rulesTableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = e.target.dataset.index;
        domainRules.splice(idx, 1);
        await browser.storage.sync.set({ domainRules });
        renderRules();
      });
    });
  }

  // Export JSON
  exportJsonBtn.addEventListener('click', async () => {
    const data = await browser.storage.sync.get(null);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jpit-backup-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import JSON
  importJsonBtn.addEventListener('click', () => importJsonInput.click());
  importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        await browser.storage.sync.set(imported);
        alert('Settings imported successfully!');
        window.location.reload();
      } catch (err) {
        alert('Failed to parse settings JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
});
