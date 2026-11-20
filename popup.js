// ═══════════════════════════════════════════════════════════════
//  Campus Deadline Radar — Popup Script
//  Renders deadline cards, handles filters, scan, export & clear
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // ─── DOM Refs ─────────────────────────────────────────────
  const listEl       = document.getElementById('deadlineList');
  const emptyEl      = document.getElementById('emptyState');
  const scanBtn      = document.getElementById('scanBtn');
  const settingsBtn  = document.getElementById('settingsBtn');
  const exportAllBtn = document.getElementById('exportAllBtn');
  const clearBtn     = document.getElementById('clearBtn');
  const lastScanEl   = document.getElementById('lastScan');
  const filterBtns   = document.querySelectorAll('.filter-btn');
  const toastEl      = document.getElementById('toast');

  let currentFilter  = 'all';
  let allDeadlines   = [];

  const HOUR = 60 * 60 * 1000;
  const DAY  = 24 * HOUR;
  const WEEK = 7 * DAY;

  // ─── Load & Render ────────────────────────────────────────

  async function loadDeadlines() {
    const { deadlines = [], lastScan, lastPlatform } =
      await chrome.storage.local.get(['deadlines', 'lastScan', 'lastPlatform']);
    allDeadlines = deadlines;

    if (lastScan) {
      const ago = timeAgo(new Date(lastScan));
      lastScanEl.textContent =
        `Last scan: ${ago}${lastPlatform ? ' · ' + lastPlatform : ''}`;
    }

    renderDeadlines();
  }

  function renderDeadlines() {
    const now = Date.now();
    let filtered = [...allDeadlines];

    // Apply active filter
    switch (currentFilter) {
      case 'urgent':
        filtered = filtered.filter(d => {
          const ms = (d.timestamp || 0) - now;
          return ms > 0 && ms < DAY;
        });
        break;
      case 'week':
        filtered = filtered.filter(d => {
          const ms = (d.timestamp || 0) - now;
          return ms > 0 && ms < WEEK;
        });
        break;
      case 'later':
        filtered = filtered.filter(d => {
          const ms = (d.timestamp || 0) - now;
          return ms >= WEEK;
        });
        break;
    }

    // Sort: upcoming first (soonest at top), overdue at bottom
    filtered.sort((a, b) => {
      const aOver = (a.timestamp || 0) < now;
      const bOver = (b.timestamp || 0) < now;
      if (aOver !== bOver) return aOver ? 1 : -1;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    if (filtered.length === 0) {
      listEl.style.display   = 'none';
      emptyEl.style.display  = 'flex';
      return;
    }

    listEl.style.display  = 'block';
    emptyEl.style.display = 'none';

    listEl.innerHTML = filtered
      .map((d, i) => cardHTML(d, i, now))
      .join('');

    // Bind .ics buttons
    listEl.querySelectorAll('.ics-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = JSON.parse(btn.dataset.deadline);
        const ics = CalendarUtils.generateICS(
          d.title,
          d.dueDate || new Date(d.timestamp).toISOString(),
          d.link || '',
          d.course || ''
        );
        CalendarUtils.downloadFile(
          `${sanitizeFilename(d.title)}.ics`,
          ics,
          'text/calendar'
        );
        showToast('Downloaded .ics file!');
      });
    });

    // Bind delete buttons
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        allDeadlines = allDeadlines.filter(
          d => `${d.title}::${d.dueDate}` !== key
        );
        await chrome.storage.local.set({ deadlines: allDeadlines });
        renderDeadlines();
        showToast('Deadline removed');
      });
    });
  }

  // ─── Card HTML ────────────────────────────────────────────

  function cardHTML(d, index, now) {
    const ms = (d.timestamp || 0) - now;
    const isOverdue = ms < 0;
    const urgencyClass = isOverdue
      ? 'overdue'
      : ms < DAY
      ? 'urgent'
      : ms < 3 * DAY
      ? 'warning'
      : 'safe';
    const countdownText = isOverdue ? 'OVERDUE' : formatCountdown(ms);
    const dateStr = formatDate(new Date(d.timestamp || d.dueDate));
    const gcalLink = CalendarUtils.createGoogleCalendarLink(
      d.title,
      d.dueDate || new Date(d.timestamp).toISOString(),
      d.link || ''
    );
    const safeJSON = JSON.stringify(d).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    const key = `${d.title}::${d.dueDate}`;

    return `
      <div class="deadline-card ${urgencyClass}"
           style="animation-delay:${index * 40}ms">
        <div class="card-top">
          <div class="card-info">
            ${d.course ? `<span class="course-badge">${esc(d.course)}</span>` : ''}
            <div class="card-title">
              ${d.link
                ? `<a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.title)}</a>`
                : esc(d.title)}
            </div>
            <div class="card-meta">
              <span class="due-date">📅 ${dateStr}</span>
              <span class="countdown ${urgencyClass}">${countdownText}</span>
              <span class="platform-tag">${esc(d.platform || '')}</span>
            </div>
          </div>
          <div class="card-actions">
            <!-- Google Calendar -->
            <a href="${gcalLink}" target="_blank" rel="noopener"
               class="btn-icon" title="Add to Google Calendar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
                <line x1="12" y1="14" x2="12" y2="18"/>
                <line x1="10" y1="16" x2="14" y2="16"/>
              </svg>
            </a>
            <!-- Download .ics -->
            <button class="btn-icon ics-btn" title="Download .ics"
                    data-deadline="${safeJSON}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <!-- Delete -->
            <button class="btn-icon delete-btn" title="Remove"
                    data-key="${esc(key)}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round">
                <line x1="18" y1="6"  x2="6"  y2="18"/>
                <line x1="6"  y1="6"  x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>`;
  }

  // ─── Filter Tabs ──────────────────────────────────────────

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderDeadlines();
    });
  });

  // ─── Scan Button ──────────────────────────────────────────

  scanBtn.addEventListener('click', async () => {
    scanBtn.classList.add('scanning');
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      if (tab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await delay(600); // let content script write to storage
        await loadDeadlines();
        showToast('Page scanned!');
      }
    } catch (err) {
      console.error('Scan failed:', err);
      showToast('Scan failed — try on your LMS page');
    }
    scanBtn.classList.remove('scanning');
  });

  // ─── Settings ─────────────────────────────────────────────

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ─── Export All ───────────────────────────────────────────

  exportAllBtn.addEventListener('click', () => {
    const future = allDeadlines.filter(d => (d.timestamp || 0) > Date.now());
    if (future.length === 0) {
      showToast('No upcoming deadlines to export');
      return;
    }
    const ics = CalendarUtils.generateMultiICS(future);
    CalendarUtils.downloadFile('campus_deadlines.ics', ics, 'text/calendar');
    showToast(`Exported ${future.length} deadline${future.length > 1 ? 's' : ''}!`);
  });

  // ─── Clear All ────────────────────────────────────────────

  clearBtn.addEventListener('click', async () => {
    if (!confirm('Clear all saved deadlines?')) return;
    await chrome.storage.local.set({ deadlines: [], notified: [] });
    allDeadlines = [];
    renderDeadlines();
    showToast('All deadlines cleared');
  });

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  function formatCountdown(ms) {
    const mins  = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(ms / HOUR);
    const days  = Math.floor(ms / DAY);
    const weeks = Math.floor(days / 7);

    if (hours < 1)  return `${Math.max(1, mins)}m left`;
    if (hours < 24) return `${hours}h left`;
    if (days === 1) return '1 day left';
    if (days < 7)   return `${days} days left`;
    if (weeks === 1) return '1 week left';
    return `${weeks} weeks left`;
  }

  function formatDate(date) {
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function timeAgo(date) {
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60)    return 'just now';
    if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function sanitizeFilename(str) {
    return str.replace(/[^a-z0-9_\- ]/gi, '').replace(/\s+/g, '_').substring(0, 60);
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ─── Init ─────────────────────────────────────────────────
  await loadDeadlines();
});
