# Ikigai OS — V0.1 Starter

A local-first personal growth operating system.

## Why this stack?
This version uses Vite + React + TypeScript instead of a server-centric framework because the first product goal is an offline-first PWA with no required backend. IndexedDB (via Dexie) owns the data locally. A storage/service boundary lets us add optional cloud sync later without rewriting the UI.

## What already works
- Today dashboard
- progress logging modal
- local IndexedDB persistence
- Growth XP calculation
- simple tree stage
- custom monthly Journey Calendar
- basic Garden category views
- PWA configuration foundation
- placeholder routes for Roadmap, Reflection, Memories, Career and Settings

## Run locally
1. Install Node.js 20+ (or current LTS).
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm run dev
```

4. Open the local URL printed by Vite.

## First Git commit
```bash
git init
git add .
git commit -m "feat: initialize Ikigai OS foundation"
```

Then create an empty GitHub repository and follow GitHub's push instructions.

## Architecture to understand first
Read these files in this order:
1. `src/types.ts` — what our data looks like.
2. `src/db.ts` — where local data is stored.
3. `src/lib/growth.ts` — how XP and tree stages work.
4. `src/components/LogProgressModal.tsx` — how an activity is created.
5. `src/pages/TodayPage.tsx` — how the UI reads activities and turns them into progress.
6. `src/pages/CalendarPage.tsx` — how the month visualization is computed.

## Your first coding task
Do not ask AI to do this one. Change the `todayFocus` items in `src/data/roadmap.ts` so they match your real priorities for this week.

Then change ONE visual detail in `src/styles.css` yourself (spacing, font size, border radius, etc.) and observe what changes.

## Next sprint
- selectable calendar days and daily detail drawer
- explicit meaningful/partial/recovery day states
- streak logic that respects exam mode
- per-category XP and richer tree growth
- local backup/export
