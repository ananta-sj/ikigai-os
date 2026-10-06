import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const types = read('src/types.ts');
const settings = read('src/lib/settings.ts');
const core = read('src/lib/nowPlayingCore.ts');
const runtime = read('src/lib/nowPlaying.ts');
const bridge = read('src/lib/tauriBridge.ts');
const page = read('src/pages/NowPlayingPage.tsx');
const mini = read('src/components/GlobalNowPlaying.tsx');
const guides = read('src/data/pageGuides.ts');
const rust = read('src-tauri/src/lib.rs');
const cargo = read('src-tauri/Cargo.toml');

test('v0.33 makes Windows System Media a real provider with read-only controls by default', () => {
  assert.match(types, /NowPlayingProvider\s*=\s*'none'\s*\|\s*'system'\s*\|\s*'spotify'/);
  assert.match(settings, /systemMediaPlaybackControls:\s*false/);
  assert.match(settings, /value === 'system' \|\| value === 'spotify'/);
  assert.match(core, /parseSystemMediaSnapshot/);
  assert.match(core, /provider:\s*'system'/);
  assert.match(core, /allowControls && Boolean\(sourceId\)/);
});

test('v0.33 native bridge uses narrow Windows system-media commands and no media history store', () => {
  assert.match(bridge, /invoke<SystemMediaSnapshot>\('read_system_media'\)/);
  assert.match(bridge, /invoke<boolean>\('control_system_media'/);
  assert.match(rust, /GlobalSystemMediaTransportControlsSessionManager::RequestAsync\(\)/);
  assert.match(rust, /async fn read_system_media\(\)/);
  assert.match(rust, /async fn control_system_media\(/);
  assert.match(rust, /matches!\(action\.as_str\(\), "play" \| "pause" \| "next" \| "previous"\)/);
  assert.match(rust, /actual_source_id != expected_source_id/);
  assert.match(rust, /TryPlayAsync\(\)/);
  assert.match(rust, /TryPauseAsync\(\)/);
  assert.match(rust, /TrySkipNextAsync\(\)/);
  assert.match(rust, /TrySkipPreviousAsync\(\)/);
  assert.doesNotMatch(settings, /systemMediaHistory|listeningHistory/);
});

test('v0.33 Windows API dependency stays target-scoped', () => {
  assert.match(cargo, /\[target\.'cfg\(target_os = "windows"\)'\.dependencies\]/);
  assert.match(cargo, /windows\s*=\s*\{\s*version\s*=\s*"0\.62\.2"/);
  assert.match(cargo, /"Media_Control"/);
});

test('v0.33 provider refreshes reject stale results and controls validate the current source', () => {
  assert.match(runtime, /let refreshEpoch = 0/);
  assert.match(runtime, /function emitIfCurrent\(epoch: number/);
  assert.match(runtime, /const epoch = \+\+refreshEpoch/);
  assert.match(runtime, /activateSystemMedia/);
  assert.match(runtime, /sendNowPlayingPlaybackAction/);
  assert.match(runtime, /item\.controlCapabilities/);
  assert.match(runtime, /controlSystemMedia\(action, item\.sourceId\)/);
});

test('v0.33 source UI recommends local Windows media and makes Spotify explicitly advanced', () => {
  assert.match(page, /Windows System Media/);
  assert.match(page, /Recommended · local/);
  assert.match(page, /No Spotify developer app, Client ID, OAuth, or Spotify Premium is required/);
  assert.match(page, /Advanced: Spotify Web API/);
  assert.match(page, /Spotify Premium is required by Spotify for current Development Mode/i);
  assert.match(page, /Ikigai does not charge for this/);
  assert.match(page, /Do not paste the Client Secret/i);
  assert.match(page, /Browser\/PWA builds cannot read the Windows system media session or other apps directly/);
  assert.match(page, /without microphone or audio capture/);
});



test('v0.33 system-media permission is device-local so backups cannot silently start native observation', () => {
  assert.match(runtime, /SYSTEM_MEDIA_DEVICE_ENABLED_KEY/);
  assert.match(runtime, /SYSTEM_MEDIA_DEVICE_CONTROLS_KEY/);
  assert.match(runtime, /systemMediaEnabledOnThisDevice\(\)/);
  assert.match(runtime, /systemMediaControlsEnabledOnThisDevice\(\)/);
  assert.match(runtime, /saved as the preferred source, but it is not enabled on this device/i);
  assert.match(runtime, /setSystemMediaDeviceConsent\(true, allowControls\)/);
  assert.match(runtime, /setSystemMediaDeviceConsent\(false\)/);
  assert.match(page, /This source was saved in Ikigai settings, but this installation has not been given local permission/i);
  assert.match(page, /systemMediaControlsEnabledOnThisDevice\(\)/);
});

test('v0.33 controls are provider-neutral and system capabilities hide unsupported buttons', () => {
  assert.match(mini, /sendNowPlayingPlaybackAction/);
  assert.match(mini, /item\.controlCapabilities\?\.\[action\] === true/);
  assert.doesNotMatch(mini, /Pause Spotify playback|Resume Spotify playback/);
  assert.match(page, /canAction\('previous'\)/);
  assert.match(page, /canAction\('next'\)/);
  assert.match(page, /canAction\(runtime\.item\.isPlaying \? 'pause' : 'play'\)/);
});

test('v0.33 Now Playing guidance distinguishes native, web and Spotify boundaries', () => {
  assert.match(guides, /Windows System Media is the recommended native source/);
  assert.match(guides, /Spotify Web API setup is available as an advanced provider/);
  assert.match(guides, /Browser\/PWA builds explicitly explain that they cannot read Windows media sessions/);
});
