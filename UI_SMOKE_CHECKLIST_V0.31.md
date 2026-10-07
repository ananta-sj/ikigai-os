# Ikigai v0.31 — Browser / Accessibility / Responsive Verification

This checklist is the manual release gate for the v0.31 source pass. Source audits are useful evidence, but they do not prove browser composition, assistive-technology behavior, touch ergonomics, or GPU performance.

## Required setup

- Run `npm ci` from a clean checkout.
- Run `npm run verify` before visual testing.
- Test with production build output where practical, not only Vite dev mode.
- Keep one dataset with realistic long titles, long notes, attachments, completed tasks, Roadmap phases, Companion messages, an active Focus timer, and Now Playing configured if available.

## Desktop composition

Test at 1440×900 and 1280×720.

- [ ] Living Dock remains icon-only and never overlaps primary controls.
- [ ] Today notebook, Journey calendar, Focus Room, Now Playing, Sanctuary, Roadmap, Reflection, Memories, Career, Companion, and Settings have no clipped primary content.
- [ ] Global Focus timer and Now Playing strip can coexist without covering dock, Familiar, or dialogs.
- [ ] Every modal is fully visible or internally scrollable.
- [ ] Journey month animation still has no ghost sheet / giant blank board regression.

## Tablet / narrow desktop

Test around 1024×768 and 820×1180.

- [ ] Room layouts collapse without horizontal page scrolling.
- [ ] Sticky panels do not trap content beneath browser UI.
- [ ] Roadmap checkpoint selector and status control remain independently operable.
- [ ] Career/Memory/Roadmap modals fit inside the dynamic viewport.
- [ ] Focus/Now Playing global strips do not obscure touch targets.

## Mobile / touch

Test around 390×844 and 360×800 on at least one real touch device.

- [ ] Dynamic browser chrome does not create blank space or hide bottom actions.
- [ ] Opening a modal focuses the dialog surface without forcing the software keyboard open.
- [ ] Tapping a field opens the keyboard only after explicit field interaction.
- [ ] Escape-equivalent close controls remain reachable; backdrop taps close only where intended.
- [ ] Journey date sheet behaves as mobile paper/bottom sheet, not a permanent inspector.
- [ ] Living Dock, Focus timer, Now Playing strip, and Familiar remain usable with safe-area insets.

## Keyboard-only

For each main room, start from the browser chrome and use only Tab / Shift+Tab / Enter / Space / Escape.

- [ ] Skip link reaches the main workspace.
- [ ] Route changes move focus to the main workspace and announce the opened room.
- [ ] No positive custom tab order exists.
- [ ] Modal focus remains trapped inside the active modal.
- [ ] Escape closes custom modals that allow cancellation.
- [ ] Closing a modal returns focus to the element that opened it.
- [ ] Confirmation dialogs focus Cancel first and cannot leak focus behind the modal.
- [ ] Roadmap checkpoint selection works through its native button; status dropdown remains independently reachable.

## Screen reader

Run at least one desktop screen reader/browser pair and one mobile screen reader if available.

- [ ] Main room has a useful accessible name after navigation.
- [ ] Confirmation dialog title and explanatory text are announced before actions.
- [ ] Form labels are announced with their controls.
- [ ] Icon-only buttons expose meaningful accessible names.
- [ ] Live status messages do not repeat excessively.
- [ ] Hidden visual-only content is not announced.

## Reduced motion

- [ ] OS-level `prefers-reduced-motion` is honored without changing data or navigation behavior.
- [ ] Ikigai reduced-motion preference remains functional.
- [ ] Focus, Journey, Familiar, Now Playing and Sanctuary do not rely on animation to communicate state.

## Sanctuary device / GPU matrix

At minimum test one integrated-GPU laptop and one mobile device.

- [ ] Auto, Balanced and Lush quality modes remain interactive at their intended device budgets; Balanced must not feel visually broken or empty.
- [ ] Quality can be stepped down from Lush to Balanced (or left on Auto) before the device becomes unusable.
- [ ] Tab/background/foreground transitions recover cleanly.
- [ ] Device does not show runaway thermal/battery behavior during a representative session.

## Release evidence

Record the browser/OS/device combinations used, screenshots for the desktop/tablet/mobile matrix, any screen-reader issues, and any known exceptions in the v0.32 release notes. Do not mark v0.31 browser-verified from source audits alone.


