import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('v0.31.4 repairs the stale dark onboarding surface token', () => {
  const css = read('src/onboarding-v050.css');
  assert.doesNotMatch(css, /--ik-panel/);
  assert.match(css, /--onboarding-surface:\s*var\(--ik-surface/);
  assert.match(css, /onboarding-world \{ position:relative; overflow:auto/);
});

test('First Light is progressive, skippable and personalized without making identity mandatory', () => {
  const page = read('src/pages/OnboardingPage.tsx');
  assert.match(page, /const steps = \['Arrival', 'You', 'Chapter', 'Dates', 'Comfort', 'Familiar', 'Atmosphere', 'Paper', 'Ready'\]/);
  assert.match(page, /Skip this/);
  assert.match(page, /Preferred name or nickname/);
  assert.match(page, /No name stored · generic greetings/);
  assert.match(page, /interfaceStyle/);
  assert.match(page, /familiarActivity/);
  assert.match(page, /gardenTheme/);
  assert.match(page, /journeyCalendarTheme/);
});

test('First Light explains the actual storage/encryption boundary instead of calling integrity encryption', () => {
  const page = read('src/pages/OnboardingPage.tsx');
  const safety = read('DATA_SAFETY.md');
  assert.match(page, /does <b>not<\/b> add application-level encryption at rest/);
  assert.match(page, /SHA-256 checksums protect backup integrity; they do not hide the contents/);
  assert.match(page, /Passwords, API keys and provider tokens are deliberately not requested/);
  assert.doesNotMatch(page, /spotifyClientId|apiKey|accessToken|refreshToken/);
  assert.match(safety, /SHA-256 checksum is an integrity mechanism[\s\S]*not encryption/i);
});

test('optional profile name persists as settings data and personalizes Today only when present', () => {
  const types = read('src/types.ts');
  const settings = read('src/lib/settings.ts');
  const onboarding = read('src/lib/onboarding.ts');
  const today = read('src/pages/TodayPage.tsx');
  assert.match(types, /profileName: string/);
  assert.match(settings, /profileName: ''/);
  assert.match(settings, /normalizeProfileName/);
  assert.match(onboarding, /profileName: normalizeShortName/);
  assert.match(today, /Good evening, \$\{name\}\./);
  assert.match(today, /greetingFor\(clock, settings\?\.profileName\)/);
});
