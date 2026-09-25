import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paperThemes } from '../data/paperThemes';
import { appThemes } from '../data/themes';
import { journeyThemes } from '../data/journeyThemes';
import { ensureSettings, updateSettings } from '../lib/settings';
import type { UserSettings } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { DataSafetyPanel } from '../components/settings/DataSafetyPanel';
import { DangerZonePanel } from '../components/settings/DangerZonePanel';

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => { ensureSettings().then(setSettings); }, []);

  async function patch(next: Partial<Omit<UserSettings, 'id'>>) {
    const updated = await updateSettings(next);
    setSettings(updated);
  }

  return (
    <div className="page settings-page">
      <div className="ik-page-width">
        <PageHeader
          compact
          eyebrow="SETTINGS · LOCAL PREFERENCES"
          title="Make the space feel like yours."
          description="Atmosphere can change. Your data model and the meaning of each room stay consistent underneath."
          meta={<><span className="status-dot" /> Changes save locally on this device.</>}
        />

        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div>
              <span className="eyebrow">IKIGAI ATMOSPHERE</span>
              <h3>Workspace theme</h3>
              <p>One shared interface grammar, five different atmospheres.</p>
            </div>
          </div>

          <div className="app-theme-picker" role="radiogroup" aria-label="Workspace theme">
            {appThemes.map(theme => {
              const selected = settings?.appTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? 'app-theme-choice selected' : 'app-theme-choice'}
                  onClick={() => patch({ appTheme: theme.id })}
                >
                  <div className={`app-theme-preview ${theme.id}`}><span className="sr-only">{theme.name} preview</span></div>
                  <div className="app-theme-meta">
                    <strong>{theme.mark} · {theme.name}</strong>
                    <small>{theme.subtitle}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>



        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div>
              <span className="eyebrow">INTERFACE FEEL</span>
              <h3>Shape, scale & type</h3>
              <p>Tune the shared interface language. These controls change presentation only; the deeper room-by-room composition pass comes later.</p>
            </div>
          </div>

          <div className="setting-block">
            <div><strong>Control style</strong><small>Soft keeps the current rounded language. Quiet removes most visual weight. Structured makes controls sharper and more deliberate.</small></div>
            <div className="ik-choice-row" role="radiogroup" aria-label="Interface style">
              {([
                ['soft', 'Soft', 'Rounded · layered'],
                ['quiet', 'Quiet', 'Flat · low chrome'],
                ['structured', 'Structured', 'Sharper · framed']
              ] as const).map(([value, label, note]) => (
                <button key={value} type="button" role="radio" aria-checked={settings?.interfaceStyle === value} className={settings?.interfaceStyle === value ? 'ik-choice-card is-selected' : 'ik-choice-card'} onClick={() => patch({ interfaceStyle: value })}>
                  <strong>{label}</strong><small>{note}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-block">
            <div><strong>Interface size</strong><small>Changes shared spacing and control geometry without inflating physical objects or giant page headings.</small></div>
            <div className="ik-choice-row ik-choice-row-four" role="radiogroup" aria-label="Display scale">
              {([
                ['compact', 'Compact', 'Tighter spacing'],
                ['balanced', 'Balanced', 'Default spacing'],
                ['large', 'Roomy', 'More breathing room'],
                ['oversized', 'Extra roomy', 'Largest controls']
              ] as const).map(([value, label, note]) => (
                <button key={value} type="button" role="radio" aria-checked={settings?.interfaceScale === value} className={settings?.interfaceScale === value ? 'ik-choice-card is-selected' : 'ik-choice-card'} onClick={() => patch({ interfaceScale: value })}>
                  <strong>{label}</strong><small>{note}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-block">
            <div><strong>Text size</strong><small>Increase readable interface text independently from spacing. Physical calendar print and the 3D world keep their own proportions.</small></div>
            <div className="ik-choice-row ik-choice-row-four" role="radiogroup" aria-label="Interface text size">
              {([
                ['small', '90%', 'Small'],
                ['default', '100%', 'Default'],
                ['large', '115%', 'Large'],
                ['xlarge', '130%', 'Extra large']
              ] as const).map(([value, label, note]) => (
                <button key={value} type="button" role="radio" aria-checked={settings?.interfaceTextScale === value} className={settings?.interfaceTextScale === value ? 'ik-choice-card is-selected' : 'ik-choice-card'} onClick={() => patch({ interfaceTextScale: value })}>
                  <strong>{label}</strong><small>{note}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-block">
            <div><strong>Typography</strong><small>Choose the type personality independently from the workspace theme. Theme Default keeps each atmosphere's intended font pairing.</small></div>
            <div className="ik-font-picker" role="radiogroup" aria-label="Interface typography">
              {([
                ['theme', 'Aa', 'Theme default', 'Let the active atmosphere decide'],
                ['modern', 'Aa', 'Modern', 'Neutral sans · clean UI'],
                ['editorial', 'Aa', 'Editorial', 'Serif · bookish and calm'],
                ['humanist', 'Aa', 'Humanist', 'Soft sans · warmer rhythm'],
                ['technical', 'Aa', 'Technical', 'Monospace · precise and dense']
              ] as const).map(([value, sample, label, note]) => (
                <button key={value} type="button" role="radio" aria-checked={settings?.interfaceFont === value} className={settings?.interfaceFont === value ? `ik-font-choice is-selected ${value}` : `ik-font-choice ${value}`} onClick={() => patch({ interfaceFont: value })}>
                  <span>{sample}</span><strong>{label}</strong><small>{note}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-block">
            <div><strong>Living familiar</strong><small>Choose how present the agent-creature feels around Ikigai. Drag it to park it temporarily. Reduced Motion always keeps it still.</small></div>
            <div className="ik-choice-row ik-choice-row-four" role="radiogroup" aria-label="Living familiar activity">
              {([
                ['lively', 'Lively', 'Wanders more often'],
                ['calm', 'Calm', 'Occasional perches'],
                ['still', 'Still', 'Stays in one place'],
                ['hidden', 'Hidden', 'Companion page only']
              ] as const).map(([value, label, note]) => (
                <button key={value} type="button" role="radio" aria-checked={settings?.familiarActivity === value} className={settings?.familiarActivity === value ? 'ik-choice-card is-selected' : 'ik-choice-card'} onClick={() => patch({ familiarActivity: value })}>
                  <strong>{label}</strong><small>{note}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div><span className="eyebrow">HOME EXPERIENCE</span><h3>Daily Page</h3><p>The tear-off calendar is a ritual object inside Today, not the identity of the entire OS.</p></div>
          </div>

          <label className="setting-row">
            <div><strong>Show Daily Page</strong><small>Enable the physical calendar object on Today.</small></div>
            <input type="checkbox" checked={settings?.showDailyPage ?? true} onChange={event => patch({ showDailyPage: event.target.checked })} />
          </label>

          <label className="setting-row">
            <div><strong>Mini month</strong><small>Keep a tiny month overview printed on compatible paper skins.</small></div>
            <input type="checkbox" checked={settings?.showMiniMonth ?? true} onChange={event => patch({ showMiniMonth: event.target.checked })} />
          </label>

          <div className="setting-block">
            <div><strong>Paper skin</strong><small>Every skin uses the same day record, tear rules and physical interaction.</small></div>
            <div className="theme-picker">
              {paperThemes.map(theme => (
                <button key={theme.id} type="button" className={settings?.dailyPageTheme === theme.id ? `theme-choice ${theme.id} selected` : `theme-choice ${theme.id}`} onClick={() => patch({ dailyPageTheme: theme.id })}>
                  <span>{theme.mark}</span><small>{theme.name}</small><em>{theme.subtitle}</em>
                </button>
              ))}
            </div>
          </div>

          <label className="setting-row">
            <div><strong>Reduce motion</strong><small>Apply the calmer motion contract across navigation, controls and feature rooms.</small></div>
            <input type="checkbox" checked={settings?.reducedMotion ?? false} onChange={event => patch({ reducedMotion: event.target.checked })} />
          </label>

          <label className="setting-row">
            <div><strong>Tear sound</strong><small>Play the local tear reference while paper separates.</small></div>
            <input type="checkbox" checked={settings?.tearSound ?? true} onChange={event => patch({ tearSound: event.target.checked })} />
          </label>
        </section>

        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div><span className="eyebrow">JOURNEY CALENDAR</span><h3>Monthly calendar skin</h3><p>Change the printed calendar language without changing archived days or planning data.</p></div>
          </div>
          <div className="journey-theme-picker" role="radiogroup" aria-label="Journey calendar skin">
            {journeyThemes.map(theme => {
              const selected = settings?.journeyCalendarTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? `journey-theme-choice ${theme.id} is-selected` : `journey-theme-choice ${theme.id}`}
                  onClick={() => patch({ journeyCalendarTheme: theme.id })}
                >
                  <span className="journey-theme-mini" aria-hidden="true">
                    <i className="journey-theme-binding" />
                    <i className="journey-theme-month">9</i>
                    <i className="journey-theme-grid">
                      {Array.from({ length: 14 }).map((_, index) => <b key={index} />)}
                    </i>
                  </span>
                  <span className="journey-theme-copy">
                    <strong>{theme.mark} {theme.name}</strong>
                    <small>{theme.subtitle}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass-panel ik-surface settings-card welcome-tour-settings">
          <div className="settings-section-heading">
            <div><span className="eyebrow">FIRST LIGHT</span><h3>Welcome experience</h3><p>Revisit onboarding without deleting your tasks, garden, themes or local history.</p></div>
          </div>
          <Link className="ik-button ik-button-quiet" to="/welcome?preview=1">Preview welcome tour</Link>
        </section>

        <DataSafetyPanel />
        <DangerZonePanel />
      </div>
    </div>
  );
}
