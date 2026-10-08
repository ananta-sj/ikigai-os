# Ikigai Space — UI Grammar v0.7.2

Ikigai Space should feel like one place with different rooms. The design system therefore standardizes interaction and hierarchy, not visual metaphor.

## Shared grammar

### Layout
- `--ik-content-max`: normal content width.
- `--ik-page-top`, `--ik-page-bottom`: page rhythm.
- `--ik-space-1` … `--ik-space-10`: spacing scale.

### Shape
Radii derive from the active workspace theme:
- `--ik-radius-xs`
- `--ik-radius-sm`
- `--ik-radius-md`
- `--ik-radius-lg`
- `--ik-radius-pill`

This lets Washi stay sharper and Midnight Grove stay softer while controls remain structurally related.

### Typography
- `--ik-type-caption`: metadata/kickers.
- `--ik-type-body-sm`, `--ik-type-body`: supporting copy.
- `--ik-type-title-sm`, `--ik-type-title`: headings.
- `--ik-display`, `--ik-body`, `--ik-mono` still come from the workspace theme.

### Surfaces
Use:
- `.ik-surface` for primary panels.
- `.ik-surface-flat` for secondary interactive surfaces.
- `.ik-surface-soft` for quiet nested areas.

Do not wrap every piece of content in a card just because these classes exist.

### Controls
Use `.ik-button` or the `IkButton` component.
Variants:
- primary
- secondary
- quiet

All controls share focus, hover, pressed and disabled behavior.

### Semantic color roles (v0.31.17)
Workspace atmosphere and readable UI ink are deliberately separate concerns. `--ik-accent` and `--ik-danger` may stay expressive enough for decoration, fills and ambience; do not assume they are readable as foreground text on every theme.

Use:
- `--ik-text` for primary copy; `--ik-muted` and `--ik-faint` for subordinate copy/metadata. All three are readability roles.
- `--ik-action-fill` + `--ik-action-ink` for filled primary actions.
- `--ik-accent-text` and `--ik-secondary-text` for theme-colored labels/icons/links that must remain readable.
- `--ik-danger-text`, `--ik-warning-text`, `--ik-info-text`, `--ik-success-text` for semantic foreground feedback.
- `--ik-focus-ring` for visible keyboard focus outlines.

Do not use raw `color: var(--ik-accent)` for text or icons. The UI audit treats that as a regression because special-edition decorative accents may be intentionally softer than a text-safe ink.

### Page headings
Use `PageHeader` for normal OS rooms. A room can keep its own typography and physical metaphor through its page CSS.

Today is intentionally exempt for now because its composition still needs a later dedicated redesign.

## Motion
`AppShell` writes the user's preference to:

```text
data-ikigai-motion="full"
```

or:

```text
data-ikigai-motion="reduced"
```

Shared motion tokens then respond automatically. Feature-specific animation should also consult the existing settings value when physics or WebGL is involved.

## Core principle

**Shared:** navigation, hierarchy, focus, buttons, forms, spacing, motion, accessibility, theme tokens.

**Room-specific:** paper, calendar binding, garden world, journal texture, future Memory Vault metaphors.

## v0.10 user-controlled chrome

Workspace theme remains the atmosphere. Two independent preferences now sit above the shared design grammar:

- `interfaceStyle`: `soft | quiet | structured`
- `interfaceScale`: `compact | balanced | large`

These may tune shared controls, surfaces, navigation and page spacing. Feature-defining physical objects (Daily Page, Journey calendar, 3D Garden world) should not be globally scaled by this setting.

The later polish sprint still owns page-level clutter, composition and information-density decisions. Do not use these preferences as a substitute for fixing a genuinely poor layout.


## v0.10.1 display and typography controls

`interfaceScale` now acts as a real display magnification layer (90%, 100%, 112%, 124%) so legacy px-based rooms respond too. `interfaceFont` can be `theme`, `modern`, `editorial`, `humanist`, or `technical`. Theme default preserves the atmosphere-specific pairing; explicit font choices override only typography, not colors or room metaphors.

## v0.15 accessibility + runtime contract

