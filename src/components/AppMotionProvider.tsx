import { MotionConfig } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { systemPrefersReducedMotion } from '../hooks/useReducedMotionPreference';
import { ensureSettings } from '../lib/settings';
import type { UserSettings } from '../types';

export function AppMotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(systemPrefersReducedMotion);

  useEffect(() => {
    let alive = true;
    let forceReduced = false;
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    const update = () => {
      if (alive) setReduced(forceReduced || Boolean(media?.matches));
    };

    void ensureSettings().then(settings => {
      forceReduced = settings.reducedMotion;
      update();
    }).catch(() => {
      // Motion safety can fall back to the operating-system preference.
      update();
    });

    const onSettings = (event: Event) => {
      const settings = (event as CustomEvent<UserSettings>).detail;
      if (!settings) return;
      forceReduced = settings.reducedMotion;
      update();
    };

    window.addEventListener('ikigai-settings-changed', onSettings);
    media?.addEventListener?.('change', update);
    return () => {
      alive = false;
      window.removeEventListener('ikigai-settings-changed', onSettings);
      media?.removeEventListener?.('change', update);
    };
  }, []);

  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>;
}
