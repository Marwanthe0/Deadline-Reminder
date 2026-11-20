# LMS Deadline Reminder

A lightweight, client-side Chromium extension that detects assignment deadlines across university Learning Management Systems (Canvas, Moodle, Google Classroom, Blackboard, and Brightspace) and exports them directly to **Google Calendar** or standardized **iCalendar (.ics)** files.

Built with Manifest V3, without any external server dependencies, database clusters, or complex OAuth handshakes. All data stays local in browser storage.

---

## Key Features

- **Automated Scraping**: Detects and extracts assignments, due dates, course names, and direct links when navigating your university dashboard or assignment pages.
- **Universal Calendar Export**:
  - Direct pre-filled Google Calendar event generation.
  - Multi-platform `.ics` file generation (RFC 5545 compatible) for Apple Calendar, Outlook, Thunderbird, and Notion.
- **Urgency Visualization**: Prioritizes upcoming deliverables with color-coded status badges:
  - 🔴 **Urgent**: Less than 24 hours remaining.
  - 🟡 **Approaching**: Within 3 days.
  - 🟢 **Safe**: Scheduled further out.
- **Local Alerts & Badges**: Periodic checks trigger desktop notifications prior to impending cutoffs, with a live countdown badge displayed directly on the extension icon.
- **Extensible Heuristics & Selectors**: Includes a resilient fallback parser for custom or self-hosted university portals, along with an options page to configure site-specific DOM selectors and custom domains.
- **Privacy First**: Fully client-side. No user data, session cookies, or LMS credentials ever leave your machine.

---

## Supported Learning Platforms

| LMS | Auto-Detection Match Pattern | Extraction Target |
| :--- | :--- | :--- |
| **Canvas LMS** | `*.instructure.com` | Assignment tables, planner cards, syllabus schedule, calendar |
| **Moodle** | `*.moodle.org`, `*.moodlecloud.com` + self-hosted | Timeline block, upcoming events, course activity modules |
| **Google Classroom** | `classroom.google.com` | Coursework lists, student to-do views |
| **Blackboard Learn / Ultra** | `*.blackboard.com` | Activity stream, course assignment lists |
| **Brightspace / D2L** | `*.brightspace.com`, `*.d2l.com` | Assignment lists, upcoming work widgets |
| **Custom Portals** | User-defined domains | Heuristic table/list date-parsing engine + configurable CSS selectors |

---

## Installation

### Load Unpacked Extension (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Marwanthe0/LMS-Deadline-Reminder.git
   ```
2. Open Google Chrome (or any Chromium browser like Brave, Edge, or Arc).
3. Navigate to `chrome://extensions`.
4. Enable **Developer mode** via the toggle switch in the top-right corner.
5. Click **Load unpacked** and select the root directory of this repository (`LMS-Deadline-Reminder`).
6. Pin the extension to your browser toolbar for quick access.

---

## Usage Workflow

1. Log into your university portal as usual.
2. Navigate to your course dashboard, upcoming tasks, or assignments overview.
3. The extension content script runs automatically on recognized domains, extracting deadlines into `chrome.storage.local`.
4. Click the extension toolbar icon:
   - View your upcoming assignments sorted in chronological order.
   - Click the **Google Calendar** icon on any task to add it immediately.
   - Click the **.ics** icon to download a calendar file for individual events, or use **Export All (.ics)** for your full schedule.
5. If you are on an unlisted university subdomain, click the **⟳ Scan** button inside the popup to force an active-tab extraction.

---

## Configuration & Options

Access the settings page by clicking the gear icon (**⚙**) in the popup:

- **Notification Lead Time**: Configure how many hours in advance you receive desktop reminders (default: 24h).
- **Custom Domains**: Add your institution's hostnames (e.g., `lms.university.edu`) to ensure scripts inject automatically.
- **Custom CSS Selectors**: Specify custom CSS selectors for assignment titles and due dates on bespoke university portals.
- **Data Management**: Export your entire stored deadline database to JSON or import from an existing backup.

---

## Architecture

```
LMS-Deadline-Reminder/
├── manifest.json       # Manifest V3 configuration & permission declarations
├── background.js       # Background service worker for alarms, notifications & icon badges
├── content.js          # Platform adapters & heuristic DOM scrapers
├── calendar.js         # RFC 5545 iCalendar serialization & Google Calendar URL encoder
├── popup.html          # Extension popup interface
├── popup.css           # Clean dark-mode stylesheet & responsive card layout
├── popup.js            # Popup interaction, state management, and filtering logic
├── options.html        # Settings page layout
├── options.css         # Options styling
├── options.js          # Options persistence and JSON import/export handlers
├── icons/              # Extension asset sizes (16, 32, 48, 128px)
└── README.md
```

---

## License

Distributed under the [MIT License](LICENSE).
