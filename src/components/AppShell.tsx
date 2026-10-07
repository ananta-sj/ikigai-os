import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ensureSettings } from '../lib/settings';
import { isLightAppTheme } from '../data/themes';
import { ensureSyncState, rebuildSyncManifest } from '../lib/sync';
import type { UserSettings } from '../types';
import { FloatingDock } from './FloatingDock';
import { GuideLayer } from './guidance/GuideLayer';
import { GlobalFocusTimer } from './GlobalFocusTimer';
import { GlobalNowPlaying } from './GlobalNowPlaying';

const CompanionPet = lazy(async () => {
  const module = await import('./CompanionPet');
  return { default: module.CompanionPet };
});

const routeLabels: Record<string, string> = {
  '/': 'Today',
  '/calendar': 'Journey',
  '/focus': 'Focus Room',
  '/now-playing': 'Now Playing',
  '/garden': 'Sanctuary',
  '/roadmap': 'Roadmap',
  '/reflection': 'Weekly Reflection',
  '/memories': 'Memory Vault',
  '/career': 'Career and Proof',
  '/companion': 'Companion',
  '/settings': 'Settings'
};

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function applyPreferences(settings: UserSettings) {
  const root = document.documentElement;
  root.dataset.ikigaiTheme = settings.appTheme;
  root.dataset.ikigaiMotion = settings.reducedMotion || prefersReducedMotion() ? 'reduced' : 'full';
  root.dataset.ikigaiUiStyle = settings.interfaceStyle;
  root.dataset.ikigaiUiScale = settings.interfaceScale;
  root.dataset.ikigaiFont = settings.interfaceFont;
  root.dataset.ikigaiTextScale = settings.interfaceTextScale;
  const lightTheme = isLightAppTheme(settings.appTheme);
  root.style.colorScheme = lightTheme ? 'light' : 'dark';

  // Installed mobile shells should visually belong to the selected Ikigai theme.
  // Browser/PWA chrome is updated from the same source of truth instead of staying
  // permanently dark while the app itself may be a light paper theme.
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name=\"theme-color\"]');
  const appBg = getComputedStyle(root).getPropertyValue('--ik-bg').trim();
  if (themeMeta && appBg) themeMeta.content = appBg;
  const appleStatusMeta = document.querySelector<HTMLMetaElement>('meta[name=\"apple-mobile-web-app-status-bar-style\"]');
  if (appleStatusMeta) appleStatusMeta.content = lightTheme ? 'default' : 'black-translucent';
}

const roomFitRoutes = new Set(['/', '/calendar', '/focus', '/now-playing']);

export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const previousPath = useRef(location.pathname);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let alive = true;
    let latestSettings: UserSettings | null = null;
    const motionMedia = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    void ensureSettings().then(async settings => {
      latestSettings = settings;
      if (alive) applyPreferences(settings);
      const state = await ensureSyncState();
      if (!state.lastManifestAt) await rebuildSyncManifest();
    }).catch(error => {
      // Sync/bootstrap maintenance must never take the shell down.
      console.warn('Ikigai shell maintenance could not finish.', error);
    });

    const onSettings = (event: Event) => {
      const settings = (event as CustomEvent<UserSettings>).detail;
      if (!settings) return;
      latestSettings = settings;
      applyPreferences(settings);
    };
    const onMotionPreference = () => {
      if (latestSettings) applyPreferences(latestSettings);
    };

    window.addEventListener('ikigai-settings-changed', onSettings);
    motionMedia?.addEventListener?.('change', onMotionPreference);
    return () => {
      alive = false;
      window.removeEventListener('ikigai-settings-changed', onSettings);
      motionMedia?.removeEventListener?.('change', onMotionPreference);
    };
  }, []);

  useEffect(() => {
    const label = routeLabels[location.pathname] ?? 'Ikigai';
    document.title = `${label} · Ikigai`;
    setAnnouncement(`${label} opened.`);

    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;

    // Room changes should open at their own beginning. Without an explicit
    // reset, navigating away from a long Settings/Memory page can leave the
    // next room inheriting the old document scroll offset.
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const frame = window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  const roomFit = roomFitRoutes.has(location.pathname);

  return (
    <div className={`app-shell living-shell${roomFit ? ' room-fit-shell' : ''}`}>
      <a className="ik-skip-link" href="#ikigai-main">Skip to main content</a>
      <FloatingDock />
      <GuideLayer />
      <GlobalFocusTimer />
      <GlobalNowPlaying />
      {location.pathname !== '/focus' ? <Suspense fallback={null}><CompanionPet /></Suspense> : null}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <main
        ref={mainRef}
        className="main-stage"
        id="ikigai-main"
        tabIndex={-1}
        aria-label={routeLabels[location.pathname] ?? 'Ikigai workspace'}
      >
        <Outlet />
      </main>
    </div>
  );
}
