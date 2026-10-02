const preloaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/TodayPage'),
  '/calendar': () => import('../pages/CalendarPage'),
  '/focus': () => import('../pages/FocusPage'),
  '/now-playing': () => import('../pages/NowPlayingPage'),
  '/garden': () => import('../pages/GardenPage'),
  '/roadmap': () => import('../pages/RoadmapPage'),
  '/reflection': () => import('../pages/ReflectionPage'),
  '/memories': () => import('../pages/MemoriesPage'),
  '/career': () => import('../pages/CareerPage'),
  '/companion': () => import('../pages/CompanionPage'),
  '/settings': () => import('../pages/SettingsPage')
};

const pending = new Map<string, Promise<unknown>>();

export function preloadRoute(path: string) {
  const load = preloaders[path];
  if (!load || pending.has(path)) return;
  const request = load().catch(error => {
    pending.delete(path);
    throw error;
  });
  pending.set(path, request);
  void request.catch(() => undefined);
}