## v0.31.2 material / atmosphere pass

Treat this as a visual regression gate, not a source-audit substitute. Check every item in a real browser after a clean dependency install.

- [ ] Switch through Cedar Study, Washi Sanctuary, Indigo Draft, Sumi Workshop and Moonlit Ledger. Each should feel materially distinct rather than like the same layout with a different accent colour.
- [ ] Verify vertical and nested scrollbars in all five workspace themes. Firefox should receive the matching track/thumb colours; Chromium/WebKit should also show the theme-specific thumb/track treatment.
- [ ] At 1440, 1280, 1024 and the narrowest desktop layout, the floating Ikigai badge has clear air before Today/Journey header text and never overlaps Focus Room content.
- [ ] Familiar Paper clay, Glasslight and Felt visibly differ as surfaces; Aura Accent remains a separate colour choice.
- [ ] Familiar Left nook is actually left of the content area, clear of the Living Dock; Right nook mirrors correctly; mobile positioning remains reachable.
- [ ] Journey renders all eight core calendar constructions: Nihon Sakura, Fuji Seasonal, Study Wall, Washi Minimal, Midnight Desk, Letterpress Ledger, Kraft Clip and Newsprint Month, plus the five optional special editions covered below. Verify month transitions and the date sheet remain unchanged.
- [ ] Calendar materials still read at 1024/tablet and mobile widths; bindings, clips and paper textures do not cover dates or navigation controls.
- [ ] Sanctuary World settings sits outside the 3D viewport and remains keyboard/touch operable. Its panel should inherit the current workspace theme rather than forcing a dark green surface.
- [ ] Visit Cedar Rain, Moon Courtyard, Sakura Mist and Autumn Tea Garden during representative day/night periods. Each should read as a grounded garden atmosphere, not as a palette swap.
- [ ] Check Sanctuary Auto/Balanced/Lush quality modes, reduced motion, tab background/foreground recovery and at least one integrated-GPU and one touch device.


## v0.31.3 theme comfort / preview pass

- [ ] In Settings > Appearance, hover each workspace theme card and confirm the large preview changes without navigating away or committing the theme.
- [ ] Keyboard-tab through the five theme cards; focus alone must update the preview, and leaving focus must return the preview to the selected theme.
- [ ] Click each theme and confirm the selection still applies globally. Cedar Study, Washi Sanctuary, Indigo Draft and Sumi Workshop should all remain comfortable on a bright display; Moonlit Ledger should be the intentional evening/dark option rather than one of four dark choices.
- [ ] Check the large preview at desktop, tablet and mobile widths; its fake dock/cards/calendar must not create horizontal scrolling.
- [ ] In Sanctuary at dusk and night, verify terrain, paths, pavilion/landmarks and Familiar remain visually separable without raising the monitor brightness.
- [ ] Compare Cedar Rain at dusk against the v0.31.2 screenshot: it should retain a rainy cedar mood but no longer read as a near-black scene.

## v0.31.4 personalized First Light / onboarding surface pass

- [ ] Open Welcome Preview in each workspace theme. Every onboarding surface uses the current theme surface tokens; no light theme falls back to the old dark-green panel colour.
- [ ] In Moonlit Ledger, verify the same cards remain intentionally dark with readable text and controls rather than inheriting light-theme foreground values.
- [ ] At 1440, 1024, 768 and ~390px widths, every First Light step can scroll vertically and the Back / Skip this / Continue controls remain reachable.
- [ ] Use only the keyboard through all nine First Light steps. Every optional step can be skipped; cards, checkboxes/radios and text fields have visible focus; no step depends on hover.
- [ ] Confirm the Arrival disclosure states that life data is stored in browser IndexedDB, Ikigai does not add application-level encryption at rest, exported JSON backups are readable, and SHA-256 is an integrity check rather than encryption.
- [ ] Confirm First Light never asks for passwords, API keys, OAuth/provider tokens, exact home address or private-document uploads.
- [ ] Enter a preferred name, finish onboarding, and verify Today uses the personalized greeting. Clear the name in Settings and verify Today returns to the neutral greeting.
- [ ] Preview the welcome tour from Settings, change theme/interface/Familiar options, then exit preview without finishing. The previously saved preferences must be restored and no onboarding completion state should be written.
- [ ] Complete onboarding with several fields left blank/skipped. Defaults stay valid and the app does not create placeholder tasks, milestones, streaks or profile claims for omitted answers.
- [ ] Export a backup after saving a preferred name and confirm the ordinary profile setting is included. Treat the JSON as readable local data; do not describe it as encrypted.
## v0.31.5 First Light reassurance / final composition

