# Ikigai Space Security Model

Ikigai Space is a local-first browser application. This document describes the security boundaries that are actually implemented as of **v0.32.0** and the limits that remain.

## Trust boundaries

### Local life data
Tasks, Daily/Day records, Journey markers, reflections, memories, roadmap records, career/proof records, achievements, Companion history/state, settings, sync metadata and Sanctuary progression live in IndexedDB on the current browser profile.

Ikigai Space does not require an account or server to use those systems.

### Remote AI is opt-in
Ollama and remote OpenAI-compatible providers are optional. Remote requests can contain the planning context selected by Companion. They do **not** receive the user's whole IndexedDB database or Memory Vault attachments.

For remote endpoints:

- HTTPS is required except for loopback `localhost` / `127.0.0.1` endpoints.
- credentials embedded in the endpoint URL are rejected;
- common API-key/token/password query parameters are rejected;
- the Gemini OpenAI-compatible origin is treated as a known provider origin;
- an arbitrary custom origin must be explicitly trusted on this browser before Ikigai Space will send an API key to it;
- API-bearing requests refuse HTTP redirects so a configured host cannot silently redirect the credential to another origin.

The trust decision itself is stored locally in browser storage and can be revoked from AI settings.

### API-key persistence
The default remote API-key mode is session-only storage. **Remember key on this device** stores the key in browser `localStorage` so it survives restarts.

That remembered key is **not encrypted by Ikigai Space**. Any script that gains execution on the same web origin could potentially read it. This is why v0.25 adds a Content Security Policy and source checks, but browser storage is not equivalent to an OS credential vault. Do not enable remembered credentials on a shared or untrusted machine.

API keys are not included in Ikigai Space backups.

## Native media bridge · v0.33 candidate

The v0.33 Windows candidate adds a narrow Tauri bridge for Now Playing instead of granting the webview broad operating-system access. The exposed system-media commands are limited to reading the current Windows media-session snapshot and, only after an in-product opt-in, requesting play, pause, next or previous. Unknown actions, oversized/control-character source identifiers and stale source identities are rejected before a transport command is sent.

The system-media snapshot is transient runtime state. It is not written to IndexedDB, sync, portable backups or a listening-history table. The bridge does not expose microphone/audio capture or arbitrary process inspection. Browser/PWA builds cannot call Windows System Media and are told that limitation explicitly.

Spotify remains a separate optional provider. Its OAuth flow uses PKCE and never asks Ikigai Space to store a Client Secret. Native loopback authorization is bound to `127.0.0.1`, uses a bounded callback request, validates OAuth state before forwarding the callback to the webview, and retains the JavaScript PKCE state check as a second validation layer. Provider tokens remain outside portable backups.

This section documents the v0.33 native candidate, not a claim of independent security certification. The Windows Rust/Tauri path still requires packaged-artifact verification on the GitHub Actions Windows runner and a real Windows acceptance pass.

## Browser hardening

v0.25 adds baseline defense-in-depth controls:

- Content Security Policy in `index.html`;
- `object-src 'none'`, `frame-src 'none'`, and `base-uri 'self'`;
- no-referrer policy;
- development/preview `X-Content-Type-Options: nosniff`;
- development/preview `Permissions-Policy` denying camera, microphone and geolocation;
- no `dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`, or direct HTML assignment in the source tree according to the static audit;
- network calls are constrained to the Companion boundary and local paper-audio sample loader by the static audit;
- browser key/value storage access is constrained to the Companion/UI/security boundary by the static audit.

**Production deployment should also send equivalent security headers from the web server/CDN.** A meta CSP is useful defense in depth but cannot express every response header.

## External links

User-authored Memory/Career URLs pass through a shared HTTP/HTTPS-only sanitizer. `javascript:`, `data:`, credential-bearing URLs, and malformed values are not rendered as active external links.

External links opened in a new tab use `noopener`, `noreferrer`, and a no-referrer policy.

Imported backups receive the same URL sanitation before records are written. The local integrity repair tool can clear unsafe legacy/imported URLs while preserving the rest of the record.

## Memory Vault attachments

v0.25 adds resource ceilings to reduce accidental or hostile browser-memory exhaustion:

- a single backup file is capped at 256 MiB before text parsing;
- backup restore is capped at 250,000 total records;
- serialized attachment payloads are size-checked before decoding;
- Memory capture is capped at 48 attachments per memory;
- SVG attachments are treated as files rather than rendered inline as images;
- download filenames are sanitized before use.

These are application safety limits, not an antivirus system. Ikigai Space does not execute uploaded files.


## Ephemeral Companion documents · v0.32

Familiar/Companion can accept PDF, Word `.docx`, Markdown and text as one-request source material. This is a separate trust boundary from Memory Vault attachments.

- files are parsed in the browser and are never executed;
- original bytes are never written to IndexedDB, sync, backups, local/session storage or Companion history;
- **Reset all Ikigai Space data** also clears any still-attached volatile Companion documents;
- the parser accepts at most three files, 8 MiB each, and bounds extracted text/decompression output;
- encrypted PDFs, legacy `.doc`, macro-enabled `.docm`, unsupported compressed archives and image-only/scanned PDFs fail closed;
- no third-party OCR/conversion service is used;
- extracted text is explicitly labeled untrusted in the AI prompt, so document-contained instructions cannot expand the tool/proposal contract;
- remote mode sends extracted text only to the already configured/trusted endpoint, while Ollama remains loopback-local;
- common email/phone patterns plus labeled address, birth-date and government-identifier fields are redacted from document-derived provider output before it is persisted as Companion history/proposals;
- document-driven writes still require ordinary explicit proposal approval and reuse existing Roadmap/Career mutation helpers.

The contact redaction is defense in depth, not a complete DLP system. A user who attaches a sensitive document to a remote model is deliberately sending its extracted text to that provider and should choose/trust that provider accordingly.

## Backup/restore

Restore remains checksum-verified and transaction-based. v0.25 adds resource preflight before expensive decoding/writes and sanitizes imported link fields and attachment metadata.

A backup is user-controlled data. Treat backups from another person or an unknown source as untrusted input.

## Runtime diagnostics

Settings → Data & safety includes **Product diagnostics**. It checks browser/platform capabilities such as IndexedDB, secure context, Web Crypto, storage, service worker support/registration, WebGL and Web Audio.

Diagnostics intentionally do not read task text, memories, attachment contents, API keys or Companion messages.

## Dependency policy

v0.25 replaces floating `latest` dependency ranges with exact version pins and adds a supported Node engine declaration. This makes installs reproducible once the lockfile is installed successfully.

Run before release:

```bash
npm ci
npm run audit:deps
npm run verify
```

The v0.25 sandbox could not reach the npm registry reliably, so a live registry vulnerability audit is **not claimed as completed** by the migration. It must be run on a networked release machine/CI.

## Reporting / release posture

Ikigai Space does not currently have a public hosted security-reporting endpoint. Until one exists, do not describe the project as independently audited or security-certified.

v0.25 is an internal hardening/red-team pass, not a penetration-test certification.