- Operating-system `prefers-reduced-motion` is always respected, even when the in-app **Reduce motion** switch is off.
- `AppMotionProvider` applies the same effective motion preference to Framer Motion; WebGL / physics features should use `useReducedMotionPreference` when they need an explicit boolean.
- Main routes are lazy-loaded. Keep page-specific heavy dependencies inside their route modules so they do not inflate the initial shell bundle.
- The primary dock may preload a route after deliberate hover/focus, but should not eagerly import every room at startup.
- Route changes update the document title, announce the destination to assistive technology, and move keyboard focus to `#ikigai-main` without changing scroll position.
- The shell exposes a keyboard-visible **Skip to main content** link.
- Mobile layout must account for safe-area insets, dynamic viewport height and 44px coarse-pointer targets.
- Normal page scrolling must not be trapped by fixed navigation or physical-room interactions.

## v0.16 empty / loading state contract

Rooms should not invent a completely different visual language every time there is no data.

Use `EmptyState` for a true blank state, a filtered-no-results state, or a nested section that has nothing to show yet. It supports:

- an optional icon;
- one short eyebrow;
- one clear title;
- supporting copy;
- primary / secondary actions;
- a compact mode for nested panels.

A room may still tune alignment or borders so the state fits its metaphor, but the content hierarchy should stay consistent. Empty states should explain what can happen next without implying that the user has failed to fill the product.

Use `LoadingState` for local room-loading work. Loading copy should say what Ikigai Space is preparing and avoid implying network activity when data is only being read from IndexedDB.

Onboarding preview is presentation-only. It may temporarily preview theme choices in the document, but closing the preview must restore the user's saved appearance and must not create milestones, tasks, Garden state, or other user data.

## v0.20 reimagine contract

v0.20 deliberately stops treating every feature as its own visual product. The data model stays intact; the shell and primary interaction grammar are rebuilt around clarity.

### Navigation
- Desktop uses one persistent labelled left sidebar.
- Tablet collapses the same information architecture to an icon rail.
- Mobile exposes Today, Journey, Garden and Companion directly, with the remaining rooms behind one **More** sheet.
- Avoid a second global floating navigation system on top of this shell.

### Composition
- One dominant action per room. Secondary controls should not compete with the main workflow.
- Prefer flat, readable surfaces over stacked glass panels, glow and decorative chrome.
- Page headers, content width, spacing and control geometry come from the shared system. A room may keep a physical metaphor inside that frame.
- Empty space is useful. Do not create cards merely to fill it.

### Input burden
- Ask for the minimum information needed to create something.
- Optional metadata belongs behind `.ik-progressive-fields` unless it is essential to the user's immediate decision.
- Good defaults are preferred to mandatory configuration.
- Reflection can invite depth, but it must not feel like a weekly form to complete.

### Garden freeze in v0.20
- v0.20 does **not** redesign the existing Garden world.
- Do not paper over the current Garden with additional CSS or primitive geometry during this release.
- The replacement world is developed as a separate Sanctuary line in v0.21–v0.23, where geography, art direction, interaction and data meaning can be designed together.
- The Garden route and existing local Garden data remain compatible while that work happens.

### Companion connection
- Provider setup should begin with presets where possible rather than raw endpoint plumbing.
- API keys are never part of Ikigai Space backups.
- Users may explicitly choose **Remember key on this device**; otherwise the key remains session-only.
- Remote setup must have a real **Save & test** action so a saved endpoint is not mistaken for a verified connection.

## Reimagine sequence after v0.20

- **v0.21 — Sanctuary prototype:** terrain, authored environment direction, camera/interaction, lighting and a first 3D Familiar presence. Dummy world state is acceptable while visual language is proven.
- **v0.22 — Living World:** connect Tasks, Roadmap, Reflection, Memories and Career/Proof to spatial world evolution.
- **v0.23 — World depth:** achievements as world objects, richer ambience, day/night, soundscape, secrets, theme reinterpretations and performance tiers.
- **v0.24 — Familiar reimagine:** rebuild the Familiar concept itself—its UI, settings, personality/presence model, movement/play, reactions, Companion relationship, page behavior and Sanctuary embodiment. Treat it as a character system, not a floating chatbot skin.

