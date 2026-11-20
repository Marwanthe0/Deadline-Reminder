# Deadline Reminder

A lightweight, privacy-focused Chromium browser extension that automatically detects coursework and assignment deadlines across educational platforms (Canvas, Moodle, Google Classroom, Blackboard, and Brightspace) and synchronizes them directly with **Google Calendar**, **Microsoft Outlook**, or standard **iCalendar (.ics)** formats.

Designed with Manifest V3. Runs 100% locally in the browser with zero third-party servers, zero credential transmission, and zero telemetry.

---

## Features

- **Automated Deadline Extraction**: Continuously identifies assignments, due dates, course names, and submission URLs while navigating your course dashboard or coursework tabs.
- **Universal Calendar Integration**:
  - One-click pre-filled Google Calendar event creation.
  - One-click Microsoft Outlook Web Calendar event creation.
  - Direct template capture for Notion student workspaces.
  - Multi-platform `.ics` file generation (RFC 5545 compliant) compatible with Apple Calendar, Thunderbird, and desktop calendar software.
- **Completion & State Tracking**:
  - Automatically identifies submitted or turned-in assignments on Google Classroom and Canvas.
  - Dedicated "Completed" view and manual completion toggle.
- **Multi-Stage Notification Intervals**:
  - Customizable alert thresholds (e.g. 48h, 24h, 2h before submission cutoffs).
  - Optional sound notifications for urgent deadlines.
- **Custom Portals & Heuristic Fallback**:
  - Configurable custom domains for university-hosted subdomains.
  - Custom DOM title and date CSS selector overrides.
- **Offline & Private**: All data is stored in `chrome.storage.local`.

---

## Supported Educational Platforms

| Platform | Domain Patterns | Scope of Extraction |
| :--- | :--- | :--- |
| **Canvas** | `*.instructure.com` | Assignment tables, planner cards, syllabus, calendar agenda |
| **Moodle** | `*.moodle.org`, `*.moodlecloud.com` + custom hostnames | Timeline blocks, upcoming events, course activity lists |
| **Google Classroom** | `classroom.google.com` | Coursework lists, classwork streams, student to-do dashboards |
| **Blackboard Learn / Ultra** | `*.blackboard.com` | Activity streams, course assignment content lists |
| **Brightspace / D2L** | `*.brightspace.com`, `*.d2l.com` | Assignment lists, upcoming work widgets |
| **Custom / University Portals** | User-defined hostnames | Heuristic table and list parser with configurable selectors |

---

## Quick Installation (Developer Mode)

You can install this extension on any Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Arc, Opera) in under a minute without using the Chrome Web Store:

1. **Download the Extension**:
   - Download the latest **`Deadline-Reminder.zip`** from the [GitHub Releases](https://github.com/Marwanthe0/LMS-Deadline-Reminder/releases) page (or clone this repository).
   - Unzip the downloaded file onto your computer.

2. **Open Extensions Manager**:
   - In your browser address bar, navigate to:
     - Chrome / Brave / Arc: `chrome://extensions`
     - Microsoft Edge: `edge://extensions`

3. **Enable Developer Mode**:
   - Turn on the **Developer mode** toggle in the top-right corner.

4. **Load the Extension**:
   - Click **Load unpacked** in the top-left corner.
   - Select the unzipped folder containing `manifest.json`.
   - Pin **Deadline Reminder** to your browser toolbar.

---

## Usage Guide

1. Log into your university or course portal as you normally would.
2. Navigate to your course classwork, assignments page, or dashboard.
3. The extension detects upcoming deliverables in the background and updates the toolbar badge.
4. Open the extension popup to view deliverables sorted by chronological urgency:
   - Click the checkmark icon to toggle completion.
   - Click the calendar icons to export directly to Google Calendar, Outlook, Notion, or download an `.ics` file.
   - Click **Export Schedule (.ics)** to export all upcoming events in a single calendar feed.

---

## Configuration

Click the gear icon in the extension popup to open the settings:
- **Reminder Intervals**: Set custom alert milestones (e.g., `48, 24, 2` hours).
- **Sound Alerts**: Toggle audio notification chimes.
- **Custom Domains**: Add institution-specific URLs (e.g., `canvas.university.edu`).
- **DOM Selectors**: Define custom CSS selectors for custom or legacy university portals.
- **Data Backup**: Export or import your stored deadline database via JSON.

---

## Technical Architecture

```
Deadline-Reminder/
├── manifest.json       # Manifest V3 configuration & permission declarations
├── background.js       # Service worker for periodic alarms, notifications & badge updates
├── content.js          # Platform DOM adapters, relative date parser & SPA observers
├── calendar.js         # RFC 5545 iCalendar engine & calendar link generators
├── popup.html          # Extension popup UI
├── popup.css           # Clean dark-mode stylesheet
├── popup.js            # Popup filtering, rendering, and interaction logic
├── options.html        # Settings page UI
├── options.css         # Settings page stylesheet
├── options.js          # Configuration persistence & backup handlers
├── icons/              # Extension icons (16, 32, 48, 128px)
├── LICENSE             # MIT License
└── README.md           # Documentation
```

---

## License

This project is licensed under the [MIT License](LICENSE).
