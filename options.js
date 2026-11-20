// ═══════════════════════════════════════════════════════════════
//  Campus Deadline Radar — Options Page Script
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // ─── DOM Refs ─────────────────────────────────────────────
  const enableNotifications  = document.getElementById('enableNotifications');
  const notifyHours          = document.getElementById('notifyHours');
  const customDomains        = document.getElementById('customDomains');
  const customTitleSelector  = document.getElementById('customTitleSelector');
  const customDateSelector   = document.getElementById('customDateSelector');
  const deadlineCount        = document.getElementById('deadlineCount');
  const lastScanInfo         = document.getElementById('lastScanInfo');
  const exportJsonBtn        = document.getElementById('exportJson');
  const importJsonBtn        = document.getElementById('importJson');
  const importFile           = document.getElementById('importFile');
  const clearAllBtn          = document.getElementById('clearAll');
  const saveBtn              = document.getElementById('saveBtn');
  const saveStatus           = document.getElementById('saveStatus');

  // ─── Load Current Settings ────────────────────────────────

  const {
    settings = {},
    deadlines = [],
    lastScan,
    lastPlatform
  } = await chrome.storage.local.get([
    'settings',
    'deadlines',
    'lastScan',
    'lastPlatform'
  ]);

  enableNotifications.checked = settings.enableNotifications !== false;
  notifyHours.value           = settings.notifyHoursBefore || 24;
  customDomains.value         = (settings.customDomains || []).join('\n');
  customTitleSelector.value   = settings.customTitleSelector || '';
  customDateSelector.value    = settings.customDateSelector || '';

  deadlineCount.textContent   = deadlines.length;
  if (lastScan) {
    const d = new Date(lastScan);
    lastScanInfo.textContent =
      `${d.toLocaleDateString()} ${d.toLocaleTimeString()}` +
      (lastPlatform ? ` (${lastPlatform})` : '');
  }

  // ─── Save ─────────────────────────────────────────────────

  saveBtn.addEventListener('click', async () => {
    const domains = customDomains.value
      .split('\n')
      .map(d => d.trim())
      .filter(Boolean);

    await chrome.storage.local.set({
      settings: {
        enableNotifications: enableNotifications.checked,
        notifyHoursBefore:   parseInt(notifyHours.value, 10) || 24,
        customDomains:       domains,
        customTitleSelector: customTitleSelector.value.trim(),
        customDateSelector:  customDateSelector.value.trim()
      }
    });

    saveStatus.textContent = '✓ Saved!';
    saveStatus.classList.add('visible');
    setTimeout(() => saveStatus.classList.remove('visible'), 2500);
  });

  // ─── Export JSON ──────────────────────────────────────────

  exportJsonBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `cdr_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ─── Import JSON ──────────────────────────────────────────

  importJsonBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.deadlines && Array.isArray(data.deadlines)) {
        // Merge with existing
        const { deadlines: existing = [] } =
          await chrome.storage.local.get('deadlines');
        const map = new Map();
        for (const d of existing) map.set(`${d.title}::${d.dueDate}`, d);
        for (const d of data.deadlines) map.set(`${d.title}::${d.dueDate}`, d);
        const merged = Array.from(map.values());

        await chrome.storage.local.set({ deadlines: merged });
        deadlineCount.textContent = merged.length;

        saveStatus.textContent = `✓ Imported ${data.deadlines.length} deadline(s)`;
        saveStatus.classList.add('visible');
        setTimeout(() => saveStatus.classList.remove('visible'), 3000);
      } else {
        alert('Invalid backup file: no deadlines array found.');
      }
    } catch (e) {
      alert('Failed to parse file: ' + e.message);
    }

    importFile.value = ''; // reset
  });

  // ─── Clear All ────────────────────────────────────────────

  clearAllBtn.addEventListener('click', async () => {
    if (!confirm('Delete ALL stored deadlines and settings? This cannot be undone.'))
      return;
    await chrome.storage.local.clear();
    deadlineCount.textContent = '0';
    lastScanInfo.textContent  = '—';
    enableNotifications.checked = true;
    notifyHours.value         = 24;
    customDomains.value       = '';
    customTitleSelector.value = '';
    customDateSelector.value  = '';

    saveStatus.textContent = '✓ All data cleared';
    saveStatus.classList.add('visible');
    setTimeout(() => saveStatus.classList.remove('visible'), 2500);
  });
});
