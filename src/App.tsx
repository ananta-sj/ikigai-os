import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { GardenPage } from './pages/GardenPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { SettingsPage } from './pages/SettingsPage';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <TodayPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/garden', element: <GardenPage /> },
      { path: '/roadmap', element: <PlaceholderPage eyebrow="ROADMAP" title="Your plan, alive." text="Exam-aware phases, ReFlow milestones, learning goals and evidence will live here." /> },
      { path: '/reflection', element: <PlaceholderPage eyebrow="REFLECTION" title="Turn weeks into chapters." text="Weekly reports and monthly retrospectives arrive after the daily loop is stable." /> },
      { path: '/memories', element: <PlaceholderPage eyebrow="MEMORY VAULT" title="Keep what mattered." text="Text, photos, files and time capsules will stay private and local by default." /> },
      { path: '/career', element: <PlaceholderPage eyebrow="CAREER" title="Proof, not promises." text="Projects, certificates, internship applications, GitHub evidence and LinkedIn output will connect here." /> },
      { path: '/settings', element: <SettingsPage /> }
    ]
  }
]);

export default function App() { return <RouterProvider router={router} />; }
