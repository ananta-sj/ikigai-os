import { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { GardenPage } from './pages/GardenPage';
import { PaperLabPage } from './pages/PaperLabPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ReflectionPage } from './pages/ReflectionPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { CareerPage } from './pages/CareerPage';
import { CompanionPage } from './pages/CompanionPage';
import { ensureSettings } from './lib/settings';

function RequireOnboarding() {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void ensureSettings().then(settings => { if (alive) setReady(settings.onboardingComplete); });
    return () => { alive = false; };
  }, []);

  if (ready === null) return <div className="onboarding-route-check"><span>生</span></div>;
  if (!ready) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: '/welcome', element: <OnboardingPage /> },
  { path: '/paper-lab', element: <PaperLabPage /> },
  {
    element: <RequireOnboarding />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <TodayPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/garden', element: <GardenPage /> },
          { path: '/roadmap', element: <RoadmapPage /> },
          { path: '/reflection', element: <ReflectionPage /> },
          { path: '/memories', element: <MemoriesPage /> },
          { path: '/career', element: <CareerPage /> },
          { path: '/companion', element: <CompanionPage /> },
          { path: '/settings', element: <SettingsPage /> }
        ]
      }
    ]
  }
]);

export default function App() { return <RouterProvider router={router} />; }

