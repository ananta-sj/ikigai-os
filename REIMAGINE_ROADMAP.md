# Ikigai Space — Reimagine Roadmap

This roadmap starts after the v0.20 UI foundation. The goal is to avoid mixing shell cleanup, 3D world design and character-system design into one untestable release.

## v0.20 — Reimagine Foundation

Rebuild the product shell and high-friction workflows while keeping the data model stable.

- coherent desktop/tablet/mobile navigation
- simplified Today hierarchy
- progressive disclosure for data-heavy forms
- calmer Settings structure
- provider presets, Save & test, and explicit API-key persistence
- no Garden rebuild in this version
- no major Familiar redesign in this version

## v0.21 — Sanctuary Prototype · implemented

Replace the old Garden direction with an authored, explorable world prototype. Prove the experience before wiring every data source into it.

- terrain and geography with a clear sense of place
- camera and interaction model that works on desktop and touch
- environmental composition, lighting and material language
- authored/optimized GLB/GLTF asset pipeline for major objects
- procedural detail only where it helps: grass, motes, flowers, particles, small variation
- first 3D Familiar resident as a presence test
- performance tiers and graceful non-WebGL fallback
- local GLB pipeline proven with the Guardian Tree, reflection bench, pavilion and threshold gate
- five readable regions connected by paths, with camera travel controls and minimal contextual UI

## v0.22 — Living World · implemented

Make the Sanctuary a spatial expression of the same local data already visible elsewhere in Ikigai Space.

- completed Tasks enrich Home Grove with flowers, younger growth and recent-work warmth
- Roadmap progress develops the route to The Lookout through capped waystones
- written Weekly Reflections add lilies, reeds and reflective atmosphere to Moon Pond
- Memory Vault records become abstract lantern traces around Quiet Pavilion without exposing private contents
- Career projects and Proof build a small beacon/structure at The Lookout
- all world state is derived live from existing IndexedDB records; no new world-maintenance fields are introduced
- decorative counts are capped for long-lived datasets and lower-power devices
- the world remains optional; normal pages stay the fastest way to edit data

## v0.23 — World Depth · implemented

Turn the prototype into a durable place rather than a one-session visual demo.

- achievements now become actual clickable world objects in earned locations
- local-time dawn/day/dusk/night changes sky, fog, lighting and ambience without using location/network data
- four world atmospheres reinterpret terrain, vegetation, architecture accents, weather-like particles, materials and light rather than recoloring one scene
- optional procedural soundscape has independent Ambient and Interaction controls, both off by default
- three small discoveries exist without gating features or creating another chore/inventory system
- the temporary 3D Familiar follows the region being explored and reacts to night while the full character redesign remains reserved for v0.24
- persisted Auto/Balanced/Lush rendering control complements existing hard caps, instancing, offscreen pausing and new distance-gated secondary detail
- discovery persistence stores only tiny local IDs; private Memory/Companion content is never projected into secrets or landmarks

## v0.24 — Familiar Reimagine · implemented

Completely rethink the Familiar after the Sanctuary gives it somewhere meaningful to live. The Familiar becomes a character system, not a floating chatbot button.

### Concept
- define what the Familiar is in Ikigai Space and what role it serves
- separate companionship, navigation/context help and AI conversation instead of making one bubble do everything
- establish personality/presence rules that do not pretend to be sentient or needy

### UI
- redesign the page presence from zero: size, placement, affordances, open/closed states and conversation entry
- remove detached/popover behavior and unnecessary floating chrome
- make context actions appear only when relevant
- design mobile, keyboard and reduced-motion behavior as first-class states

### Settings
- replace scattered Familiar controls with one coherent character/presence editor
- appearance, motion, activity level, sounds, notifications/reactions and privacy/context permissions
- strong defaults so users do not need to configure a pet before using Ikigai Space

### Behavior and play
- idle movement, following, resting, looking at nearby UI/world objects and reacting to completed work
- small optional play interactions that never interrupt task entry or navigation
- no manipulative streak pressure, guilt, hunger meters or attention demands
- reduced motion produces calm/static equivalents, not feature loss

### Companion relationship
- Familiar can open or carry Companion context, but Companion remains the explicit place for model/provider configuration and proposal review
- AI failures should change the conversation state, not make the character look broken or distressed
- proposal approval remains explicit and user-controlled

### Sanctuary embodiment
- the same Familiar identity has a 3D resident form inside Sanctuary
- page Familiar and Sanctuary Familiar share appearance/personality settings
- Sanctuary behavior can include wandering, resting, approaching new landmarks and reacting to world changes

The v0.24 implementation should be evaluated as a cohesive interaction/character design pass rather than accumulated tweaks to the current pet.

