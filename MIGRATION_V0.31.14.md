# Ikigai OS v0.31.14 — Release Candidate Preflight

## Why this release exists

The current source is already well past the v0.28.6 handoff snapshot: the Journey ghost-sheet animation regression was fixed in v0.28.7, Focus and Now Playing are implemented, and the v0.31 source consolidation has reached v0.31.13. The remaining roadmap boundary is not another feature room; it is proving that the product can become a release candidate without confusing source audits for browser/device evidence.

v0.31.14 therefore prepares the release gate but deliberately does **not** call itself v0.32.

## What changed

### Dependency-free release preflight

`npm run audit:release` now checks repository-level RC contracts that can be proven without installed application dependencies:

- `package.json`, `package-lock.json`, `FEATURE_MANIFEST_VERSION`, README current version and current migration note stay aligned;
- the current migration file exists;
- `npm run verify` still contains release/static/UI/icon audits, tests and the production build;
- the GitHub release workflow requires clean `npm ci`, repository verification, a live dependency audit and a retained `dist` artifact;
- the Vite PWA keeps standalone install metadata, canonical 192/512 icons, auto-update/cache cleanup behavior and disabled production sourcemaps;
- the canonical favicon/install assets exist and the PNG dimensions are correct;
- the v0.31 manual checklist still contains desktop, touch, screen-reader, Sanctuary GPU and Journey ghost-sheet regression checks;
- the v0.32 evidence ledger remains present with all non-source release gates.

### GitHub Actions release gate

`.github/workflows/release-gate.yml` now runs on pushes to `main`, pull requests and manual dispatch. It verifies clean lockfile installs on both minimum supported engine boundaries:

- Node `20.19.0`;
- Node `22.12.0`.

Both jobs run `npm ci` and `npm run verify`. The Node 22 job additionally runs the live production dependency vulnerability audit and uploads the production `dist` directory as a short-retention artifact.

### v0.32 evidence ledger

`RELEASE_EVIDENCE_V0.32.md` turns the remaining RC work into an explicit evidence record covering:

- automated clean-install/build/dependency-audit results;
- desktop browser screenshots and Journey transition regression checks;
- screen-reader and keyboard behavior;
- real touch/mobile behavior;
- PWA install/offline/update behavior;
- hostile-looking user data and large-backup browser checks;
- Sanctuary integrated-GPU/mobile/thermal observations;
- final documentation/repository sync and the hold/ready decision.

## Product/data impact

No product behavior, Dexie schema, local records, user preferences, AI provider state, Focus state, PWA data, or backup format changes in this patch. No files need deletion.

## Files in this patch

- `.github/workflows/release-gate.yml`
- `MIGRATION_V0.31.14.md`
- `RELEASE_EVIDENCE_V0.32.md`
- `Readme.md`
- `REIMAGINE_ROADMAP.md`
- `package.json`
- `package-lock.json`
- `scripts/audit-release.mjs`
- `src/data/featureManifest.ts`
- `tests/v03114ReleaseGate.test.ts`

## Verification contract

Run:

```bash
npm run audit:release
npm run audit:static
npm run audit:ui
npm run audit:icons
npm test
npm run build
npm run verify
npm run audit:deps
```

For v0.32, also complete `UI_SMOKE_CHECKLIST_V0.31.md` and record the results in `RELEASE_EVIDENCE_V0.32.md`.

## Verification performed in this environment

- `npm run audit:release` — **passed**; package/lock/feature versions, migration presence, PWA assets/settings, CI contract and v0.32 evidence ledger are aligned.
- `npm run audit:static` — **passed**, **103 source modules** checked.
- `npm run audit:ui` — **passed hard checks**; measured debt remains **199 `!important`, 34 fixed, 16 sticky, 0 `100vh`, 0 `autoFocus`, 0 native confirm**.
- `npm run audit:icons` — source scan found **116 Lucide imports**; dependency export verification was skipped because dependencies are not installed.
- `npm test` — **134/134 passed**.
- GitHub Actions workflow YAML — parsed successfully in this environment.
- `npm ci` — **attempted and did not complete** because this runtime cannot resolve `registry.npmjs.org` (`EAI_AGAIN`) while fetching missing Workbox/Zustand tarballs; npm 10.9.2 then also reported its own `Exit handler never called!` failure after the network errors.
- `npm run build` — **attempted and blocked** because the failed clean install left React/Vite/type packages unavailable; TypeScript therefore reports missing dependency/type modules.
- `npm run verify` — **attempted**; source-side release/static/UI/icon checks and tests run, but the final production build reaches the same missing-dependency boundary.
- `npm run audit:deps` — **attempted and blocked** because the npm advisory endpoint could not be resolved (`EAI_AGAIN`).
- Real browser screenshots, PWA install/offline/update validation, screen-reader/touch sessions, hostile-data browser checks and Sanctuary GPU/thermal checks were **not** performed because a dependency-complete production build could not be established here. They remain required before v0.32.
