# Ikigai OS

[![Release gate](https://github.com/ananta-sj/ikigai-os/actions/workflows/release-gate.yml/badge.svg)](https://github.com/ananta-sj/ikigai-os/actions/workflows/release-gate.yml)

**A local-first personal life OS for planning, focus, reflection, memory, career, and a living Sanctuary.**

Ikigai OS is not trying to be another productivity dashboard. It is a private, calm workspace where practical rooms help you move through your day, while **Sanctuary** quietly reflects what that movement has become.

**Current release line:** `v0.32.0`

---

## What is Ikigai OS?

Ikigai OS brings several parts of day-to-day life into one coherent, local-first web app:

- **Today** — tasks, day notes, continuity, and a physical desk-calendar feel.
- **Journey** — a calendar and planning space with tactile, themed calendar constructions.
- **Focus** — deliberate focus sessions with optional quotes, fullscreen, and completion notifications.
- **Now Playing** — an optional Spotify-connected listening surface without turning music into a productivity metric.
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

Optional integrations can use the network:

- **Spotify** uses Spotify authorization and playback APIs when explicitly connected.
- **Companion** can use Gemini or a configured OpenAI-compatible endpoint. Remote requests leave the device by definition, so use only providers you trust.
- API/provider credentials are kept out of Ikigai's portable backup data.

Private writing is not projected verbatim into Sanctuary scenery.

---

## Progressive Web App

Ikigai OS ships as a **PWA**.

A production build includes a web app manifest and service worker so the app can be installed to a desktop or home screen and can keep its application shell and selected local assets available offline.

PWA installation requires the app to be served from a secure origin (`https://`, with normal localhost exceptions during development).

Because browser storage is origin-specific, installing the PWA does not create automatic cross-device sync.

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

The current release line is `v0.32.0`.

Public release-gate documents include:

- `MIGRATION_V0.32.0.md`
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

`v0.32.0` focuses on a release-ready local-first foundation: responsive rooms, a stronger mobile experience, a calmer shared capture language, PWA support, a living Sanctuary, a more natural Familiar, optional remote integrations, backup/restore safeguards, and cross-version release verification.

The next changes should earn their place by making the system more useful, more personal, or more alive without making it busier.
