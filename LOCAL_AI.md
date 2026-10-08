# Ikigai Space — Companion pet / agent architecture (v0.12.4)

The Companion is now presented as a small persistent pet, but the important part is its control model: it can draft plans and structured changes without silently acting on them.

```text
Ikigai Space local data
      ↓
limited context builder
      ↓
provider adapter
   ↙        ↘
Ollama      Remote chat API
(local)     (user-supplied endpoint/key)
   ↘        ↙
structured JSON proposals
      ↓
validator
      ↓
review UI
      ↓
explicit user approval
      ↓
existing Ikigai Space mutation helpers / IndexedDB
```

## Provider choices

### Ollama

- restricted to localhost / loopback addresses;
- model discovery uses the existing local Ollama API;
- no Ikigai Space planning context leaves the device.

### Remote API

- the user supplies a full HTTPS chat endpoint, model name and API key;
- the request follows a common chat-completions style (`model` + `messages`);
- browser CORS policy still applies, so not every provider permits direct browser calls;
- the API key is stored only in `sessionStorage` for the current browser tab;
- the key is not stored in IndexedDB, portable backups or sync metadata.

Remote mode sends only the same bounded planning context shown by the Companion, plus the user's message and any document text visibly attached to that send.

## Data included

Depending on the selected context window, the Companion can receive:

- incomplete/overdue/upcoming tasks;
- recently completed tasks;
- upcoming milestones;
- user-created roadmap phases and unfinished checkpoints;
- recent day-note text;
- the current weekly reflection;
- active projects;
- open career opportunities.

## Data excluded

- Memory Vault entries;
- Memory Vault attachments and arbitrary app files;
- Companion documents unless the user explicitly attaches one to the current message;
- backup files;
- sync/device diagnostics;
- API keys.

## Agent actions

The Companion may propose:

- `move-task`
- `unschedule-task`
- `create-task`
- `create-roadmap-phase`
- `create-roadmap-item`
- `create-career-project`
- `create-proof-item`

This is enough for prompts such as “plan my next month”: the model can draft a small set of roadmap phases, checkpoints and scheduled tasks.

It still cannot directly:

- mark work complete;
- delete data;
- tear/close Daily Pages;
- edit memories;
- change settings;
- alter the Garden;
- silently apply any proposal.

New phases are normalized first, so checkpoint proposals can reference phases created in the same response. The UI applies selected proposals in dependency-safe order.

## Why the pet is not a hidden autonomous agent

The pet is a persistent interface to Ikigai Space's planning layer, not an unrestricted tool runner. Its visual presence can become more expressive later, but the product rule remains: **the model drafts; the human commits.**

## v0.12.5 — Living Familiar

The persistent familiar is an interface layer over the same Companion agent; it is not a second AI system.

- Click: opens a compact conversation surface in the current room.
- Drag: temporarily parks the familiar at a chosen screen position.
- Expand: opens the full Companion room for provider configuration and proposal review.
- States: sleeping, idle, thinking, waiting-for-approval.
- Activity preference: lively, calm, still, hidden.
- Reduced Motion overrides roaming and decorative animation.

The mini chat intentionally does not apply agent proposals. Proposal approval remains in the full Companion room so consequential changes stay visible and deliberate.

A later contextual-agent pass can make UI objects explicit drop targets (tasks, Journey dates, roadmap phases, projects) without changing this approval model.

## v0.12.6 — Familiar-anchored chat

The compact chat surface now belongs spatially to the Familiar rather than behaving like an unrelated floating panel.

- Opening chat scores nearby pet perches and bubble directions against viewport bounds and important physical UI objects (Daily Page, Journey calendar, Roadmap sheet, Career project surfaces).
- When needed, the Familiar briefly hops to the lowest-conflict perch before opening the bubble.
- The bubble carries a visual tail back to the Familiar and uses the Familiar as its animation origin.
- The offline state is intentionally minimal: one status sentence and one connect action.
- Connected mini-chat shows only the latest response, pending-proposal link, and composer; configuration and approval remain in the full Companion room.
- Clicking outside or pressing Escape collapses the bubble.
- On narrow screens the interaction becomes a compact bottom sheet instead of forcing an awkward pet-anchored popup.
- Reduced Motion keeps the same interaction without decorative movement.

The design rule is: **the chat follows the Familiar; the Familiar does not merely open a chat window.**

## v0.12.8 — Proposal + provider hardening

The remote Gemini path now requests the same Companion proposal schema through the OpenAI-compatible structured-output field when the endpoint/model is recognized as Gemini. The existing JSON prompt remains the compatibility fallback when a Gemini-compatible endpoint rejects that parameter.

Proposal approval is deliberately split by surface:

- Familiar mini-chat: shows **Review & apply** and never silently commits a model suggestion.
- Full Companion: each pending proposal has a direct **Apply** action plus batch **Apply selected**.
- Conversational `yes` / `yep`: only commits one pending proposal from the latest proposal-bearing Companion reply; older pending changes require the review UI or the explicit `apply all` phrase.

