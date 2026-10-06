# Ikigai OS

[![Release gate](https://github.com/ananta-sj/ikigai-os/actions/workflows/release-gate.yml/badge.svg)](https://github.com/ananta-sj/ikigai-os/actions/workflows/release-gate.yml)

**A local-first personal life OS for planning, focus, reflection, memory, career, and a living Sanctuary.**

Ikigai OS is not trying to be another productivity dashboard. It is a private, calm workspace where practical rooms help you move through your day, while **Sanctuary** quietly reflects what that movement has become.

**Current version:** `v0.33.0`

---

## What is Ikigai OS?

Ikigai OS brings several parts of day-to-day life into one coherent, local-first web app:

- **Today** — tasks, day notes, continuity, and a physical desk-calendar feel.
- **Journey** — a calendar and planning space with tactile, themed calendar constructions.
- **Focus** — deliberate focus sessions with optional quotes, fullscreen, and completion notifications.
- **Now Playing** — a quiet playback surface. The installed Windows app can read Windows System Media locally; Spotify Web API remains an optional advanced source.
- **Roadmap** — phases, checkpoints, and longer-term direction.
- **Reflection** — weekly reflection with continuity back into the rest of the app.
- **Memories** — a private memory vault with date-aware capture and navigation.
- **Career** — projects, proof, opportunities, and career evidence.
- **Companion** — optional AI assistance using a configured remote provider.
- **Sanctuary** — a Japanese-inspired 3D living landscape shaped by local activity.
- **Familiar** — a configurable, draggable companion that can be disabled entirely.
- **Settings** — appearance, motion, world, integrations, backup, and other local preferences.

The goal is coherence rather than gamification. Ikigai OS deliberately avoids XP, currencies, streak pressure, and a second progress economy.

---

## Sanctuary

Sanctuary is the emotional center of Ikigai OS.

It is a persistent 3D place with a grove, Moon Pond, pavilion, Lantern Street, Tea House, changing local-time atmosphere, ambient life, and a resident Familiar. Its world state is projected from existing local records such as completed work, reflections, memories, roadmap activity, and career evidence.

Sanctuary is intentionally **not** a dashboard in a 3D costume. Some objects are interactive, but the world is allowed to exist simply as somewhere to sit, look around, and be still.

Core progression is conservative and idempotent: completing work can contribute to Garden growth, but rewards are stamped once and are not designed as a grindable economy.

Reduced Motion and lower-power rendering paths are supported.

---

## Local-first by design

Core Ikigai data lives in the browser using **IndexedDB via Dexie**.

There is no required Ikigai account, no built-in cloud sync, and the core experience does not depend on a remote backend. Data belongs to the browser origin and device where it was created, so `localhost` and a deployed HTTPS site are separate stores.

Backups can be exported and restored through the app.

Local-first does **not** mean application-level encrypted storage. Treat the device and browser profile as part of the security boundary.

The installed Windows app can optionally read the current **Windows System Media** session locally. This is device-local, stores no listening history, and keeps playback controls separately opt-in.

Optional integrations can use the network:

- **Spotify Web API** remains an advanced, explicitly connected provider. Its OAuth tokens stay outside portable backups.
- **Companion** can use Gemini or a configured OpenAI-compatible endpoint. Remote requests leave the device by definition, so use only providers you trust.
- API/provider credentials are kept out of Ikigai's portable backup data.

Private writing is not projected verbatim into Sanctuary scenery.

---

## Progressive Web App

Ikigai OS ships as a **PWA**.

A production build includes a web app manifest and service worker so the app can be installed to a desktop or home screen and can keep its application shell and selected local assets available offline.

PWA installation requires the app to be served from a secure origin (`https://`, with normal localhost exceptions during development).

Because browser storage is origin-specific, installing the PWA does not create automatic cross-device sync.

### Windows app

v0.33 also ships through a Tauri 2 Windows build. The native app keeps its own local storage origin, separate from the browser/PWA installation, so **Backup / Restore** is the supported migration path between them.

Windows System Media is available only in the installed Windows app. It reads the current media-session metadata locally and starts read-only; play/pause/previous/next remain separately opt-in and are shown only when the active media app exposes those capabilities.

Unsigned development/personal builds may trigger Windows SmartScreen. Code signing is a distribution step rather than a requirement for the app to function.

---

## Tech stack

Ikigai OS is built with:

- React + TypeScript
- Vite
- React Router
- Dexie / IndexedDB
- Three.js + React Three Fiber
- Framer Motion
- Lucide
- vite-plugin-pwa
- Tauri 2 for the installed Windows application
- Node's test runner with `tsx`

Dependency versions are pinned in `package.json` / `package-lock.json`.

### Supported Node versions

The release gate verifies:

```text
Node 20.19.0
Node 22.12.0
```

The package engine contract is:

```text
^20.19.0 || >=22.12.0
```

---

## Run locally

```bash
git clone https://github.com/ananta-sj/ikigai-os.git
cd ikigai-os
npm ci
npm run dev
```

Vite will print the local development address.

For a production build:

```bash
npm run build
```

---

## Verification

The main release gate is:

```bash
npm run verify
```

It performs retired-source cleanup, release-contract checks, static/UI/icon audits, the test suite, a production build, and a fresh `dist` audit.

Production dependency auditing is separate:

```bash
npm run audit:deps
```

Useful individual commands:

| Command | Purpose |
| --- | --- |
| `npm test` | Run the TypeScript test suite |
| `npm run build` | Type-check and build production assets |
| `npm run audit:release` | Validate version, docs, PWA, and CI contracts |
| `npm run audit:static` | Run static source checks |
| `npm run audit:ui` | Run UI source guardrails |
| `npm run audit:icons` | Validate Lucide imports |
| `npm run audit:dist` | Audit the generated production artifact |
| `npm run verify` | Run the complete release gate |
| `npm run audit:deps` | Audit production dependencies |

GitHub Actions runs the release gate on pushes to `main` and on pull requests across the supported Node boundaries.

---

## Product principles

Ikigai OS is guided by a few constraints:

1. **Local-first before cloud-first.** Core data should remain useful without a backend.
2. **Calm before noisy.** Avoid dashboard density, pressure mechanics, and attention traps.
3. **Meaning before gamification.** Sanctuary should reflect a life being lived, not create another score to optimize.
4. **Private text stays private.** Ambient projections should use bounded state, not expose journal or memory text.
5. **Accessibility is part of the product.** Keyboard-safe dialogs, safe-area-aware mobile layouts, reduced motion, and practical touch targets are release concerns.
6. **Visual truth matters.** Source-level tests are not a substitute for checking the real rendered experience.

---

## Release documentation

The current release line is `v0.33.0`.

Public release-gate documents include:

- `MIGRATION_V0.33.0.md`
- `RELEASE_EVIDENCE_V0.32.md`
- `UI_SMOKE_CHECKLIST_V0.31.md`

Before cutting a release, run:

```bash
npm ci
npm run verify
npm run audit:deps
```

and confirm the corresponding GitHub Actions release-gate run is green.

---

## Project status

Ikigai OS is an actively developed personal project.

`v0.33.0` adds the installed Windows release path, native Windows System Media for Now Playing, polished First Light onboarding, bounded Sanctuary Explore controls, responsive preview repairs, and final native-release hardening while preserving the local-first web/PWA experience.

The next changes should earn their place by making the system more useful, more personal, or more alive without making it busier.


<!-- Release-contract marker: v0.31.14 release candidate preflight -->
<!-- Release-contract marker: Patch 17 release-closure sync -->
<!-- Sanctuary contract: mist-sealed world boundary -->
<!-- Historical contract: Patch 16 mist-world closure -->