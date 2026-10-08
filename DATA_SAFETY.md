# Data Safety Architecture

Ikigai Space remains local-first. v0.11 separates three concepts that should not be confused:

1. **IndexedDB** is the live local database.
2. **Backup** is a portable user-controlled snapshot of the live data.
3. **Sync queue** is a local record of changes that a future opt-in provider can consume.

## Backup format

The export is JSON with format metadata, source-device metadata, all portable user-data tables, attachment blobs encoded into the file, and an integrity checksum. `syncState`, `syncQueue`, and the active `focusTimer` singleton are deliberately excluded because they describe the current device/session context rather than portable life data.

## Restore modes

- Merge is ID-based and non-destructive to unrelated local records.
- Replace clears the user-data tables and restores the snapshot.
- After either restore, Ikigai Space rebuilds the local sync manifest so a future provider sees the restored state as pending local truth.

## Sync foundation

`syncQueue` is keyed by `table:recordId`, which naturally coalesces repeated edits. Each queue item stores an `upsert` or `delete` operation and the latest local change timestamp. Deletes survive as tombstones even though the original record no longer exists.

A future provider layer can therefore:

1. read pending queue items;
2. fetch current local records for upserts;
3. upload tombstones for deletes;
4. compare remote revisions;
5. surface conflicts to the user;
6. remove acknowledged queue entries.

v0.11 intentionally stops before step 1 reaches the network.

## v0.14 hardening

v0.14 adds a second safety layer around backup/restore and a local integrity audit.

### Backup preflight

Before restore controls are enabled, Ikigai Space now verifies:

- the backup envelope and schema metadata;
- the integrity checksum;
- that every known table is an array when present;
- that every record has the expected string primary key;
- that a table does not contain duplicate primary keys;
- that serialized Vault attachment markers are structurally valid.

Restore performs the checksum and table-structure checks again before writing. Attachment blobs are decoded **before** the write transaction begins. Replace mode therefore cannot clear the current dataset and then discover a malformed attachment halfway through decoding.

All user-data table writes happen inside one Dexie transaction. Old roadmap backups that contain checkpoints without phase rows are repaired in the prepared restore payload so those compatibility records are written in the same transaction.

Sync queue / manifest rebuilding remains secondary metadata. If that maintenance step fails after a successful restore, Ikigai Space reports the restore as successful and asks the user to rebuild diagnostics later instead of claiming the user dataset failed to restore.

### Local integrity audit

Settings → Backup & restore now includes a read-only **Check local data** action. It checks structural relationships such as:

- active Settings and Garden singleton rows;
- task → project links;
- memory → task links;
- Vault attachment → memory links and attachment metadata;
- roadmap checkpoint → phase / project links;
- proof → project / roadmap links;
- obviously invalid task/day/roadmap dates.

The audit never changes data. **Repair safe issues** is separate and only performs repairs that preserve the underlying user record or file. For example, orphaned Vault files are placed into recovered placeholder memories instead of being deleted. Ambiguous date corruption and unexpected extra singleton rows are reported for review rather than guessed away.

### UI crash recovery

A top-level React error boundary now provides a local recovery screen for render failures. It offers reload, Settings, and a best-effort backup download. Crash details are logged only to the local browser console; Ikigai Space does not send telemetry or crash reports automatically.

### Referential delete safety

Destructive operations that keep related records now clear stale references transactionally. Roadmap checkpoint / phase deletion preserves Proof items but removes links to the deleted checkpoints, and Calendar clearing preserves Memory Vault entries while removing links to tasks being erased.

## v0.16 onboarding safety

First-run completion is now finalized as one local transaction across Settings, the initial Garden singleton, any valid protected-date milestones, and their sync-queue records.

This means a storage failure cannot leave onboarding marked complete while only part of the user's protected dates were written. Blank or invalid date rows are ignored before the transaction begins, and onboarding still never creates a task automatically.

Settings → **Preview welcome tour** is non-persistent. Theme and paper choices can be previewed visually, but closing the preview does not write settings, milestones, Garden data, or tasks.


## v0.31.4 First Light privacy disclosure

First Light now explains the storage boundary before asking for optional personalization. Core life data and ordinary preferences are stored in the current browser profile through IndexedDB. Ikigai Space does **not** currently add its own encryption-at-rest layer to that database. Device, operating-system, browser-profile or full-disk encryption may protect the underlying storage, but those protections are outside Ikigai Space and vary by platform.

Portable Ikigai Space backups are readable JSON files. Their SHA-256 checksum is an integrity mechanism used to detect corruption/tampering; it is **not encryption** and does not make the backup confidential. Users who need encrypted backup-at-rest should protect the exported file with an external encrypted volume/archive or device storage.

The welcome flow deliberately does not ask for passwords, remote AI API keys, Spotify tokens or other provider credentials. Those connection-specific secrets keep their existing separate session/local-storage rules and remain outside portable backups.