Transient 429/502/503/504 responses use bounded backoff. Provider JSON is parsed for a useful code/message but the normal UI receives a friendly Ikigai Space error presentation rather than the raw response body.

## v0.12.9 Companion UI continuity
The Familiar overlay and the full Companion Chat history share one browser-tab draft/failure state. Unsent text is not treated as a conversation message and is cleared only after a successful provider response. Provider failures remain friendly/retryable and follow the user into the full Chat history view instead of leaving the two surfaces out of sync.

The Companion room now separates Familiar appearance, model/endpoint configuration, and Chat history. These are UI sections only; the agent safety contract is unchanged: model-proposed mutations still require explicit user approval before local data is written.

## v0.12.10 — Bounded auto-retry + Familiar send shortcut
Remote API requests now automatically retry transient network/timeout failures as well as retryable 429/502/503/504 responses. The retry budget is deliberately bounded to four total attempts with exponential backoff; short `Retry-After` values are respected, while long cooldowns fall back to the existing manual Retry action instead of leaving the UI stuck for an extended period. No user or assistant message is persisted until a complete model reply validates, so these automatic retries do not duplicate conversation entries.

In the Familiar overlay composer, **Shift+Enter sends** while plain Enter remains available for a new line. The full Companion composer keeps its existing shortcut behaviour.

## v0.12.11 retry visibility

Remote API retry is bounded and visible. During a transient 429, 502, 503, 504, network failure, or timeout, Companion can retry automatically up to four total attempts. The Familiar and full Chat history show the next attempt while waiting. Gemini/Google JSON `RetryInfo.retryDelay` and ordinary `Retry-After` headers are respected when they fit inside the bounded retry window. If the provider remains unavailable, Ikigai Space stops automatically and leaves the prompt intact with a manual Retry action.

## v0.24 — Familiar and Companion are deliberately separate layers

v0.24 replaces the old roaming pet + anchored mini-chat model.

The Familiar now exists even with no model configured. Its **Together** mode provides local room context, navigation and optional play without making any provider request. **Talk** is the explicit AI surface and reuses the same Companion draft, retry and proposal pipeline as Chat history.

- Provider/model configuration remains in **AI settings**.
- Proposal review remains in **Chat history** and still requires explicit approval.
- Gemini/remote errors affect Talk only; the character does not become sad, sick, hungry or distressed because a provider failed.
- Room context hints are deterministic local copy. They are not generated by the model and do not expand the planning context sent to the provider.
- The 3D Sanctuary resident shares the same character settings and can open the same Together panel.

This supersedes the v0.12.5/v0.12.6 interaction model. Those sections remain in this file as historical migration notes, not current product behavior.

## v0.25 — Remote endpoint trust boundary

Remote OpenAI-compatible mode now separates **configuration** from **trust**.

Known Gemini OpenAI-compatible endpoints can be used normally. A custom remote origin must first be explicitly trusted in Companion → AI settings before Save & test or a model request can send an API key to that origin.

Ikigai Space rejects:

- remote plain-HTTP endpoints except `localhost` / `127.0.0.1`;
- usernames/passwords embedded in endpoint URLs;
- common API-key/token/password query parameters;
- redirects on credential-bearing remote requests.

This is not a statement that a trusted custom provider is safe. It makes the destination explicit and user-approved instead of silently accepting any arbitrary origin.

Remembered API keys remain convenience storage in browser local storage. They are not encrypted by Ikigai Space and should not be remembered on shared/untrusted machines. They remain excluded from backup/export.


## v0.32 — Ephemeral document context

Companion Talk and full Chat can accept a small, explicit document set for one request: PDF, Word `.docx`, Markdown and plain text.

The safety boundary is intentionally different from Memory Vault attachments:

- the browser parses the document locally;
- the original file bytes are never written to IndexedDB, sync state, backups or Companion history;
- extracted text lives only in volatile page memory and is cleared after a successful model response;
- failed requests keep the attachment visible so the user can retry or remove it deliberately;
- Remote API mode sends the extracted text to the already trusted endpoint with that one message, while Ollama keeps the request on the local loopback connection;
- the request is capped to three files, 8 MiB per file, 24,000 extracted characters per file and 48,000 characters total;
- encrypted/password-protected PDFs, macro-enabled Word files, legacy `.doc`, unsupported archive compression and image-only/scanned PDFs fail closed rather than being converted through a third-party service;
- PDF/Word parsing has decompression ceilings to reduce hostile archive/PDF memory expansion.

Document text is marked as **untrusted source material** in the system prompt. Instructions embedded inside a PDF/CV are not allowed to override the user's chat request or the Companion safety contract.

Document-driven writes still use the existing proposal gate. A roadmap document can draft phases/checkpoints. A CV or portfolio can draft Career projects and proof records that are directly supported by the text. The model is instructed not to persist contact/identity fields such as email, phone, home address, date of birth or government identifiers; common email/phone patterns plus labeled address, birth-date and government-identifier fields are also redacted from document-derived model output before it is saved to Companion history.

The attachment itself is never treated as stored proof. If the user wants a resume/certificate artifact to live in Ikigai Space, they must explicitly keep it through the ordinary Career/Memory flows.