### Implemented in v0.24
- the roaming/draggable page pet is replaced by a stable left/right edge nook
- clicking opens one attached drawer with separate Together and Talk modes
- Together works without AI: deterministic room context, navigation and optional non-scored play
- Talk reuses Companion drafts, provider error formatting, visible retry and explicit proposal review
- Familiar identity now includes a local display name, nook side, form, aura and material style
- Quiet / Nearby / Playful / Home only presence language maps safely onto existing stored activity values
- reactions, local context hints, play and interaction tones are individually optional
- task completion can trigger a small local celebration without streak pressure or private-data projection
- AI failures never drive negative character emotions
- Sanctuary uses the same form/colour/material/presence settings and its 3D resident opens the same Together surface
- reduced motion keeps all interactions while removing autonomous decorative movement

---

# Post-Reimagine production roadmap

The v0.20–v0.24 feature reimagine is complete. The next line is about proving, simplifying and composing the product rather than continuously adding rooms.

## v0.25 — Red-team / Product Audit · implemented

- exact dependency pins and Node-engine contract
- source static audit for dangerous DOM execution patterns, secret literals, network/storage boundaries, link safety and button semantics
- baseline CSP/referrer/dev-preview security headers
- explicit trust gate for custom remote AI origins plus redirect refusal
- shared external-link sanitation across normal entry, restore and integrity repair
- backup/attachment resource limits and safer SVG/file handling
- local Product diagnostics in Data & safety
- product-wide source audit ledger and browser smoke checklist
- no claim of browser visual verification or registry CVE audit where the sandbox could not perform them

## v0.26 — Daily + Journey immersive desk/calendar · implemented

- permanent Journey inspector removed from the active composition
- Journey calendar/date is the primary interaction surface
- click/tap a date reveals a temporary writable paper sheet
- title-only task entry is available directly on writable date sheets
- tactile month turning uses draggable paper edges with click/keyboard equivalents
- Today is rebuilt as the open two-page notebook on the same desk metaphor
- Daily Page tear-off behavior survives as an explicit sealing ritual rather than default chrome
- responsive layouts turn the temporary date paper into a mobile bottom sheet instead of restoring the old inspector
- semantics remain real buttons, inputs and textareas beneath the physical styling

## v0.27 — Navigation + Guide layer · implemented

- desktop navigation now uses a narrow living edge rail that expands on hover/focus and can be pinned open
- the rail overlays rather than permanently shrinking immersive rooms; active destinations use an orb + edge marker instead of large filled rows
- mobile keeps a compact bottom dock with secondary destinations in a More sheet
- every primary room now has one optional `ⓘ Guide` control with purpose, key interactions, customization notes and keyboard help
- Settings → Experience can disable Guide buttons globally or hide keyboard hints
- first-visit popovers were deliberately not added; help stays user-invoked so the new guidance system does not become another source of clutter

## v0.28 — Reflection + Career Hub

- make one short weekly reflection sufficient; deeper prompts remain optional
- reorganize Career into projects/proof/applications plus opt-in professional integrations
- GitHub contribution calendar through supported APIs
- LinkedIn only through permissions/data actually available to the application; no scraping

## v0.29 — Focus Room + Pomodoro

- one persistent timer state
- immersive Focus Room for deliberate sessions
- tiny global timer when the user leaves the room
- resilient background/tab timing and notification behavior without gamified pressure

## v0.30 — Now Playing · implemented

- opt-in Spotify integration through browser Authorization Code + PKCE; provider tokens remain outside portable backups
- compact current-track widget plus read-only-by-default permissions and separately authorized playback controls
- generic Familiar music presence when playback is active; no audio capture, analysis or prohibited music-synchronized visual behavior

## v0.31 — UX consistency / accessibility / responsive consolidation · source pass implemented

