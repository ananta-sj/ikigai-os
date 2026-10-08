<div align="center">

<img src="./public/brand/ikigai-native-icon.png" width="136" alt="Ikigai Space logo" />

# Ikigai Space

### A local-first personal workspace for planning, focus, reflection, and memory.

Not a dashboard for measuring your life. A place for inhabiting it.

[**Live Demo**](https://ananta-sj.github.io/ikigai-space/) ·
[**Download for Windows**](https://github.com/ananta-sj/ikigai-os/releases/latest) ·
[**Source**](https://github.com/ananta-sj/ikigai-os)

<br />

[![Release gate](https://github.com/ananta-sj/ikigai-os/actions/workflows/release-gate.yml/badge.svg)](https://github.com/ananta-sj/ikigai-os/actions/workflows/release-gate.yml)
![Version](https://img.shields.io/badge/version-v0.33.0-3d433b)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20PWA-5d625a)
![Local first](https://img.shields.io/badge/data-local--first-766f60)

**Current version:** `v0.33.0`

</div>

<div align="center">
    <small> ikigai (生き甲斐) </small>
    <small> or </small>
    <small> 'a reason for being' is a Japanese concept of an individual's definition of the meaning of their life. </small>
    </div>
    
---
## A place for inhabiting your life

Ikigai Space is a private workspace for the parts of life that usually end up scattered across task managers, calendars, journals, notes, timers, career trackers, and half-forgotten documents.

It brings them together as a set of **rooms**, each designed around a different kind of attention.

There are no XP bars to chase, no currencies, no streak pressure, and no second economy hiding behind your real life.

The goal is simpler:

> **Help you remember where you are, what matters, and what you want to move toward.**

---

## Try Ikigai Space

### 🌐 Live demo

**https://ananta-sj.github.io/ikigai-space/**

The browser version contains the full local-first PWA experience.

Some native functionality, particularly **Windows System Media**, is available only in the installed Windows app.

### 🪟 Windows

Download the latest installer from:

**https://github.com/ananta-sj/ikigai-os/releases/latest**

The Windows application is built with **Tauri 2** and keeps its own local storage separate from the browser/PWA version.

Use **Backup & Restore** to move your Ikigai Space data between installations.

> Current Windows builds are unsigned, so Windows SmartScreen may show a warning during installation.

---

## The rooms

| Room | Purpose |
| --- | --- |
| **Today** | Tasks, notes, continuity, and a tactile daily paper workspace |
| **Journey** | A physical-feeling calendar for planning days and milestones |
| **Focus** | Deliberate focus sessions without productivity theatre |
| **Now Playing** | A quiet surface for the media already accompanying your day |
| **Roadmap** | Longer arcs, phases, checkpoints, and direction |
| **Reflection** | Weekly reflection connected back to the rest of the system |
| **Memories** | A private, date-aware vault for moments worth keeping |
| **Career** | Projects, evidence, opportunities, and professional growth |
| **Companion** | Optional AI assistance using a provider you configure |
| **Sanctuary** | A persistent 3D world shaped quietly by your activity |

---

## Sanctuary

Sanctuary is the emotional center of Ikigai Space.

It is not a statistics page rendered in 3D.

It is a persistent place.

A grove.  
Moon Pond.  
A pavilion.  
Lantern Street.  
A Tea House.  
Changing light.  
Ambient life.  
A Familiar that actually inhabits the world.

Your existing activity can gently influence the landscape, but Sanctuary deliberately avoids becoming another progression system to optimize.

You can explore it.

You can notice what has changed.

Or you can simply stay there for a while.

---

## Familiar

The Familiar is a small resident that moves between Ikigai Space and Sanctuary.

It can respond to the room you are in, move around its available space, and take on different material treatments.

It is also entirely optional.

Disable it and Ikigai Space remains complete.

That principle matters throughout the project: personality should enrich the system, never hold it hostage.

---

## Now Playing

### Windows System Media

The native Windows app can read compatible media sessions directly from Windows.

It supports:

- current media metadata
- artwork when provided by the source
- playback state
- locally projected playback progress
- supported play / pause / next / previous controls
- read-only access by default
- separately opt-in playback controls

Ikigai Space does **not** capture microphone input, analyze system audio, or build a listening-history database.

### Spotify

Spotify Web API support remains available as an optional **Advanced** source.

It uses PKCE rather than a client secret and stays separate from the normal Windows System Media path.

---

## Local-first by design

Your core Ikigai Space data lives locally using **IndexedDB via Dexie**.

No Ikigai Space account is required.

No Ikigai Space cloud backend is required.

No automatic cloud sync is silently running behind the experience.

### What stays local

| Data | Behaviour |
| --- | --- |
| Tasks, plans, reflections and memories | Stored locally |
| Sanctuary state | Derived from local records |
| Windows System Media | Read locally on the device |
| Media history | Not stored |
| Native media permission | Device-local |
| Backup data | Exported only when you choose |
| Spotify OAuth tokens | Excluded from portable backups |

Local-first does not mean application-level encrypted storage. Your device and browser profile remain part of the security boundary.

Optional remote integrations naturally leave the device when used.

---

## v0.33.0

This release brings Ikigai Space into its native Windows chapter.

### Highlights

- **Native Windows application** with Tauri 2
- **Windows System Media** integration
- locally projected, living playback progress
- provider-neutral media controls
- refined **First Light** onboarding
- real text-size and Familiar previews
- live Paper & Time preview
- improved Journey auto-fitting
- responsive Settings repairs
- bounded keyboard-friendly **Sanctuary Explore**
- official **Ikigai Seed** native branding
- browser ↔ native migration through Backup & Restore
- hardened Spotify advanced integration
- dependency and release cleanup

---

## Built with

<div align="center">

**React 19** · **TypeScript** · **Vite** · **Dexie**  
**Three.js** · **React Three Fiber** · **Framer Motion**  
**Lucide** · **vite-plugin-pwa** · **Tauri 2**

</div>

The Windows build uses a deliberately narrow native bridge for functionality that cannot exist safely in the browser, including Windows System Media.

---

## Architecture

```text
                         Ikigai Space
                             │
              ┌──────────────┴──────────────┐
              │                             │
          React / Vite                  Tauri 2
              │                             │
       ┌──────┼───────┐                     │
       │      │       │                     │
     Dexie   R3F     PWA             Windows native APIs
       │      │                             │
 IndexedDB  Sanctuary              Windows System Media
       │
   Local data
```

Browser and native installations deliberately have separate storage origins.

**Backup & Restore is the bridge between them.**

---

## Run locally

Requirements:

```text
Node ^20.19.0 or >=22.12.0
npm
```

Clone and start:

```bash
git clone https://github.com/ananta-sj/ikigai-os.git
cd ikigai-os
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

---

## Native development

The Windows desktop application uses Tauri 2.

```bash
npm run native:dev
```

Production native build:

```bash
npm run native:build
```

Official Windows release artifacts are built through GitHub Actions rather than requiring the release machine to carry the complete native toolchain.

---

## Verification

Before release:

```bash
npm ci
npm run verify
npm run audit:deps
```

`npm run verify` covers release contracts, static checks, UI guardrails, icon validation, the automated test suite, production build, and generated-distribution auditing.

The GitHub release gate verifies both supported Node boundaries:

```text
Node 20.19.0
Node 22.12.0
```

---

## Design principles

**Calm over density.**  
The interface should not feel like an admin panel for your existence.

**Meaning over gamification.**  
Growth may leave traces. It should not become another score.

**Local-first over account-first.**  
The core product remains useful without an Ikigai Space backend.

**Private text stays private.**  
Sanctuary may respond to bounded state, but private writing is not projected verbatim into scenery.

**Tactile over generic.**  
Paper, calendars, rooms, landscape, and movement should feel authored rather than assembled from dashboard components.

**Accessibility is product quality.**  
Keyboard use, reduced motion, focus management, safe areas, and practical touch targets belong inside the release definition.

---

## Backup & migration

Browser/PWA and native Windows installations keep separate local stores.

To move your existing Ikigai Space world:

1. Export a backup from the current installation.
2. Open the destination installation.
3. Go to **Backup & Restore**.
4. Restore the exported backup.

v0.33.0 requires no destructive database migration.

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

Ikigai Space is an actively developed personal project.

`v0.33.0` adds the installed Windows release path, native Windows System Media for Now Playing, polished First Light onboarding, bounded Sanctuary Explore controls, responsive preview repairs, and final native-release hardening while preserving the local-first web/PWA experience.

The next changes should earn their place by making the system more useful, more personal, or more alive without making it busier.

---

<div align="center">

## Ikigai Space

**Not a dashboard for measuring your life.  
A place for inhabiting it.**

[Live Demo](https://ananta-sj.github.io/ikigai-space/) ·
[Latest Release](https://github.com/ananta-sj/ikigai-os/releases/latest)

</div>

<!-- Release-contract marker: v0.31.14 release candidate preflight -->
<!-- Release-contract marker: Patch 17 release-closure sync -->
<!-- Sanctuary contract: mist-sealed world boundary -->
<!-- Historical contract: Patch 16 mist-world closure -->