## v0.21 Sanctuary contract

The Sanctuary is not a dashboard rendered in 3D. It is an optional spatial expression of the user's progress.

- Geography must be readable before progression systems are layered on top.
- Major landmarks should come from authored assets or an authored asset pipeline; procedural geometry is reserved for terrain/detail/variation where it is actually stronger.
- Permanent HUD should be minimal. Prefer contextual labels and world response over rows of meters.
- The Sanctuary must never become required navigation for editing Tasks, Roadmap, Reflection, Memories, Career or Companion settings.
- Existing Garden data remains the continuity layer during the prototype. v0.21 only uses growth to scale the Guardian Tree; broader world evolution begins in v0.22.
- No hidden planting ritual exists. If something grows automatically from real work, the UI must say so plainly.
- Touch users must be able to scroll the page normally. World gestures cannot trap the document.
- Reduced motion changes movement, not meaning or access.
- The 3D Familiar in v0.21 is a presence test only. Do not expand it piecemeal before the dedicated v0.24 Familiar reimagine.

## v0.22 Living Sanctuary contract

The Sanctuary may react to user data, but it must not become another place that asks the user to maintain a second set of progress fields.

- Living-world state is **derived** from existing local records. v0.22 adds no Sanctuary progression table and no manual world editor.
- Completed Tasks enrich **Home Grove** through flowers, young growth and subtle warmth. The world never displays an XP bar for this.
- Written Weekly Reflections enrich **Moon Pond** through lilies, reeds and reflective atmosphere.
- Memory Vault records enrich **Quiet Pavilion** through abstract lantern traces. Memory titles, bodies, tags and attachment contents are never rendered into the 3D scene.
- Roadmap phases/checkpoints develop the route toward **The Lookout** through waystones. Career projects and Proof develop a small beacon/structure at the ridge.
- Decorative counts are capped. A long-lived dataset should become richer, not linearly more expensive to render forever.
- Region descriptions may explain what local data is represented, but must remain contextual and quiet; do not add a permanent metrics HUD.
- The projection must update when its source IndexedDB records change and must remain entirely optional. Editing still belongs in the normal Ikigai Space rooms.
- Empty regions are valid states. Do not seed fake memories, tasks, reflections, roadmap items or career proof just to make the Sanctuary look populated.
- v0.22 deliberately avoids achievements, sound, day/night, full environmental themes and richer Familiar behavior; those remain scoped to v0.23/v0.24.

## Sanctuary world-depth contract · v0.23

Sanctuary is not a second dashboard. The scene should carry meaning before overlays do.

- The normal state shows only the world title/context, region navigation and two quiet world actions. Do not add permanent XP/resource/stat bars.
- World themes change environmental interpretation—vegetation, structures, particles/weather, materials, fog and lighting—not underlying user data or geography.
- Day/night follows local device time only. It must not request location or weather permissions.
- Achievement rewards belong in the world as authored objects. Avoid giant reward props, inventory grids or placement editors.
- Secrets are optional atmosphere. They must never gate normal Ikigai Space features, task completion or progression.
- Sound is opt-in, locally generated/played, independently controllable and never required to understand feedback.
- Balanced/Lush quality may change decorative density and rendering budget, never information or functionality.
- The v0.23 Familiar behavior is deliberately temporary. Do not extend its page UI or personality here; v0.24 owns the cohesive character-system redesign.

## Familiar character-system contract · v0.24

The Familiar is a persistent character layer, not a draggable chatbot button and not a second navigation system.

