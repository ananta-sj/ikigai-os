# Ikigai OS v0.31.18 — Layout scale & workspace balance

## Why this patch exists

The source-level contrast and interaction guardrails in v0.31.15–v0.31.17 removed several systemic UI failures, but real-browser screenshots still exposed a different class of polish issue: some workspaces and editors were under-scaled relative to the available canvas. GitHub activity was technically present but visually tiny, several Career/Roadmap modals felt like narrow forms floating in a large backdrop, distraction-free Focus left too much unused widescreen space, and deeper Reflection treated unlike prompts as four equal boxes.

v0.31.18 addresses those scale, hierarchy and navigation issues without adding another major room or changing the local-first product model.

## What changed

- **Focus Room**
  - Widened the distraction-free/fullscreen workspace up to a 1580px surface on large displays while keeping the circular timer capped at its existing 440px instrument scale.
  - Added an optional `focusQuotes` local setting. When enabled, distraction-free Focus shows one restrained, source-checked public-domain quotation with visible author attribution; it is not a feed, score, streak or auto-advancing motivational surface.
  - Added a compact Focus quotation toggle alongside other optional focus setup controls.
- **Career / GitHub**
  - Increased the public-activity day cells from the previous tiny 8px grid to a responsive 16–26px scale and added a small activity heading/event count.
  - Preserved the existing token-free GitHub limitation copy; the larger visualization still represents recent public events, not the authenticated contribution calendar.
  - Widened Career content slightly on desktop and gave Project, Proof and Opportunity editors content-proportional modal widths with stronger header separation and roomier optional-field sections.
  - Changed Project “One-line story” from an oversized textarea to a bounded single-line field and kept its target date intentionally compact.
- **Roadmap**
  - Rebalanced Phase and Checkpoint editor widths and field spacing so the modals feel intentional on large screens while retaining bounded mobile behavior.
- **Reflection**
  - The visible week range is now a real picker trigger instead of only a jump-to-current-week shortcut.
  - Added a compact Monday–Sunday mini calendar with month selection, direct year entry, previous/next month navigation, selected-week highlighting, Today/This week return, outside-click/Escape dismissal, and a supported year range of 1970–9999.
  - Previous/next week arrows no longer stop at the current week, so direct future-week navigation remains possible.
  - Reworked “Reflect a little deeper” into a semantic layout: two retrospective prompts side-by-side on desktop, one full-width forward-looking prompt, and a compact optional chapter-title input.
- Added v0.31.18 source regression coverage and updated the feature manifest, README, roadmap, smoke checklist and v0.32 evidence baseline.

## Data / migration impact

No Dexie schema migration is required. Existing data remains untouched.

One new optional setting is added to the existing `settings` record:

- `focusQuotes: boolean` — defaults to `false` for existing and new users until explicitly enabled.

`ensureSettings()` fills the missing key automatically on existing installations. No files need to be deleted.

## Validation

Source-side validation completed in this environment:

- `npm test` — **PASS, 152/152 tests**.
- `npm run audit:release` — **PASS**; v0.31.18 version/docs/PWA/CI contracts aligned.
- `npm run audit:static` — **PASS**; 103 source modules checked.
- `npm run audit:ui` — **PASS** hard checks across 46 TSX + 30 CSS files; 0 unsafe theme foregrounds. Audit debt remains 209 `!important`, 34 fixed-position uses and 16 sticky-position uses.
- `npm run audit:icons` — dependency-free scan found 116 Lucide imports; installed-package export verification was **SKIPPED because `node_modules` is absent**.
- TypeScript syntax transpile of every changed TS/TSX file — **PASS** using the environment's global TypeScript compiler.
- `npm run build` — **ATTEMPTED, not established**. TypeScript cannot resolve React/Vite/Lucide and related package types because dependencies are not installed in this environment, so Vite never runs.
- `npm run audit:deps` — **ATTEMPTED, not established**. The npm advisory endpoint failed with `getaddrinfo EAI_AGAIN registry.npmjs.org`.
- `npm run verify` — **ATTEMPTED**. Release/static/UI audits and 152/152 tests pass; icon export verification skips without dependencies; the command then stops at the same missing-dependency build boundary.
- Headless Chromium rendering was attempted during this iteration, but the browser process did not complete in this environment; **no visual-browser pass is claimed**.

Browser/device verification is still required. In particular, the new Focus width, modal proportions, GitHub activity scale, Reflection picker and deeper-prompt layout must be checked in a real browser across desktop/tablet/mobile before v0.32 is cut.

## Product intent preserved

- The icon-only Living Dock remains the navigation contract.
- No rejected Journey study-room/workstation/permanent-inspector experiment is reintroduced.
- Focus quotations are optional and deliberately quiet; they do not create scores, streaks, pressure or automatic behavioral nudges.
- GitHub remains token-free/public-only in this view and does not import public activity into Ikigai records.
- AI proposal review/apply remains explicit.
