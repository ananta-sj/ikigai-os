import { db } from '../db';
import { normalizePaperTheme } from '../data/paperThemes';
import { normalizeTaskCategories } from '../data/categories';
import { defaultGardenTheme, normalizeGardenTheme } from '../data/gardenThemes';
import type { FocusCustomQuote, SanctuarySecretId, UserSettings } from '../types';
import { queueSyncChange } from './sync';

export const defaultSettings: UserSettings = {
  id: 'main',
  profileName: '',
  appTheme: 'midnight-grove',
  interfaceStyle: 'soft',
  interfaceScale: 'balanced',
  interfaceFont: 'theme',
  interfaceTextScale: 'default',
  familiarEnabled: true,
  familiarActivity: 'calm',
  familiarDesign: 'sprout',
  familiarColor: 'mint',
  familiarTheme: 'natural',
  familiarName: 'Familiar',
  familiarSide: 'right',
  familiarPosition: null,
  familiarReactions: true,
  familiarSounds: false,
  familiarContextHints: true,
  familiarPlay: true,
  showGuideButtons: true,
  showGuideKeyboardHints: true,
  careerGithubUsername: '',
  nowPlayingProvider: 'none',
  spotifyClientId: '',
  spotifyPlaybackControls: false,
  familiarMusicPresence: true,
  gardenTheme: defaultGardenTheme,
  sanctuaryQuality: 'auto',
  sanctuaryAmbientSound: false,
  sanctuaryEffectsSound: false,
  sanctuaryDiscoveries: [],
  sanctuaryIntroSeen: false,
  showDailyPage: true,
  todayPaperPhysics: false,
  dailyCalendarSize: 'standard',
  dailyPageTheme: 'himekuri',
  journeyCalendarTheme: 'nihon-sakura',
  showMiniMonth: true,
  reducedMotion: false,
  focusQuotes: true,
  focusQuoteMode: 'shuffle',
  focusQuoteSide: 'right',
  focusQuoteSingleId: 'epictetus-suddenly',
  focusCustomQuotes: [],
  tearSound: true,
  onboardingComplete: false,
  chapterIntent: '',
  focusAreas: [],
  updatedAt: new Date().toISOString()
};



function normalizeDailyCalendarSize(value: unknown): UserSettings['dailyCalendarSize'] {
  return value === 'compact' || value === 'large' ? value : 'standard';
}

function normalizeProfileName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 48);
}

const sanctuarySecretIds = new Set<SanctuarySecretId>(['old-cairn', 'moon-moth', 'paper-crane']);

function normalizeSanctuaryDiscoveries(value: unknown): SanctuarySecretId[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is SanctuarySecretId => typeof item === 'string' && sanctuarySecretIds.has(item as SanctuarySecretId))));
}

function normalizeSanctuaryQuality(value: unknown): UserSettings['sanctuaryQuality'] {
  return value === 'balanced' || value === 'lush' ? value : 'auto';
}


function normalizeFocusQuoteMode(value: unknown, legacyEnabled: unknown): UserSettings['focusQuoteMode'] {
  if (value === 'shuffle' || value === 'single' || value === 'off') return value;
  return Boolean(legacyEnabled) ? 'single' : 'off';
}

function normalizeFocusQuoteSide(value: unknown): UserSettings['focusQuoteSide'] {
  return value === 'left' ? 'left' : 'right';
}

function normalizeFocusQuoteSingleId(value: unknown) {
  if (typeof value !== 'string') return 'epictetus-suddenly';
  const trimmed = value.trim().slice(0, 100);
  return trimmed || 'epictetus-suddenly';
}

