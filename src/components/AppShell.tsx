import { CalendarDays, Flower2, Home, Map, NotebookPen, BriefcaseBusiness, Settings, Brain } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  ['Today', '/', Home],
  ['Journey', '/calendar', CalendarDays],
  ['Garden', '/garden', Flower2],
  ['Roadmap', '/roadmap', Map],
  ['Reflection', '/reflection', NotebookPen],
  ['Memories', '/memories', Brain],
  ['Career', '/career', BriefcaseBusiness],
  ['Settings', '/settings', Settings]
] as const;

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar glass-panel">
        <div className="brand-block">
          <span className="brand-mark">生</span>
          <div>
            <strong>Ikigai OS</strong>
            <small>local-first life system</small>
          </div>
        </div>
        <nav>
          {nav.map(([label, path, Icon]) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" /> Local data only
        </div>
      </aside>
      <main className="main-stage">
        <Outlet />
      </main>
    </div>
  );
}
