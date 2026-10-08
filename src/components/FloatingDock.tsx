import {
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Home,
  Map,
  Music2,
  NotebookPen,
  Settings,
  Sparkles,
  TimerReset,
  Trees
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { preloadRoute } from '../lib/routePreload';
import { IkigaiMark } from './IkigaiMark';

const destinations = [
  ['Today', '/', Home],
  ['Journey', '/calendar', CalendarDays],
  ['Focus', '/focus', TimerReset],
  ['Now Playing', '/now-playing', Music2],
  ['Sanctuary', '/garden', Trees],
  ['Roadmap', '/roadmap', Map],
  ['Reflection', '/reflection', NotebookPen],
  ['Memories', '/memories', Brain],
  ['Career', '/career', BriefcaseBusiness],
  ['Companion', '/companion', Sparkles],
  ['Settings', '/settings', Settings]
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function FloatingDock() {
  const dockRef = useRef<HTMLElement | null>(null);
  const location = useLocation();

  const resetMagnet = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;
    dock.style.setProperty('--dock-y', '50%');
    dock.querySelectorAll<HTMLElement>('.floating-nav-link').forEach(link => {
      link.style.setProperty('--mag-x', '0px');
      link.style.setProperty('--mag-y', '0px');
    });
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    const dock = dockRef.current;
    if (!dock) return;

    const dockRect = dock.getBoundingClientRect();
    dock.style.setProperty('--dock-y', `${clamp(event.clientY - dockRect.top, 18, dockRect.height - 18)}px`);

    dock.querySelectorAll<HTMLElement>('.floating-nav-link').forEach(link => {
      const rect = link.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / 92);
      const x = clamp(dx * 0.16 * influence, -5.5, 5.5);
      const y = clamp(dy * 0.16 * influence, -5.5, 5.5);
      link.style.setProperty('--mag-x', `${x.toFixed(2)}px`);
      link.style.setProperty('--mag-y', `${y.toFixed(2)}px`);
    });
  }, []);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    let frame = 0;

    const centerActive = () => {
      if (!window.matchMedia('(max-width: 680px), (max-height: 560px) and (orientation: landscape) and (pointer: coarse)').matches) return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const active = dock.querySelector<HTMLElement>('.floating-nav-link.active');
        if (!active) return;
        const target = active.offsetLeft + active.offsetWidth / 2 - dock.clientWidth / 2;
        const reduced = document.documentElement.dataset.ikigaiMotion === 'reduced'
          || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        dock.scrollTo({ left: Math.max(0, target), behavior: reduced ? 'auto' : 'smooth' });
      });
    };

    centerActive();
    window.addEventListener('resize', centerActive, { passive: true });
    window.addEventListener('orientationchange', centerActive);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', centerActive);
      window.removeEventListener('orientationchange', centerActive);
    };
  }, [location.pathname]);

  return (
    <>
      <div
        className="floating-brand"
        role="img"
        aria-label="Ikigai Space · local-first"
        draggable={false}
        onDragStart={event => event.preventDefault()}
      >
        <span className="floating-brand-mark" aria-hidden="true"><IkigaiMark /></span>
        <span className="floating-brand-copy" aria-hidden="true">
          <strong>Ikigai Space</strong>
          <small><span className="status-dot" aria-hidden="true" />local-first</small>
        </span>
      </div>

      <nav
        ref={dockRef}
        className="floating-dock"
        aria-label="Primary navigation"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetMagnet}
        onDragStart={event => event.preventDefault()}
      >
        <span className="floating-dock-glow" aria-hidden="true" />
        {destinations.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            aria-label={label}
            draggable={false}
            className={({ isActive }) => `floating-nav-link${isActive ? ' active' : ''}`}
            onPointerEnter={() => preloadRoute(path)}
            onFocus={() => preloadRoute(path)}
          >
            <span className="floating-nav-icon" aria-hidden="true">
              <Icon size={19} strokeWidth={1.8} />
            </span>
            <span className="floating-nav-label" aria-hidden="true">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