- [ ] Step through all nine First Light pages and confirm the small bottom reassurance is present but visually subordinate to the current decision. It should never cover fields, cards, or the fixed Back / Skip / Continue controls.
- [ ] On the You step, confirm the large “What First Light will not ask for” side card is gone; the name field should be the primary content rather than sharing the page with a warning panel.
- [ ] Confirm the bottom reassurance says choices can be changed or cleared later in Settings and that external services remain separate opt-in connections.
- [ ] On the Ready page at 1440, 1024, 768 and ~390px widths, verify the heading, seed, four reassurance cards, six-item summary and final action bar form one balanced reading order with no overlap.
- [ ] At desktop width, the Ready page should show the four reassurance cards as a compact 2×2 group beside the seed and the six summary values below both. On narrow screens they should stack naturally.
- [ ] In Welcome Preview, confirm the new reassurance remains non-persistent guidance and closing preview still restores the previously saved appearance.



## v0.31.6 Journey calendar live preview

- [ ] In Settings > Experience > Monthly calendar skin, a large representative month preview appears above the full skin picker (eight core constructions plus optional special editions).
- [ ] Hover each skin at desktop width. The large preview changes immediately without changing the saved selection; moving the pointer away restores the selected skin.
- [ ] Keyboard-tab through all calendar skin buttons. Focus must update the large preview and blur must restore the selected skin unless a new choice was clicked.
- [ ] Click a skin and confirm it becomes the saved Journey appearance and the large preview remains on that skin.
- [ ] Verify the full preview has visibly different construction for Nihon Sakura, Fuji Seasonal, Study Wall, Washi Minimal, Midnight Desk, Letterpress Ledger, Kraft Clip and Newsprint Month rather than palette-only swaps.
- [ ] At 1024, 768 and ~390px widths, the preview scales without horizontal page overflow and date cells remain legible.
- [ ] Open Journey after selecting each skin and confirm the real calendar still matches the chosen material and all date data remains unchanged.

## v0.31.7 Focus flexibility / fullscreen

- [ ] Focus preset rows show 15 / 25 / 45 / 50 / 90 minute focus choices and 5 / 10 / 15 / 20 minute rest choices without crowding or clipping at desktop, tablet and mobile widths.
- [ ] Custom duration accepts 1–240 minutes for Focus or Rest, applies only when the timer is idle/complete, and never auto-starts after setting.
- [ ] Starting, pausing, resuming and resetting a custom duration keeps the same timestamp-based behavior as built-in presets.
- [ ] “Distraction-free” enters native browser fullscreen when permitted; Escape or “Exit focus view” exits cleanly and restores the normal shell.
- [ ] When native fullscreen is unavailable/denied, the full-viewport fallback hides the dock/setup/footer and Escape exits the fallback.
- [ ] Fullscreen shows only the timer, essential controls and the current intention (when one exists); the timer remains readable on small laptop and phone viewports.
- [ ] Keyboard focus remains visible on fullscreen/custom controls and Reduced Motion does not introduce new animation.


## v0.31.8 compact desktop rooms

- [ ] At 1440×900 and 1366×768 with default/balanced UI settings, Today, Journey, Focus and Now Playing do not produce a document-level vertical scrollbar in their normal primary state.
- [ ] Today keeps the notebook, lamp, postcard and header visible together; a task-heavy or note-heavy day may scroll inside the paper rather than extending the whole room.
- [ ] Journey keeps its header, physical calendar and keyboard-help line in one viewport; opening a dense day sheet may scroll inside the temporary sheet without moving the board.
- [ ] Focus keeps the room header, timer, pace/intention controls and footer in one viewport. Fullscreen/distraction-free mode still behaves exactly as v0.31.7 specified.
- [ ] Now Playing keeps its glance-first media card and footer in one viewport in both disconnected and connected states. Opening Source may use bounded modal overflow without creating a document-level page scrollbar.
- [ ] Set Interface scale to Large/Oversized or Text size to Large/XL and confirm normal document scrolling returns instead of clipping content.
- [ ] At 1024px width and below, verify the existing responsive stacked layouts still scroll naturally; the desktop room-fit contract must not force one-screen layouts onto tablets or phones.
- [ ] At 125% and 150% browser zoom, confirm content remains reachable. If the CSS-pixel viewport falls outside the room-fit threshold, ordinary scrolling should resume naturally.


