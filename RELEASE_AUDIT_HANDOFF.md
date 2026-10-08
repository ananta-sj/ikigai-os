# Ikigai Space release audit handoff

Prepared 8 October 2026. Current recommendation: **BLOCK RELEASE**.

This document hands off the ongoing audit and repairs. It does not authorize a release, certify every control, or replace the detailed evidence report. The newest source changes include the Ikigai Space rebrand and First Light's Skip tour addition, both made after the main audit checkpoint.

## Latest checkpoint: rebranding completed in source

The user supplied a new naming specification on 8 October: the official product is **Ikigai Space** (uppercase **IKIGAI SPACE**), a **Local-first personal workspace**. This supersedes the earlier plain Ikigai naming instruction. Preserve the primary description and philosophy recorded in `REBRANDING_SPACE.md`.

Display copy throughout the product, web/social/PWA metadata, Windows product/window configuration, current docs and backup download name were updated. Compatibility identifiers, source version 0.33.0, logo geometry/bitmap assets and existing data schemas/keys remain unchanged. The main audit report is an earlier checkpoint, not evidence of the renamed installed binary.

**Rebranding status: PARTIAL; release: BLOCK RELEASE.** Source/production web checks pass; actual Windows install/upgrade, old shortcut migration, native metadata and installed PWA naming remain pending. Keep app.exe until an executable/shortcut migration is actually tested. Product-name-based NSIS registry/install discovery and MSI upgrade-code changes are material compatibility gates; see the rebranding report's official-source links. Do not implement an untested destructive installer migration against the user's installation.

After rebranding, the maintained AI (14), workspace storage (8), Skip tour (12), reset (3), and new branding browser (7 scenario groups) checks all passed with generated data: 44 checks/groups in this latest checkpoint, zero recorded page errors. The final full verification passed with 372 Node tests, type checking, production build and repository audits, including the new legacy-name classification gate. These runs overlap older scenarios; do not add all counts together as unique coverage. The current change set has 97 uncommitted files, including 81 with naming changes/validation/documentation and the earlier audit repairs; the changed-files artifact identifies each.

New maintained commands: `npm run audit:branding` and `npm run audit:branding-browser`. The browser suite needs production preview (default localhost port 4182), the same automation-module environment setting below, and isolated temporary contexts. Legacy-name classification includes production text and historical project docs, and records each remaining occurrence with a reason. Generated reports/fixtures are excluded from runtime/source claims.

Current user-facing supplemental artifacts: `Ikigai-Space-rebranding-report.md`, `Ikigai-Space-remaining-names.json`, `Ikigai-Space-changed-files.json` and `Ikigai-Space-rebranding-evidence`. The complete ongoing audit continues after handoff; live Gemini/native/exhaustive coverage/security gates remain open.

## Authoritative working state

- Repository: `C:\Projects\Ikigai_OS`.
- Branch: `audit/release-readiness-2026-10-07`.
- Baseline HEAD: `9ce708b2f58069f30fe7b29e2d78422c7be8510a`.
- Source package version: `0.33.0`.
- The pre-rebranding checkpoint had 34 uncommitted implementation/test files. The current change list is recorded in the rebranding report and changed-files artifact. Nothing was staged, committed, pushed, published, or dispatched to CI. Preserve these changes; do not reset the checkout or overwrite it from an older audit copy.
- The identified installed application reports version `0.32.0`, ProductName `Ikigai OS`, and executable size 12,091,904 bytes. It is a different build from the repaired source. Its known executable is `C:\Users\19shr\AppData\Local\Ikigai OS\app.exe`.
- No applicable `AGENTS.md` was found during the audit.

The user earlier conditionally authorized commit and push after exhaustive validation, but the latest rebranding instructions explicitly require receiving approval after fixes, feature validation and rebranding validation. That latest approval gate governs; no approval has been granted to push this unfinished work. Pushing `v0.33-native` triggers the Windows installer workflow; do not push that branch, dispatch the workflow, publish a release, or generate the final installer now.

## Scope and permissions to preserve

Work only with Ikigai Space's repository, the already identified Ikigai Space app, its own developer tools, and isolated local Ikigai Space test instances. Do not inspect unrelated windows, applications, files, folders, websites, tabs, accounts, browser profiles, media contents, or personal data.

The user already granted:

1. Viewing and controlling only the running Ikigai Space window, including its developer tools and non-sensitive test data.
2. A one-time open-window title/process identification exception solely to locate Ikigai Space. That discovery was used; it is not blanket permission for further unrelated inventories.
3. An isolated local Ikigai Space test instance with generated data in a temporary browser profile. Do not import the installed app's personal records into it.

