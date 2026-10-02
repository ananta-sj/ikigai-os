# Ikigai OS v0.32 — Release Candidate Evidence

This file is the evidence ledger for the first release candidate. Do not mark v0.32 ready from source audits alone. Complete this alongside `UI_SMOKE_CHECKLIST_V0.31.md` using a clean checkout and real browser/device sessions.

**Current source baseline:** `v0.32.0` Patch 22. Approved desktop room and capture-sheet visuals remain frozen. The current browser/device acceptance track is limited to device-specific defects; Patch 22 fixes the phone Today diary leaf so its paper remains opaque and readable over the dark desk without altering desktop/tablet composition or product data contracts. no browser/device item below should be checked from source evidence alone.

## Automated gate

**Source-audit snapshot (2026-10-02, v0.32.0 Patch 22):** Source-level release/static/UI gates and the mobile paper regression test pass in the patch workspace. A dependency-complete Windows checkout previously passed the full `npm run verify` and `npm run audit:deps` release gates; rerun both after applying Patch 22 so the fresh `dist` artifact audit includes this phone-only CSS repair.

- [ ] Clean checkout used.
- [ ] `npm ci` completed from `package-lock.json`.
- [ ] `npm run verify` passed.
- [ ] Fresh production artifact audit (`npm run audit:dist`) passed after the production build.
- [ ] `npm run audit:deps` passed against the live npm advisory service.
- [ ] GitHub Actions release gate passed on Node 20.19.0.
- [ ] GitHub Actions release gate passed on Node 22.12.0.
- [ ] Production `dist` artifact retained from the passing CI run.

Evidence / run links:

- CI run:
- Commit SHA:
- Dependency-audit date:
- Build artifact:

## Browser matrix

Use production output where practical. Record screenshots for the core room matrix and specifically confirm the Journey month transition never produces a ghost page, giant translucent sheet, or blank board.

| Browser / OS | 1440×900 | 1280×720 | 1024×768 | Notes / screenshots |
| --- | --- | --- | --- | --- |
| Chromium / Windows | [ ] | [ ] | [ ] | |
| Firefox / Windows | [ ] | [ ] | [ ] | |
| Chromium / Linux or macOS | [ ] | [ ] | [ ] | |
| Safari / macOS, if available | [ ] | [ ] | [ ] | |

## v0.32 evidence + document continuity

- [ ] Open a Roadmap checkpoint with linked proof and confirm the evidence row opens the exact Career proof; return from Career to the exact checkpoint.
- [ ] Start **Add proof in Career** from a Roadmap checkpoint and confirm project/checkpoint context is prefilled only after real local records load.
- [ ] Familiar → Together may report proof/memory/reflection counts or presence, but never repeats Memory body/title, Reflection writing, or proof note/title/URL.
- [ ] Attach a normal PDF, `.docx`, Markdown and text document; previewed text is readable and the original file never appears in Memory Vault/backup data.
- [ ] Attach a roadmap document and ask for an import: phases/checkpoints appear as pending proposals and nothing is written until explicit approval.
- [ ] Attach a CV/portfolio and ask for Career extraction: only supported project/proof facts are proposed; contact/identity details are not proposed as Career data.
- [ ] Legacy `.doc`, macro-enabled `.docm`, encrypted PDF, oversized input and scan/image-only PDF fail closed with useful local messages.
- [ ] In Remote API mode, the attachment disclosure is visible before send; in Ollama mode the same flow stays loopback-local.
- [ ] After a successful response, attached document text clears; after a failed request it remains visible for deliberate retry/removal.

Evidence / screenshots:

- Roadmap ↔ Career evidence round trip:
- Familiar bounded room note:
- PDF/.docx attachment preview:
- Roadmap/CV proposal review:
- Rejected/unsupported document cases:

## v0.32 memory continuity

- [ ] Open a Journey date that has memories: the Threads row reports the count and opens Memory Vault filtered to that exact date.
- [ ] Open a Journey date with no memories: Memory Vault shows the date-scoped empty state and Capture preselects that day.
- [ ] From a memory detail, Journey reopens the exact date and Reflection reopens that memory's Monday–Sunday week.
- [ ] Clearing the date scope returns the full vault without changing or deleting records.
- [ ] Familiar/Guide copy may describe the time link, but no memory body/title is projected into ambient Familiar reactions or another room.

## v0.32 time continuity

Use real local records for these checks; do not create a second fixture-only persistence path.

- [ ] Today → Weekly Reflection opens the current local Monday–Sunday week.
- [ ] Selecting a Journey date writes `?date=YYYY-MM-DD`, opens the matching month/date sheet after reload, and does not leave the previous date's Roadmap/Reflection thread visible while local context refreshes.
- [ ] A Journey date inside one Roadmap phase names that chapter; a week crossing a phase boundary reads as a transition rather than a score.
- [ ] Journey → Reflection opens the selected date's normalized local week through `?week=YYYY-MM-DD`.
- [ ] Reflection week navigation/picker keeps `?week=` synchronized, never relabels the previous week’s writing/evidence as the new week while loading, and Reflection → Journey reopens that same week.
- [ ] A week with no Roadmap phase remains calmly unassigned; an untouched Reflection does not pretend to be started.
- [ ] If optional Roadmap continuity is unavailable, core Reflection writing, local save state and weekly evidence still work normally.
- [ ] The Journey/Reflection continuity rows read as part of the existing paper/room composition rather than new dashboard cards.

