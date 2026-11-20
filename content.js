// ═══════════════════════════════════════════════════════════════
//  Deadline Reminder — Content Script
//  Auto-detects educational platform and extracts assignment deadlines
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

        // 1) Assignment index (/courses/X/assignments)
        document
          .querySelectorAll('.assignment, .ig-row, .assignment_group .ig-list .ig-row')
          .forEach(row => {
            const titleEl = row.querySelector(
              '.ig-title a, a.ig-title, .title a, .assignment-title a'
            );
            const dateEl = row.querySelector(
              '.assignment-date-due .screenreader-only, .due-date, .date-due, .assignment-date-due'
            );
            const isSubmitted = !!(
              row.querySelector('.submission_status, .submitted, .ig-status, .check') ||
              row.textContent.match(/\b(submitted|turned in|graded)\b/i)
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: cleanDateText(dateEl),
                link: titleEl.href,
                course,
                submitted: isSubmitted,
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
            const isSubmitted = !!(
              item.querySelector('[class*="Completed"], [class*="complete"], [class*="submitted"]') ||
              item.textContent.match(/\b(submitted|completed|turned in|graded)\b/i)
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
                submitted: isSubmitted,
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
            const isSubmitted = !!row.textContent.match(/\b(submitted|completed|graded)\b/i);
            if (dateEl && titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateEl.textContent.trim(),
                link: titleEl.href || '',
                course,
                submitted: isSubmitted,
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
            const isSubmitted = !!(
              item.classList.contains('completed') ||
              item.querySelector('.completed')
            );
            if (titleEl) {
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate:
                  dateEl?.getAttribute('datetime') ||
                  dateEl?.textContent.trim() ||
                  '',
                link: titleEl.href || item.querySelector('a')?.href || '',
                course,
                submitted: isSubmitted,
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
        const course = this.getCourse();

        // Check if current tab is "Done" or "Turned in"
        const isDonePage = window.location.href.includes('/turned-in') || window.location.href.includes('/done');

        // 1) Work / assignment cards & coursework items
        document
          .querySelectorAll(
            '[data-assignmentid], [data-courseworkid], [data-item-id], [data-stream-item-id], c-wiz [role="listitem"], .y2abvd'
          )
          .forEach(item => {
            const titleEl = item.querySelector(
              '[class*="title"], h2, h3, [role="heading"], a[href*="/c/"]'
            );
            const dateText = this.findDateInElement(item);
            const courseEl = item.querySelector(
              '[class*="course"], [class*="class"], .j10vNd'
            );
            const itemText = item.textContent || '';
            const isSubmitted = isDonePage || !!(
              itemText.match(/\b(turned in|submitted|done late|graded)\b/i) ||
              item.querySelector('[aria-label*="Turned in" i], [aria-label*="Submitted" i], .A6dC2d')
            );

            if (titleEl && dateText) {
              const linkEl = item.querySelector('a[href*="/c/"]') || item.closest('a') || item.querySelector('a');
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateText,
                link: linkEl?.href || window.location.href,
                course: courseEl?.textContent.trim() || course,
                submitted: isSubmitted,
                platform: 'Google Classroom'
              });
            }
          });

        // 2) To-do / assigned work page list items
        document
          .querySelectorAll('[role="listitem"], .asQ4ud, .MHp48d, .VnOHwf')
          .forEach(item => {
            const titleEl = item.querySelector(
              'h2, h3, [role="heading"], .YVvGBb, a'
            );
            const dateText = this.findDateInElement(item);
            const courseEl = item.querySelector('.j10vNd, .asQ4ud .A6dC2d, [class*="course"]');
            const itemText = item.textContent || '';
            const isSubmitted = isDonePage || !!(
              itemText.match(/\b(turned in|submitted|done late|graded)\b/i) ||
              item.querySelector('[aria-label*="Turned in" i], [aria-label*="Submitted" i]')
            );

            if (titleEl && dateText) {
              const linkEl = item.querySelector('a') || item.closest('a');
              deadlines.push({
                title: titleEl.textContent.trim(),
                dueDate: dateText,
                link: linkEl?.href || window.location.href,
                course: courseEl?.textContent.trim() || course,
                submitted: isSubmitted,
                platform: 'Google Classroom'
              });
            }
          });

        return deadlines;
      },
      getCourse() {
        return (
          document.querySelector('h1[data-course-title], [aria-label="Class name"], h1')?.textContent?.trim() ||
          document.title.split(/[-–—|•]/)[0]?.trim() ||
          'Google Classroom'
        );
      },
      findDateInElement(el) {
        const text = el.textContent || '';

        // 1. Check relative phrasing: "Due tomorrow, 11:59 PM", "Due today at 5 PM", "Due Friday"
        const relMatch = text.match(/(?:Due|Deadline|Submit by)[:\s]*((?:today|tomorrow|\w+day)[^,\n\r]*(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);
        if (relMatch) return relMatch[1].trim();

        // 2. Check standard dates: "Due Nov 25", "Due 11/25/2026", "Due Oct 12, 11:59 PM"
        const patterns = [
          /(?:Due|Deadline|Submit by)[:\s]*([\w\s,]+\d{1,2}(?:[,\s]+\d{4})?(?:\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i,
          /(\w{3,9}\s+\d{1,2},?\s*\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i,
          /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m) return m[1].trim();
        }

        const timeEl = el.querySelector('time, [datetime], [aria-label*="Due" i]');
        if (timeEl) {
          return (
            timeEl.getAttribute('datetime') ||
            timeEl.getAttribute('aria-label') ||
            timeEl.textContent.trim()
          );
        }

        return '';
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

  function parseRelativeDate(str) {
    if (!str) return null;
    const now = new Date();
    const text = str.trim();

    // Check "today" or "tomorrow"
    const relMatch = text.match(/\b(today|tomorrow)\b/i);
    // Check weekdays: "Monday", "Tue", "Wednesday", etc.
    const dayMatch = text.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);

    // Extract optional time like "11:59 PM", "23:59", "5:00 PM", "at 5pm"
    let hours = 23, minutes = 59; // default to end of day
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch && (timeMatch[3] || text.includes(':'))) {
      let h = parseInt(timeMatch[1], 10);
      let m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      hours = h;
      minutes = m;
    }

    if (relMatch) {
      const target = new Date(now);
      if (relMatch[1].toLowerCase() === 'tomorrow') {
        target.setDate(target.getDate() + 1);
      }
      target.setHours(hours, minutes, 0, 0);
      return target.toISOString();
    }

    if (dayMatch) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayMatch[1].toLowerCase());
      const currentDay = now.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence of that weekday
      const target = new Date(now);
      target.setDate(target.getDate() + diff);
      target.setHours(hours, minutes, 0, 0);
      return target.toISOString();
    }

    return null;
  }

  function normalizeDate(str) {
    if (!str) return null;

    // 1. Try relative date translation (today, tomorrow, weekday names)
    const relIso = parseRelativeDate(str);
    if (relIso) return relIso;

    // 2. Try native parse
    let d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();

    // 3. If year is missing like "Nov 25, 11:59 PM" -> append current year
    const monthPattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i;
    if (monthPattern.test(str) && !/\b20\d{2}\b/.test(str)) {
      const withYear = `${str}, ${new Date().getFullYear()}`;
      d = new Date(withYear);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    // 4. Strip ordinal suffixes (1st, 2nd, 3rd, 4th …)
    const cleaned = str.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
    d = new Date(cleaned);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();

    // 5. DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = cleaned.match(
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
    );
    if (slashMatch) {
      let [, a, b, year] = slashMatch;
      if (year.length === 2) year = '20' + year;
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
      `[Deadline Reminder] Platform detected: ${adapter.name} (${platform})`
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
      console.log('[Deadline Reminder] No deadlines found on this page.');
      return;
    }

    console.log(
      `[Deadline Reminder] Extracted ${deadlines.length} deadline(s).`
    );

    // Merge with stored
    const { deadlines: existing = [], settings = {} } =
      await chrome.storage.local.get(['deadlines', 'settings']);

    // Check if auto-sync to Google Calendar is enabled
    if (settings.autoCalendarSync) {
      for (const d of deadlines) {
        if (!d.submitted && !d.calendarSynced) {
          try {
            // Direct background injection or silent fetch
            chrome.runtime.sendMessage({ action: 'autoSyncCalendar', deadline: d });
            d.calendarSynced = true;
          } catch (_) {}
        }
      }
    }

    const merged = mergeDeadlines(existing, deadlines);

    await chrome.storage.local.set({
      deadlines: merged,
      lastScan: new Date().toISOString(),
      lastPlatform: adapter.name
    });

    console.log(
      `[Deadline Reminder] Stored ${merged.length} total deadline(s).`
    );

    // Show floating in-page badge / notification on supported course page
    injectInPageBadge(merged.length, deadlines.length);
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════
  //  FLOATING IN-PAGE BADGE & POPUP
  // ═══════════════════════════════════════════════════════════

  function injectInPageBadge(count, newItemsCount) {
    if (document.getElementById('deadline-reminder-badge')) {
      const existingBadge = document.getElementById('deadline-reminder-badge');
      const countEl = existingBadge.querySelector('.dr-badge-count');
      if (countEl) countEl.textContent = count;
      return;
    }

    const host = document.createElement('div');
    host.id = 'deadline-reminder-badge';
    host.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0f172a;
      color: #f1f5f9;
      padding: 10px 16px;
      border-radius: 30px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      animation: drSlideUp 0.4s ease-out;
    `;

    host.innerHTML = `
      <style>
        @keyframes drSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        #deadline-reminder-badge:hover {
          background: #1e293b;
          border-color: #475569;
        }
        .dr-badge-count {
          background: #2563eb;
          color: #ffffff;
          font-weight: 600;
          font-size: 11px;
          padding: 1px 7px;
          border-radius: 10px;
        }
      </style>
      <span style="font-weight: 600; letter-spacing: -0.2px;">Deadlines</span>
      <span class="dr-badge-count">${count}</span>
    `;

    host.addEventListener('click', () => {
      showInPageDeadlinesModal();
    });

    document.body.appendChild(host);
  }

  async function showInPageDeadlinesModal() {
    let modal = document.getElementById('deadline-reminder-modal');
    if (modal) {
      modal.remove();
      return;
    }

    const { deadlines = [] } = await chrome.storage.local.get('deadlines');
    const now = Date.now();
    const sorted = deadlines.filter(d => (d.timestamp || 0) > now - 86400000);

    modal = document.createElement('div');
    modal.id = 'deadline-reminder-modal';
    modal.style.cssText = `
      position: fixed;
      bottom: 74px;
      right: 24px;
      width: 360px;
      max-height: 480px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
      animation: drSlideUp 0.25s ease-out;
    `;

    modal.innerHTML = `
      <div style="padding: 12px 16px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: #1e293b;">
        <span style="font-weight: 600; font-size: 13px; letter-spacing: -0.2px;">Upcoming Deadlines (${sorted.length})</span>
        <button id="dr-close-modal" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 2px 6px;">×</button>
      </div>
      <div style="padding: 10px; overflow-y: auto; flex: 1; max-height: 380px;">
        ${sorted.length === 0 ? '<p style="font-size: 12px; color: #94a3b8; text-align: center; padding: 24px;">No upcoming deadlines found.</p>' : sorted.map(d => {
          const ms = (d.timestamp || 0) - now;
          const urgencyColor = ms < 86400000 ? '#ef4444' : ms < 259200000 ? '#f59e0b' : '#3b82f6';
          const dateStr = new Date(d.timestamp || d.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          return `
            <div style="background: #1e293b; border-left: 3px solid ${urgencyColor}; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
              <div style="font-size: 11px; color: #60a5fa; font-weight: 500;">${esc(d.course || '')}</div>
              <div style="font-size: 13px; font-weight: 500; margin: 3px 0;">
                <a href="${esc(d.link || '#')}" target="_blank" style="color: #f1f5f9; text-decoration: none;">${esc(d.title)}</a>
              </div>
              <div style="font-size: 11px; color: #94a3b8;">${dateStr}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('dr-close-modal')?.addEventListener('click', () => modal.remove());
  }

  // ─── Continuous SPA Observer ─────────────────────────────

  function startSPAObserver() {
    let lastUrl = window.location.href;
    let scanTimeout = null;

    // Listen to pushState / replaceState for client-side navigation
    const origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      triggerScan();
    };

    const origReplaceState = history.replaceState;
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      triggerScan();
    };

    window.addEventListener('popstate', triggerScan);

    // Mutation observer for DOM additions (e.g. tabs loading coursework dynamically)
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        triggerScan();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    function triggerScan() {
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        main();
      }, 1200);
    }
  }

  // ─── Execute ──────────────────────────────────────────────

  main();
  startSPAObserver();

  // Listen for manual-scan requests from popup
  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.action === 'manualScan') {
        main().then(() => sendResponse({ success: true }));
        return true;
      }
    });
  }
})();
