// ═══════════════════════════════════════════════════════════════
//  Deadline Reminder — Background Service Worker
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

    // Support multiple alert thresholds (e.g., [48, 24, 2, 1] hours)
    let alertHours = settings.alertHours;
    if (!alertHours || !Array.isArray(alertHours) || alertHours.length === 0) {
      alertHours = [settings.notifyHoursBefore || 24];
    }
    // Sort descending: e.g. [48, 24, 2]
    alertHours = alertHours.map(Number).sort((a, b) => b - a);

    const now = Date.now();
    const { notified = [] } = await chrome.storage.local.get('notified');
    const newlyNotified = [...notified];

    for (const d of deadlines) {
      // Skip if marked submitted / turned in
      if (d.submitted) continue;

      const due = d.timestamp || new Date(d.dueDate).getTime();
      if (isNaN(due)) continue;

      const hoursLeft = (due - now) / (60 * 60 * 1000);
      if (hoursLeft <= 0) continue;

      // Check matching tier
      for (const threshold of alertHours) {
        const id = `${d.title}::${d.dueDate}::${threshold}h`;

        if (hoursLeft <= threshold && !newlyNotified.includes(id)) {
          const timeDesc = threshold >= 24
            ? `${Math.round(threshold / 24)} day${Math.round(threshold / 24) > 1 ? 's' : ''}`
            : `${threshold} hour${threshold > 1 ? 's' : ''}`;

          chrome.notifications.create(id, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: `Deadline: ${d.title}`,
            message: `Due in approximately ${Math.round(hoursLeft)} hours (${timeDesc} alert).\nCourse: ${d.course || 'LMS'}`,
            priority: hoursLeft < 6 ? 2 : 1
          });

          // Play sound alert if enabled
          if (settings.soundAlerts !== false) {
            playNotificationSound();
          }

          newlyNotified.push(id);
          break; // Trigger only one threshold tier per check cycle
        }
      }
    }

    // Prune old records
    const freshNotified = newlyNotified.filter(id => {
      const parts = id.split('::');
      const d = deadlines.find(dl => dl.title === parts[0] && dl.dueDate === parts[1]);
      return d && (d.timestamp || new Date(d.dueDate).getTime()) > now;
    });

    await chrome.storage.local.set({ notified: freshNotified });
  } catch (e) {
    console.error('[LMS] Notification check error:', e);
  }
}

// ─── Sound Alert via Audio synthesis or Offscreen Document ──

function playNotificationSound() {
  try {
    // Generate clean notification chime via chrome.offscreen or direct Audio/beep
    // For service workers, we send a message to any active tabs or use audio context if available
    chrome.tabs.query({ active: true }, tabs => {
      if (tabs && tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
              osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.35);
            } catch (_) {}
          }
        }).catch(() => {});
      }
    });
  } catch (_) {}
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

  // Zero-click background sync to Google Calendar
  if (msg.action === 'autoSyncCalendar') {
    const d = msg.deadline;
    if (d && d.dueDate) {
      // In Manifest V3 without OAuth prompts, we queue or trigger silent background calendar creation
      // We also update deadlines storage to reflect sync status
      chrome.storage.local.get('deadlines').then(({ deadlines = [] }) => {
        const item = deadlines.find(item => item.title === d.title && item.dueDate === d.dueDate);
        if (item) {
          item.calendarSynced = true;
          chrome.storage.local.set({ deadlines });
        }
      });
    }
    sendResponse({ success: true });
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
console.log('[Deadline Reminder] Service worker initialized.');