The optional preferred name added in v0.31.4 is an ordinary Settings field. It is used for local greetings, can be left blank, follows normal Settings backup/restore behavior, and does not create an account or identity profile.

## v0.20 Companion credentials

Remote API keys are intentionally outside the IndexedDB life-data model and outside backup/restore.

The default remains session-only browser storage. If the user explicitly enables **Remember key on this device**, Ikigai Space stores that key in the current browser's local storage so it can survive a browser restart. This is a convenience trade-off, not an encrypted secret vault: browser scripts running on the same origin can access browser storage. The UI therefore warns against enabling it on a shared computer.

- The key is never written to Companion messages or planning context.
- The key is never exported by Ikigai Space backup.
- Clearing the key removes both session and remembered forms.
- **Reset all Ikigai Space data** also clears the remembered credential.
- If persistent browser storage is blocked, Ikigai Space falls back to session storage instead of failing the whole Companion setup.

## Sanctuary depth data · v0.23

Sanctuary day/night is calculated only from the device's local clock. It does not request location, weather or network data.

World atmosphere, audio preferences and rendering quality are stored in the existing local Settings record. Optional discoveries store only small fixed IDs such as `old-cairn`; no Memory Vault body, task note, Companion message, attachment content or provider credential is copied into discovery state.

Sanctuary ambience and interaction tones are generated locally with the browser Web Audio API. No audio stream, microphone access or remote sound service is used.

## Familiar data and privacy · v0.24

The Familiar rework adds only ordinary local preference fields to the existing Settings record: display name, nook side, reaction/play/context toggles and optional interaction-sound preference. These settings follow the same local backup/restore behavior as other appearance preferences.

The **Together** surface uses a fixed route-to-context map in local code. Opening it does not call Ollama, Gemini or another remote provider, and it does not read Memory Vault bodies, attachments or Companion history to invent ambient reactions.

Completing a task may dispatch an in-browser event that produces a short visual Familiar reaction. The event does not contain task notes or send anything to a provider. Familiar play interactions likewise remain local and are not logged as progress, streaks or achievements.

The 3D Sanctuary Familiar shares appearance/presence settings only. It does not receive private Memory text or provider credentials. API keys remain governed by the v0.20 credential rules and remain outside backups.


## v0.29 — Focus timer state

Focus Room adds one IndexedDB singleton named `focusTimer`. It stores the selected focus/rest duration, paused/running state, the optional short intention, notification preference, and — while running — the real wall-clock end timestamp.

The active countdown is intentionally **device-local**. It is not added to the sync queue and is not exported in portable backup files, so restoring a backup on another device cannot unexpectedly start or resume an in-flight timer there. Full **Reset all Ikigai Space data** still deletes it because the whole IndexedDB database is removed.

Running timers are calculated from the stored end timestamp instead of counting browser interval ticks, so throttled/background tabs do not stretch a session. Same-origin tabs mirror timer changes through an in-browser channel. Completion notifications require explicit browser permission, contain only generic focus/rest completion text, and never expose the optional intention. Browsers that require service-worker notifications use the registered PWA worker when available. If the app is fully closed, v0.29 does not claim to provide an operating-system background alarm; the timer settles from the real timestamp the next time the app can run.

## v0.30 — Now Playing provider credentials

Now Playing starts with an opt-in Spotify integration using Authorization Code with PKCE. Ikigai Space does not ask for or store a Spotify client secret. The ordinary non-secret connection preferences — provider choice, Spotify client ID, playback-control preference, and Familiar music-presence preference — live in the existing Settings record and therefore follow normal backup/restore behavior.

Spotify OAuth access/refresh tokens are different: they are never written to IndexedDB, the sync queue, or portable backups. By default they live only in browser session storage. If the user explicitly enables **Remember this connection on this device**, the tokens are stored in the current origin's browser local storage so the provider connection can survive a restart. Browser local storage is not encrypted by Ikigai Space; remembered provider connections should not be enabled on shared or untrusted devices. **Reset all Ikigai Space data** clears both session and remembered Spotify credentials.

The read-only connection asks only for playback-state/current-item access. Playback modification is a separate opt-in permission requested only when the user enables controls. Ikigai Space does not request Spotify profile, email, library, playlist, listening-history, or Web Playback streaming scopes. The integration reads provider metadata and sends permitted control commands to the user's existing Spotify client; it does not capture or stream provider audio.

The Familiar's music presence is driven only by the boolean active-playback state. Ikigai Space does not request audio-analysis data, inspect waveforms/tempo/beats, or synchronize visual animation to Spotify content.

## v0.33 native candidate — Windows System Media

The Windows-native v0.33 line adds **Windows System Media** as the preferred Now Playing source. This source is deliberately local and transient: the Tauri backend asks Windows for the current system media session, returns only bounded playback metadata needed for the Now Playing surface, and does not create a listening-history database. Title, artist/album context, source application identity, playing state and timeline values stay in the in-memory Now Playing runtime and are not added to IndexedDB, sync records, portable backups or provider-token storage.

