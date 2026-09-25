export type TearSampleId = 'clean' | 'a' | 'b' | 'c';

const SAMPLE_URLS: Record<TearSampleId, string> = {
  clean: '/audio/tear/ikigai-clean-reference.ogg',
  a: '/audio/tear/reference-a.ogg',
  b: '/audio/tear/reference-b.ogg',
  c: '/audio/tear/reference-c.ogg'
};

/**
 * Sample-driven paper audio.
 *
 * The active home calendar uses `clean`, extracted from the clean foley video
 * supplied during development. Short overlapping grains follow actual binding
 * progress, so a slow tear stays audible for the full visual tear while a fast
 * pull compresses the gesture naturally.
 */
class PaperAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<TearSampleId, AudioBuffer>();
  private loading = new Map<TearSampleId, Promise<AudioBuffer | null>>();
  private activeSources = new Set<AudioBufferSourceNode>();
  private selected: TearSampleId = 'clean';
  private enabled = true;
  private tearing = false;
  private lastProgress = 0;
  private lastGrainAt = 0;

  private getContext() {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const AudioCtor = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.7;

      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -8;
      compressor.knee.value = 8;
      compressor.ratio.value = 1.8;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.12;
      this.master.connect(compressor).connect(this.context.destination);
    }
    return this.context;
  }

  private async runningContext() {
    const ctx = this.getContext();
    if (!ctx) return null;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      return ctx.state === 'running' ? ctx : null;
    } catch {
      return null;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.cancelTear();
  }

  isEnabled() { return this.enabled; }

  setSample(id: TearSampleId) {
    this.selected = id;
    void this.loadSample(id);
  }

  getSample() { return this.selected; }

  private async loadSample(id: TearSampleId) {
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const pending = this.loading.get(id);
    if (pending) return pending;

    const promise = (async () => {
      const ctx = await this.runningContext();
      if (!ctx) return null;
      try {
        const response = await fetch(SAMPLE_URLS[id]);
        if (!response.ok) throw new Error(`Failed to load tear sample ${id}`);
        const decoded = await ctx.decodeAudioData((await response.arrayBuffer()).slice(0));
        this.buffers.set(id, decoded);
        return decoded;
      } catch (error) {
        console.warn('[Ikigai] paper tear sample failed to load', error);
        return null;
      } finally {
        this.loading.delete(id);
      }
    })();

    this.loading.set(id, promise);
    return promise;
  }

  async unlock() {
    if (!this.enabled) return;
    const ctx = await this.runningContext();
    if (!ctx) return;
    void this.loadSample(this.selected);
  }

  private grain(
    ctx: AudioContext,
    buffer: AudioBuffer,
    offset: number,
    duration: number,
    rate: number,
    gainAmount: number,
    when = ctx.currentTime
  ) {
    if (!this.master) return;
    const safeDuration = Math.max(0.07, Math.min(duration, buffer.duration - 0.02));
    const maxOffset = Math.max(0, buffer.duration - safeDuration - 0.008);
    const safeOffset = Math.max(0, Math.min(offset, maxOffset));

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;

    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 120;
    high.Q.value = 0.45;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 13000;
    low.Q.value = 0.3;

    const gain = ctx.createGain();
    const attack = Math.min(0.022, safeDuration * 0.18);
    const release = Math.min(0.06, safeDuration * 0.34);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(gainAmount, when + attack);
    gain.gain.setValueAtTime(gainAmount, Math.max(when + attack, when + safeDuration - release));
    gain.gain.linearRampToValueAtTime(0.0001, when + safeDuration);

    source.connect(high).connect(low).connect(gain).connect(this.master);
    this.activeSources.add(source);
    source.onended = () => this.activeSources.delete(source);
    source.start(when, safeOffset, safeDuration * rate);
    source.stop(when + safeDuration + 0.04);
  }

  startTear(_speed: number) {
    if (!this.enabled) { this.tearing = false; return; }
    this.tearing = true;
    this.lastProgress = 0;
    this.lastGrainAt = 0;
    void this.loadSample(this.selected);
  }

  updateTear(speed: number, progress: number, releasedSegments = 1) {
    if (!this.enabled) return;
    if (!this.tearing) this.startTear(speed);
    const selected = this.selected;
    void (async () => {
      const ctx = await this.runningContext();
      const buffer = await this.loadSample(selected);
      if (!ctx || !buffer || !this.tearing) return;

      const now = ctx.currentTime;
      const p = Math.max(0, Math.min(1, progress));
      const delta = Math.max(0, p - this.lastProgress);
      this.lastProgress = Math.max(this.lastProgress, p);
      const normalizedSpeed = Math.max(0, Math.min(1, speed / 1550));

      // Deliberately overlap grains at low speed. This turns the single clean
      // recording into a continuous physical texture rather than a one-shot SFX.
      const grainDuration = 0.34 - normalizedSpeed * 0.14;
      const minSpacing = 0.085 - normalizedSpeed * 0.04;
      if (now - this.lastGrainAt < minSpacing && releasedSegments <= 1 && delta < 0.018) return;
      this.lastGrainAt = now;

      const baseOffset = p * Math.max(0.01, buffer.duration - grainDuration - 0.03);
      const count = Math.max(1, Math.min(2, releasedSegments));
      for (let i = 0; i < count; i += 1) {
        const jitter = (Math.random() - 0.5) * 0.035;
        const rate = 0.92 + normalizedSpeed * 0.16 + (Math.random() - 0.5) * 0.025;
        const volume = (0.31 + normalizedSpeed * 0.06) / Math.sqrt(count);
        this.grain(ctx, buffer, baseOffset + jitter, grainDuration, rate, volume, now + i * 0.016);
      }
    })();
  }

  finishTear(speed: number) {
    if (!this.enabled) { this.tearing = false; return; }
    const selected = this.selected;
    this.tearing = false;
    void (async () => {
      const ctx = await this.runningContext();
      const buffer = await this.loadSample(selected);
      if (!ctx || !buffer) return;
      const normalizedSpeed = Math.max(0, Math.min(1, speed / 1550));
      const duration = 0.24 + (1 - normalizedSpeed) * 0.08;
      const offset = Math.max(0, buffer.duration - duration - 0.025);
      this.grain(ctx, buffer, offset, duration, 0.97 + normalizedSpeed * 0.06, 0.24);
    })();
  }

  cancelTear() {
    this.tearing = false;
    this.lastProgress = 0;
  }

  test(id: TearSampleId = this.selected) {
    if (!this.enabled) return;
    this.selected = id;
    void (async () => {
      const ctx = await this.runningContext();
      const buffer = await this.loadSample(id);
      if (!ctx || !buffer || !this.master) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.65;
      source.connect(gain).connect(this.master);
      source.start();
    })();
  }
}

export const paperAudio = new PaperAudioEngine();
