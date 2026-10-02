# Ikigai OS v0.32.0 — Patch 01 · One Life, One Atmosphere

This is the first incremental patch on top of the frozen v0.31.20 Patch 19 baseline.

## What changed

- Today now reads the current Roadmap phase and the current week's saved Reflection record alongside its existing local task/garden/milestone data.
- The notebook notes page gets a quiet `THREADS FROM TODAY` section with two paper-line links: the current Roadmap chapter and Weekly Reflection state.
- Empty states stay non-pressuring: no phase becomes “No chapter covers today.” and an untouched week becomes “One sentence is enough.”
- The package/release version moves to `0.32.0`.
- Historical v0.31 regression tests now use a shared semver-forward gate, so preserved v0.31 contracts keep protecting v0.32+ instead of failing merely because the package version crossed the minor-version boundary.

## What did not change

- No IndexedDB schema change or migration.
- No task, reward, Garden growth, Sanctuary living-world, settings, backup, sync or AI contracts changed.
- No private Reflection or Roadmap body text is copied into another record; Today only reads presence/title state already stored locally.
- v0.31.20 Patch 19 remains the frozen base underneath v0.32.0.

## Verification

Source verification in this patch workspace: 225/225 dependency-free tests passed; release/static/UI audits passed; the Lucide audit skipped because dependencies are not installed.

Run locally after applying this patch:

```bash
npm run verify
npm run audit:deps
```

Browser acceptance: open Today with (a) no current Roadmap phase/reflection, then (b) a phase covering today and a saved weekly Reflection. Confirm the two thread lines update without adding scroll pressure or card/dashboard chrome.

Full production-build success is not claimed from an environment without the complete project dependency tree.
