# Ikigai OS v0.31.16 — Interaction chrome guardrails

## Why this patch exists

Browser screenshots exposed two interactions that made the installed-app shell feel like an ordinary web document:

1. dragging across room headings, labels and notebook text could create native browser text selections;
2. dragging a Living Dock destination could start the browser's native anchor/URL drag ghost.

Neither behavior is useful for normal room navigation, and both visually break the physical/app-like interaction model.

## Changed behavior

- The `.app-shell` suppresses document-style text selection with `user-select: none` / `-webkit-user-select: none`.
- Editable text surfaces explicitly opt back into native text selection:
  - `input`
  - `textarea`
  - `contenteditable="true"`
  - `contenteditable="plaintext-only"`
  - any explicit `[data-ikigai-selectable="true"]` escape hatch
- The Ikigai OS brand-door `NavLink` is marked `draggable={false}` and cancels `dragstart`.
- Every Living Dock destination is marked `draggable={false}`.
- The dock container cancels bubbled `dragstart` events so nested icons/labels cannot initiate a native drag.
- WebKit's native element-drag behavior is also disabled on the brand/dock descendants as a CSS fallback.

## What did not change

- Click/tap navigation remains unchanged.
- Keyboard navigation and focus-visible behavior remain unchanged.
- Route preloading on hover/focus remains unchanged.
- The Living Dock magnetic hover effect remains unchanged.
- Text editing, caret placement and selection inside inputs/textareas/editable surfaces remain native.
- No IndexedDB schema, local data, backup format, Companion approval behavior, Focus timer state, Journey data, Sanctuary state, Spotify state or PWA storage behavior changed.

## Validation performed here

- `npm test` — **passed, 142/142 tests**.
- `npm run audit:release` — **passed**, v0.31.16 version/docs/PWA/CI contracts aligned.
- `npm run audit:static` — **passed**, 103 source modules checked.
- `npm run audit:ui` — **passed hard checks** across 46 TSX and 30 CSS files. Existing debt remains: 199 `!important`, 34 `fixed`, 16 `sticky`; `100vh`, `autoFocus`, and native `confirm` are all 0.
- `npm run audit:icons` — command completed but package-export verification was **skipped because dependencies are not installed**; 116 icon imports were discovered.
- `npm run build` — **could not complete in this environment** because `node_modules` is absent, so TypeScript cannot resolve React/Vite packages and their type declarations.
- `npm run verify` — release/static/UI/icon audits and tests pass, then verification exits non-zero at the same dependency-backed build boundary.
- Real-browser visual verification — **not claimed** in this environment. The change is covered by source regression tests and should be confirmed in the normal browser after extraction.

## Files changed

- `package.json`
- `package-lock.json`
- `src/components/FloatingDock.tsx`
- `src/design-system.css`
- `src/navigation-v028.css`
- `src/data/featureManifest.ts`
- `tests/v03116InteractionChrome.test.ts`
- `tests/v0311ForNerds.test.ts`
- `Readme.md`
- `REIMAGINE_ROADMAP.md`
- `MIGRATION_V0.31.16.md`

## Apply

Extract the patch ZIP into the repository root and overwrite matching files. No files need deletion. No data migration is required.
