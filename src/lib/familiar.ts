import type { FamiliarActivity } from '../types';

export const FAMILIAR_OPEN_EVENT = 'ikigai-familiar-open';
export const FAMILIAR_REACTION_EVENT = 'ikigai-familiar-reaction';

export type FamiliarPanelMode = 'together' | 'talk';
export type FamiliarReactionKind = 'task-completed' | 'proposal-ready' | 'play';

export interface FamiliarOpenDetail {
  mode?: FamiliarPanelMode;
}

export interface FamiliarReactionDetail {
  kind: FamiliarReactionKind;
}

export interface FamiliarRouteContext {
  route: string;
  label: string;
  title: string;
  detail: string;
  actions: Array<{ label: string; to: string }>;
}

const contexts: FamiliarRouteContext[] = [
  {
    route: '/',
    label: 'TODAY',
    title: 'Stay close to the next thing.',
    detail: 'The Familiar keeps this room quiet: finish what matters, then let the rest of Ikigai Space update around it.',
    actions: [
      { label: 'See the Journey', to: '/calendar' },
      { label: 'Visit Sanctuary', to: '/garden' }
    ]
  },
  {
    route: '/calendar',
    label: 'JOURNEY',
    title: 'Zoom out without turning the week into a spreadsheet.',
    detail: 'A date can carry its Roadmap chapter and weekly Reflection with it. The calendar stays the place where time is visible.',
    actions: [
      { label: 'Weekly Reflection', to: '/reflection' },
      { label: 'Back to Today', to: '/' }
    ]
  },
  {
    route: '/garden',
    label: 'SANCTUARY',
    title: 'This is the Familiar’s home in the world.',
    detail: 'The 3D resident and the page Familiar share one identity. Conversation stays optional; the world remains explorable without a model.',
    actions: [
      { label: 'Back to Today', to: '/' },
      { label: 'Open Companion', to: '/companion' }
    ]
  },
  {
    route: '/roadmap',
    label: 'ROADMAP',
    title: 'Keep the route readable.',
    detail: 'The Familiar does not create structure by itself. It can help you think through it, while every proposed write still waits for approval.',
    actions: [
      { label: 'See Career & Proof', to: '/career' },
      { label: 'Visit Sanctuary', to: '/garden' }
    ]
  },
  {
    route: '/reflection',
    label: 'REFLECTION',
    title: 'A quiet room is allowed to stay quiet.',
    detail: 'Nothing here needs to become a score. The week can open back into Journey when you want context, then return here as a sentence.',
    actions: [
      { label: 'See the Journey', to: '/calendar' },
      { label: 'Visit Moon Pond', to: '/garden' }
    ]
  },
  {
    route: '/memories',
    label: 'MEMORY VAULT',
    title: 'Keep what is worth finding again.',
    detail: 'A memory stays anchored to its day and week. The Familiar can point you through time, but private memory text never enters ambient reactions.',
    actions: [
      { label: 'Open Journey', to: '/calendar' },
      { label: 'Visit Sanctuary', to: '/garden' }
    ]
  },
  {
    route: '/career',
    label: 'CAREER & PROOF',
    title: 'Proof matters more than pressure.',
    detail: 'Use this room to keep tangible work visible. The Familiar can help draft next steps, but it does not judge momentum.',
    actions: [
      { label: 'Open Roadmap', to: '/roadmap' },
      { label: 'Visit Lookout', to: '/garden' }
    ]
  },
  {
    route: '/companion',
    label: 'COMPANION',
    title: 'Conversation is one part of the Familiar, not its whole identity.',
    detail: 'Provider settings and proposal review stay explicit here. The Familiar remains present even when no AI model is connected.',
    actions: [
      { label: 'Back to Today', to: '/' },
      { label: 'Visit Sanctuary', to: '/garden' }
    ]
  },
  {
    route: '/settings',
    label: 'SETTINGS',
    title: 'System settings live here; character settings live with the Familiar.',
    detail: 'Appearance, presence, play and local reactions are edited from Companion → Familiar so the character stays one coherent system.',
    actions: [
      { label: 'Edit Familiar', to: '/companion' },
      { label: 'Back to Today', to: '/' }
    ]
  }
];

const fallbackContext: FamiliarRouteContext = {
  route: '*',
  label: 'IKIGAI SPACE',
  title: 'I’ll stay nearby without taking over the room.',
  detail: 'The Familiar offers optional context, play and conversation. It never blocks the rest of Ikigai Space.',
  actions: [
    { label: 'Today', to: '/' },
    { label: 'Companion', to: '/companion' }
  ]
};

export function familiarRouteContext(pathname: string): FamiliarRouteContext {
  return contexts.find(context => context.route === pathname) ?? fallbackContext;
}

export function familiarPresenceCopy(activity: FamiliarActivity) {
  if (activity === 'lively') return { label: 'Playful', note: 'More expressive idle movement, still contained to its nook.' };
  if (activity === 'still') return { label: 'Quiet', note: 'Minimal autonomous motion; interactions still work.' };
  if (activity === 'hidden') return { label: 'Home only', note: 'Visible in Companion and as the 3D Sanctuary resident.' };
  return { label: 'Nearby', note: 'A calm default with occasional bounded reactions.' };
}

export function normalizeFamiliarName(value: unknown) {
  if (typeof value !== 'string') return 'Familiar';
  const trimmed = value.trim().replace(/\s+/g, ' ').slice(0, 28);
  return trimmed || 'Familiar';
}

export function openFamiliar(mode: FamiliarPanelMode = 'together') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<FamiliarOpenDetail>(FAMILIAR_OPEN_EVENT, { detail: { mode } }));
}

export function reactFamiliar(kind: FamiliarReactionKind) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<FamiliarReactionDetail>(FAMILIAR_REACTION_EVENT, { detail: { kind } }));
}
