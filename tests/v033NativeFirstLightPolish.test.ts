import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const onboarding = read('src/pages/OnboardingPage.tsx');
const onboardingCss = read('src/onboarding-v050.css');
const sanctuary = read('src/components/sanctuary/SanctuaryWorld.tsx');
const garden = read('src/pages/GardenPage.tsx');
const nowPlayingPage = read('src/pages/NowPlayingPage.tsx');
const nowPlaying = read('src/lib/nowPlaying.ts');
const tauriBridge = read('src/lib/tauriBridge.ts');
const tauriRust = read('src-tauri/src/lib.rs');
const tauriConfig = JSON.parse(read('src-tauri/tauri.conf.json')) as {
  build?: { devUrl?: string };
  app?: { withGlobalTauri?: boolean };
};
const tauriCapability = JSON.parse(read('src-tauri/capabilities/default.json')) as { permissions?: unknown[] };

test('v0.33 First Light replaces native date/select chrome with authored accessible controls', () => {
  assert.match(onboarding, /function SegmentedDateField\b/);
  assert.match(onboarding, /function MilestoneTypePicker\b/);
  assert.doesNotMatch(onboarding, /type=["']date["']/);
  assert.doesNotMatch(onboarding, /<select\b/);
  assert.match(onboarding, /parseFriendlyDate/);
  assert.match(onboarding, /onPaste=/);
  assert.match(onboarding, /aria-invalid=\{invalidDate \|\| undefined\}/);
  assert.match(onboarding, /applyIso\(dateToIso\(today\.getFullYear\(\), today\.getMonth\(\) \+ 1, today\.getDate\(\)\)\)/);
  assert.match(onboarding, /aria-haspopup="listbox"/);
  assert.match(onboarding, /event\.key === 'ArrowDown'/);
  assert.match(onboarding, /event\.key === 'Escape'/);
  assert.match(onboardingCss, /\.ik-date-segments\.is-invalid/);
});

test('v0.33 First Light previews text scale, Familiar and Paper & Time using real product components', () => {
  assert.match(onboardingCss, /arrival-copy h1[^{]*\{[^}]*--ik-text-scale/s);
  assert.match(onboarding, /<FamiliarAvatar\b/);
  assert.match(onboarding, /<DailyCalendarPreview\b/);
  assert.match(onboarding, /aria-label="Live paper and calendar preview"/);
  assert.match(onboarding, /data-preview-journey-theme=\{journeyCalendarTheme\}/);
});

test('v0.33 Sanctuary Explore stays bounded, keyboard-friendly and preserves Tea House behavior', () => {
  assert.match(sanctuary, /SANCTUARY_EXPLORE_RADIUS\s*=\s*11\.4/);
  assert.match(sanctuary, /if \(radius > SANCTUARY_EXPLORE_RADIUS\)/);
  assert.match(sanctuary, /rootRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(sanctuary, /freeExplore && event\.key === 'Escape'/);
  assert.match(sanctuary, /onFreeExploreExit\?\.\(\)/);
  assert.match(sanctuary, /event\.key\.toLowerCase\(\) === 's'/);
  assert.match(garden, /onFreeExploreExit=\{\(\) => setFreeExplore\(false\)\}/);
  assert.match(garden, /Esc to exit/);
});

test('v0.33 Spotify guide remains explicit while moving behind the advanced source path', () => {
  assert.match(nowPlayingPage, /Advanced: Spotify Web API/);
  assert.match(nowPlayingPage, /Spotify Premium is required by Spotify/i);
  assert.match(nowPlayingPage, /Authorization Code \+ PKCE/);
  assert.match(nowPlayingPage, /Do not paste the Client Secret/i);
  assert.match(nowPlayingPage, /Read-only presence/i);
  assert.match(nowPlayingPage, /cannot read the Windows system media session or other apps directly/i);
  assert.match(nowPlayingPage, /without microphone or audio capture/i);
  assert.match(nowPlayingPage, /127\.0\.0\.1/);
  assert.match(nowPlayingPage, /Development Mode/i);
});

test('v0.33 Spotify redirects respect hosted base paths and native PKCE state reaches the loopback bridge', () => {
  assert.match(nowPlaying, /import\.meta\.env\?\.BASE_URL/);
  assert.match(nowPlaying, /new URL\([^\n]*now-playing[^\n]*window\.location\.origin\)/);
  assert.match(nowPlaying, /startSpotifyOAuthLoopback\(state\)/);
  assert.match(tauriBridge, /startSpotifyOAuthLoopback\(state: string\)/);
  assert.match(tauriBridge, /start_spotify_oauth_listener', \{ state \}/);
});

test('v0.33 native Spotify callback is loopback-only, bounded and state-gated before reaching the webview', () => {
  assert.match(tauriRust, /TcpListener::bind\("127\.0\.0\.1:0"\)/);
  assert.match(tauriRust, /SPOTIFY_REQUEST_LINE_LIMIT/);
  assert.match(tauriRust, /set_read_timeout/);
  assert.match(tauriRust, /spotify_state_is_valid\(&state\)/);
  assert.match(tauriRust, /if path != SPOTIFY_CALLBACK_PATH/);
  assert.match(tauriRust, /query_value\(query, "state"\) != Some\(state\.as_str\(\)\)/);
  assert.match(tauriRust, /403 Forbidden/);
  assert.match(tauriRust, /url\.len\(\) > 4096/);
  assert.match(tauriRust, /url\.chars\(\)\.any\(char::is_control\)/);
  assert.equal(tauriConfig.build?.devUrl, 'http://127.0.0.1:5173');
  assert.equal(tauriConfig.app?.withGlobalTauri, true);
  assert.deepEqual(tauriCapability.permissions, ['core:default']);
});
