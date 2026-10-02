import type { GardenTheme } from '../types';
import type { SanctuaryDayPeriod } from './sanctuaryDepthCore';

type AudioContextCtor = typeof AudioContext;

export type SanctuaryAudioZone = 'grove' | 'pond' | 'pavilion' | 'street' | 'lookout';

type AmbientBundle = {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
};

let context: AudioContext | null = null;
let ambient: AmbientBundle | null = null;
let ambientSignature: string | null = null;

function contextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;
}

function ensureContext() {
  if (context) return context;
  const Ctor = contextCtor();
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

function themeBaseFrequency(theme: GardenTheme) {
  switch (theme) {
    case 'moonwell': return 146.83;
    case 'aether-bloom': return 174.61;
    case 'sunhive': return 130.81;
    default: return 110;
  }
}

function periodGain(period: SanctuaryDayPeriod) {
  return period === 'night' ? .72 : period === 'dusk' ? .82 : period === 'dawn' ? .78 : .62;
}

function zoneProfile(zone: SanctuaryAudioZone) {
  switch (zone) {
    case 'pond': return { noise: .24, cutoff: 1380, drone: .032, shimmer: 410 };
    case 'pavilion': return { noise: .17, cutoff: 1040, drone: .042, shimmer: 286 };
    case 'street': return { noise: .12, cutoff: 760, drone: .055, shimmer: 196 };
    case 'lookout': return { noise: .21, cutoff: 1620, drone: .028, shimmer: 330 };
    default: return { noise: .16, cutoff: 920, drone: .05, shimmer: 246 };
  }
}

function makeNoiseBuffer(ctx: AudioContext) {
  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < channel.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * .985 + white * .015;
    channel[i] = last * .8;
  }
  return buffer;
}

export async function startSanctuaryAmbience(theme: GardenTheme, period: SanctuaryDayPeriod, zone: SanctuaryAudioZone = 'grove') {
  const signature = `${theme}:${period}:${zone}`;
  if (ambient && ambientSignature === signature && context?.state === 'running') return true;
  const ctx = ensureContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { return false; }
  }
  if (ctx.state !== 'running') return false;

  stopSanctuaryAmbience();

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.024 * periodGain(period), ctx.currentTime + .65);
  gain.connect(ctx.destination);

  const profile = zoneProfile(zone);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = Math.max(profile.cutoff, theme === 'aether-bloom' ? 1250 : theme === 'sunhive' ? 900 : 720);
  lowpass.Q.value = .35;
  lowpass.connect(gain);

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx);
  noise.loop = true;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = (theme === 'moonwell' ? profile.noise * 1.22 : profile.noise);
  noise.connect(noiseGain).connect(lowpass);

  const base = themeBaseFrequency(theme);
  const droneGain = ctx.createGain();
  droneGain.gain.value = profile.drone;
  droneGain.connect(gain);

  const droneA = ctx.createOscillator();
  droneA.type = 'sine';
  droneA.frequency.value = base;
  const droneB = ctx.createOscillator();
  droneB.type = 'sine';
  droneB.frequency.value = base * (period === 'night' ? 1.5 : 1.3333);
  const aGain = ctx.createGain(); aGain.gain.value = .16;
  const bGain = ctx.createGain(); bGain.gain.value = .07;
  droneA.connect(aGain).connect(droneGain);
  droneB.connect(bGain).connect(droneGain);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = .07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = .012;
  lfo.connect(lfoGain).connect(droneGain.gain);

  // A very quiet location colour keeps each district sonically distinct without
  // becoming a soundtrack or a second interaction system.
  const zoneTone = ctx.createOscillator();
  zoneTone.type = 'sine';
  zoneTone.frequency.value = profile.shimmer * (period === 'night' ? .75 : 1);
  const zoneToneGain = ctx.createGain();
  zoneToneGain.gain.value = zone === 'pond' ? .012 : zone === 'street' ? .008 : .006;
  zoneTone.connect(zoneToneGain).connect(lowpass);

  noise.start();
  droneA.start();
  droneB.start();
  lfo.start();
  zoneTone.start();
  ambient = { gain, sources: [noise, droneA, droneB, lfo, zoneTone], nodes: [lowpass, noiseGain, droneGain, aGain, bGain, lfoGain, zoneToneGain] };
  ambientSignature = signature;
  return true;
}

export function stopSanctuaryAmbience() {
  if (!ambient || !context) return;
  const active = ambient;
  ambient = null;
  ambientSignature = null;
  const now = context.currentTime;
  try {
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(Math.max(.0001, active.gain.gain.value), now);
    active.gain.gain.exponentialRampToValueAtTime(.0001, now + .2);
  } catch { /* no-op */ }
  window.setTimeout(() => {
    active.sources.forEach(source => { try { source.stop(); } catch { /* already stopped */ } });
    active.nodes.forEach(node => { try { node.disconnect(); } catch { /* no-op */ } });
    try { active.gain.disconnect(); } catch { /* no-op */ }
  }, 230);
}

export async function playSanctuaryTone(kind: 'artifact' | 'secret' | 'travel') {
  const ctx = ensureContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { return false; }
  }
  if (ctx.state !== 'running') return false;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === 'secret' ? .055 : .035, now + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === 'secret' ? .75 : .45));
  gain.connect(ctx.destination);

  const first = ctx.createOscillator();
  first.type = 'sine';
  first.frequency.setValueAtTime(kind === 'secret' ? 659.25 : kind === 'artifact' ? 523.25 : 392, now);
  first.frequency.exponentialRampToValueAtTime(kind === 'secret' ? 987.77 : kind === 'artifact' ? 783.99 : 523.25, now + .28);
  first.connect(gain);
  first.start(now);
  first.stop(now + .8);

  first.addEventListener('ended', () => { try { gain.disconnect(); } catch { /* no-op */ } }, { once: true });
  return true;
}