System media is not enabled silently. The user explicitly chooses it in the Source dialog. Metadata reading and playback control are separate permissions inside Ikigai Space: **playback controls default to off**. When controls are enabled, Ikigai Space accepts only play, pause, next and previous, checks whether Windows reports the specific action as available, and revalidates the active source application immediately before sending the command so a stale UI cannot casually control a different media app. The source identity used for that check is ephemeral runtime data, not a persisted activity log.

Browser/PWA builds do not receive a simulated or hidden equivalent. They cannot read Windows system-wide media sessions through this path and the product states that limitation explicitly. Spotify therefore remains an advanced optional provider rather than a requirement for native Now Playing. Its existing PKCE/token-storage boundaries remain unchanged: no Client Secret, read-only access by default, controls as a separate opt-in, and provider tokens excluded from Dexie sync and portable backups.

The native media bridge does not capture microphone input, inspect audio buffers, decode media, or request listening-history data. It exposes metadata and explicit transport commands only. Turning the Now Playing source off stops the provider polling path rather than continuing to observe media in the background for product analytics.

## v0.25 — Red-team and hostile-input hardening

v0.25 treats backup files, external links and custom AI endpoints as untrusted input rather than assuming that locally entered data is safe forever.

### Restore resource limits

Before expensive restore work begins, Ikigai Space now refuses backup files above 256 MiB, payloads above 250,000 total records, pathologically deep data, and oversized serialized attachment payloads. These ceilings are intended to reduce accidental or hostile browser-memory exhaustion. They do not replace the checksum/shape/primary-key checks added in v0.14.

Imported Memory/Career URLs pass through the same HTTP/HTTPS-only sanitizer used by normal editing. Unsafe imported URLs are cleared rather than being allowed to become active links. Attachment filenames and metadata are normalized before write.

### Vault attachment defense in depth

SVG files are kept as files rather than rendered inline as images. A single Memory entry can contain at most 48 attachments. Download filenames are sanitized immediately before use as well as during restore.

### Custom AI endpoint trust

A custom remote AI endpoint must now be explicitly trusted by origin before Ikigai Space sends an API key to it. Remote endpoints require HTTPS except for loopback development endpoints, credential-bearing URLs are rejected, and common key/token/password query parameters are rejected. Credential-bearing remote requests also refuse redirects.

The trust decision is local browser metadata. Trusting a custom origin means the user is choosing to send the configured key and Companion request context to that provider. **Reset all Ikigai Space data** clears those custom trust decisions along with remembered/session credentials and tab-scoped Companion draft/failure/retry state.

### API-key limitation

Remembered API keys remain browser `localStorage`, not encrypted OS credentials. v0.25 makes this limitation explicit in the UI and adds CSP/source hardening to reduce attack surface, but it does not describe browser storage as a secure secret vault.

### Runtime product diagnostics

Settings → Data & safety now includes a local Product diagnostics pass for IndexedDB, secure context, Web Crypto, browser storage, service workers, WebGL and Web Audio. It intentionally does not inspect task text, Memory contents, attachments, Companion messages or API keys.

See `SECURITY.md` and `PRODUCT_AUDIT_V0.25.md` for the full security boundary and audit ledger.


## v0.32 Companion document ingestion

Documents attached to Familiar/Companion AI are **ephemeral request context**, not Vault attachments and not a new persistence table.

Supported inputs are PDF, Word `.docx`, Markdown and plain text. Parsing happens in the browser. The original file bytes are never written to IndexedDB, the sync queue, portable backup, local/session storage or Companion messages. Extracted text is held only in module memory until the user removes it or a model reply succeeds.

The local parser applies resource ceilings before model contact: at most three documents, 8 MiB per file, 24,000 extracted characters per document and 48,000 characters total. PDF/ZIP decompression also has per-stream/aggregate output limits. Encrypted PDFs, legacy `.doc`, macro-enabled `.docm`, unsupported compression and PDFs with no readable text fail closed. Ikigai Space does not upload documents to a conversion/OCR service.

When Ollama is selected, extracted document text stays on the loopback AI path. When Remote API is selected, the extracted text is sent to the explicitly configured/trusted endpoint with the next message; the UI states this before send. The endpoint trust/HTTPS/no-redirect rules from v0.25 still apply.

Document text is treated as hostile/untrusted content for prompt purposes. Instructions embedded inside a document cannot expand the Companion tool contract. Resulting roadmap/Career changes remain ordinary reviewable proposals and are written only after explicit approval through existing mutation helpers.

To reduce accidental persistence of CV contact details, document-derived provider output is redacted for common email/phone patterns and labeled address, birth-date and government-identifier fields before the reply/proposals are stored. This is defense in depth, not a guarantee that every possible identifier can be detected; users should still review proposals before applying them.