Evidence / screenshots:

- Today → Reflection:
- Journey date → Reflection → Journey round trip:
- Roadmap transition week:
- Empty/unassigned week:

## Assistive technology

- [ ] Desktop screen reader + browser pair completed.
- [ ] Route focus handoff and room announcement are understandable.
- [ ] Icon-only controls expose useful names.
- [ ] Modal focus remains trapped and returns to the opener.
- [ ] Confirmation dialogs announce title/context before actions.
- [ ] Reduced Motion preserves meaning and operation.

Evidence:

- Screen reader / browser / OS:
- Issues or exceptions:

## Touch / mobile

- [ ] Real touch device tested around 390×844.
- [ ] Second narrow viewport tested around 360×800.
- [ ] Dynamic browser chrome does not hide bottom actions.
- [ ] Living Dock, Familiar, Focus timer, and Now Playing strip remain reachable.
- [ ] Journey date sheet behaves as temporary mobile paper, not a permanent inspector.
- [ ] Dialog opening does not summon the software keyboard until a field is explicitly focused.
- [ ] At ~844×390 phone landscape, the compact horizontal dock remains reachable and no desktop side rail suddenly replaces it.
- [ ] Familiar Talk remains fully inside the viewport after dragging the Familiar against either screen edge; long text/URLs do not widen the page.
- [ ] Journey day-sheet inputs remain inside the dynamic viewport with the software keyboard open.

Evidence:

- Device / OS / browser:
- Screenshots / notes:

## PWA / offline / update

- [ ] Install succeeds from a production-served build.
- [ ] Installed icon and favicon use the canonical Ikigai Seed geometry.
- [ ] Previously visited core rooms reopen while offline where expected.
- [ ] Installed shortcuts open Today, Focus, Sanctuary and Memories without a blank/offline navigation failure.
- [ ] After one installed/online load, Sanctuary local GLBs reopen offline without missing-model placeholders or failed network fetches.
- [ ] Local-first data remains available offline.
- [ ] Remote AI / Spotify limitations are visible and non-destructive while offline.
- [ ] Service-worker update activates cleanly without losing local data.
- [ ] Old caches are cleaned after update.
- [ ] Production `dist` contains no retired route chunks or stale precache entries from earlier builds.

Evidence:

- Browser / install target:
- Offline test notes:
- Update-from / update-to commits:

## Hostile-data browser checks

Use representative long and script-like strings as inert user data. Do not execute payloads; the purpose is to verify rendering, escaping, bounded layout, backup preflight, and recovery behavior.

- [ ] Task titles/notes with long HTML/script-like text render as text.
- [ ] Memories and Roadmap fields with hostile-looking strings remain inert.
- [ ] Career/project/proof fields remain inert and layout stays bounded.
- [ ] Companion drafts/messages do not create executable markup.
- [ ] Oversized/invalid backup cases fail before destructive restore behavior.
- [ ] A realistic large backup export/import cycle completes without data loss.

Evidence:

- Dataset / fixture description:
- Failures or repaired cases:

## Sanctuary performance

- [ ] From low and elevated camera angles, all four Sanctuary boundaries remain fully concealed by mist with no terrestrial exterior, map edge or void leak.
- [ ] Day/dusk/night checks preserve the intended exceptions: sun, moon, stars, birds and existing insect life remain visible while authored terrestrial horizon scenery stays absent.
- [ ] Patch-12 camera-floor protection is stress-tested around pond, bridge, Tea House, slopes and perimeter approaches.
- [ ] Reduced Motion keeps boundary coverage complete while freezing decorative mist drift.

- [ ] Verify continuous local-light motion, the mist-sealed perimeter, bird/leaf ambience and pond ripples remain smooth on Balanced and Lush quality.
- [ ] Verify Reduced Motion freezes decorative drift while preserving the readable scenic composition.

- [ ] Integrated-GPU laptop tested in Auto/Balanced/Lush as practical.
- [ ] Real mobile/touch device tested.
- [ ] Tab background/foreground recovery is clean.
- [ ] Quality can be lowered before the device becomes unusable.
- [ ] No sustained runaway thermal/battery behavior during a representative session.

Evidence:

- Device / GPU:
- Quality modes tested:
- Session length / observations:

## Documentation / release surface

- [ ] README current version and setup steps match the RC.
- [ ] Data-safety language matches actual encryption/storage behavior.
- [ ] Final screenshots reflect the current navigation, canonical brand, Journey constructions, and core rooms.
- [ ] Migration/release notes list known limitations and do not claim unperformed verification.
- [ ] Public repository source is synchronized with the RC commit before announcing the release.

## Release decision