- Page presence lives in a **stable edge nook**. It may animate inside that nook but must never roam across primary content or jump to make room for chat.
- Opening the Familiar reveals an **attached edge drawer** on desktop and a bottom sheet on mobile. Do not reintroduce detached speech bubbles whose position is independently solved from the character.
- The drawer separates **Together** from **Talk**. Together is local context/navigation/play and does not require an AI provider. Talk is the optional AI conversation surface.
- AI connection state must not determine whether the character appears alive, asleep, upset or broken. Provider failures are conversation errors, not character emotions.
- Familiar reactions to work are small visual acknowledgements only. No hunger, affection, streak, guilt, neglect or attention-demand systems are permitted.
- Play is optional, short and non-progressive. Petting, tossing a mote or settling the Familiar never awards currency, unlocks productivity features or creates another maintenance loop.
- Existing appearance choices remain one identity across page UI and Sanctuary: form, aura colour and material style.
- Presence settings use the legacy stored activity values for compatibility, but the product language is now **Quiet / Nearby / Playful / Home only**.
- Home only means the page Familiar is absent from ordinary rooms while the Companion editor and 3D Sanctuary resident remain available.
- Room context in Together is deterministic/local and must not silently call a model. Companion context sharing remains governed by the explicit AI context-scope setting.
- Optional Familiar tones are locally generated Web Audio sounds and are off by default.
- Reduced Motion preserves every action and state while suppressing decorative movement.
- The Sanctuary resident must share the same form, colour, material style and broad presence mode. Clicking the 3D resident may open the same Together drawer rather than inventing a second character UI.

## v0.25 audit rule — evidence before polish

The Reimagine line now distinguishes three kinds of confidence:

1. **logic verified** by unit/static checks;
2. **source-reviewed** interaction/data paths;
3. **runtime verified** composition and behavior in a real browser/device.

A visually present component is not considered working merely because its React branch exists. Before release, every primary room must be checked for discoverability, keyboard/touch reachability, viewport clipping, persistence, failure recovery and responsive composition.

v0.25 intentionally does not redesign Journey/Daily/Reflection/navigation while auditing them. Confirmed structural UX debt is moved into explicit follow-up releases rather than hidden inside security work. See `PRODUCT_AUDIT_V0.25.md` and `UI_SMOKE_CHECKLIST_V0.25.md`.


## v0.26 physical-workspace rule

Daily and Journey share one spatial grammar: **desk → paper → direct writing**. Physical metaphor is allowed to create delight, but never to hide the real controls. Date cells remain buttons, task entry remains an input/form, notes remain textareas, and month navigation remains keyboard-operable.

The key composition rule is progressive physical disclosure: the calendar stays visually dominant and a date sheet appears only after a date is chosen. Permanent inspectors, always-open metadata columns and duplicated task forms should not return.

### v0.26.1 workstation refinement

Journey may feel like a real study/work station, but every meaningful object needs either a clear function or a purely decorative role. Calendar, pencil, lamp, laptop, Sanctuary plant and Memory frame can be interactive; visual clutter should not become hidden mandatory navigation.

Month changes use directional paper-flip motion around the page edge. Reduced Motion replaces the flip with an immediate transition. Daily closure uses a Morning handoff sheet rather than destroying or tearing a calendar page.

Sanctuary camera motion should feel inertial and continuous: dragging must move the camera while the pointer is down, region travel is damped rather than snapped, and release momentum remains small and bounded.


### v0.26.2 Journey room principle

Journey may use true 3D for space, camera, lighting, and object discovery, but writing and critical planning controls remain semantic DOM. Spatial interaction must be additive: every essential date/task action needs a non-3D alternative, and normal page scrolling must not be trapped.


### v0.26.3 Journey visual reset

Journey must not use rough low-poly geometry merely to qualify as “immersive.” Its room layer is now an illustrated 2.5D composition. The calendar, notebook, laptop, plant, photo frame, lamp, and mug are spatial objects with direct interactions, while text entry remains accessible DOM UI. Depth comes from composition, parallax, shadows, page motion, and object response—not from exposing primitive meshes.

The Journey room should feel authored before it feels technically impressive. If an environmental layer lowers visual quality, remove the layer rather than keeping it for novelty.

### v0.27 Living navigation and Guide layer

The shell no longer keeps a permanently wide sidebar visible. Desktop uses a 76px edge rail that expands on hover/focus or when pinned. The expanded surface overlays the workspace instead of changing room geometry. Mobile continues to use a bottom dock because edge-hover interaction does not translate well to touch.

Page guidance is one optional control per primary room. The Guide drawer contains feature-level help so the product does not scatter permanent information icons beside every control. Guide content is static and never reads private user records.