The user personally enters and saves the Gemini key inside Ikigai Space. Never ask for it in chat, extract it from storage, copy it to another instance, expose it in logs/screenshots/reports, put it in shell arguments or environment variables, or use it outside Ikigai Space's functional AI tests. Automated tests use only the synthetic string `audit-dummy-key-not-a-real-secret` and intercepted provider responses.

Native screenshots were stopped after the computer tool returned an incorrectly bound foreground surface. Subsequent native observations used only the identified Ikigai Space window's accessibility text. Do not resume broad screenshots or assume that a foreground screenshot is scoped correctly.

Pending user responses or additional permissions:

- The user must personally enter the key in the repaired isolated app for live Gemini testing. Do not copy the installed app's saved key.
- Rust/Cargo was unavailable at the last scoped check. Official toolchain installation outside the repository needs the pending user approval; do not install it or search personal folders for alternatives without permission.
- The production dependency advisory query is pending permission. Automatic approval review rejected the npm request because it would transmit dependency names and versions to an external registry. It has not been rerun through another route. Do not bypass that rejection.

## Evidence and artifacts

The user-facing output directory is:

`C:\Users\19shr\Documents\Codex\2026-10-07\referenced-chatgpt-conversation-this-is-an-2\outputs`

Files there:

- `Ikigai-release-readiness-audit.md`: detailed feature matrix, exact failures/reproductions, root causes, source paths, privacy findings, test results and remaining gates.
- `Ikigai-audit-evidence.json`: checkpoint evidence index.
- `Ikigai-control-inventory.csv`: 543 observed control rows, including repetitions and conditional controls. These are not 543 unique or individually certified controls.
- `audit-evidence\`: selected synthetic fixtures, test scripts, logs and before/after results.
- `Ikigai-audit-handoff.md`: delivery copy of this document.

The main report/evidence describe the 32-file checkpoint before Skip tour. Skip tour added two files and onboarding/package changes; the later rebrand substantially expands the change set. Do not interpret the old hashes or manifest as hashes of the latest source.

The older working copy at `...\work\ikigai-audit` lacks the newest Skip tour and rebranding changes. Earlier transfer scripts were already run and are not a safe way to restore the latest source. Do not copy that directory wholesale over this repository.

## Completed repairs

### AI connectivity, transport and user feedback

- Saved configuration no longer fabricates a connected state. A usable response is required to mark a successful connection. Provider and model are explicit.
- Google model discovery replaces hardcoded model recommendations. The selected generation model is tested through the chat path. Availability for the user's real key remains unverified.
- Full chat and floating Familiar share a controller and operation lock, preventing duplicate sends and conflicting operations.
- Visible states cover not configured, configured/untested, validating, connecting, sending, receiving, retrying, connected, rate limited, offline, failed and cancelled. The UI provides immediate feedback, elapsed time, retry countdown, character progress, Cancel and actionable errors.
- A chat operation has one 60-second deadline covering fetch, body reading, retry delays and fallback. Connection tests use 20 seconds. Discovery is bounded to 20 seconds total, at most five pages and at most 12 seconds per request. Document and media reads are bounded to 20 seconds.
- Retries are restricted to eligible 502/503/504 responses or 429 responses with usable reset hints. Exhausted daily/billing/zero quota, authentication, missing models, invalid payloads, ambiguous network failures and timeouts do not automatically repeat generation. At most two automatic retries are allowed, within the operation deadline; individual delays are capped at 15 seconds.
- Streaming SSE handles split chunks, Unicode and CRLF. Malformed/truncated or empty replies fail before durable conversation writes. Response reading is bounded.
- One schema fallback is allowed only for an explicit schema rejection, within the same deadline. An Ollama 500 mentioning JSON no longer causes another generation; empty replies no longer fabricate conversational success.
- Retry state is runtime-only. Drafts and failure context survive recoverably; obsolete persisted retry markers are cleared.

### Persistence and recovery

- Normal conversation pairs and queue writes are atomic. Proposal Apply/Dismiss and typed approval serialize against current pending state. Write failures roll back tasks and messages rather than leaving partial records; safe retry does not duplicate tasks.
- Startup and First Light show local storage recovery instead of a blank page when IndexedDB fails. Startup is bounded and Retry is visible.
- Career proof/opportunity/project and Roadmap checkpoint creation preserve drafts, show storage errors and re-enable Save. Record creation and local queue writes are transactional.
- Full reset no longer broadcasts a credential-change refresh into a deleted database. Instrumentation confirmed a `DatabaseClosedError` behind the earlier minified page error; three fresh reset runs passed after the repair.

### Documents and privacy

- PDF ASCII85 plus Flate decoding was repaired. A generated compressed PDF was independently extracted/rendered; its synthetic grounding facts are `MARIGOLD-742`, `37 paper tokens`, and `2030-05-17`.
- Actual upload inputs were exercised for PDF, DOCX, Markdown and text. There are three attachment slots, an 8 MiB per-file limit, 24,000 extracted characters per document, and a 48,000-character request context bound.
- Attachment slots are reserved across both Familiar surfaces. Send waits for parsing; removal/clear prevents late parsing from restoring discarded attachments.
- This parser is not a universal PDF/OCR implementation. Scanned, encrypted, unusual-font PDFs and broader DOCX variants remain limitations or coverage gaps.
- Remote AI receives the current message, recent history, selected planning context, and visible attachment names/extracted text. Original document bytes and automatic Vault contents are excluded from the tested request construction.
- Familiar attachments are volatile across reload. Durable conversation can retain document-derived facts and send them later as history. Vault separately persists files the user explicitly saves there.
- Keys remain masked and bound to the intended provider origin. Requests reject redirects and URL credentials; cookies/referrer are omitted. Secret echoes are redacted from errors and successful responses. The application error boundary no longer dumps raw errors.

### Branding

Public branding is `Ikigai Space` and `A local-first personal workspace for planning, focus, reflection, and memory.` The Spotify display description and backup filename were repaired. A checkpoint scan of 220 source/public/production files found no requested public OS-category remnants or credential-pattern literals.

Keep compatibility-sensitive repository/package/bundle identifiers, database/storage keys, backup formats, URLs and import paths. The installed 0.32 application's old name is still present; a source scan does not prove updated native product metadata.

### Latest addition: First Light Skip tour

- `Skip tour` is visible on the opening screen and every tour step (0–8). It marks onboarding complete atomically, then replaces navigation with Today.
- Saved/default preferences and an existing completion timestamp are preserved. Unsaved tour drafts are discarded; presentation cleanup restores the saved appearance.
- Storage failure rolls back completion, shows an error, and allows retry.
- Preview retains `Exit preview`, does not show Skip tour and does not write onboarding completion.
- Twelve targeted browser scenarios passed: desktop/mobile entry, skipping each step with unsaved draft preservation checks, reload staying on Today, queue failure rollback/retry, and preview exit without preference changes.

## Verification completed and its limits

At the pre-rebranding checkpoint, `npm run verify` after Skip tour passed with exit code 0. The new rebranding report records the final verification of the renamed source. This earlier checkpoint included:

- Release/static/UI/icon audits.
- **372 Node tests**, zero failures or skips (baseline 355).
- TypeScript checking and the Vite production build.
- Production distribution audit and PWA output (110 precache entries, approximately 5,207 KiB).

There is no separate lint script. Existing UI audit debt includes 328 `!important` uses, 35 fixed and 12 sticky elements. The largest 3D chunk is approximately 909.69 KiB, gzip 241.18 KiB. Static/build success does not establish native performance.

The main audit checkpoint had **112/112 passing browser/source-browser scenarios**, with zero recorded final page errors in suites collecting them:

| Suite | Passed | Environment |
|---|---:|---|
| Main feature/UI audit | 64 | Production web, synthetic data |
| Familiar proposal UI | 7 | Production web, intercepted provider |
| Document upload UI | 5 | Actual inputs, generated documents |
| Native/PWA/storage | 5 | Three bridge simulations plus real browser PWA/storage |
| Handoff/destructive controls | 6 | Isolated synthetic records |
| AI regression | 14 | Source browser, injected transport/storage failures |
| Workspace storage regression | 8 | Source browser, injected queue/write failures |
| Full reset regression | 3 | Production web, new temporary contexts |

Skip tour added **12/12 targeted passes** later. There are 124 passing scenarios across those checkpoints, but the entire 112-scenario suite was not rerun after Skip tour. Do not describe this as a single latest 124-scenario run, a native run, or live AI validation.

Node additions cover transport/runtime, compressed PDF and long-response secret redaction. Two obsolete fixed-model source assertions were updated to verify discovery. Some older tests are source/regex contracts; actual UI evidence must remain distinct.

## Feature status and remaining coverage

All main rooms are **PARTIAL overall** under the user's exhaustive requirement. Their tested paths passed, but open coverage remains:

| Feature | Key remaining checks |
|---|---|
| First Light | Alternate step combinations, interrupted migration and actual native startup. Skip tour itself passed targeted checks |
| Today / Journey | Physical tear gestures, past/day/month boundaries, inline write failures and native touch. Current UI exposes task creation/completion, not task edit/delete; Journey marker edit/delete is also absent |
| Focus | Actual long completion, OS notifications/permission failures, sleep/resume and native fullscreen |
| Now Playing | Actual Windows media session/capability/playback and optional Spotify OAuth/polling/recovery. Existing native tests are simulations |
| Sanctuary | Real GPU/WebGL failure, all region/artifact interactions, native rendering. Activity reward/persistence and visible atmosphere/stillness controls passed |
| Roadmap / Career | Remaining inline-write failures, large/migrated datasets, conditional field/link combinations and actual optional public API behavior |
| Reflection | Extreme date/time-zone boundaries and inline save failure |
| Memories / Vault | All file types/limits, filters/link combinations, quota/storage failures and native picker |
| Familiar character | Full accessibility/audio/native pointer capture and hidden/ambient combinations |
| Familiar AI / documents | Real Gemini/Ollama/custom-provider response, streaming/cancel, actual document grounding, native origin and picker |
| Settings | Every conditional onboarding/preferences combination and native display/accessibility edge cases |
| Backup / restore | Native save/open, large/legacy backups, interrupted restore, low disk. Synthetic Replace/Merge/corrupt checksum and exact Blob round trip passed |
| Local storage / reset | Actual damaged/quota-exhausted database, process termination during writes and profile recovery |
| PWA | Actual installation/update, stale caches/migrations and browser eviction. Production offline route reloads passed |
| Tauri / Windows | **FAIL release gate:** repaired 0.33 has not been compiled/run |
| Security / privacy | Plaintext key storage, disabled native CSP, dependency advisory and live destination review |

The detailed audit and inventory must be used to finish individual conditional controls. Opening a room or observing a control does not establish its behavior.

## Findings that must not be overstated

The installed app showed a provider-busy failure and a timeout, with a fixed `Gemini 3.8 Flash` recommendation. Raw HTTP status, key validity, exposed models, exact quota, origin rejection, provider outage and API response were not captured. The application defects above are confirmed in source/regressions; they do not establish which external cause affected the user's key.

Mocked PDF grounding proves extraction/context ingestion and UI handling; it does not prove a real model answered from the document. Native media simulations prove bridge handling; they do not prove Windows media behavior. A real web service worker was exercised, but that is not installed PWA lifecycle coverage.

Remembered/session keys are currently plaintext browser storage, not OS secure storage. Storage identifiers include `ikigai-companion-api-key-remembered`, `ikigai-companion-api-key`, and `ikigai-companion-api-key-origin`; do not read their real values. Tauri CSP is currently null and `withGlobalTauri` true. This is a hardening gap, not evidence that CSP caused the Gemini failure. Do not claim encrypted credentials, wholly offline Gemini, universal PDF support, or complete native readiness.

## Important source map

| Concern | Files |
|---|---|
| Provider settings, full Familiar UI | `src/pages/CompanionPage.tsx` |
| Floating Familiar | `src/components/CompanionPet.tsx` |
| Shared request state/cancellation | `src/lib/companionRuntime.ts` |
| Endpoints, key storage, discovery, context, proposals/history | `src/lib/companion.ts` |
| Deadlines, response bounds, SSE, retries, redaction | `src/lib/companionTransportCore.ts` |
| Status UI | `src/components/companion/CompanionConnectionStatus.tsx`, `src/companion-connection.css` |
| Draft/retry state | `src/lib/companionUi.ts` |
| Document parsing/slots/UI | `src/lib/companionDocumentCore.ts`, `src/lib/companionDocuments.ts`, `src/components/companion/CompanionDocumentTray.tsx` |
| Startup/storage recovery | `src/App.tsx`, `src/components/LocalStorageRecovery.tsx` |
| First Light/Skip tour | `src/lib/onboarding.ts`, `src/pages/OnboardingPage.tsx` |
| Career/Roadmap recovery | `src/lib/career.ts`, `src/pages/CareerPage.tsx`, `src/pages/RoadmapPage.tsx` |
| Reset notification repair | `src/lib/reset.ts`, credential setter in `src/lib/companion.ts` |
| Backup, download, branding/media | `src/lib/backup.ts`, `src/pages/MemoriesPage.tsx`, `src/lib/nowPlaying.ts`, `src/pages/NowPlayingPage.tsx` |
| Regression tests | `tests/companionTransport.test.ts`, `tests/companionDocumentCompression.test.ts`, `tests/fixtures/companion-compressed.pdf`, `tests/v0320Patch16GuidedAiSetup.test.ts` |

## Re-running the maintained checks

Run from the authoritative repository. Use the existing dependencies; do not install packages or download browsers merely to repeat these checks.

```powershell
npm run verify
```

Existing browser automation dependency:

```powershell
$env:IKIGAI_PLAYWRIGHT_MODULE = 'file:///C:/Users/19shr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
```

The maintained scripts launch headless Edge with empty test contexts and block unrelated external routes. They need a local Ikigai Space server accessible in the same execution environment. Browser/server startup required approved sandbox escalation during this audit; first attempt in mismatched environments timed out. Obtain the tooling's required approval without expanding app/data scope.

For source-module regressions, start a fresh Vite dev server in one terminal, then run tests in another:

```powershell
npm run dev -- --host 127.0.0.1 --port 4179 --strictPort
```

```powershell
$env:IKIGAI_AUDIT_URL = 'http://127.0.0.1:4179'
npm run audit:companion-browser
npm run audit:workspace-browser
npm run audit:onboarding-skip-browser
```

Use a cold dev server after source edits to avoid stale module instances. Skip tour defaults to port 4180 if the URL environment variable is absent.

For the reset regression, serve an already built production output:

```powershell
npm run preview -- --host 127.0.0.1 --port 4178 --strictPort
```

```powershell
$env:IKIGAI_AUDIT_URL = 'http://127.0.0.1:4178'
npm run audit:reset-browser
```

The authoritative test servers on 4180, production 4182 and source 4183 were stopped; their headless browsers were closed. Older working-copy servers on 4178/4179 may still exist; do not assume they contain the newest changes. Avoid broad process discovery/kills. Stop only a known helper created for this audit, or use a fresh port and explicit test URL.

The wider production UI scripts and evidence reside in the audit artifact directory. Review their intended test-only mutations and URL before running them. Never point destructive fixtures at the installed app's origin/profile/database.

Do not run `npm run native:build` for the final executable. `native:dev` is a prospective isolated debug validation path after the toolchain permission is resolved. Do not run `audit:deps` before the outstanding external request permission arrives.

## Next steps, in order

1. Inspect branch/status and preserve the repairs. Read the detailed audit, scenario evidence and control inventory; mark remaining controls explicitly rather than treating observed rows as passes.
2. Continue reversible isolated web validation for uncovered conditional controls, failure paths and boundaries. Add targeted regressions for demonstrated defects, then rerun checks appropriate to the change. Keep all fixtures synthetic.
3. When the user personally configures the repaired app, test live Gemini discovery, Save & test, normal prompt, stream, cancellation, failure/recovery, reload and real PDF-grounded answers. Observe status/timing/destination with secrets excluded. Collect raw status/error evidence before assigning an external root cause.
4. Resolve the scoped Rust/toolchain setup, then build/run an isolated native debug app and test native dialogs, WebView origin/network/permissions, persistence, 0.32-to-0.33 upgrade behavior, actual media opt-in/capabilities and rendering. Keep personal installed records intact and stop if testing would require unrelated media/account access.
5. Complete security review, including a tested restrictive native CSP and credential-storage decision; perform the dependency advisory check only if authorized. Record any unresolved risk honestly.
6. Update the report/evidence and recommendation. **SAFE TO BUILD v0.33-native** requires actual release gates and the user's exhaustive validation requirement to be satisfied. Otherwise retain **BLOCK RELEASE**.
7. After the audit and rebranding gates pass, present the exact proposed commit/push scope and obtain the user's approval required by the latest instruction. Do not push or trigger installer CI beforehand. The user authorized observing eventual push results through the already-open Ikigai Space GitHub repository tab; use only that repository/CI context.
8. Final Windows installer generation/publication remains subject to the user's explicit authorization after completion. Do not equate conditional permission to push with approval to publish an installer or release.

Runtime tests in this turn were required by the rebranding request. Read the supplemental rebranding report for the latest results; the earlier 112-scenario audit remains checkpoint evidence. No commit/push/installer is authorized by this handoff.
