// ═══════════════════════════════════════════════════════════════
//  Campus Deadline Radar — Background Service Worker
//  Handles: badge updates, alarm notifications, storage mgmt
// ═══════════════════════════════════════════════════════════════

// ─── Badge ───────────────────────────────────────────────────

async function updateBadge() {
  try {
    const { deadlines = [] } = await chrome.storage.local.get('deadlines');
    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;

    const upcoming = deadlines.filter(d => {
      const due = d.timestamp || new Date(d.dueDate).getTime();
      return due > now && due - now < WEEK;
    });

    const count = upcoming.length;
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({
      color: upcoming.some(d => {
        const due = d.timestamp || new Date(d.dueDate).getTime();
        return due - now < 24 * 60 * 60 * 1000;
      })
        ? '#ef4444'
        : '#3b82f6'
    });
  } catch (e) {
    console.error('[CDR] Badge update error:', e);
  }
}

// ─── Alarms & Notifications ─────────────────────────────────

chrome.alarms.create('checkDeadlines', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === 'checkDeadlines') {
    await updateBadge();
    await checkAndNotify();
  }
});

async function checkAndNotify() {
  try {
    const { deadlines = [], settings = {} } = await chrome.storage.local.get([
      'deadlines',
      'settings'
    ]);

    if (settings.enableNotifications === false) return;

    const notifyHours = settings.notifyHoursBefore || 24;
    const now = Date.now();
    const { notified = [] } = await chrome.storage.local.get('notified');
    const newlyNotified = [...notified];

    for (const d of deadlines) {
      const due = d.timestamp || new Date(d.dueDate).getTime();
      if (isNaN(due)) continue;

      const hoursLeft = (due - now) / (60 * 60 * 1000);
      const id = `${d.title}::${d.dueDate}`;

      if (hoursLeft > 0 && hoursLeft <= notifyHours && !notified.includes(id)) {
        const icon = hoursLeft < 3 ? '🚨' : hoursLeft < 12 ? '⏰' : '📌';
        chrome.notifications.create(id, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: `${icon} Deadline Approaching!`,
          message: `${d.title}\nDue in ${Math.round(hoursLeft)} hour${Math.round(hoursLeft) !== 1 ? 's' : ''}`,
          priority: hoursLeft < 6 ? 2 : 1
        });
        newlyNotified.push(id);
      }
    }

    // Prune old records
    const freshNotified = newlyNotified.filter(id => {
      const d = deadlines.find(dl => `${dl.title}::${dl.dueDate}` === id);
      return d && (d.timestamp || new Date(d.dueDate).getTime()) > now;
    });

    await chrome.storage.local.set({ notified: freshNotified });
  } catch (e) {
    console.error('[CDR] Notification check error:', e);
  }
}

// ─── Storage Change Listener ────────────────────────────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.deadlines) {
    updateBadge();
  }
});

// ─── Message Router ─────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'scanPage') {
    chrome.scripting
      .executeScript({
        target: { tabId: msg.tabId },
        files: ['content.js']
      })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // keep channel open for async response
  }

  if (msg.action === 'refreshBadge') {
    updateBadge().then(() => sendResponse({ success: true }));
    return true;
  }
});

// ─── Notification Click → Open Link ─────────────────────────

chrome.notifications.onClicked.addListener(async notificationId => {
  const { deadlines = [] } = await chrome.storage.local.get('deadlines');
  const d = deadlines.find(dl => `${dl.title}::${dl.dueDate}` === notificationId);
  if (d?.link) {
    chrome.tabs.create({ url: d.link });
  }
  chrome.notifications.clear(notificationId);
});

// ─── Init ────────────────────────────────────────────────────
updateBadge();
console.log('[Campus Deadline Radar] Service worker initialized.');
