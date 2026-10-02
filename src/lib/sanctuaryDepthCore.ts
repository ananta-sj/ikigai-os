import type { GardenTheme, SanctuaryQuality, SanctuarySecretId } from '../types';
import type { SanctuaryLivingState } from './sanctuaryLivingCore';

export type SanctuaryDayPeriod = 'dawn' | 'day' | 'dusk' | 'night';

export interface SanctuaryDepthState {
  period: SanctuaryDayPeriod;
  quality: Exclude<SanctuaryQuality, 'auto'>;
  visibleSecrets: SanctuarySecretId[];
}

export function sanctuaryDayProgress(date = new Date()): number {
  const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  return Math.min(0.999999, Math.max(0, seconds / 86400));
}

export function sanctuaryDayPeriod(date = new Date()): SanctuaryDayPeriod {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export function resolveSanctuaryQuality(
  preference: SanctuaryQuality,
  lowPowerDetected: boolean
): Exclude<SanctuaryQuality, 'auto'> {
  if (preference === 'balanced' || preference === 'lush') return preference;
  return lowPowerDetected ? 'balanced' : 'lush';
}

export function visibleSanctuarySecrets(
  living: SanctuaryLivingState,
  period: SanctuaryDayPeriod
): SanctuarySecretId[] {
  const visible: SanctuarySecretId[] = ['old-cairn'];
  if ((period === 'dusk' || period === 'night') && living.moonPond.tier >= 1) visible.push('moon-moth');
  if (living.quietPavilion.memories > 0) visible.push('paper-crane');
  return visible;
}

export function sanctuaryThemeMood(theme: GardenTheme, period: SanctuaryDayPeriod) {
  const names: Record<GardenTheme, string> = {
    'verdant-sanctuary': 'Cedar rain',
    moonwell: 'Moon courtyard',
    'aether-bloom': 'Sakura mist',
    sunhive: 'Autumn tea garden'
  };
  const periods: Record<SanctuaryDayPeriod, string> = {
    dawn: 'dawn',
    day: 'daylight',
    dusk: 'dusk',
    night: 'night'
  };
  return `${names[theme]} · ${periods[period]}`;
}

export function deriveSanctuaryDepthState(
  living: SanctuaryLivingState,
  options: {
    now?: Date;
    quality: SanctuaryQuality;
    lowPowerDetected: boolean;
  }
): SanctuaryDepthState {
  const period = sanctuaryDayPeriod(options.now ?? new Date());
  return {
    period,
    quality: resolveSanctuaryQuality(options.quality, options.lowPowerDetected),
    visibleSecrets: visibleSanctuarySecrets(living, period)
  };
}
