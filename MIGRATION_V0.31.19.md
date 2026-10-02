# Ikigai OS v0.31.19 — Layout Balance Corrective

This patch is intended to be extracted over v0.31.18 at the repository root.

## What changed

- Centers the Career GitHub recent-public-activity grid inside the available content canvas.
- Fixes the Roadmap/Career modal CSS cascade instead of layering another competing width rule on top of it.
- Introduces `--ik-editor-width` as the shared dialog sizing hook consumed by the global Reimagine layer and owned by each dialog variant.
- Rebalances Phase, Project, Proof and Opportunity editor widths and vertical rhythm.
- Makes Project details use a compact story + target-date row with repository/demo below it.
- Keeps the Project “One-line story” visually single-line even if a browser is temporarily running the older textarea markup; the current TSX uses an actual `<input>`.
- Adds regression tests for centered GitHub activity, modal width ownership and stale-route compatibility.

## Browser note

If the Project dialog still shows the old textarea markup immediately after extraction while the GitHub CSS already changed, reload the page once so Vite/PWA route code is refreshed. The v0.31.19 CSS fallback keeps that stale textarea compact in the meantime.

## Validation contract

Run where dependencies are available:

- `npm test`
- `npm run audit:release`
- `npm run audit:static`
- `npm run audit:ui`
- `npm run audit:icons`
- `npm run build`
- `npm run verify`

No database migration or file deletion is required.

## Validation performed in this environment

Passed:

- `npm test` — 156/156 tests passed.
- `npm run audit:release` — passed.
- `npm run audit:static` — passed across 103 source modules.
- `npm run audit:ui` — passed hard checks; 0 unsafe theme foregrounds.
- `npm run audit:icons` — dependency-free scan completed and found 116 imports; export verification was skipped because dependencies are not installed.

Could not establish:

- `npm run build` — dependencies are absent, so TypeScript cannot resolve React/Vite/Lucide packages.
- Full `npm run verify` — blocked by the same missing dependency installation.
- Browser screenshot verification — not available in this environment; the user-provided screenshots are the browser evidence driving this corrective patch.