## v0.31.9 glance-first Now Playing

- [ ] With no provider connected, Now Playing shows one compact media card with “Nothing to show yet” and a Connect a source action; the Spotify client-ID form is not visible until Source is opened.
- [ ] Open Source with mouse and keyboard. Focus moves into the dialog, Tab stays trapped, Escape closes it, clicking the backdrop closes it, and focus returns to the Source opener.
- [ ] The Source sheet clearly says the web/PWA build cannot read the Windows system media session or arbitrary other apps directly, and does not imply microphone/audio capture.
- [ ] Connect Spotify read-only. Start playback in Spotify and confirm title, artist/context, device and progress appear automatically after the polling interval without a manual refresh button in the normal state.
- [ ] With read-only permission, previous/play/next are absent; reconnect with Allow playback controls and confirm those controls appear and work only after the scope is granted.
- [ ] When playback is paused, the status chip says Paused and the progress bar remains readable. When nothing is playing, the card becomes a small waiting state rather than expanding into provider setup.
- [ ] Trigger an expired/rate-limited provider error and confirm a compact error row plus Try again appears without replacing the whole room.
- [ ] At 1440×900, 1366×768, 1024px and ~390px widths, the media card remains legible, Source remains reachable, and no decorative document scrollbar appears in the standard desktop room-fit state.
- [ ] Reduced Motion disables the subtle playing pulse while preserving all playback/status information.


## v0.31.10 Journey calendar construction families

- [ ] In Settings > Experience, hover/focus all eight core calendar choices. Each large preview must visibly change its physical/layout construction, not merely its palette or paper texture.
- [ ] Nihon Sakura reads as a hanging print with a vertical month folio; Fuji Seasonal reads as a scenic poster with the calendar beneath the landscape.
- [ ] Study Wall is visibly side-bound like ruled notebook paper; Washi Minimal is a loose handmade sheet with open/unboxed day rows.
- [ ] Midnight Desk reads as a horizontal desk pad with separated day tiles; Letterpress Ledger uses a bound split-page/folio layout.
- [ ] Kraft Clip reads as a tall clipboard with a single brass clamp; Newsprint Month reads as a flat broadsheet with masthead/editorial rules.
- [ ] Save each skin, open Journey, and verify the real calendar matches the Settings preview's construction while all tasks, notes, markers and selected dates remain unchanged.
- [ ] Open First Light and confirm its Journey choices hint at the same eight core constructions instead of reverting to identical coloured thumbnails.
- [ ] At 1366×768, 1024px and ~390px widths, confirm the more radical desktop constructions collapse safely into the responsive calendar without clipping date controls or page-turn buttons.


## v0.31.11 Journey preview stability

- In Settings → Experience, hover slowly across all core and special-edition Monthly calendar skin cards. The large preview may change construction, but the picker itself must not move vertically or horizontally.
- Move directly between adjacent cards without leaving the picker. The preview should switch directly to the newly hovered card without flashing back to the saved skin in between.
- Move the pointer completely outside the picker. The preview should return to the saved skin.
- Repeat with keyboard Tab/Shift+Tab focus across the cards. Focused cards preview immediately; leaving the radiogroup restores the saved skin.
- Verify tall Kraft Clip and wide Fuji/Newsprint constructions remain fully visible inside the stable preview stage without clipping important calendar content.


## v0.31.12 — Seasonal & cultural theme editions

