# Ikigai v0.33.0

v0.33 closes the native-first release milestone while preserving the existing local-first browser and PWA experience.

## What changed

### Windows application

- Added the Tauri 2 Windows packaging path and NSIS installer workflow.
- Added the canonical Ikigai Seed native icon family.
- The native application keeps a separate local storage origin from the browser/PWA build. Use **Backup / Restore** to move data between installations.
- Unsigned builds may trigger Windows SmartScreen. Signing is intentionally treated as a later distribution step.

### Now Playing

- Windows System Media is the preferred installed-Windows source.
- Media title, artist/context, playback state, duration and position are read locally from the current Windows media session.
- Playback controls remain separately opt-in and are exposed only when the current source supports the exact action.
- System Media permission is device-local and is not included in portable backups.
- No listening-history store, microphone capture, screen capture, waveform analysis or beat synchronization was added.
- The displayed progress clock advances locally between authoritative provider snapshots and re-synchronizes on refresh, pause, seek or track changes.
- Spotify Web API remains an optional advanced provider. Its authorization tokens stay outside portable backups.

### First Light

- Replaced native date/select chrome with authored keyboard-accessible controls.
- Added real text-size, Familiar, Daily Paper and Journey previews.
- Repaired reduced-window behavior, carried scroll position and Journey preview fitting across the full calendar-theme family.

### Sanctuary

- Added bounded Explore movement with keyboard focus and Escape exit.
- Existing Tea House interaction remains available outside Explore.
- Garden reward stamping and Sanctuary projection data contracts are unchanged.

## Data and migration

No destructive database migration is required.

Existing settings and records continue through the normal settings-default path. New Windows System Media consent is deliberately local to each installed device. Restoring a portable backup does not silently enable native media observation or playback controls.

Browser/PWA storage and Tauri storage are separate. Export a backup from one installation and restore it into the other when moving data.

## Security and release hardening

- Windows System Media commands remain narrow and source-identity checked before controls are sent.
- Spotify continues to use Authorization Code + PKCE and does not require a Client Secret.
- `source-map-js` is locked to the patched `1.2.2` release.
- Production verification still requires `npm run verify` and the separate live dependency gate `npm run audit:deps`.

## Release gate

Before tagging v0.33.0:

```text
npm ci
npm run verify
npm run audit:deps
```

The final Windows installer must be produced from the same accepted commit and smoke-tested after installation. The GitHub Pages demo should then be refreshed from the accepted v0.33 source.
