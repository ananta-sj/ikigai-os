# Ikigai v0.31.20 — Career workspace repair

This patch is a corrective Career-room pass on top of v0.31.19. It does not change the local database schema or migrate user records.

## What changed

- Add Project, Add Proof and Add Opportunity now use a Career-specific editor composition instead of inheriting generic Roadmap/Career modal-density rules.
- Career editors have a stable header, independently scrollable body, and footer action row, with responsive single-column fields on narrow screens.
- Project story remains a real single-line text field.
- `reimagine.css` no longer owns Career modal width, heading size, or form-grid gap overrides.
- GitHub public activity now has a centered, more immersive activity stage with a dedicated GitHub identity tile, visible public-event count, and restrained intensity legend.
- The GitHub view remains public-event metadata only. No token is requested and no GitHub activity is imported into Ikigai records.

## Files

- `package.json`
- `package-lock.json` (if present in the source tree)
- `src/pages/CareerPage.tsx`
- `src/career-v03120.css`
- `src/reimagine.css`
- `src/data/featureManifest.ts`
- `tests/v03118WorkspaceBalance.test.ts`
- `tests/v03119LayoutCorrective.test.ts`
- `tests/v03120CareerWorkspaceRepair.test.ts`
- `Readme.md`
- `REIMAGINE_ROADMAP.md`
- `RELEASE_EVIDENCE_V0.32.md`
- `MIGRATION_V0.31.20.md`

## Apply

Extract the patch ZIP into the repository root and overwrite matching files. No files need to be deleted.

After applying, restart the Vite dev server once and hard-reload the Career page so the new Career-specific stylesheet and component chunk are definitely active.

## Validation in this environment

Actually run:

- `npm test` — **161/161 passed**.
- `npm run audit:release` — passed.
- `npm run audit:static` — passed across 103 source modules.
- `npm run audit:ui` — hard checks passed; 0 unsafe theme foregrounds.
- `npm run audit:icons` — dependency-free scan found 116 Lucide imports; installed-export verification was skipped because dependencies are absent.
- `npm run build` — attempted, but cannot complete because `node_modules` is absent, so React/Vite/type packages are unavailable to TypeScript.

No browser screenshot/render was produced in this environment, so visual acceptance still belongs to the real browser after applying the patch.
