import { db } from '../db';
import type { SyncQueueItem, UserSettings } from '../types';
import { initialGardenState } from './rewards';
import { ensureSettings } from './settings';
import { prepareOnboardingMilestones, type OnboardingDateDraft } from './onboardingCore';

export type OnboardingPreferenceInput = Pick<UserSettings,
  | 'profileName'
  | 'appTheme'
  | 'interfaceStyle'
  | 'interfaceScale'
  | 'interfaceFont'
  | 'interfaceTextScale'
  | 'reducedMotion'
  | 'showGuideButtons'
  | 'showGuideKeyboardHints'
  | 'showDailyPage'
  | 'dailyPageTheme'
  | 'journeyCalendarTheme'
  | 'chapterIntent'
  | 'focusAreas'
  | 'familiarActivity'
  | 'familiarDesign'
  | 'familiarColor'
  | 'familiarTheme'
  | 'familiarName'
  | 'familiarSide'
  | 'familiarReactions'
  | 'familiarSounds'
  | 'familiarContextHints'
  | 'familiarPlay'
  | 'gardenTheme'
  | 'sanctuaryQuality'
  | 'sanctuaryAmbientSound'
  | 'sanctuaryEffectsSound'
>;

interface CompleteOnboardingInput extends OnboardingPreferenceInput {
  importantDates: readonly OnboardingDateDraft[];
}

function normalizeShortName(value: string, fallback = '') {
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 48);
  return normalized || fallback;
}

function notifySettings(next: UserSettings) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<UserSettings>('ikigai-settings-changed', { detail: next }));
}

export async function skipOnboardingTour() {
  const current = await ensureSettings();
  const now = new Date().toISOString();
  const nextSettings: UserSettings = {
    ...current,
    onboardingComplete: true,
    onboardingCompletedAt: current.onboardingCompletedAt ?? now,
    updatedAt: now
  };

  await db.transaction('rw', db.settings, db.syncQueue, async () => {
    await db.settings.put(nextSettings);
    await db.syncQueue.put({
      id: 'settings:main', table: 'settings', recordId: 'main',
      operation: 'upsert', changedAt: now
    });
  });
  notifySettings(nextSettings);
  return nextSettings;
}

export async function completeOnboardingSetup(input: CompleteOnboardingInput) {
  const current = await ensureSettings();
  const now = new Date().toISOString();
  const milestones = prepareOnboardingMilestones(input.importantDates, now, () => crypto.randomUUID());
  const nextSettings: UserSettings = {
    ...current,
    ...input,
    profileName: normalizeShortName(input.profileName),
    familiarName: normalizeShortName(input.familiarName, 'Familiar').slice(0, 28),
    chapterIntent: input.chapterIntent.trim().slice(0, 180),
    focusAreas: Array.from(new Set(input.focusAreas)),
    onboardingComplete: true,
    onboardingCompletedAt: now,
    updatedAt: now,
    id: 'main'
  };

  await db.transaction('rw', db.settings, db.garden, db.milestones, db.syncQueue, async () => {
    const existingGarden = await db.garden.get('main');
    const queue: SyncQueueItem[] = [{
      id: 'settings:main',
      table: 'settings',
      recordId: 'main',
      operation: 'upsert',
      changedAt: now
    }];

    await db.settings.put(nextSettings);

    if (!existingGarden) {
      const garden = initialGardenState();
      await db.garden.put(garden);
      queue.push({
        id: 'garden:main',
        table: 'garden',
        recordId: 'main',
        operation: 'upsert',
        changedAt: now
      });
    }

    if (milestones.length) {
      await db.milestones.bulkAdd(milestones);
      queue.push(...milestones.map(milestone => ({
        id: `milestones:${milestone.id}`,
        table: 'milestones' as const,
        recordId: milestone.id,
        operation: 'upsert' as const,
        changedAt: now
      })));
    }

    await db.syncQueue.bulkPut(queue);
  });

  notifySettings(nextSettings);
  return { settings: nextSettings, milestones };
}