- source audit now blocks reintroduction of `100vh`, `autoFocus`, native `window.confirm`, positive tab order, and non-semantic clickable container regressions
- custom modal focus helper captures focus, traps Tab, supports Escape and restores the opener; destructive actions use an accessible native `<dialog>` confirmation surface
- Roadmap checkpoint selection now uses a native button alongside its independent status control
- legacy `100vh` declarations were consolidated onto dynamic viewport units for mobile browser chrome behavior
- screenshot-based desktop/tablet/mobile composition audit remains required in a dependency-complete browser environment
- screen-reader/touch verification and Sanctuary GPU/performance/device matrix remain required before v0.32
- v0.31.3 adds a keyboard-accessible in-place workspace theme preview, shifts Cedar/Indigo/Sumi to lighter long-session materials, keeps Moonlit as the deliberate dark option, and lifts Sanctuary dusk/night readability
- v0.31.4 repairs the stale onboarding panel token, adds skippable progressive personalization, optional local greeting name, and a plain-language disclosure that IndexedDB/backups are not encrypted by Ikigai Space itself
- v0.31.5 reduces onboarding warning-card weight, keeps a small editable-later/local-choice reassurance on every step, and recomposes the final Ready review so it remains clear above the fixed action controls
- v0.31.6 closes the Journey Settings preview gap: hovering or keyboard-focusing any calendar skin renders a full representative month in place, while click remains the explicit saved action
- v0.31.7 expands Focus Room pacing with more presets, custom 1–240 minute focus/rest blocks, and an explicit distraction-free fullscreen mode with a graceful local fallback
- v0.31.8 treats Today, Journey, Focus and Now Playing as viewport-sized desktop rooms at normal scale, removing cosmetic page scrolling while keeping bounded detail overflow and accessibility-scale fallbacks
- v0.31.9 simplifies Now Playing into a Windows-widget-like glance surface: track/context/device/progress and authorized controls stay primary, while Spotify/client setup moves behind a Source dialog; the UI explicitly states that the web/PWA build cannot read Windows system media sessions directly
- v0.31.10 makes Journey skins structural rather than cosmetic: Nihon becomes a hanging print, Fuji a scenic poster, Study Wall a side-bound planner, Washi a loose open sheet, Midnight a tiled desk pad, Letterpress a split ledger, Kraft a clipboard, and Newsprint a broadsheet; Settings/First Light previews match those constructions
- v0.31.11 stabilizes the Settings Journey preview footprint so structurally different calendar constructions cannot shift the picker while the pointer is hovering it; temporary preview reset now happens at picker-boundary level instead of between adjacent cards
- v0.31.12 adds five optional Workspace special editions and five Journey calendar editions (Hanami, winter/Christmas, Holi, Diwali and motivational studio) while preserving the five core Workspace materials and eight core Journey constructions; saved data is unchanged

## v0.32 — Release candidate

- clean `npm ci` and production build in CI
- live dependency vulnerability audit
- browser/device/PWA/offline/update matrix
- hostile-data/browser E2E suite
- final README/changelog/screenshots/version/install/data-safety documentation

## v0.26.1 — Study Station & Motion Refinement
- Journey deepened into a lived-in interactive study/work station.
- Month changes receive directional physical page-flip motion.
- Daily tear-off closure retired from active UX in favor of a once-per-day Morning handoff.
- Sanctuary camera orbit/travel softened with continuous damping and bounded inertia.


## v0.26.2 — Playable Journey Room

Journey moves from a decorated desk layout to a true interactive Three.js room. The calendar is a spatial object with clickable dates and a page-flip animation; desk objects become usable world affordances. The DOM date sheet remains the accessible writing surface so the 3D layer enriches interaction without becoming a requirement.


## v0.26.3 — Journey Visual Reset

The v0.26.2 low-poly Three.js room did not meet the product's visual bar and is no longer the active Journey presentation. Journey returns to a deliberately illustrated 2.5D workspace: spatial and playful, but not dependent on crude 3D primitives. The calendar remains directly interactive, months physically flip around the binding, and desk objects act as meaningful shortcuts.


## v0.28.1 — Navigation Recovery

- replace the visually heavy bottom Orbit Dock with the compact Living Ribbon on desktop
- keep mobile bottom navigation unchanged
- fix the Career route-load icon crash
- add route-level recovery UI and a Lucide export audit to prevent the same class of failure

## v0.28.2 — Navigation Reset

- retire the persistent Living Ribbon after browser testing exposed both visual weight and a legacy global `nav` CSS collision
- keep only a compact current-room switcher on desktop
- reveal the complete room map on demand instead of permanently showing primary/secondary route chrome
- scope the old generic `nav` rule to legacy `.sidebar nav` so modern semantic navigation components cannot inherit sidebar layout rules
- keep the established touch-first mobile dock

## v0.28.3 navigation decision

Navigation experiments are closed. Desktop returns to the original icon-only floating Living Dock; mobile uses its horizontal icon-only counterpart. Future releases should refine this dock rather than replace the shell navigation model again without a dedicated product review.

## v0.28.4 — Navigation brand cleanup

The restored Living Dock keeps a single local-first status indicator. The extra decorative pulse badge on the `生` mark is removed because it reads as a duplicate notification at compact sizes.



## v0.28.5 — Journey Calendar Reset

The Journey study-world experiment is paused. Journey uses the physical calendar as the primary surface with temporary per-date paper sheets; no permanent inspector/sidebar is restored.

### v0.31.13 brand consolidation

