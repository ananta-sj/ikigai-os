# Ikigai OS 🌱

> A local-first personal growth operating system that turns daily tasks, milestones, and reflection into an interactive calendar, evolving garden, and living record of progress.

Ikigai OS is an experimental personal productivity and life-tracking application built around a simple idea:

> **Plan → Do → Complete → Reward → See your world change.**

Instead of behaving like a traditional task manager, Ikigai OS is designed to feel like a **place you return to every day** — part planner, part journal, part progress system, and eventually part living digital garden.

---

## ✨ Why Ikigai OS?

Most productivity tools are good at storing tasks.

Ikigai OS is being built to make progress **visible, memorable, and emotionally rewarding**.

The long-term vision includes:

- a task-driven daily system
- a physical, tear-off style interactive calendar
- seasonal themes and visual customization
- an evolving garden that grows from completed work
- weekly and monthly reflections
- memories and personal milestones
- project, certification, and career tracking
- optional local AI assistance
- local-first data ownership with optional sync later

The goal is not to gamify life for the sake of points.

The goal is to create a system where **real effort leaves visible evidence**.

---

## 🚧 Project Status

**Current version:** `v0.2 — The Living Day`

Ikigai OS is currently in active early development.

### Working now

- local-first storage using IndexedDB
- task creation and completion
- task difficulty levels
- task-driven growth rewards
- persistent local data
- Today dashboard
- single-seed garden progression
- basic journey/calendar view
- future-task scheduling
- responsive React UI
- PWA foundation
- no account required
- no cloud dependency

### In development

- first-time onboarding experience
- redesigned immersive Today screen
- optional tear-off Daily Page calendar
- day-closing and unfinished-task carryover
- memo system
- visual garden growth animation
- settings-driven themes
- more interactive navigation

### Planned later

- full physical-style interactive calendar
- page-tear and page-turn animations
- weekly progress reports
- achievements and special rewards
- rare seeds and collectible plants
- animal eggs and garden companions
- memory vault
- GitHub activity integration
- roadmap / certification tracking
- internship and career tracker
- local AI companion using Ollama
- optional cloud sync
- data export / import / backup

---

## 🌱 The Core Loop

```text
Task
  ↓
Completion
  ↓
Rewards
  ├── Growth
  ├── Water
  ├── Sunlight
  └── Fertilizer
  ↓
Garden progression
  ↓
Calendar / journey history
```

The application is gradually moving away from manual activity logging and toward a task-first model where completing meaningful work naturally updates the rest of the system.

---

## 🌿 Garden Philosophy

Every user begins with **one seed**.

There is no pre-filled forest.

The seed grows only when real tasks are completed.

Current progression concept:

```text
Dormant Seed
    ↓
Awakening Seed
    ↓
Sprout
    ↓
Young Plant
    ↓
Sapling
    ↓
Young Tree
    ↓
Mature Tree
    ↓
Bloom
```

Future milestones may award:

- 🌸 rare seeds
- 🌲 special trees
- 🥚 animal eggs
- 🐣 garden companions
- 🏆 milestone-specific rewards

Nothing is intended to die because of missed days.

Ikigai OS is meant to encourage consistency, not punish imperfect weeks.

---

## 📅 Daily Page Concept

One of the signature planned features is an optional **physical-style Daily Page calendar**.

The idea is to make each day feel like a real paper page that can contain:

- the current date
- today's tasks
- handwritten-style notes
- important events
- mini calendar views
- seasonal themes
- optional page-tear interaction

At the end of a day, the page can eventually be "torn away" and archived into the user's journey history.

The tear is not just decoration — it will represent **closing the day**.

---

## 🧠 Local-First by Design

Ikigai OS is intentionally being built as a **local-first application**.

Your primary data lives on your device.

Current architecture:

```text
React UI
   ↓
Application data layer
   ↓
Dexie
   ↓
IndexedDB
   ↓
Your device
```

### Current privacy model

- no login required
- no mandatory cloud account
- no Supabase dependency
- no remote database required
- no personal data uploaded by default

Optional synchronization may be added later, but local storage remains the default philosophy.

---

## 🛠 Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Framer Motion

### Local data

- Dexie
- IndexedDB

