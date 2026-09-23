# Ikigai OS v0.2 — Migration Notes

This version changes the main progress loop from **manual activity logging** to:

**Task → Completion → Reward → Garden Growth**

## Important

Your existing browser database is still named `ikigai-os`, and Dexie upgrades it from schema version 1 to version 2. The old `activities` and `dailyEntries` tables are preserved.

That means you should **not clear browser site data** if you want to keep any v0.1 test data.

## Upgrade

1. Stop the dev server (`Ctrl+C`).
2. Make a copy of your current project folder.
3. Replace the project files with this v0.2 folder, or copy the changed `src/` files into your current project.
4. Run:

```bash
npm install
npm run dev
```

5. Refresh `http://localhost:5173`.

## First test

1. Click **Add task**.
2. Enter only a title, such as `Fix ReFlow agent handoff`.
3. Keep the default date as today and save.
4. Click the empty circle beside the task.
5. Confirm that:
   - the task crosses out,
   - garden resources increase,
   - growth increases,
   - the Garden page shows the same plant state,
   - refreshing the browser keeps the data.

## What is intentionally NOT in v0.2 yet

- first-run onboarding
- tear-off Daily Page animation
- Ollama companion
- rare seeds / eggs / animals
- weekly reports
- full physical-calendar simulation

Those are next once the core task/reward loop is stable.
