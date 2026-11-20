# 📡 Campus Deadline Radar

A lightweight Chrome extension that **auto-detects course deadlines** from your university LMS (Canvas, Moodle, Google Classroom, Blackboard, Brightspace) and lets you export them to **Google Calendar** or download **.ics files** — all without any backend server, database, or OAuth setup.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Auto-detection** | Content scripts automatically scrape deadlines when you visit supported LMS pages |
| 📅 **Google Calendar** | One-click "Add to Calendar" via pre-filled URL — no API key needed |
| 📥 **.ics Export** | Download individual or bulk `.ics` files for Apple Calendar, Outlook, or any calendar app |
| 🔔 **Notifications** | Desktop alerts when a deadline is approaching (configurable hours) |
| 🎨 **Urgency Colors** | 🔴 Red (<24h), 🟡 Yellow (<3 days), 🟢 Green (>3 days) |
| 🏷️ **Badge Count** | Extension icon shows the number of upcoming deadlines this week |
| 🔎 **Manual Scan** | Click the ⟳ button to scan any page — works on custom university portals |
| ⚙️ **Custom Selectors** | Advanced users can define CSS selectors for unsupported portals |
| 💾 **JSON Backup** | Export/import all data as JSON |

---

## 🏫 Supported Platforms

- **Canvas** (Instructure) — `*.instructure.com`
- **Moodle** — `*.moodle.org`, `*.moodlecloud.com`
- **Google Classroom** — `classroom.google.com`
- **Blackboard** — `*.blackboard.com`
- **Brightspace / D2L** — `*.brightspace.com`, `*.d2l.com`
- **Generic** — Heuristic fallback that detects assignment tables & date patterns on any page

---

## 🚀 Installation (Developer Mode)

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/Marwanthe0/campus-deadline-radar.git
   ```

2. Open **Chrome** and navigate to `chrome://extensions`

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **"Load unpacked"** and select the project folder

5. The 📡 extension icon appears in your toolbar — you're ready to go!

---

## 📖 Usage

1. **Log into your university portal** (Canvas, Moodle, etc.) as you normally would
2. Navigate to your **assignments/dashboard page**
3. The extension **automatically extracts deadlines** and stores them locally
4. Click the **📡 extension icon** to see your deadlines sorted by urgency
5. Use the action buttons on each card:
   - 📅 **Add to Google Calendar** — opens a pre-filled event
   - ⬇️ **Download .ics** — imports into any calendar app
   - ✕ **Remove** — delete a single deadline
6. Use the **footer buttons** to export all deadlines or clear stored data

### Manual Scan
If your university uses a custom portal not auto-detected, click the **⟳ Scan** button in the popup to run the scraper on the current tab.

### Settings
Click the **⚙️ gear icon** to configure:
- Notification timing (hours before deadline)
- Custom university domains
- Advanced CSS selectors for custom portals
- Data export/import

---

## 🏗️ Project Structure

```
campus-deadline-radar/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service worker: alarms, badge, notifications
├── content.js          # Content script: platform detection + scraping
├── popup.html          # Popup UI layout
├── popup.css           # Popup styles (dark theme, card-based)
├── popup.js            # Popup logic: rendering, filters, actions
├── calendar.js         # Calendar utilities: Google Calendar links, .ics generation
├── options.html        # Settings page layout
├── options.css         # Settings page styles
├── options.js          # Settings logic: save, export, import, clear
├── icons/              # Extension icons (16, 32, 48, 128 px)
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🔧 Adding Your Own University Domain

If your university portal isn't auto-detected:

1. Click the ⚙️ icon → **Settings**
2. Under **Custom Domains**, add your portal URL (e.g. `portal.myuni.edu`)
3. Under **Custom CSS Selectors**, inspect your portal's HTML and enter:
   - **Title selector**: CSS selector for assignment titles (e.g. `.hw-title a`)
   - **Date selector**: CSS selector for due dates (e.g. `.due-date`)
4. Click **Save Settings**
5. Reload the extension on `chrome://extensions`

---

## 🛣️ Roadmap

- [ ] Chrome Web Store publishing
- [ ] Outlook Calendar direct link support
- [ ] Recurring deadline detection (e.g. weekly quizzes)
- [ ] Multi-language date parsing
- [ ] Dark/light theme toggle
- [ ] Sync across devices via `chrome.storage.sync`

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

---

Built with ❤️ by [Marwanthe0](https://github.com/Marwanthe0)
