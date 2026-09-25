import {
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Flower2,
  Home,
  Map,
  NotebookPen,
  Settings,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import type { CSSProperties, PointerEvent } from 'react';

const nav = [
  ['Today', '/', Home],
  ['Journey', '/calendar', CalendarDays],
  ['Garden', '/garden', Flower2],
  ['Roadmap', '/roadmap', Map],
  ['Reflection', '/reflection', NotebookPen],
  ['Memories', '/memories', Brain],
  ['Career', '/career', BriefcaseBusiness],
  ['Companion', '/companion', Sparkles],
  ['Settings', '/settings', Settings]
] as const;

function updateMagnet(event: PointerEvent<HTMLAnchorElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  const strength = 0.16;
  event.currentTarget.style.setProperty('--mag-x', `${x * strength}px`);
  event.currentTarget.style.setProperty('--mag-y', `${y * strength}px`);
}

function resetMagnet(event: PointerEvent<HTMLAnchorElement>) {
  event.currentTarget.style.setProperty('--mag-x', '0px');
  event.currentTarget.style.setProperty('--mag-y', '0px');
}

export function FloatingDock() {
  function trackDock(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    event.currentTarget.style.setProperty('--dock-y', `${y}px`);
  }

  return (
    <>
      <motion.div
        className="floating-brand"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 170, damping: 20 }}
      >
        <span className="floating-brand-mark">生</span>
        <div className="floating-brand-copy">
          <strong>Ikigai OS</strong>
          <small><i className="status-dot" /> local-first</small>
        </div>
      </motion.div>

      <motion.nav
        className="floating-dock"
        aria-label="Primary navigation"
        onPointerMove={trackDock}
        initial={{ opacity: 0, x: -14, y: '-50%' }}
        animate={{ opacity: 1, x: 0, y: '-50%' }}
        transition={{ type: 'spring', stiffness: 165, damping: 21, delay: .05 }}
      >
        <div className="floating-dock-glow" aria-hidden="true" />
        {nav.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            aria-label={label}
            title={label}
            className={({ isActive }) => isActive ? 'floating-nav-link active' : 'floating-nav-link'}
            onPointerMove={updateMagnet}
            onPointerLeave={resetMagnet}
            style={{ '--mag-x': '0px', '--mag-y': '0px' } as CSSProperties}
          >
            <span className="floating-nav-icon"><Icon size={19} strokeWidth={1.85} /></span>
            <span className="floating-nav-label">{label}</span>
          </NavLink>
        ))}
      </motion.nav>
    </>
  );
}
