// ═══════════════════════════════════════════════════════════════
//  Campus Deadline Radar — Content Script
//  Auto-detects LMS platform and extracts assignment deadlines
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Prevent double-execution on the same page
  if (window.__cdr_scanned) return;
  window.__cdr_scanned = true;

  // ─── Platform Detection ───────────────────────────────────

  function detectPlatform() {
    const url = window.location.href.toLowerCase();

    // Canvas / Instructure
    if (
      url.includes('instructure.com') ||
      document.getElementById('application')?.classList?.contains('ic-app') ||
      document.querySelector('.ic-app-header')
    )
      return 'canvas';

    // Moodle
    if (
      url.includes('moodle') ||
      document.querySelector('meta[name="keywords"][content*="moodle" i]') ||
      document.querySelector('#page-footer a[href*="moodle"]') ||
      document.querySelector('body[class*="path-mod"]')
    )
      return 'moodle';

    // Google Classroom
    if (url.includes('classroom.google.com')) return 'google-classroom';

    // Blackboard / Bb Learn / Ultra
    if (
      url.includes('blackboard.com') ||
      document.querySelector('#blackboard-logo, .bb-offcanvas, [class*="Bb"]')
    )
      return 'blackboard';

    // Brightspace / D2L
    if (
      url.includes('brightspace.com') ||
      url.includes('d2l.com') ||
      document.querySelector('.d2l-page, d2l-navigation')
    )
      return 'brightspace';

    return 'generic';
  }

  // ═══════════════════════════════════════════════════════════
  //  PLATFORM ADAPTERS
  // ═══════════════════════════════════════════════════════════

  const adapters = {
    // ──────────── Canvas / Instructure ────────────
    canvas: {
      name: 'Canvas',
      extract() {
        const deadlines = [];
        const course = this.getCourse();

        // 1) Assignment index  (/courses/X/assignments)
        document
          .querySelectorAll('.assignment, .ig-row, .assignment_group .ig-list .ig-row')
          .forEach(row => {
            const titleEl = row.querySelector(
              '.ig-title a, a.ig-title, .title a, .assignment-title a'
            );
            const dateEl = row.querySelector(
              '.assignment-date-due .screenreader-only, .due-date, .date-due, .assignment-date-due'
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: cleanDateText(dateEl),
                link: titleEl.href,
                course,
                platform: 'Canvas'
              });
            }
          });

        // 2) Dashboard planner
        document
          .querySelectorAll(
            '[class*="PlannerItem"], [class*="planner-item"], .todo-list-item'
          )
          .forEach(item => {
            const titleEl = item.querySelector(
              '[class*="Title"] a, [class*="title"] a, a'
            );
            const dateEl =
              item.querySelector('[datetime]') ||
              item.querySelector('[class*="due"], time');
            const courseEl = item.querySelector(
              '[class*="Course"], [class*="course"]'
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate:
                  dateEl?.getAttribute('datetime') ||
                  dateEl?.textContent.trim() ||
                  '',
                link: titleEl.href || window.location.href,
                course: courseEl?.textContent.trim() || course,
                platform: 'Canvas'
              });
            }
          });

        // 3) Syllabus table
        document
          .querySelectorAll('.syllabus_table tr, .events .event')
          .forEach(row => {
            const dateEl = row.querySelector('.day_date, .date');
            const titleEl = row.querySelector('.name a, .title a, a');
            if (dateEl && titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateEl.textContent.trim(),
                link: titleEl.href || '',
                course,
                platform: 'Canvas'
              });
            }
          });

        // 4) Calendar agenda
        document
          .querySelectorAll('.agenda-event, .fc-event')
          .forEach(item => {
            const titleEl = item.querySelector('.ig-title, .fc-title, a');
            const dateEl = item.querySelector('.agenda-date, time, [datetime]');
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate:
                  dateEl?.getAttribute('datetime') ||
                  dateEl?.textContent.trim() ||
                  '',
                link: titleEl.href || item.querySelector('a')?.href || '',
                course,
                platform: 'Canvas'
              });
            }
          });

        return deadlines;
      },
      getCourse() {
        return (
          document
            .querySelector(
              '.ic-app-crumbs a:nth-child(2), #breadcrumbs li:nth-child(2) a'
            )
            ?.textContent.trim() ||
          document.title.split(':')[0]?.trim() ||
          'Unknown Course'
        );
      }
    },

    // ──────────── Moodle ────────────
    moodle: {
      name: 'Moodle',
      extract() {
        const deadlines = [];
        const course = this.getCourse();

        // 1) Dashboard timeline / upcoming events
        document
          .querySelectorAll(
            '.event-name-container, [data-region="event-list-content"] [data-region="event-item"], [data-region="timeline"] [data-region="event-list-item"]'
          )
          .forEach(item => {
            const titleEl = item.querySelector('.event-name a, .event-name, a');
            const dateEl = item.querySelector(
              '[data-region="event-date"], .date, time'
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate:
                  dateEl?.getAttribute('datetime') ||
                  dateEl?.textContent.trim() ||
                  '',
                link:
                  titleEl.closest('a')?.href ||
                  titleEl.querySelector('a')?.href ||
                  '',
                course:
                  item.querySelector('.course-name, .small')?.textContent.trim() ||
                  course,
                platform: 'Moodle'
              });
            }
          });

        // 2) Calendar events
        document
          .querySelectorAll(
            '.maincalendar .event, [data-event-title], .calendar-event'
          )
          .forEach(item => {
            const title =
              item.getAttribute('data-event-title') ||
              item.querySelector('.event-name, .name')?.textContent.trim();
            const dateEl = item.querySelector('.date, time, [datetime]');
            if (title) {
              deadlines.push({
                title,
                dueDate:
                  dateEl?.getAttribute('datetime') ||
                  dateEl?.textContent.trim() ||
                  '',
                link: item.querySelector('a')?.href || '',
                course,
                platform: 'Moodle'
              });
            }
          });

        // 3) Activity items (assignment, quiz, etc.)
        document
          .querySelectorAll(
            '.activity.assign, .activity.quiz, .activity.forum, [data-activityname]'
          )
          .forEach(item => {
            const titleEl = item.querySelector(
              '.activityname a, .instancename, .aalink, .activity-name-area a'
            );
            const dateEl = item.querySelector(
              '.text-info, [class*="date"], .description .date'
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.replace(/\s+/g, ' ').trim(),
                dueDate: dateEl?.textContent.trim() || '',
                link: titleEl.href || '',
                course,
                platform: 'Moodle'
              });
            }
          });

        // 4) Upcoming events block
        document
          .querySelectorAll(
            '.block_calendar_upcoming .event, .block_timeline .event-name-container'
          )
          .forEach(item => {
            const titleEl = item.querySelector('a, .event-name');
            const dateEl = item.querySelector('.date, time');
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateEl?.textContent.trim() || '',
                link:
                  titleEl.href || titleEl.closest('a')?.href || '',
                course,
                platform: 'Moodle'
              });
            }
          });

        return deadlines;
      },
      getCourse() {
        return (
          document
            .querySelector(
              '.page-header-headings h1, .course-header .coursename, #page-header .page-title'
            )
            ?.textContent.trim() ||
          document.title.split(':')[0]?.trim() ||
          'Unknown Course'
        );
      }
    },

    // ──────────── Google Classroom ────────────
    'google-classroom': {
      name: 'Google Classroom',
      extract() {
        const deadlines = [];

        // Work / assignment cards (data attributes)
        document
          .querySelectorAll(
            '[data-assignmentid], [data-courseworkid], [data-item-id]'
          )
          .forEach(item => {
            const titleEl = item.querySelector(
              '[class*="title"], h2, h3, [role="heading"], a'
            );
            const dateEl = item.querySelector(
              '[class*="due"], [class*="date"], time'
            );
            const courseEl = item.querySelector(
              '[class*="course"], [class*="class"]'
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateEl?.textContent.trim() || '',
                link:
                  item.querySelector('a')?.href || window.location.href,
                course: courseEl?.textContent.trim() || 'Google Classroom',
                platform: 'Google Classroom'
              });
            }
          });

        // To-do / assigned work page — heuristic scan
        document
          .querySelectorAll('[role="listitem"]')
          .forEach(item => {
            const titleEl = item.querySelector(
              'h2, h3, [role="heading"], a'
            );
            const dateText = this.findDateInElement(item);
            if (titleEl && dateText) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateText,
                link: item.querySelector('a')?.href || '',
                course: 'Google Classroom',
                platform: 'Google Classroom'
              });
            }
          });

        return deadlines;
      },
      findDateInElement(el) {
        const text = el.textContent;
        const patterns = [
          /(?:Due|Deadline|Submit by)[:\s]*([\w\s,]+\d{1,2}[,\s]+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i,
          /(\w{3,9}\s+\d{1,2},?\s*\d{4})/,
          /(\d{1,2}\/\d{1,2}\/\d{2,4})/
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m) return m[1].trim();
        }
        const timeEl = el.querySelector('time, [datetime]');
        return (
          timeEl?.getAttribute('datetime') || timeEl?.textContent.trim() || ''
        );
      }
    },

    // ──────────── Blackboard ────────────
    blackboard: {
      name: 'Blackboard',
      extract() {
        const deadlines = [];

        // Activity stream
        document
          .querySelectorAll(
            '.stream_item, .activity-item, .js-upcoming-item, [class*="due-date"], [class*="activityItem"]'
          )
          .forEach(item => {
            const titleEl = item.querySelector(
              '.name a, .item-title a, h3 a, h4 a, a'
            );
            const dateEl = item.querySelector(
              '.date, .due-date, [class*="date"], time'
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: cleanDateText(dateEl),
                link: titleEl.href || '',
                course:
                  item
                    .querySelector('.course-title, [class*="course"]')
                    ?.textContent.trim() || '',
                platform: 'Blackboard'
              });
            }
          });

        // Grade-center / content list
        document
          .querySelectorAll(
            '#content_listContainer li, .contentList li, [id*="content"] li'
          )
          .forEach(item => {
            const titleEl = item.querySelector('a, h3');
            const dateEl = item.querySelector(
              '.details .date, [class*="date"], .itemdates'
            );
            if (titleEl && dateEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: cleanDateText(dateEl),
                link: titleEl.href || '',
                course: '',
                platform: 'Blackboard'
              });
            }
          });

        return deadlines;
      }
    },

    // ──────────── Brightspace / D2L ────────────
    brightspace: {
      name: 'Brightspace',
      extract() {
        const deadlines = [];

        document
          .querySelectorAll(
            '.d2l-datalist-item, [class*="assignment"], .d2l-card, d2l-list-item'
          )
          .forEach(item => {
            const titleEl = item.querySelector(
              '.d2l-heading a, .d2l-link, a, d2l-link'
            );
            const dateEl = item.querySelector(
              '[class*="date"], time, .d2l-dates, d2l-tooltip-help'
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate:
                  dateEl?.getAttribute('datetime') ||
                  dateEl?.textContent.trim() ||
                  '',
                link: titleEl.href || '',
                course: '',
                platform: 'Brightspace'
              });
            }
          });

        // Widget-based upcoming items
        document
          .querySelectorAll(
            '.d2l-widget .d2l-datalist-item, [class*="upcoming"]'
          )
          .forEach(item => {
            const titleEl = item.querySelector('a, .d2l-link');
            const dateEl = item.querySelector('time, [class*="date"]');
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate:
                  dateEl?.getAttribute('datetime') ||
                  dateEl?.textContent.trim() ||
                  '',
                link: titleEl.href || '',
                course: '',
                platform: 'Brightspace'
              });
            }
          });

        return deadlines;
      }
    },

    // ──────────── Generic Fallback (heuristic) ────────────
    generic: {
      name: 'Detected',
      extract() {
        const deadlines = [];
        const keywords =
          /\b(assign|homework|hw|quiz|exam|midterm|final|test|project|lab|submission|deadline|due|report)\b/i;
        const datePattern =
          /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w{3,9}\s+\d{1,2},?\s*\d{2,4})|(\d{4}-\d{2}-\d{2})/;

        // --- Tables ---
        document.querySelectorAll('table tr').forEach(row => {
          const cells = row.querySelectorAll('td, th');
          const text = row.textContent;
          if (keywords.test(text) && datePattern.test(text)) {
            const titleCell = Array.from(cells).find(c =>
              keywords.test(c.textContent)
            );
            const dateCell = Array.from(cells).find(c =>
              datePattern.test(c.textContent)
            );
            if (titleCell && dateCell) {
              const dateMatch = dateCell.textContent.match(datePattern);
              deadlines.push({
                title: titleCell.textContent.trim().substring(0, 120),
                dueDate: dateMatch ? dateMatch[0] : dateCell.textContent.trim(),
                link:
                  titleCell.querySelector('a')?.href || window.location.href,
                course: document.title.split(/[-–—|]/)[0].trim(),
                platform: 'Detected'
              });
            }
          }
        });

        // --- List items & cards ---
        document
          .querySelectorAll(
            'li, .card, [class*="item"], [class*="assignment"], [class*="activity"]'
          )
          .forEach(item => {
            const text = item.textContent;
            if (
              keywords.test(text) &&
              datePattern.test(text) &&
              text.length < 600
            ) {
              const dateMatch = text.match(datePattern);
              const titleEl = item.querySelector(
                'a, h2, h3, h4, h5, strong, b, [class*="title"]'
              );
              if (titleEl && dateMatch) {
                deadlines.push({
                  title: titleEl.textContent.trim().substring(0, 120),
                  dueDate: dateMatch[0],
                  link:
                    titleEl.href ||
                    item.querySelector('a')?.href ||
                    window.location.href,
                  course: document.title.split(/[-–—|]/)[0].trim(),
                  platform: 'Detected'
                });
              }
            }
          });

        return deadlines;
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  function cleanDateText(el) {
    if (!el) return '';
    return el.textContent.replace(/^Due:?\s*/i, '').trim();
  }

  function normalizeDate(str) {
    if (!str) return null;

    // Try native parse
    let d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();

    // Strip ordinal suffixes (1st, 2nd, 3rd, 4th …)
    const cleaned = str.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
    d = new Date(cleaned);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();

    // DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = cleaned.match(
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
    );
    if (slashMatch) {
      let [, a, b, year] = slashMatch;
      if (year.length === 2) year = '20' + year;
      // Try MM/DD first (US), then DD/MM
      for (const iso of [
        `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`,
        `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
      ]) {
        d = new Date(iso);
        if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();
      }
    }

    return null; // truly unparseable
  }

  function dedup(deadlines) {
    const seen = new Set();
    return deadlines.filter(d => {
      const key = `${d.title.toLowerCase().replace(/\s+/g, ' ')}::${d.dueDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function mergeDeadlines(existing, fresh) {
    const map = new Map();
    for (const d of existing) {
      map.set(
        `${d.title.toLowerCase().replace(/\s+/g, ' ')}::${d.dueDate}`,
        d
      );
    }
    for (const d of fresh) {
      map.set(
        `${d.title.toLowerCase().replace(/\s+/g, ' ')}::${d.dueDate}`,
        d
      );
    }
    return Array.from(map.values()).sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  MAIN
  // ═══════════════════════════════════════════════════════════

  async function main() {
    const platform = detectPlatform();
    const adapter = adapters[platform];
    if (!adapter) return;

    console.log(
      `[Campus Deadline Radar] Platform detected: ${adapter.name} (${platform})`
    );

    let deadlines = [];
    try {
      deadlines = adapter.extract();
    } catch (e) {
      console.error('[CDR] Extraction error:', e);
      return;
    }

    // Also try custom selectors from settings
    try {
      const { settings = {} } = await chrome.storage.local.get('settings');
      if (settings.customTitleSelector && settings.customDateSelector) {
        document
          .querySelectorAll(settings.customTitleSelector)
          .forEach((titleEl, i) => {
            const dateEls = document.querySelectorAll(
              settings.customDateSelector
            );
            const dateEl = dateEls[i] || dateEls[0];
            if (titleEl && dateEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateEl.textContent.trim(),
                link: titleEl.href || titleEl.closest('a')?.href || window.location.href,
                course: document.title.split(/[-–—|]/)[0].trim(),
                platform: 'Custom'
              });
            }
          });
      }
    } catch (_) {
      /* storage might fail in some contexts */
    }

    // Normalize & filter
    deadlines = deadlines
      .map(d => {
        const normalized = normalizeDate(d.dueDate);
        return {
          ...d,
          dueDate: normalized || d.dueDate,
          timestamp: normalized ? new Date(normalized).getTime() : 0,
          scrapedAt: new Date().toISOString(),
          sourceUrl: window.location.href
        };
      })
      .filter(d => d.title && d.timestamp > 0);

    deadlines = dedup(deadlines);

    if (deadlines.length === 0) {
      console.log('[Campus Deadline Radar] No deadlines found on this page.');
      return;
    }

    console.log(
      `[Campus Deadline Radar] Extracted ${deadlines.length} deadline(s).`
    );

    // Merge with stored
    const { deadlines: existing = [] } =
      await chrome.storage.local.get('deadlines');
    const merged = mergeDeadlines(existing, deadlines);

    await chrome.storage.local.set({
      deadlines: merged,
      lastScan: new Date().toISOString(),
      lastPlatform: adapter.name
    });

    console.log(
      `[Campus Deadline Radar] Stored ${merged.length} total deadline(s).`
    );
  }

  // ─── Execute ──────────────────────────────────────────────

  main();

  // Listen for manual-scan requests from popup
  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.action === 'manualScan') {
        window.__cdr_scanned = false;
        main().then(() => sendResponse({ success: true }));
        return true;
      }
    });
  }
})();
