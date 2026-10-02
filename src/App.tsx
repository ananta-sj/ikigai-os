import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useRouteError } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ensureSettings } from './lib/settings';
import { IkigaiMark } from './components/IkigaiMark';

function lazyNamed<TModule, TKey extends keyof TModule>(loader: () => Promise<TModule>, name: TKey) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[name] as unknown as ComponentType };
  });
}

const TodayPage = lazyNamed(() => import('./pages/TodayPage'), 'TodayPage');
const CalendarPage = lazyNamed(() => import('./pages/CalendarPage'), 'CalendarPage');
const GardenPage = lazyNamed(() => import('./pages/GardenPage'), 'GardenPage');
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage'), 'SettingsPage');
const OnboardingPage = lazyNamed(() => import('./pages/OnboardingPage'), 'OnboardingPage');
const ReflectionPage = lazyNamed(() => import('./pages/ReflectionPage'), 'ReflectionPage');
const MemoriesPage = lazyNamed(() => import('./pages/MemoriesPage'), 'MemoriesPage');
const RoadmapPage = lazyNamed(() => import('./pages/RoadmapPage'), 'RoadmapPage');
const CareerPage = lazyNamed(() => import('./pages/CareerPage'), 'CareerPage');
const CompanionPage = lazyNamed(() => import('./pages/CompanionPage'), 'CompanionPage');
const FocusPage = lazyNamed(() => import('./pages/FocusPage'), 'FocusPage');
const NowPlayingPage = lazyNamed(() => import('./pages/NowPlayingPage'), 'NowPlayingPage');

function RouteLoading() {
  return (
    <div className="ik-route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="ik-loading-mark" aria-hidden="true"><IkigaiMark /></span>
      <p>Opening this room…</p>
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}


function RouteErrorPage() {
  const routeError = useRouteError();
  const detail = routeError instanceof Error
    ? routeError.message
    : typeof routeError === 'string'
      ? routeError
      : 'This room could not be opened.';

  return (
    <main className="ik-crash-shell" role="alert">
      <section className="ik-crash-card">
        <span className="eyebrow">ROOM RECOVERY</span>
        <h1>This room did not open cleanly.</h1>
        <p>Ikigai kept the failure inside this route instead of replacing the whole app with the router's developer error screen.</p>
        <div className="ik-crash-actions">
          <button type="button" className="ik-button ik-button-primary" onClick={() => window.location.reload()}>Reload room</button>
          <Link className="ik-button ik-button-secondary" to="/">Return to Today</Link>
          <Link className="ik-button ik-button-quiet" to="/settings">Open Settings</Link>
        </div>
        <details className="ik-crash-details">
          <summary>Technical detail</summary>
          <code>{detail}</code>
        </details>
      </section>
    </main>
  );
}

function RequireOnboarding() {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void ensureSettings().then(settings => { if (alive) setReady(settings.onboardingComplete); });
    return () => { alive = false; };
  }, []);

  if (ready === null) return <div className="onboarding-route-check" role="status" aria-label="Loading Ikigai"><span className="ik-loading-mark" aria-hidden="true"><IkigaiMark /></span></div>;
  if (!ready) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: '/welcome', element: withSuspense(<OnboardingPage />), errorElement: <RouteErrorPage /> },
  { path: '/paper-lab', element: <Navigate to="/" replace /> },
  {
    element: <RequireOnboarding />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: withSuspense(<TodayPage />) },
          { path: '/calendar', element: withSuspense(<CalendarPage />) },
          { path: '/focus', element: withSuspense(<FocusPage />) },
          { path: '/now-playing', element: withSuspense(<NowPlayingPage />) },
          { path: '/garden', element: withSuspense(<GardenPage />) },
          { path: '/roadmap', element: withSuspense(<RoadmapPage />) },
          { path: '/reflection', element: withSuspense(<ReflectionPage />) },
          { path: '/memories', element: withSuspense(<MemoriesPage />) },
          { path: '/career', element: withSuspense(<CareerPage />) },
          { path: '/companion', element: withSuspense(<CompanionPage />) },
          { path: '/settings', element: withSuspense(<SettingsPage />) }
        ]
      }
    ]
  }
]);

export default function App() { return <RouterProvider router={router} />; }