### App experience

- Progressive Web App foundation
- responsive desktop/mobile UI
- local persistence

### Planned integrations

- Ollama for optional local AI
- GitHub API for contribution/activity data
- optional cloud sync layer later

---

## 📂 Project Structure

The project is evolving, but the current structure roughly follows:

```text
src/
├── components/
├── data/
├── lib/
├── pages/
├── db.ts
├── types.ts
├── styles.css
└── main.tsx
```

Important files include:

```text
src/db.ts
```

Defines the local IndexedDB database.

```text
src/types.ts
```

Defines the application's core data models.

```text
src/lib/tasks.ts
```

Handles task completion and reward logic.

```text
src/lib/rewards.ts
```

Defines task difficulty and growth rewards.

```text
src/pages/TodayPage.tsx
```

Main daily experience.

```text
src/pages/GardenPage.tsx
```

Displays the current garden state.

---

## 🚀 Getting Started

### Requirements

- Node.js
- npm
- a modern browser

### Install

```bash
git clone https://github.com/YOUR_USERNAME/ikigai-os.git
cd ikigai-os
npm install
```

### Run locally

```bash
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

---

## 🧪 Current Development Workflow

A typical contribution cycle:

```bash
git status
git add .
git commit -m "feat: describe the change"
git push
```

Commit conventions used in this project:

```text
feat:      new feature
fix:       bug fix
refactor:  structural change
style:     UI / CSS change
docs:      documentation
chore:     maintenance / configuration
```

Examples:

```text
feat: add task-driven growth system
feat: introduce Daily Page experience
fix: resolve garden reward persistence bug
style: improve Today page spacing
docs: expand project architecture notes
```

---

## 🗺 Roadmap

### v0.1 — Technical Prototype

- React application shell
- local database
- basic activity persistence
- initial Today page
- initial calendar
- initial garden concept

### v0.2 — The Living Day

- task-first workflow
- task completion rewards
- single-seed garden
- redesigned Today experience
- Daily Page prototype
- day closing
- carryover behavior
- onboarding

### v0.3 — The Living Calendar

- physical calendar experience
- page turning
- tear-off interactions
- seasonal themes
- editable day notes
- historical day archive

### v0.4 — Growth & Reflection

- weekly reports
- streaks
- achievements
- monthly chapters
- richer garden progression
- rare seeds

### v0.5 — Personal World

- memory vault
- photos and files
- long-term milestones
- personal analytics
- time capsule features

### v0.6 — Career & Intelligence

- GitHub integration
- project tracking
- certificate tracking
- internship tracking
- local AI companion
- optional Ollama integration

---

## 🎨 Design Direction

Ikigai OS is not intended to look like a standard enterprise dashboard.

The visual direction aims for a mix of:

- Japanese seasonal design
- calm dark interfaces
- subtle glass and depth
- physical stationery metaphors
- gentle motion
- natural scenery
- responsive cursor and parallax effects
- game-like progression without aggressive gamification

Possible future themes include:

- 🌸 Sakura Dawn
- 🌌 Midnight Observatory
- 🌲 Forest Rain
- 🍁 Autumn Kyoto
- ❄️ Winter Study
- 🎄 Christmas
- 🌊 Ocean Night

---

## 🔐 Data Ownership

A future backup system is planned so users can export and restore their data.

Planned export formats include:

```text
ikigai-backup.zip
├── database.json
├── memories/
├── attachments/
├── preferences.json
└── metadata.json
```

The long-term goal is simple:

> **Your data should never leave your device unless you explicitly choose to sync it.**

---

## 🤝 Contributions

Ikigai OS is currently an early personal project and is changing quickly.

Issues, ideas, UI suggestions, and thoughtful pull requests may be welcomed once the core architecture stabilizes.

For now, expect breaking changes between early versions.

---

## 📜 License

This project is intended to use the **MIT License**.

See `LICENSE` for details once the license file is added to the repository.

---

## 🌱 Project Principle

> **A good productivity system should not make you feel guilty for living. It should make your effort visible.**

Ikigai OS is being built around that principle.

---

## 📌 Current Goal

Build a version worth opening every day.

Not because it demands attention.

Because it feels good to return to.