- [ ] Settings → Experience keeps the original five Workspace materials under **Core materials** and shows Hanami Atelier, Winter Hearth, Holi Pigment, Diwali Lantern and Momentum Board under **Special editions**.
- [ ] Hover and keyboard-focus each special Workspace edition. The live preview changes without saving; leaving the picker restores the selected theme; clicking commits it.
- [ ] Verify the five Workspace editions are materially distinct, not palette-only: Hanami paper/asymmetry, Winter card/weave, Holi pigment fields, Diwali indigo/gold/rangoli, Momentum planning-grid/index-card language.
- [ ] Journey Settings shows the eight core constructions plus Hanami Scroll, Winter Advent, Holi Powder, Diwali Diya and Momentum Month.
- [ ] Hover/focus all 13 Journey skins. The large preview remains layout-stable and accurately previews the selected construction; moving directly between cards must not flash back to the saved skin.
- [ ] Open Journey with each new edition actually selected. Verify the *real calendar*, not only the Settings preview, changes construction: hanging scroll, folded-card/advent board, loose pigment poster, illuminated night ledger and studio planning board.
- [ ] Verify date-sheet opening, tasks, notes, markers, month navigation and archived-day data are unchanged when switching among all 13 skins.
- [ ] First Light exposes all five Workspace special editions and all five Journey special editions without horizontal clipping at desktop, tablet and narrow/mobile widths.
- [ ] Diwali Lantern/Diwali Diya meet readable contrast in normal, hover, selected, disabled and focus-visible states; decorative gold/rangoli details never replace text labels.
- [ ] Holi Pigment/Holi Powder remain readable and restrained; pigment fields must not reduce text/grid contrast or look like status/error colors.
- [ ] Hanami and Diwali motifs remain decorative/seasonal and do not imply language, religion or identity selection.
- [ ] Winter Hearth/Winter Advent remain usable outside Christmas and do not hide or rename stored data.
- [ ] Momentum Board/Month add no streaks, scores, guilt copy or automatic goals.

## v0.31.13 — Canonical brand identity

- [ ] Switch through every Workspace theme and confirm the **Ikigai Seed** sprout stays the same shape in the floating brand badge.
- [ ] In Settings → Appearance, hover/focus every Workspace theme and confirm the live preview brand uses the same sprout instead of the theme glyph.
- [ ] Confirm theme glyphs still appear in their theme labels/cards so `森`, `紙`, `図`, etc. remain useful identifiers without becoming the product logo.
- [ ] Open First Light / Welcome Preview and confirm the top-left brand, arrival symbol and loading surfaces use the same sprout.
- [ ] Confirm the browser favicon and installed PWA icon use the same sprout geometry.
- [ ] Check the mark at compact/mobile badge size for clean edges and sufficient contrast in both light and dark workspace themes.

## v0.31.17 — Visual consistency / theme readability sweep

Treat this as the browser proof for the source-level contrast work. Check all ten Workspace themes—Cedar Study, Washi Sanctuary, Indigo Draft, Sumi Workshop, Moonlit Ledger, Hanami Atelier, Winter Hearth, Holi Pigment, Diwali Lantern and Momentum Board—under Soft, Quiet and Structured interface styles. Do not infer a pass from the automated token tests alone.

- [ ] Primary body text, muted copy and faint metadata remain readable on the page background and strong panel surfaces in all ten themes.
- [ ] Accent-colored labels, links and icons remain readable; decorative accent color may still appear in borders, fills, ambient gradients and art without becoming foreground ink.
- [ ] Error, warning, info and success feedback is distinguishable and readable in Companion, Roadmap/Career, Reflection and shared settings/data-safety surfaces.
- [ ] Keyboard focus rings are clearly visible on both light and dark themes and are not lost against accent-colored controls.
- [ ] Primary/secondary/quiet buttons retain the v0.31.15 contrast contract in normal, hover, pressed, focus-visible and disabled states.
- [ ] Now Playing disconnected/connected/error states, Roadmap empty/form states and Memories empty/selected states keep a consistent hierarchy rather than washing out under Quiet style.
- [ ] Today notebook metadata, Focus controls/status, Journey chrome/date sheet, Sanctuary controls, onboarding cards and Living Dock labels remain readable without theme-specific overrides fighting the shared semantic roles.
- [ ] At 1440×900, 1280×720, 1024×768 and ~390×844, the semantic color changes introduce no clipping, unexpected reflow, browser text highlighting or native navigation drag regressions.
- [ ] Capture at least one screenshot per Workspace theme and at least one full Soft/Quiet/Structured comparison for a representative room before the v0.32 RC decision.



