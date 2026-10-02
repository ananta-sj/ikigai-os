import { Info, Keyboard, Settings2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPageGuide } from '../../data/pageGuides';
import { ensureSettings, updateSettings } from '../../lib/settings';
import type { UserSettings } from '../../types';

export function GuideLayer() {
  const location = useLocation();
  const guide = getPageGuide(location.pathname);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    void ensureSettings().then(value => { if (alive) setSettings(value); });
    const onSettings = (event: Event) => {
      const next = (event as CustomEvent<UserSettings>).detail;
      if (next) setSettings(next);
    };
    window.addEventListener('ikigai-settings-changed', onSettings);
    return () => {
      alive = false;
      window.removeEventListener('ikigai-settings-changed', onSettings);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!guide || !settings?.showGuideButtons) return null;

  async function hideGuideButtons() {
    const next = await updateSettings({ showGuideButtons: false });
    setSettings(next);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={open ? 'ik-guide-trigger is-open' : 'ik-guide-trigger'}
        onClick={() => setOpen(value => !value)}
        aria-label={`Open ${guide.title} guide`}
        aria-expanded={open}
        aria-controls="ik-page-guide"
      >
        <Info size={17} strokeWidth={1.9} aria-hidden="true" />
        <span>Guide</span>
      </button>

      {open ? (
        <div
          className="ik-guide-backdrop"
          onMouseDown={event => {
            if (event.currentTarget !== event.target) return;
            setOpen(false);
            window.requestAnimationFrame(() => triggerRef.current?.focus());
          }}
        >
          <aside ref={panelRef} id="ik-page-guide" className="ik-guide-panel" role="dialog" aria-modal="true" aria-labelledby="ik-guide-title">
            <header className="ik-guide-head">
              <div>
                <span>{guide.eyebrow}</span>
                <h2 id="ik-guide-title">{guide.title}</h2>
              </div>
              <button ref={closeRef} type="button" onClick={() => { setOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()); }} aria-label="Close guide">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <p className="ik-guide-summary">{guide.summary}</p>

            <section className="ik-guide-section" aria-labelledby="ik-guide-features">
              <div className="ik-guide-section-title"><Sparkles size={15} aria-hidden="true" /><h3 id="ik-guide-features">Things to try</h3></div>
              <div className="ik-guide-feature-list">
                {guide.features.map((feature, index) => (
                  <article key={feature.title} className="ik-guide-feature">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div><strong>{feature.title}</strong><p>{feature.detail}</p></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="ik-guide-callout">
              <Settings2 size={16} aria-hidden="true" />
              <div><strong>Make it yours</strong><p>{guide.customize}</p></div>
            </section>

            {settings.showGuideKeyboardHints && guide.keyboard?.length ? (
              <section className="ik-guide-section" aria-labelledby="ik-guide-keyboard">
                <div className="ik-guide-section-title"><Keyboard size={15} aria-hidden="true" /><h3 id="ik-guide-keyboard">Keyboard</h3></div>
                <ul className="ik-guide-keyboard-list">
                  {guide.keyboard.map(item => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ) : null}

            <footer className="ik-guide-footer">
              <Link to="/settings" onClick={() => setOpen(false)}>Guidance settings</Link>
              <button type="button" onClick={hideGuideButtons}>Hide Guide buttons</button>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}
