// ═══════════════════════════════════════════════════════════════
//  Deadline Reminder — Calendar Utilities
//  Google Calendar links · .ics generation · file download
// ═══════════════════════════════════════════════════════════════

const CalendarUtils = {
  // ─── Google Calendar Pre-filled Link ─────────────────────

  createGoogleCalendarLink(title, dateStr, url) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '#';

    const start = this.toGCalDate(date);
    const end = this.toGCalDate(new Date(date.getTime() + 60 * 60 * 1000));

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${start}/${end}`,
      details: url
        ? `Assignment link: ${url}\n\nAdded by Deadline Reminder`
        : 'Added by Deadline Reminder',
      sf: 'true'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  },

  // ─── Microsoft Outlook Web Calendar Pre-filled Link ───────

  createOutlookCalendarLink(title, dateStr, url, course) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '#';

    const start = date.toISOString();
    const end = new Date(date.getTime() + 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: title + (course ? ` [${course}]` : ''),
      startdt: start,
      enddt: end,
      body: url ? `Assignment: ${url}\nAdded by Deadline Reminder` : 'Added by Deadline Reminder'
    });

    return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
  },

  // ─── Notion Direct Template / Quick-Capture Link ──────────

  createNotionPageUrl(title, dateStr, url, course) {
    const text = encodeURIComponent(
      `Course: ${course || 'General'}\nDue Date: ${dateStr}\nURL: ${url || ''}`
    );
    return `https://www.notion.so/?action=new&title=${encodeURIComponent(title)}&body=${text}`;
  },

  toGCalDate(date) {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  },

  // ─── Single .ics Event ──────────────────────────────────

  generateICS(title, dateStr, url, course) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const stamp = this.toICSDate(new Date());
    const start = this.toICSDate(date);
    const end = this.toICSDate(new Date(date.getTime() + 60 * 60 * 1000));
    const uid = this.uid();

    const description = [
      course ? `Course: ${course}` : '',
      url ? `Link: ${url}` : '',
      'Added by Deadline Reminder'
    ]
      .filter(Boolean)
      .join('\\n');

    return this.wrapCalendar([
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${this.esc(title)}`,
      `DESCRIPTION:${description}`,
      url ? `URL:${url}` : '',
      'STATUS:CONFIRMED',
      // 1-hour reminder
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${this.esc(title)} is due soon!`,
      'END:VALARM',
      // 24-hour reminder
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${this.esc(title)} is due tomorrow!`,
      'END:VALARM',
      'END:VEVENT'
    ]);
  },

  // ─── Multi-event .ics ───────────────────────────────────

  generateMultiICS(deadlines) {
    const stamp = this.toICSDate(new Date());

    const events = deadlines
      .map(d => {
        const date = new Date(d.timestamp || d.dueDate);
        if (isNaN(date.getTime())) return '';

        const start = this.toICSDate(date);
        const end = this.toICSDate(
          new Date(date.getTime() + 60 * 60 * 1000)
        );
        const uid = this.uid();

        const description = [
          d.course ? `Course: ${d.course}` : '',
          d.link ? `Link: ${d.link}` : '',
          `Platform: ${d.platform || 'Unknown'}`,
          'Added by Deadline Reminder'
        ]
          .filter(Boolean)
          .join('\\n');

        return [
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${start}`,
          `DTEND:${end}`,
          `SUMMARY:${this.esc(d.title)}`,
          `DESCRIPTION:${description}`,
          d.link ? `URL:${d.link}` : '',
          'STATUS:CONFIRMED',
          'BEGIN:VALARM',
          'TRIGGER:-PT1H',
          'ACTION:DISPLAY',
          `DESCRIPTION:${this.esc(d.title)} is due soon!`,
          'END:VALARM',
          'END:VEVENT'
        ]
          .filter(Boolean)
          .join('\r\n');
      })
      .filter(Boolean);

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Deadline Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Deadlines',
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');
  },

  // ─── Internal Helpers ───────────────────────────────────

  toICSDate(date) {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  },

  esc(str) {
    return str.replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
  },

  uid() {
    return `dr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@deadline-reminder`;
  },

  wrapCalendar(eventLines) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Deadline Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...eventLines,
      'END:VCALENDAR'
    ]
      .filter(Boolean)
      .join('\r\n');
  },

  // ─── Trigger Browser Download ───────────────────────────

  downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