- one canonical **Ikigai Seed** sprout is now used by the shell badge, First Light, loading states, workspace preview, favicon and PWA icons
- workspace/theme glyphs remain decorative labels and no longer substitute for the product identity
- brand geometry and core moss/ivory lockup remain stable when workspace themes change

### v0.31.14 release candidate preflight

- add a dependency-free `audit:release` contract for version alignment, current migration notes, canonical PWA assets, PWA update settings, release workflow requirements and preservation of the manual v0.31 browser/device gate
- add a GitHub Actions release gate that performs clean `npm ci` + `npm run verify` on the minimum supported Node 20 and Node 22 boundaries; the Node 22 job also runs the live production dependency audit and retains `dist` as an artifact
- add `RELEASE_EVIDENCE_V0.32.md` so browser, assistive-tech, touch, PWA/offline/update, hostile-data and Sanctuary performance results are recorded before the RC decision
- do **not** cut v0.32 from source checks alone; the real-browser/device evidence remains a hard gate

### v0.31.15 theme action consistency

- fix the shared Quiet-interface cascade so low-chrome styling applies to secondary/quiet controls without washing the fill out of semantic primary actions
- introduce `--ik-action-fill` / `--ik-action-ink` as the contrast-safe filled-control pair, leaving each theme's expressive `--ik-accent` available for decorative/ambient use
- give all ten workspace themes an action pair with at least 4.5:1 foreground contrast and at least 3:1 separation from the workspace background
- route primary buttons, selected chips, Focus/Now Playing primary controls, onboarding actions, Companion apply/send affordances, skip links and filled brand/guide marks through the shared action tokens
- add regression coverage so future interface-style/theme work cannot silently recreate the pale-fill/light-text failure

### v0.31.16 interaction chrome guardrails

- suppress accidental document-style text selection inside the installed app shell while keeping inputs, textareas, contenteditable surfaces and explicit `data-ikigai-selectable="true"` regions selectable
- suppress native browser URL/image dragging from the Living Dock and hidden brand-door link without changing click, keyboard, touch, route-preload or magnetic hover behavior
- add regression coverage so later navigation/theme polish cannot silently reintroduce either browser-native interaction leak

### v0.31.17 visual consistency sweep

- make `--ik-muted` and `--ik-faint` readable text roles across every core and special-edition workspace theme rather than allowing atmosphere palettes to push metadata below normal text contrast
- keep expressive `--ik-accent` / `--ik-danger` values available for decoration and surfaces, while routing text/icons through `--ik-accent-text`, `--ik-danger-text`, `--ik-warning-text`, `--ik-info-text`, `--ik-success-text` and `--ik-focus-ring`
- migrate cross-room accent/error/status foregrounds and focus outlines to the semantic roles so Today, Focus, Now Playing, Companion, Roadmap, Memories, Reflection, onboarding and legacy/inactive room CSS share one readable contract
- extend `audit:ui` and regression tests so raw decorative accent foregrounds or weak theme metadata cannot silently return
- real-browser screenshot/device verification remains the next gate; this source sweep is not a claim that all theme × interface-style × viewport combinations have been visually observed


### v0.31.18 layout scale & workspace balance

- widen distraction-free Focus toward the available desktop canvas while keeping the timer dial itself restrained and centered
- add an opt-in, device-local Focus quotation treatment with professional typography and visible attribution; no feed, streak, score or automatic motivational rotation during a session
- enlarge the public GitHub activity visualization without implying it is GitHub's full contribution calendar
- rebalance Career Project/Proof/Opportunity and Roadmap Phase/Checkpoint editors with content-proportional widths, stronger header separation and roomier progressive fields
- make the Reflection week range open a compact Monday–Sunday calendar picker; support direct selection from 1970 through 9999 while keeping previous/next week navigation
- restructure deeper Reflection so retrospective prompts pair naturally, the forward-looking prompt spans the row, and the optional week title remains compact
- keep v0.32 as the next release-candidate gate after real-browser visual verification of this layout pass


### v0.31.19 layout balance corrective

- Center GitHub recent-public-activity inside the Career canvas instead of pinning it to the left edge.
- Move Roadmap/Career editor width ownership out of the global reimagine override and into per-dialog tokens.
- Normalize modal vertical rhythm so headers, fields, progressive sections, and actions do not accumulate competing margins.
- Keep Project's one-line story compact, including a CSS fallback for a stale pre-v0.31.18 route chunk until reload.


### v0.31.20 Career workspace repair

- Isolate Add Project, Add Proof and Add Opportunity from the shared room-density modal cascade.
- Use one Career-owned header/body/footer dialog composition with bounded internal scrolling and responsive single-column fallback.
- Present GitHub public activity as a centered Career object with a GitHub identity tile, event count and restrained activity legend while preserving the token-free/public-only limitation.
