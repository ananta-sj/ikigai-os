import { db } from '../db';
import { normalizePaperTheme } from '../data/paperThemes';
import { normalizeTaskCategories } from '../data/categories';
import type { UserSettings } from '../types';
import { queueSyncChange } from './sync';

export const defaultSettings: UserSettings = {
  id: 'main',
  appTheme: 'midnight-grove',
  interfaceStyle: 'soft',
  interfaceScale: 'balanced',
  interfaceFont: 'theme',
  interfaceTextScale: 'default',
  familiarActivity: 'calm',
  showDailyPage: true,
  dailyPageTheme: 'himekuri',
  journeyCalendarTheme: 'nihon-sakura',
  showMiniMonth: true,
  reducedMotion: false,
  tearSound: true,
  onboardingComplete: false,
  chapterIntent: '',
  focusAreas: [],
  updatedAt: new Date().toISOString()
};

function notifySettings(next: UserSettings) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<UserSettings>('ikigai-settings-changed', { detail: next }));
}

async function hasExistingLifeData() {
  const [tasks, garden, days, milestones] = await Promise.all([
    db.tasks.count(),
    db.garden.count(),
    db.dayRecords.count(),
    db.milestones.count()
  ]);
  return tasks + garden + days + milestones > 0;
}

export async function ensureSettings(): Promise<UserSettings> {
  const existing = await db.settings.get('main');
  if (existing) {
    const legacyNeedsOnboardingDecision = !('onboardingComplete' in existing);
    const legacyShouldSkip = legacyNeedsOnboardingDecision ? await hasExistingLifeData() : false;

    const merged: UserSettings = {
      ...defaultSettings,
      ...existing,
      id: 'main',
      onboardingComplete: legacyNeedsOnboardingDecision ? legacyShouldSkip : Boolean(existing.onboardingComplete),
      chapterIntent: existing.chapterIntent ?? '',
      focusAreas: normalizeTaskCategories(existing.focusAreas),
      dailyPageTheme: normalizePaperTheme(existing.dailyPageTheme)
    };

    const missingKeys = Object.keys(defaultSettings).some(key => !(key in existing));
    const migratedPaperTheme = existing.dailyPageTheme !== merged.dailyPageTheme;
    const migratedFocusAreas = JSON.stringify(existing.focusAreas ?? []) !== JSON.stringify(merged.focusAreas);
    if (missingKeys || migratedPaperTheme || migratedFocusAreas || legacyNeedsOnboardingDecision) await db.settings.put(merged);
    return merged;
  }

  const fresh = { ...defaultSettings, updatedAt: new Date().toISOString() };
  await db.settings.put(fresh);
  return fresh;
}

export async function updateSettings(patch: Partial<Omit<UserSettings, 'id'>>): Promise<UserSettings> {
  const current = await ensureSettings();
  const next: UserSettings = {
    ...current,
    ...patch,
    id: 'main',
    updatedAt: new Date().toISOString()
  };
  await db.settings.put(next);
  await queueSyncChange('settings', 'main');
  notifySettings(next);
  return next;
}
