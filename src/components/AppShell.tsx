import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ensureSettings } from '../lib/settings';
import { ensureSyncState, rebuildSyncManifest } from '../lib/sync';
import type { UserSettings } from '../types';
import { FloatingDock } from './FloatingDock';
import { CompanionPet } from './CompanionPet';

function applyPreferences(settings: UserSettings) {
  const root = document.documentElement;
  root.dataset.ikigaiTheme = settings.appTheme;
  root.dataset.ikigaiMotion = settings.reducedMotion ? 'reduced' : 'full';
  root.dataset.ikigaiUiStyle = settings.interfaceStyle;
  root.dataset.ikigaiUiScale = settings.interfaceScale;
  root.dataset.ikigaiFont = settings.interfaceFont;
  root.dataset.ikigaiTextScale = settings.interfaceTextScale;
  root.style.colorScheme = settings.appTheme === 'washi-sanctuary' ? 'light' : 'dark';
}

export function AppShell() {
  useEffect(() => {
    let alive = true;
    void ensureSettings().then(async settings => {
      if (alive) applyPreferences(settings);
      const state = await ensureSyncState();
      if (!state.lastManifestAt) await rebuildSyncManifest();
    });

    const onSettings = (event: Event) => {
      const settings = (event as CustomEvent<UserSettings>).detail;
      if (settings) applyPreferences(settings);
    };

    window.addEventListener('ikigai-settings-changed', onSettings);
    return () => {
      alive = false;
      window.removeEventListener('ikigai-settings-changed', onSettings);
    };
  }, []);

  return (
    <div className="app-shell living-shell">
      <FloatingDock />
      <CompanionPet />
      <main className="main-stage" id="ikigai-main">
        <Outlet />
      </main>
    </div>
  );
}
