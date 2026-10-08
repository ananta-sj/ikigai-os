# Ikigai Space rebranding verification

Date: 8 October 2026. Rebranding status: **PARTIAL**. Public source and production web naming pass the checks below; actual Windows packaging, installation/upgrade and installed PWA naming remain unvalidated. Overall release recommendation remains **BLOCK RELEASE**.

## Identity and changes

The official product name is **Ikigai Space**, with **IKIGAI SPACE** for uppercase treatments. Category: **Local-first personal workspace**. Primary description: **A local-first personal workspace for planning, focus, reflection, and memory.** Philosophy: **Not a dashboard for measuring your life. A place for inhabiting it.**

The source version remains `0.33.0`. The rename changes display copy and metadata, without renaming the database or migrating user records. Earlier audit repairs and First Light's Skip tour are preserved. No commit, push, release, workflow dispatch or final Windows installer was made.

| Surface | Change / verification |
|---|---|
| First Light | Brand, loading, privacy/help copy, optional name placeholder and Enter button use Ikigai Space. Skip tour remains available throughout |
| App shell and rooms | Floating signature, route/error recovery, guide text, Settings preview, Familiar, Sanctuary, Roadmap/Career, Memories, Today/Journey, Reflection, Now Playing and diagnostics use the new product name |
| Accessibility | Product aria labels, titles, placeholders and recovery buttons updated |
| Printed daily pages | Uppercase product signature uses IKIGAI SPACE; existing paper construction and print coordinates retained |
| Web metadata | Exact page title Ikigai Space; meta description starts “Ikigai Space is…”; Apple standalone title and Open Graph/Twitter titles/descriptions added |
| PWA | Both name and short_name are Ikigai Space (12 characters). Existing id/scope/start_url and icon paths retained |
| Windows/Tauri source | productName and window title are Ikigai Space; bundle/Cargo descriptions updated. Default generated display/shortcut names derive from productName |
| Spotify setup/callback | Suggested app name and return-to-app copy updated; URLs and local authorization event unchanged |
| Backup | Download filename now `ikigai-space-backup_…json`; portable format identifier remains compatible |
| Current documentation | README, data safety, local AI, security, design grammar, current UI checklist and roadmap updated. README/arrival include the requested philosophy |
| Verification | Distribution audit now checks title/description/PWA naming and stable installation identity. A repository-wide legacy-name classification and isolated branding browser suite were added |

Logo bitmap assets, sprout geometry, palette, sun-disc accent and layout design were preserved. The public SVG accessibility label changed; its geometry did not. “Ikigai Seed” remains the name of the existing logo family, distinct from the complete software product. Icon-only compact presentations retain their existing behavior and accessible product name.

## Old identifiers intentionally retained

| Identifier or family | Reason |
|---|---|
| `ananta-sj/ikigai-os`, Pages base `/ikigai-os/`, existing repository/demo/release URLs | Preserve infrastructure, incoming links and deployment paths |
| npm `ikigai-os`, Rust `app` / `app_lib`, `app.exe` | Internal package/crate/binary identity; avoid changing installed shortcut targets before a tested native migration |
| `io.github.anantasj.ikigaios` | Native bundle identity and default data/profile path compatibility |
| IndexedDB `ikigai-os`, versions, tables and indexes | Existing data remains in the same database; no schema/name migration introduced |
| `ikigai-os-backup`, `__ikigaiBlob`, schema/data versions | Old portable backups and exact attachment serialization remain readable |
| Existing LocalStorage/session keys, events, broadcast channels, notification tags, `IKIGAI_CONTEXT_JSON` and reply schema name | Preserve preferences, origin-bound credentials, conversation/UI coordination and internal protocols |
| Component/function names, CSS classes/data attributes, image/audio/model paths | Stable imports/assets/selectors; display text is independent of these names |
| `v0.33-native`, workflow/artifact technical identifiers | Preserve existing branch and CI routing; no workflow dispatched |
| Historical migration/release/audit documents | Accurate evidence of names used in earlier versions; not current public naming guidance |
| Logo family name “Ikigai Seed” | Preserve the supplied visual identity and artwork naming |
| Earlier installed binary metadata and path “Ikigai OS” in audit documentation | Records the observed 0.32 build; do not rewrite historical evidence as if it already contained this rename |

