IKIGAI OS v0.33 — VERIFY FIX V2
==================================

Why this patch exists
---------------------
The first corrective patch fixed the protected "Read-only presence" wording,
but the targeted regression gate still reported two source-contract failures:

1. Now Playing must explicitly state:
   "cannot read the Windows system media session or other apps directly"
   and must retain the no-microphone/audio-capture boundary.

2. Sanctuary must retain the source-level S-key Tea House shortcut contract.
   Free Explore still uses S for backward movement, so the Tea House shortcut
   is restored only when free Explore is OFF.

This V2 patch edits your CURRENT files in place rather than replacing them with
a stale full-file copy. It makes a timestamped backup first and verifies the
exact regression markers after writing.

HOW TO APPLY
------------

1. Extract this ZIP somewhere OUTSIDE C:\Projects\Ikigai_OS.

2. Open Command Prompt or PowerShell in:
   C:\Projects\Ikigai_OS

3. Run:

   powershell -ExecutionPolicy Bypass -File "PATH\TO\Ikigai_OS_v033_VERIFY_FIX_V2\APPLY_VERIFY_FIX_V2.ps1"

4. The script prints four PASS checks if the edit landed correctly.

5. Run the targeted regression gate:

   node --import tsx --test tests/v030NowPlaying.test.ts tests/v0319NowPlayingGlance.test.ts tests/v03120Patch07SanctuaryPlace.test.ts

6. Only if that reports fail 0, run:

   npm run verify

Do not commit yet. Visual acceptance comes after the full gate is green.

Safety
------
A backup of both touched source files is created under your Windows TEMP folder
before the edit. The script refuses to guess if the expected structural anchors
are missing.