## v0.31.18 — Layout scale & workspace balance

- [ ] At 1440×900 and wider, enter Focus distraction-free view. The outer focus surface should use most of the available canvas while the circular timer remains centered and does not scale beyond its intended instrument size.
- [ ] Toggle Focus quotation off/on. Off shows no quote; On shows one restrained quotation with a visible author attribution in distraction-free view. The preference persists locally after reload.
- [ ] In Career, load a GitHub username. The ~13-week public-activity grid is materially larger and easier to scan without implying full GitHub contribution totals.
- [ ] Open Add project, Add proof and Opportunity. Editors have appropriate widths, labels/fields no longer feel tiny inside an oversized backdrop, and progressive optional sections remain keyboard reachable and scroll-bounded.
- [ ] Open Roadmap Create/Edit phase and Add checkpoint. The phase editor is roomier than before without becoming full-screen; mobile still fits within the viewport.
- [ ] In Reflection, click the visible week range. A mini calendar opens, month/year navigation works from 1970 through 9999, selecting any date opens its Monday–Sunday week, This week returns to the current week, Escape/outside click closes the picker, and previous/next week arrows still work.
- [ ] Expand “Reflect a little deeper.” The first two prompts sit as a paired retrospective row on desktop, “What deserves protection next week?” spans the available width, and “Name this week” is visually compact rather than textarea-sized.
- [ ] Repeat the Career, Roadmap, Reflection and Focus checks at 1024px and ~390px widths. No page-level horizontal scrollbar, clipped modal actions or unreachable popover controls.


## Patch 16/17 — Sanctuary boundary + release closure

Treat these as final browser acceptance checks for the current Sanctuary line. Source tests cannot prove the resulting 3D composition.

- [ ] Orbit low toward north, south, east and west boundaries. No terrain edge, authored mountain, village, exterior building mass, hard skybox seam or empty void is visible beyond the garden.
- [ ] Repeat from the highest practical camera angle. The outside reads as a continuous fog sea / mist field rather than a finite square or four obvious walls.
- [ ] At day, dusk and night, the outside terrestrial world remains hidden while sun, moon, stars, birds and existing insect life can still puncture the atmosphere.
- [ ] Auto and Balanced quality retain complete boundary coverage; lower budgets reduce density without opening visual holes.
- [ ] Reduced Motion makes decorative mist drift static without changing boundary coverage or blocking navigation.
- [ ] Stress the Patch-12 camera-floor protection around the pond, bridge, Tea House, slopes and all four perimeter approaches; the camera never crosses under terrain or water.
- [ ] Open Career → Add project / Add proof / Opportunity and Roadmap → Create/Edit phase / Add checkpoint. The dialogs use the isolated warm capture-sheet composition, a small icon close control, compact fields, in-body optional details and no detached tinted footer band.
- [ ] At 1024×768 and ~390×844, those Career/Roadmap dialogs stay inside the dynamic viewport with reachable actions and no legacy oversized shell.
- [ ] After `npm run verify`, serve the fresh production `dist`, reload once with the service worker active, and confirm no retired `/nerds`/inventory UI or stale pre-Patch-16 Sanctuary bundle is served.

## v0.32 Patch 04 — Companion document context + evidence continuity

- [ ] Roadmap checkpoint evidence opens the exact Career proof and Career can return to the exact checkpoint/date.
- [ ] **Add proof in Career** from Roadmap preselects only existing project/checkpoint IDs and never duplicates proof storage.
- [ ] Familiar → Together may show bounded room counts/state but never repeats Memory text, Reflection prose, or proof note/title/URL.
- [ ] Full Companion and Familiar Talk expose the same explicit Attach affordance without obscuring Send or changing Familiar drawer geometry.
- [ ] PDF, Word `.docx`, Markdown and text parse locally and show a bounded preview/filename before send.
- [ ] A successful AI reply clears volatile attachments; a failed request leaves them visible for retry/removal.
- [ ] Remote mode clearly states extracted text will be sent to the configured/trusted endpoint; original file bytes are not persisted.
- [ ] Legacy `.doc`, `.docm`, encrypted PDFs, oversized files and scan/image-only PDFs fail closed without navigation loss or partial writes.
- [ ] Roadmap/CV-derived proposals remain pending until explicit review/apply, and applying linked project/proof proposals in order succeeds.
- [ ] A document containing prompt-like instructions cannot bypass the visible proposal review gate.