- Decision: [ ] Ready for v0.32 RC  [ ] Hold
- Candidate commit:
- Date:
- Known exceptions accepted for RC:
- Blocking issues:
- Reviewer(s):

## v0.32 Patch 17 — final stabilization evidence

Source-side verification for this patch:

- [x] `npm test` passed: **314 / 314**.
- [x] `npm run audit:release` passed.
- [x] `npm run audit:static` passed across **103 active source modules**.
- [x] `npm run audit:ui` passed its hard checks.
- [x] Changed TS/TSX files passed isolated TypeScript syntax transpilation.
- [ ] Fresh `npm ci` completed in a dependency-complete environment.
- [ ] Fresh `npm run build` completed.
- [ ] Fresh `npm run audit:dist` completed against that build.
- [ ] `npm run audit:deps` completed against the live advisory service.

The sandbox cannot close the unchecked items: its copied dependencies are incomplete, and `npm ci --offline` cannot restore them because `zustand@5.0.15` is not present in the local npm cache.

Runtime acceptance to record on the real build:

- [ ] Scroll near the bottom of Settings or Memories, navigate to another room, and confirm the new room opens at its top with main-content focus moved correctly.
- [ ] On iPhone/Android portrait, focus a text field: the bottom dock yields to the keyboard and returns after focus leaves; a closed Familiar does not crowd the field.
- [ ] Drag the Familiar to all four extremes, rotate the phone, and confirm it remains inside the dynamic safe-area viewport.
- [ ] Open a capture modal on a long page and confirm the page behind it cannot scroll; closing restores the prior scroll position without a horizontal jump.
- [ ] Leave Today/Sanctuary backgrounded long enough to cross a greeting/day-period boundary, return, and confirm time-dependent UI refreshes immediately.
- [ ] Run `APPLY_V0.32.0_PATCH_17_CLEANUP.ps1` and confirm the helper removes only exact known retired-source hashes.

## Patch 18 — cleanup gate repair

A real Windows clean-install verification exposed that retired-source deletion could be skipped when patch-specific PowerShell helpers were not retained/executed. Patch 18 replaces those temporary helper dependencies with `scripts/cleanup-retired.mjs` and runs it automatically at the start of `npm run verify`.

The cleanup is cross-platform, idempotent, and SHA-256 guarded. Exact known retired artifacts are removed; locally modified files are preserved and fail the gate rather than being silently deleted. Historical Patch 05/13/15/17 regression tests now validate the unified cleanup contract instead of requiring old `.ps1` files.

Patch 18 source verification in the release workspace:

- `npm test`: 318 / 318 passing
- `npm run cleanup:retired`: pass / already clean
- `npm run audit:release`: pass
- `npm run audit:static`: pass across 103 active source modules
- `npm run audit:ui`: hard checks pass
- synthetic dirty-tree cleanup against all 20 known retired artifacts: 20 / 20 removed

## Patch 19 — mobile Today composition repair

The RC phone pass exposed that Today was technically contained but aesthetically broken at iPhone-class widths: both desktop notebook leaves stacked into one tall paper strip while the fixed dock and Familiar occupied the same lower viewport.

Patch 19 changes the phone composition only:

- Tasks / Day note use a mobile-only two-leaf switcher.
- Only one paper leaf is presented at a time on phone widths.
- Sanctuary/handoff/physical-paper objects remain in normal mobile flow and cannot sit underneath the persistent dock.
- Familiar default and persisted free placement reserve the mobile dock zone.

Source-side evidence after the repair:

- [x] `npm test` passed: **321 / 321**.
- [x] `npm run audit:release` passed.
- [x] `npm run audit:static` passed across **103 active source modules**.
- [x] `npm run audit:ui` passed its hard checks.
- [ ] Visual acceptance at 393×852 (iPhone 16 class) after applying Patch 19.
- [ ] Android portrait/landscape acceptance after applying Patch 19.

The user separately confirmed the Patch-18 full `npm run verify` and `npm run audit:deps` gates pass on the dependency-complete Windows release machine; Patch 19 still requires that same full gate after application.

## Patch 20 visual stabilization

- Phone Today: source contract now uses a denser one-leaf stationery composition, a compact calendar/Sanctuary object shelf, and explicit shell-safe top clearance. Final acceptance remains screenshot/device based.
- Desktop Now Playing: the existing playback widget now owns more of the wide viewport and gains restrained non-interactive listening-field atmosphere; no extra data collection or controls are added.
- Regression gate after Patch 20: 323/323 tests, release/static/UI audits passing in the release workspace.

## Patch 21 mobile Journey acceptance guard

- Active mobile Living Dock labels inherit the selected capsule and are no longer painted with the desktop tooltip surface.
- Journey keeps distinct mobile construction hooks for every persisted calendar theme at <=760px; desktop constructions remain unchanged.
- Calendar theme identity uses the existing theme definition/setting only; there is no new persistence path.
- Source gate: 325/325 tests, release/static/UI audits passing in the patch workspace. Production build remains browser-machine evidence because this sandbox lacks the dependency tree.