Every detected remaining occurrence is recorded with its file, line, column, token and classification in `Ikigai-Space-remaining-names.json`. It includes current technical identifiers, historical documentation, logo family references and old-name detector/compatibility test patterns. Dependency sources, Git history, native target output, environment/credential files, binary assets and local generated scratch logs are excluded. Production text output is included. Remaining public legacy-name issues in this scan: **0**.

## Windows compatibility investigation

The installed binary observed earlier is 0.32.0 with ProductName “Ikigai OS”; repaired source is 0.33.0. Renaming source does not alter that running executable.

Tauri documents productName-dependent installer paths/registry metadata and a productName-derived default MSI upgrade code. Keeping the bundle identifier preserves the configured default profile identity; actual native data access still needs testing. See [Tauri configuration](https://v2.tauri.app/reference/config/#productname).

The [Tauri CLI 2.12.0 NSIS template](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.12.0/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi) uses product-name registry keys, install-directory defaults and shortcut names. Consequently, unchanged bundle identity alone does not prove rename upgrades discover an old installation or remove old shortcuts. This is a confirmed packaging concern from source review, not an observed installer test failure.

The preferred `Ikigai Space.exe` is deferred: `app.exe` remains unchanged to protect known existing shortcut targets. New product/window/installer display naming is configured independently. Before distribution, test old-name installations and custom install paths in an isolated Windows environment; determine and test an explicit old-install discovery/shortcut migration if needed. Do not run a destructive old uninstaller against the user's current profile to test this.

The workflow builds NSIS. The general bundle setting still permits other targets; any MSI path also requires preserving the actual prior upgrade code before distribution. Do not invent it from an assumed old name/architecture. There is no configured automatic updater integration to validate; manual install/upgrade and CI artifacts still require real checks. No custom installer migration hook has been introduced without a native test.

Rust/Cargo is unavailable and final installer generation is forbidden pending approval. Actual application/installer resources, installed Start Menu entry, Windows display name, native title, upgrade record visibility and post-upgrade database access are **pending**, not certified by configuration inspection.

## Tests and results

- `npm run verify`: 372 tests, zero failures/skips; TypeScript, release/static/UI/icon checks, production Vite build and distribution checks passed after the rename. There is no separate lint script. The final run also includes `audit:branding`.
- `audit:branding-browser`: all seven scenario groups passed, covering all eleven routes and onboarding at 1440/800/390 px, accessible labels and horizontal containment, existing synthetic records/preferences in `ikigai-os`, renamed export filename with unchanged portable format, actual legacy-named backup restore, and PWA/icon/social metadata.
- Maintained AI/source browser regressions: 14 scenarios passed with synthetic credentials and intercepted responses.
- Workspace write-failure regressions: eight scenarios passed.
- Skip tour regressions: 12 scenarios passed after rebranding.
- Full reset regressions: three fresh synthetic contexts passed with the renamed controls/confirmation phrase and no page errors.

The new test harness was corrected for an initially wrong Settings tab, a missing required synthetic memory date, duplicate memory headings, and the existing restore normalization of an absent optional link to `undefined`. These corrections did not require additional product behavior changes.

The 112-scenario audit checkpoint remains earlier evidence. The supplemental Skip tour and rebranding/regression runs do not mean that every checkpoint suite was rerun together against the latest build. Actual Gemini replies/grounding, native runtime and optional external accounts remain untested.

Browser tests use only local app pages, generated records, temporary profiles and existing automation dependencies. No real API key or installed personal data was read/copied. All source changes remain uncommitted.

This latest checkpoint contains 44 passing browser checks/groups (14 + 8 + 12 + 3 + 7), with zero recorded page errors. It is separate from the earlier 112-scenario checkpoint. The whitespace check also passed when CRLF line endings were treated correctly. The authoritative test servers were stopped and test browsers closed at completion.

## Remaining inconsistencies and gates

1. The installed 0.32 application still displays its old name until an authorized, verified native update.
2. Native packaging and old-install/shortcut/MSI compatibility need actual validation; executable naming remains deliberately deferred.
3. PWA manifest/title/icon responses passed, but actual desktop/mobile installation, existing installed-name refresh and update lifecycle remain pending. Platform-controlled truncation can vary.
4. Visible browser layout and labels passed in the tested widths; actual print rendering, native fonts/DPI, OS notifications and installer layouts need their corresponding environment checks.
5. Live Gemini, full conditional control coverage, native media/dialogs, credential storage/CSP hardening and the pending dependency advisory permission remain release blockers from the ongoing audit.

The user's latest instructions require approval after fixes, complete feature validation and rebranding validation before push, release or final Windows installer preparation. Earlier conditional permission to push does not bypass this new approval gate.

## Changed-file record

`Ikigai-Space-changed-files.json` lists the current uncommitted change set and the subset with naming changes. It distinguishes pre-existing audit repairs from rename-only files where possible. Files include current documentation/metadata, visible TSX/TS/Rust strings, CSS comment headers, existing assertions/fixtures, and the new branding audit scripts. The authoritative editable source remains `C:\Projects\Ikigai_OS`; older audit working copies lack these changes.

<!-- generated file list -->

### Exact current file list

The change set contains 97 uncommitted files including prior repairs. 81 contain branding edits, naming checks, or rebranding/handoff documentation. CSS header-only edits do not alter styling. Files marked “audit only” carry earlier functionality repairs without a new product-name edit.

- `.github/workflows/native-windows.yml` — branding / naming validation
- `.gitignore` — branding / naming validation
- `DATA_SAFETY.md` — branding / naming validation
- `REIMAGINE_ROADMAP.md` — branding / naming validation
- `Readme.md` — branding / naming validation
- `UI_SMOKE_CHECKLIST_V0.31.md` — branding / naming validation
- `index.html` — branding / naming validation
- `package.json` — branding / naming validation; already part of the audit checkpoint
- `public/ikigai-mark.svg` — branding / naming validation
- `scripts/audit-dist.mjs` — branding / naming validation
- `scripts/audit-release.mjs` — branding / naming validation
- `src-tauri/Cargo.toml` — audit only
- `src-tauri/src/lib.rs` — branding / naming validation
- `src-tauri/tauri.conf.json` — branding / naming validation
- `src/App.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/adaptive-ui-v032.css` — branding / naming validation
- `src/companion-pet.css` — branding / naming validation
- `src/companion-v120.css` — branding / naming validation
- `src/components/AddTaskModal.tsx` — branding / naming validation
- `src/components/AppErrorBoundary.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/components/AppShell.tsx` — branding / naming validation
- `src/components/CompanionPet.tsx` — audit only; already part of the audit checkpoint
- `src/components/FloatingDock.tsx` — branding / naming validation
- `src/components/IkigaiMark.tsx` — branding / naming validation
- `src/components/companion/CompanionDocumentTray.tsx` — audit only; already part of the audit checkpoint
- `src/components/sanctuary/SanctuaryWorld.tsx` — branding / naming validation
- `src/components/settings/DangerZonePanel.tsx` — branding / naming validation
- `src/components/settings/DataSafetyPanel.tsx` — branding / naming validation
- `src/components/settings/ProductDiagnosticsPanel.tsx` — branding / naming validation
- `src/data/pageGuides.ts` — branding / naming validation
- `src/data/sanctuary.ts` — branding / naming validation
- `src/db.ts` — branding / naming validation
- `src/design-system.css` — branding / naming validation; already part of the audit checkpoint
- `src/focus-v029.css` — branding / naming validation
- `src/lib/backup.ts` — branding / naming validation; already part of the audit checkpoint
- `src/lib/career.ts` — audit only; already part of the audit checkpoint
- `src/lib/companion.ts` — branding / naming validation; already part of the audit checkpoint
- `src/lib/companionDocumentCore.ts` — branding / naming validation; already part of the audit checkpoint
- `src/lib/companionDocuments.ts` — audit only; already part of the audit checkpoint
- `src/lib/companionUi.ts` — audit only; already part of the audit checkpoint
- `src/lib/dailyCalendarPrint.ts` — branding / naming validation
- `src/lib/diagnostics.ts` — branding / naming validation
- `src/lib/familiar.ts` — branding / naming validation
- `src/lib/integrity.ts` — branding / naming validation
- `src/lib/nowPlaying.ts` — branding / naming validation; already part of the audit checkpoint
- `src/lib/onboarding.ts` — audit only; already part of the audit checkpoint
- `src/lib/paperAudio.ts` — branding / naming validation
- `src/lib/reset.ts` — branding / naming validation; already part of the audit checkpoint
- `src/lib/sanctuaryLivingCore.ts` — branding / naming validation
- `src/lib/security.ts` — branding / naming validation
- `src/lib/sync.ts` — branding / naming validation
- `src/memories-v080.css` — branding / naming validation
- `src/navigation-guide-v027.css` — branding / naming validation
- `src/navigation-v028.css` — branding / naming validation
- `src/now-playing-v030.css` — branding / naming validation
- `src/pages/CareerPage.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/pages/CompanionPage.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/pages/GardenPage.tsx` — branding / naming validation
- `src/pages/MemoriesPage.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/pages/NowPlayingPage.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/pages/OnboardingPage.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/pages/ReflectionPage.tsx` — branding / naming validation
- `src/pages/RoadmapPage.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/pages/SettingsPage.tsx` — branding / naming validation
- `src/pages/TodayPage.tsx` — branding / naming validation
- `src/reimagine.css` — branding / naming validation
- `src/roadmap-career-v090.css` — branding / naming validation
- `src/sanctuary-v022.css` — branding / naming validation
- `src/sanctuary-v023.css` — branding / naming validation
- `src/theme-system.css` — branding / naming validation
- `tests/familiarCore.test.ts` — branding / naming validation
- `tests/sanctuaryLiving.test.ts` — branding / naming validation
- `tests/v03120Patch06Experience.test.ts` — branding / naming validation
- `tests/v03120Patch14ReleaseArtifact.test.ts` — branding / naming validation
- `tests/v0320Patch04DocumentCompanion.test.ts` — branding / naming validation
- `tests/v0320Patch16GuidedAiSetup.test.ts` — audit only; already part of the audit checkpoint
- `tests/v033NativeSystemMedia.test.ts` — branding / naming validation
- `vite.config.ts` — branding / naming validation
- `DESIGN_SYSTEM.md` — branding / naming validation
- `LOCAL_AI.md` — branding / naming validation
- `REBRANDING_SPACE.md` — branding / naming validation
- `RELEASE_AUDIT_HANDOFF.md` — branding / naming validation
- `SECURITY.md` — branding / naming validation
- `scripts/audit-branding-browser.mjs` — branding / naming validation
- `scripts/audit-branding.mjs` — branding / naming validation
- `scripts/audit-companion-browser.mjs` — audit only; already part of the audit checkpoint
- `scripts/audit-onboarding-skip-browser.mjs` — branding / naming validation; already part of the audit checkpoint
- `scripts/audit-reset-browser.mjs` — branding / naming validation; already part of the audit checkpoint
- `scripts/audit-workspace-browser.mjs` — audit only; already part of the audit checkpoint
- `src/companion-connection.css` — audit only; already part of the audit checkpoint
- `src/components/LocalStorageRecovery.tsx` — branding / naming validation; already part of the audit checkpoint
- `src/components/companion/CompanionConnectionStatus.tsx` — audit only; already part of the audit checkpoint
- `src/lib/companionRuntime.ts` — audit only; already part of the audit checkpoint
- `src/lib/companionTransportCore.ts` — branding / naming validation; already part of the audit checkpoint
- `tests/companionDocumentCompression.test.ts` — audit only; already part of the audit checkpoint
- `tests/companionTransport.test.ts` — audit only; already part of the audit checkpoint
- `tests/fixtures/companion-compressed.pdf` — audit only; already part of the audit checkpoint