function normalizeFocusCustomQuotes(value: unknown): FocusCustomQuote[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const quotes: FocusCustomQuote[] = [];
  for (const item of value.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<FocusCustomQuote>;
    const text = typeof candidate.text === 'string' ? candidate.text.trim().replace(/\s+/g, ' ').slice(0, 240) : '';
    const author = typeof candidate.author === 'string' ? candidate.author.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
    if (!text || !author) continue;
    const rawId = typeof candidate.id === 'string' ? candidate.id.trim().slice(0, 100) : '';
    const id = rawId || `custom-${quotes.length + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    quotes.push({
      id,
      text,
      author,
      createdAt: typeof candidate.createdAt === 'string' && candidate.createdAt ? candidate.createdAt : new Date(0).toISOString()
    });
  }
  return quotes;
}

function normalizeFamiliarName(value: unknown) {
  if (typeof value !== 'string') return 'Familiar';
  const trimmed = value.trim().replace(/\s+/g, ' ').slice(0, 28);
  return trimmed || 'Familiar';
}

function normalizeFamiliarSide(value: unknown): UserSettings['familiarSide'] {
  return value === 'left' ? 'left' : 'right';
}


function normalizeFamiliarPosition(value: unknown): UserSettings['familiarPosition'] {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { x?: unknown; y?: unknown };
  const x = typeof candidate.x === 'number' && Number.isFinite(candidate.x) ? candidate.x : NaN;
  const y = typeof candidate.y === 'number' && Number.isFinite(candidate.y) ? candidate.y : NaN;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.min(.95, Math.max(.05, x)),
    y: Math.min(.94, Math.max(.06, y))
  };
}


function normalizeGitHubUsernameSetting(value: unknown) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/^@/, '').slice(0, 39);
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(normalized) ? normalized : '';
}

function normalizeSpotifyClientIdSetting(value: unknown) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return /^[A-Za-z0-9]{8,80}$/.test(normalized) ? normalized : '';
}

function normalizeNowPlayingProvider(value: unknown): UserSettings['nowPlayingProvider'] {
  return value === 'spotify' ? 'spotify' : 'none';
}

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
      profileName: normalizeProfileName(existing.profileName),
      chapterIntent: existing.chapterIntent ?? '',
      focusAreas: normalizeTaskCategories(existing.focusAreas),
      dailyPageTheme: normalizePaperTheme(existing.dailyPageTheme),
      gardenTheme: normalizeGardenTheme(existing.gardenTheme),
      familiarEnabled: existing.familiarEnabled !== false,
      familiarName: normalizeFamiliarName(existing.familiarName),
      familiarSide: normalizeFamiliarSide(existing.familiarSide),
      familiarPosition: normalizeFamiliarPosition(existing.familiarPosition),
      familiarReactions: existing.familiarReactions !== false,
      familiarSounds: Boolean(existing.familiarSounds),
      familiarContextHints: existing.familiarContextHints !== false,
      familiarPlay: existing.familiarPlay !== false,
      showGuideButtons: existing.showGuideButtons !== false,
      showGuideKeyboardHints: existing.showGuideKeyboardHints !== false,
      careerGithubUsername: normalizeGitHubUsernameSetting(existing.careerGithubUsername),
      nowPlayingProvider: normalizeNowPlayingProvider(existing.nowPlayingProvider),
      spotifyClientId: normalizeSpotifyClientIdSetting(existing.spotifyClientId),
      spotifyPlaybackControls: Boolean(existing.spotifyPlaybackControls),
      familiarMusicPresence: existing.familiarMusicPresence !== false,
      sanctuaryQuality: normalizeSanctuaryQuality(existing.sanctuaryQuality),
      sanctuaryAmbientSound: Boolean(existing.sanctuaryAmbientSound),
      sanctuaryEffectsSound: Boolean(existing.sanctuaryEffectsSound),
      sanctuaryDiscoveries: normalizeSanctuaryDiscoveries(existing.sanctuaryDiscoveries),
      sanctuaryIntroSeen: Boolean(existing.sanctuaryIntroSeen),
      todayPaperPhysics: Boolean(existing.todayPaperPhysics),
      dailyCalendarSize: normalizeDailyCalendarSize(existing.dailyCalendarSize),
      focusQuoteMode: normalizeFocusQuoteMode(existing.focusQuoteMode, existing.focusQuotes),
      focusQuoteSide: normalizeFocusQuoteSide(existing.focusQuoteSide),
      focusQuoteSingleId: normalizeFocusQuoteSingleId(existing.focusQuoteSingleId),
      focusCustomQuotes: normalizeFocusCustomQuotes(existing.focusCustomQuotes),
      focusQuotes: normalizeFocusQuoteMode(existing.focusQuoteMode, existing.focusQuotes) !== 'off'
    };

    const missingKeys = Object.keys(defaultSettings).some(key => !(key in existing));
    const migratedProfileName = existing.profileName !== merged.profileName;
    const migratedPaperTheme = existing.dailyPageTheme !== merged.dailyPageTheme;
    const migratedDailyCalendarSize = existing.dailyCalendarSize !== merged.dailyCalendarSize;
    const migratedFocusAreas = JSON.stringify(existing.focusAreas ?? []) !== JSON.stringify(merged.focusAreas);
    const migratedGardenTheme = existing.gardenTheme !== merged.gardenTheme;
    const migratedFamiliarName = existing.familiarName !== merged.familiarName;
    const migratedFamiliarSide = existing.familiarSide !== merged.familiarSide;
    const migratedFamiliarPosition = JSON.stringify(existing.familiarPosition ?? null) !== JSON.stringify(merged.familiarPosition);
    const migratedCareerGithub = existing.careerGithubUsername !== merged.careerGithubUsername;
    const migratedSpotifyClientId = existing.spotifyClientId !== merged.spotifyClientId;
    const migratedNowPlayingProvider = existing.nowPlayingProvider !== merged.nowPlayingProvider;
    const migratedSanctuaryQuality = existing.sanctuaryQuality !== merged.sanctuaryQuality;
    const migratedSanctuaryDiscoveries = JSON.stringify(existing.sanctuaryDiscoveries ?? []) !== JSON.stringify(merged.sanctuaryDiscoveries);
    const migratedFocusQuotes = existing.focusQuoteMode !== merged.focusQuoteMode || existing.focusQuoteSide !== merged.focusQuoteSide || existing.focusQuoteSingleId !== merged.focusQuoteSingleId || JSON.stringify(existing.focusCustomQuotes ?? []) !== JSON.stringify(merged.focusCustomQuotes) || existing.focusQuotes !== merged.focusQuotes;
    if (missingKeys || migratedProfileName || migratedPaperTheme || migratedDailyCalendarSize || migratedFocusAreas || migratedGardenTheme || migratedFamiliarName || migratedFamiliarSide || migratedFamiliarPosition || migratedCareerGithub || migratedSpotifyClientId || migratedNowPlayingProvider || migratedSanctuaryQuality || migratedSanctuaryDiscoveries || migratedFocusQuotes || legacyNeedsOnboardingDecision) await db.settings.put(merged);
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