## v0.32 Patch 15 — release-polish acceptance

Items 1 (whole-app visual acceptance) and 2 (capture-sheet/dialog visual family) are treated as approved. This section verifies the remaining production-finish work without reopening accepted design unless a regression is visible.

### Adaptive containment matrix

Test at 1440×900, 1280×720, 1024×768, 820×1180, ~390×844, ~360×800 and a phone-landscape viewport around 844×390.

- [ ] No room creates a page-level horizontal scrollbar with realistic long task titles, URLs, notes or attachment filenames.
- [ ] Dialogs, drawers, selects, textareas, canvases and media stay inside the usable viewport including left/right safe areas.
- [ ] Journey day sheet remains centered/contained on desktop and reachable as temporary mobile paper with the software keyboard open.
- [ ] Familiar Talk remains on-screen when the Familiar has been dragged to the extreme left/right/top/bottom; the composer never widens the page.
- [ ] Phone landscape keeps the compact bottom navigation treatment instead of switching to the desktop side rail solely because of width.
- [ ] Standalone/PWA mode respects top/bottom safe areas and does not create double scroll or browser-chrome-sized blank space.

### Familiar behavior + focus

- [ ] Leave the page-level Familiar visible for at least five minutes. Ambient poses vary without an obvious short repeating sequence or constant attention-seeking motion.
- [ ] Background the tab for at least 30 seconds and return. The Familiar does not race through queued ambient poses while hidden.
- [ ] Open Familiar Talk by keyboard, tab through the drawer, press Escape, and verify focus returns to the opener.
- [ ] Open/close the drawer repeatedly near both viewport edges; no focus leak, clipped composer or unreachable close action appears.
- [ ] In Sanctuary, observe roaming for several minutes: movement is slow, faces the travel direction, avoids immediate backtracking/circling, rests naturally and stays on authored safe paths.
- [ ] Reduced Motion suppresses decorative Familiar motion without hiding required controls or changing stored activity/design preferences.

### Installed PWA / offline

- [ ] Install from a freshly rebuilt production `dist` and launch from the OS/app launcher.
- [ ] Today, Focus, Sanctuary and Memories shortcuts open the intended SPA route.
- [ ] Load Sanctuary online once, go offline, relaunch the installed app and confirm local authored GLBs still render.
- [ ] Offline navigation to a previously available SPA route resolves through the app shell rather than a browser network error page.
- [ ] Updating from the previous production build activates the new worker and cleans obsolete caches without touching IndexedDB data.

### Cleanup / regression

- [ ] Run `APPLY_V0.32.0_PATCH_15_CLEANUP.ps1`; known retired files are removed and the helper refuses to delete any locally modified hash mismatch.
- [ ] The accepted Today/calendar, Career/Roadmap/Task/Memory dialogs and room compositions are visually unchanged by the cleanup.
- [ ] There is no `/paper-lab` user surface and no retired technical inventory/feature-manifest surface in the shipped app.
- [ ] Fresh production `dist` contains no stale source maps, development entrypoints, retired route chunks or `featureManifest` marker.

## v0.32 Patch 17 — final stabilization smoke checks

- [ ] From the bottom of a long Settings/Memory page, switch rooms. The newly opened room starts at the top rather than inheriting the old scroll offset.
- [ ] On ~390×844 and ~360×800, focus inputs/textareas/selects. The bottom dock yields to the software keyboard and returns when editing ends.
- [ ] With Familiar free placement enabled, place it near every edge, rotate portrait ↔ landscape, and confirm the full resident remains within safe-area/dynamic viewport bounds.
- [ ] Open Task, Memory, Career, Roadmap and danger dialogs from a scrollable page. Background scrolling is locked while modal focus remains trapped and restored on close.
- [ ] Open Familiar Talk and type: the attached drawer remains usable and does not apply the page-blocking modal scroll lock.
- [ ] Background Today and Sanctuary, then return after local time has materially changed. Greeting/day atmosphere resynchronize immediately.
- [ ] Apply Patch 17 cleanup; no retired non-physics Daily Page, XP progress modal/helper, manual Garden-care helper, prototype Garden/Journey 3D room or placeholder source remains.
