export interface PageGuideFeature {
  title: string;
  detail: string;
}

export interface PageGuideDefinition {
  path: string;
  eyebrow: string;
  title: string;
  summary: string;
  features: PageGuideFeature[];
  customize: string;
  keyboard?: string[];
}

export const pageGuides: Record<string, PageGuideDefinition> = {
  '/': {
    path: '/',
    eyebrow: 'TODAY GUIDE',
    title: 'Use the day without managing the system.',
    summary: 'Write the next task directly into the notebook, keep one short day note, and let deeper task details stay optional until you need them.',
    features: [
      { title: 'Write a task', detail: 'Use the inline task line for fast capture. Open details only when area, effort or a longer note matters.' },
      { title: 'Morning handoff', detail: 'If an older day is still open, choose what carries forward and archive the rest without rewriting your history.' },
      { title: 'Physical day page', detail: 'Optional paper physics can sit on the desk as a real tear-off calendar. Choose an authored calendar edition plus Compact, Standard or Large in Settings; both the composition and printed detail adapt. Today flexes but stays attached, while an older open page tears only after carry-forward choices are confirmed.' },
      { title: 'Near horizon', detail: 'Upcoming dated work stays visible without turning Today into a full calendar dashboard.' }
    ],
    customize: 'Today paper physics, calendar edition, size, motion and the morning handoff live in Settings → Experience. Task categories and deeper planning stay optional.',
    keyboard: ['Tab moves through notebook controls.', 'Enter submits the focused task-writing form.', 'Escape closes temporary sheets and dialogs.']
  },
  '/calendar': {
    path: '/calendar',
    eyebrow: 'JOURNEY GUIDE',
    title: 'Treat the calendar like a place, not a form.',
    summary: 'Choose a date on the physical calendar to reveal its temporary paper sheet. Tasks, notes and markers stay with that day, while a quiet thread can carry the same week into Roadmap or Reflection.',
    features: [
      { title: 'Open a date', detail: 'Click or tap a calendar day. Writable dates expose task, note and marker controls only while that date is selected.' },
      { title: 'Follow the week', detail: 'The open paper sheet can show the Roadmap chapter touching that date and reopen the matching weekly Reflection without creating duplicate records.' },
      { title: 'Turn the month', detail: 'Use the page edges or month controls. Reduced Motion keeps the same navigation without large page movement.' },
      { title: 'Desk objects', detail: 'The notebook, plant, photo frame and other desk objects are shortcuts into related Ikigai rooms.' }
    ],
    customize: 'Journey paper/theme choices live in Settings → Experience.',
    keyboard: ['Use Tab to reach dates and desk objects.', 'Alt + Left/Right turns the month.', 'Escape closes the open date sheet.']
  },
  '/focus': {
    path: '/focus',
    eyebrow: 'FOCUS GUIDE',
    title: 'Give one block a clear edge.',
    summary: 'Focus Room keeps one local timer that survives route changes, reloads and background tabs by storing the real end time instead of trusting animation ticks.',
    features: [
      { title: 'Choose a pace', detail: 'Use a 25 or 50 minute focus block, or a short rest. Focus and rest never start the next block automatically.' },
      { title: 'Name the intention', detail: 'An optional one-line intention can hold the thing this block is for without turning it into another task system.' },
      { title: 'Leave the room', detail: 'A compact timer follows you through other rooms while a session is running or paused, and opens Focus Room again in one click.' },
      { title: 'Optional end notice', detail: 'Browser notifications are opt-in and only announce that the block ended; there are no streaks, scores or repeated nudges.' }
    ],
    customize: "The timer state stays on this device. Reduced Motion removes the room's ambient animation without changing timing behavior.",
    keyboard: ['Tab reaches timer controls, presets and the intention field.', 'Enter activates the focused timer control.', 'The timer does not capture global shortcuts while you work elsewhere.']
  },
  '/now-playing': {
    path: '/now-playing',
    eyebrow: 'NOW PLAYING GUIDE',
    title: 'A glance at playback, not another dashboard.',
    summary: 'The installed Windows app can read the current Windows System Media session locally. Browser/PWA builds cannot access that native session, while Spotify remains an optional advanced provider. No listening history is stored.',
    features: [
      { title: 'Local first on Windows', detail: 'Windows System Media is the recommended native source. It reads metadata Windows already exposes, needs no Spotify developer app, Client ID or Spotify Premium, and must be enabled again on a different installation even after backup restore.' },
      { title: 'Controls stay separate', detail: 'Reading the current session and sending playback controls are different permissions inside Ikigai. Playback control is off by default and only sends actions the active media app exposes.' },
      { title: 'Spotify stays optional', detail: 'Spotify Web API setup is available as an advanced provider for people who want it, with its Premium/Development Mode requirements shown before setup.' },
      { title: 'Let the Familiar notice', detail: 'Active playback can give the Familiar a generic music pose. Ikigai does not inspect beats, waveforms or tempo and does not synchronize visual motion to audio.' }
    ],
    customize: 'Open Source to choose Windows System Media, the optional Spotify Web API provider, no source, or Familiar music presence. Browser/PWA builds explicitly explain that they cannot read Windows media sessions.',
    keyboard: ['Tab reaches the media controls and Source button.', 'Opening Source traps focus until Escape or Close returns you to the room.', 'Ikigai reads metadata only; audio keeps playing in the original media app.']
  },
  '/garden': {
    path: '/garden',
    eyebrow: 'SANCTUARY GUIDE',
    title: 'Your local progress becomes a place.',
    summary: 'Sanctuary is a spatial reflection of work already recorded elsewhere. You do not maintain a second garden database or manually place every reward.',
    features: [
      { title: 'Explore regions', detail: 'Home Grove, Moon Pond, Quiet Pavilion and The Lookout each reflect different kinds of local progress. The first-arrival walk explains the relationship without adding chores.' },
      { title: 'Sit instead of manage', detail: 'Use Sit or click an in-world bench to enter a fixed scenic view. Stillness has no timer, score, streak or productivity prompt.' },
      { title: 'Notice the world', detail: 'Achievements, discoveries and a few quiet environmental interactions live inside the landscape rather than another permanent metrics panel.' }
    ],
    customize: 'Use World settings for atmosphere, sound, rendering quality and replaying the guided walk. Familiar identity lives in Companion.',
    keyboard: ['Arrow keys orbit the camera.', '+ and − change distance.', '1–5 travel between regions.', 'R, Home or 0 resets the view.']
  },
  '/roadmap': {
    path: '/roadmap',
    eyebrow: 'ROADMAP GUIDE',
    title: 'Plan chapters, not an endless backlog.',
    summary: 'Roadmap is for larger phases and checkpoints that deserve a date range and a sense of progression. Keep ordinary daily work in Today.',
    features: [
      { title: 'Create a phase', detail: 'A phase defines the chapter, time window and intent. You own the structure; Ikigai does not seed a personal roadmap for you.' },
      { title: 'Add checkpoints', detail: 'Use checkpoints for meaningful milestones inside a phase. Optional detail can stay collapsed.' },
      { title: 'Follow the evidence trail', detail: 'A checkpoint can open its linked Career proof, and Add proof hands Career the checkpoint context without moving evidence storage into Roadmap.' }
    ],
    customize: 'Phase color/mode communicates status; it does not change the underlying task data.',
    keyboard: ['Tab reaches phase/checkpoint actions.', 'Escape closes editors and dialogs.']
  },
  '/reflection': {
    path: '/reflection',
    eyebrow: 'REFLECTION GUIDE',
    title: 'A reflection can be short and still count.',
    summary: 'Use this room to preserve what the week felt like and what deserves attention next. The week can keep its place in Journey and Roadmap without turning Reflection into a progress score.',
    features: [
      { title: 'Write what stayed with you', detail: 'A short answer is enough. Deeper prompts are optional context, not homework.' },
      { title: 'Keep the week in context', detail: 'When Roadmap context is available, Reflection shows which chapter the week sits inside and can reopen that exact week in Journey.' },
      { title: 'Keep a weekly record', detail: 'Saved reflections enrich Moon Pond in Sanctuary without exposing the text itself.' },
      { title: 'Return later', detail: 'Reflection is a record, not a streak. Missing a week does not create a penalty.' }
    ],
    customize: 'Reduced Motion and interface typography apply here from Settings.',
    keyboard: ['Tab moves through prompts and save controls.', 'Escape closes temporary dialogs.']
  },
  '/memories': {
    path: '/memories',
    eyebrow: 'MEMORY GUIDE',
    title: 'Keep the parts worth remembering.',
    summary: 'Memory Vault stores notes, links and files locally. It is intentionally separate from task completion so not every memory has to become productivity data.',
    features: [
      { title: 'Capture a memory', detail: 'A title is enough to begin. Body, tags, links and attachments are optional.' },
      { title: 'Return to its time', detail: 'Journey can open the vault at one date, and each memory can reopen the exact day or weekly Reflection without copying its private text elsewhere.' },
      { title: 'Filter later', detail: 'Use search and tags when the collection grows. Empty-filter states can be cleared in one action.' },
      { title: 'Local attachments', detail: 'Files remain in IndexedDB and are included in backups subject to data-safety limits.' }
    ],
    customize: 'Backup/restore and integrity checks live in Settings → Data & safety.',
    keyboard: ['Tab reaches capture, filters and memory entries.', 'Escape closes the memory editor/detail surface.']
  },
  '/career': {
    path: '/career',
    eyebrow: 'CAREER GUIDE',
    title: 'Collect work, proof and opportunities in one place.',
    summary: 'Career is for evidence and direction: projects, proof, applications and opportunities. It should complement the Roadmap rather than duplicate it.',
    features: [
      { title: 'GitHub activity', detail: 'Optionally show recent public GitHub activity by username. v0.28 does not ask for a token and labels the view as public activity rather than a complete contribution graph.' },
      { title: 'Projects', detail: 'Track meaningful work with only the fields you need. Optional links and details can be added later.' },
      { title: 'Proof', detail: 'Preserve evidence such as links, outcomes or artifacts. Linked proof can reopen its exact Roadmap checkpoint and Journey date.' },
      { title: 'Opportunities', detail: 'Keep applications or external opportunities visible without turning them into daily tasks automatically.' }
    ],
    customize: 'Professional integrations are opt-in and arrive only through supported provider APIs; Ikigai does not scrape accounts.',
    keyboard: ['Tab reaches project/proof/opportunity actions.', 'Escape closes editors.']
  },
  '/companion': {
    path: '/companion',
    eyebrow: 'COMPANION GUIDE',
    title: 'Familiar presence and AI conversation are separate.',
    summary: 'The Familiar works locally without a model. Together notices bounded room state; Talk is the optional AI surface. PDF, Word .docx, Markdown and text can be attached ephemerally for one request, and every proposed write still waits for explicit review.',
    features: [
      { title: 'Familiar', detail: 'Edit identity, presence, play and reactions without configuring an API provider.' },
      { title: 'Document context', detail: 'Attach a roadmap or CV when you want help extracting structure. Files are parsed locally, kept only in volatile memory and cleared after a successful reply.' },
      { title: 'AI settings', detail: 'Choose Ollama, Gemini or another OpenAI-compatible endpoint. Unknown remote origins require explicit trust.' },
      { title: 'Chat history', detail: 'Conversation, retries and proposals live here. Provider errors never silently mutate your data.' }
    ],
    customize: 'Familiar identity is edited here. API keys can remain session-only or be remembered on this device when you explicitly opt in.',
    keyboard: ['In full chat, Enter sends and Shift+Enter inserts a new line.', 'Proposal actions remain explicit buttons.', 'Escape closes temporary drawers.']
  },
  '/settings': {
    path: '/settings',
    eyebrow: 'SETTINGS GUIDE',
    title: 'Presentation can change without changing your history.',
    summary: 'Appearance, experience and data-safety preferences are separated so visual choices do not get mixed with backup or destructive controls.',
    features: [
      { title: 'Appearance', detail: 'Theme, interface scale, text and typography affect presentation only.' },
      { title: 'Experience', detail: 'Motion, Journey skin, guidance and welcome behavior live here.' },
      { title: 'Data & safety', detail: 'Backup, restore, diagnostics, integrity checks and reset controls stay together and explicit.' }
    ],
    customize: 'You can turn this Guide button off under Settings → Experience → Guidance.',
    keyboard: ['Use Tab to move across settings controls.', 'Arrow keys work inside native radio/select controls.', 'Escape closes temporary dialogs.']
  }
};

export const guidedRoutePaths = Object.freeze(Object.keys(pageGuides));

export function getPageGuide(pathname: string) {
  return pageGuides[pathname] ?? null;
}
