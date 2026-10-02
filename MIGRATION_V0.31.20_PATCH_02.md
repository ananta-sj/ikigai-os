# Ikigai OS v0.31.20 — Patch 02

This incremental patch focuses on three areas: Career editor layout, the Focus Room's distraction-free quote wall, and a full Sanctuary earning/display/runtime audit.

## Career editor CSS repair

- Project, Proof and Opportunity editors explicitly own backdrop centering and safe-area padding.
- Editor shells use a 28px radius with isolated header/body/footer composition.
- The Project one-line story remains a compact text field beside the target date on desktop rather than expanding into a large textarea.
- Expanded optional details scroll inside the dialog instead of pushing actions off-screen.
- Mobile collapses paired fields to one column and keeps the dialog inside the viewport.

## Focus quote wall

Distraction-free Focus now supports a two-panel composition:

- clock left + large quote right by default;
- one-click side swap;
- shuffled library, one pinned quote, or no quote;
- locally stored custom quote + quoter pairs;
- custom quote limits and normalization to prevent settings bloat;
- responsive stacking on smaller screens.

New installations default to shuffled quotes. Existing installations keep the previous `focusQuotes` choice when the new mode setting is first migrated.

## Sanctuary aggressive audit

### Earning / Garden ledger

- A completed task receives a persistent `gardenRewardedAt` stamp the first time it earns Garden resources.
- Reopening a task removes `completedAt` only; the earning stamp remains, so recompleting the same task cannot mint the reward repeatedly.
- Existing completed tasks are reconciled into a minimum Garden baseline and stamped without subtracting any existing Garden growth.
- Recovery also recognizes previously rewarded tasks that are currently reopened.
- Malformed or implausibly future completion/reward timestamps are excluded from reward-history reconciliation.
- Invalid/non-finite Garden growth is treated as zero for display-stage calculations so a corrupt number cannot falsely render Bloom or break the Guardian Tree transform.

### Living-world projection

- The open Sanctuary subscribes to Garden growth, projection sources, settings and achievement unlocks through Dexie live queries.
- Completed-task projection rejects malformed/far-future timestamps.
- Home Grove, Moon Pond, Quiet Pavilion and Lookout retain their documented hard caps and low-power reductions.
- Achievement conditions are synchronized while Sanctuary is open; duplicate unlock races are handled through the unique unlock key.

### World runtime

- Selecting an already-active region sends a fresh navigation key, so the camera recenters after manual orbiting.
- Decorative grass now respects Reduced Motion in addition to the existing pond, particles, lanterns, secrets, Familiar and camera behavior.
- Discovery writes merge against the latest settings record so rapid secret interactions do not overwrite another discovery.
- WebGL-unavailable and render-error fallbacks preserve local progress; changing Sanctuary quality resets the render boundary for another attempt.
- The Guardian Tree uses continuous Garden growth plus named stage progression for its visible scale.
- Bundled Sanctuary GLB headers remain covered by automated regression tests.

## Validation

Run from the project root:

```bash
npm test
npm run audit:release
npm run audit:static
npm run audit:ui
npm run audit:icons
npm run build
```

The production build still requires a complete local dependency install. The patch itself does not add dependencies or change the IndexedDB schema version.
