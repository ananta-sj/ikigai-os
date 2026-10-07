import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { appThemes } from '../data/themes';
import { journeyThemes } from '../data/journeyThemes';
import { paperThemes } from '../data/paperThemes';
import { ensureSettings, updateSettings } from '../lib/settings';
import type { AppTheme, DailyCalendarSize, DailyPageTheme, JourneyCalendarTheme, UserSettings } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { DataSafetyPanel } from '../components/settings/DataSafetyPanel';
import { DangerZonePanel } from '../components/settings/DangerZonePanel';
import { IkigaiMark } from '../components/IkigaiMark';
import { DailyCalendarPreview } from '../components/settings/DailyCalendarPreview';

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [previewTheme, setPreviewTheme] = useState<AppTheme>('midnight-grove');
  const [previewJourneyTheme, setPreviewJourneyTheme] = useState<JourneyCalendarTheme>('nihon-sakura');
  const [activeTab, setActiveTab] = useState<'appearance' | 'experience' | 'data'>('appearance');

  useEffect(() => {
    ensureSettings().then(current => {
      setSettings(current);
      setProfileNameDraft(current.profileName ?? '');
      setPreviewTheme(current.appTheme);
      setPreviewJourneyTheme(current.journeyCalendarTheme);
    });
  }, []);

  useEffect(() => {
    if (settings?.appTheme) setPreviewTheme(settings.appTheme);
  }, [settings?.appTheme]);

  useEffect(() => {
    if (settings?.journeyCalendarTheme) setPreviewJourneyTheme(settings.journeyCalendarTheme);
  }, [settings?.journeyCalendarTheme]);

  const coreAppThemes = appThemes.filter(theme => theme.collection !== 'edition');
  const editionAppThemes = appThemes.filter(theme => theme.collection === 'edition');
  const coreJourneyThemes = journeyThemes.filter(theme => theme.collection !== 'edition');
  const editionJourneyThemes = journeyThemes.filter(theme => theme.collection === 'edition');
  const previewDefinition = appThemes.find(theme => theme.id === previewTheme) ?? appThemes[0];
  const journeyPreviewDefinition = journeyThemes.find(theme => theme.id === previewJourneyTheme) ?? journeyThemes[0];
  const journeyPreviewStyle = {
    '--preview-calendar-paper': journeyPreviewDefinition.paper,
    '--preview-calendar-paper-alt': journeyPreviewDefinition.paperAlt,
    '--preview-calendar-ink': journeyPreviewDefinition.ink,
    '--preview-calendar-muted': journeyPreviewDefinition.mutedInk,
    '--preview-calendar-rule': journeyPreviewDefinition.rule,
    '--preview-calendar-accent': journeyPreviewDefinition.accent,
    '--preview-calendar-sunday': journeyPreviewDefinition.sunday,
    '--preview-calendar-saturday': journeyPreviewDefinition.saturday,
    '--preview-calendar-board': journeyPreviewDefinition.board,
    '--preview-calendar-binding': journeyPreviewDefinition.binding,
    '--preview-calendar-shadow': journeyPreviewDefinition.shadow
  } as CSSProperties;
  const journeyPreviewDays = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 0, 0, 0, 0];

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

        <nav className="settings-section-nav" aria-label="Settings sections" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'appearance'}
            className={activeTab === 'appearance' ? 'active' : ''}
            onClick={() => setActiveTab('appearance')}
          >
            <strong>Appearance</strong>
            <small>Theme, type & interface</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'experience'}
            className={activeTab === 'experience' ? 'active' : ''}
            onClick={() => setActiveTab('experience')}
          >
            <strong>Experience</strong>
            <small>Morning handoff, Journey & welcome</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'data'}
            className={activeTab === 'data' ? 'active' : ''}
            onClick={() => setActiveTab('data')}
          >
            <strong>Data & safety</strong>
            <small>Backup, integrity & reset</small>
          </button>
        </nav>

        {activeTab === 'appearance' ? <>
        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div>
              <span className="eyebrow">IKIGAI ATMOSPHERE</span>
              <h3>Workspace theme</h3>
              <p>Core materials plus optional seasonal and celebratory editions. Your data never changes with the look.</p>
            </div>
          </div>

          <div className="workspace-theme-demo" data-preview-theme={previewTheme} aria-label={`${previewDefinition.name} workspace preview`}>
            <div className="workspace-theme-demo-shell" aria-hidden="true">
              <div className="workspace-theme-demo-dock"><i /><i /><i /><i /></div>
              <div className="workspace-theme-demo-page">
                <div className="workspace-theme-demo-brand"><span><IkigaiMark /></span><div><strong>Ikigai</strong><small>local-first</small></div></div>
                <span className="workspace-theme-demo-eyebrow">TODAY · DESK</span>
                <h4>A quieter place to work.</h4>
                <div className="workspace-theme-demo-grid">
                  <article><small>DAY NOTE</small><strong>One clear thing.</strong><span>Surface, type, ink and controls change together.</span><b>Open page</b></article>
                  <article className="workspace-theme-demo-calendar"><small>JOURNEY</small><strong>September</strong><div>{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div></article>
                </div>
              </div>
            </div>
            <footer>
              <div><strong>{previewDefinition.mark} · {previewDefinition.name}</strong><span>{previewDefinition.subtitle}</span></div>
              <p>Hover or focus a theme below to preview it here. Click a theme to use it across Ikigai.</p>
            </footer>
          </div>

          <div className="theme-collection-stack" role="radiogroup" aria-label="Workspace theme">
          <div className="theme-collection-heading"><strong>Core materials</strong><small>Quiet defaults for everyday use</small></div>
          <div className="app-theme-picker">
            {coreAppThemes.map(theme => {
              const selected = settings?.appTheme === theme.id;
              return (
                <button key={theme.id} type="button" role="radio" aria-checked={selected}
                  className={selected ? 'app-theme-choice selected' : 'app-theme-choice'}
                  onPointerEnter={() => setPreviewTheme(theme.id)} onPointerLeave={() => setPreviewTheme(settings?.appTheme ?? theme.id)}
                  onFocus={() => setPreviewTheme(theme.id)} onBlur={() => setPreviewTheme(settings?.appTheme ?? theme.id)}
                  onClick={() => { setPreviewTheme(theme.id); void patch({ appTheme: theme.id }); }}>
                  <div className={`app-theme-preview ${theme.id}`}><span className="sr-only">{theme.name} preview</span></div>
                  <div className="app-theme-meta"><strong>{theme.mark} · {theme.name}</strong><small>{theme.subtitle}</small></div>
                </button>
              );
            })}
          </div>
          <div className="theme-collection-heading edition"><strong>Special editions</strong><small>Japanese spring · winter/Christmas · Holi · Diwali · motivational studio</small></div>
          <div className="app-theme-picker edition-picker">
            {editionAppThemes.map(theme => {
              const selected = settings?.appTheme === theme.id;
              return (
                <button key={theme.id} type="button" role="radio" aria-checked={selected}
                  className={selected ? 'app-theme-choice selected' : 'app-theme-choice'}
                  onPointerEnter={() => setPreviewTheme(theme.id)} onPointerLeave={() => setPreviewTheme(settings?.appTheme ?? theme.id)}
                  onFocus={() => setPreviewTheme(theme.id)} onBlur={() => setPreviewTheme(settings?.appTheme ?? theme.id)}
                  onClick={() => { setPreviewTheme(theme.id); void patch({ appTheme: theme.id }); }}>
                  <div className={`app-theme-preview ${theme.id}`}><span className="sr-only">{theme.name} preview</span></div>
                  <div className="app-theme-meta"><strong>{theme.mark} · {theme.name}</strong><small>{theme.subtitle}</small></div>
                </button>
              );
            })}
          </div>
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

          <div className="setting-block familiar-settings-bridge">
            <div><strong>Familiar identity & presence</strong><small>Keep the Familiar nearby, hide it completely, or open the full character editor for form, material, placement and reactions.</small></div>
            <div className="familiar-settings-bridge-actions">
              <label className="familiar-settings-bridge-toggle">
                <input type="checkbox" checked={settings?.familiarEnabled ?? true} onChange={event => void patch({ familiarEnabled: event.target.checked })} />
                <span>{settings?.familiarEnabled === false ? 'Hidden' : 'Visible'}</span>
              </label>
              <Link className="ik-button ik-button-quiet" to="/companion">Open Familiar editor</Link>
            </div>
          </div>
        </section>

        </> : null}

        {activeTab === 'experience' ? <>
        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div><span className="eyebrow">PERSONAL TOUCH</span><h3>What should Ikigai call you?</h3><p>This optional name is used for local greetings only. Leave it blank to keep the interface neutral.</p></div>
          </div>
          <label className="setting-block settings-profile-name">
            <div><strong>Preferred name or nickname</strong><small>Stored with your normal local settings and included in portable backups. No account or identity verification is involved.</small></div>
            <input
              value={profileNameDraft}
              maxLength={48}
              placeholder="Optional"
              onChange={event => setProfileNameDraft(event.target.value)}
              onBlur={() => void patch({ profileName: profileNameDraft.trim().replace(/\s+/g, ' ').slice(0, 48) })}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
        </section>

        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div><span className="eyebrow">HOME EXPERIENCE</span><h3>Today desk & handoff</h3><p>Choose how the daily ritual appears: a quiet catch-up handoff, a physical tear-off calendar, or both. Archiving still keeps the day’s history intact.</p></div>
          </div>

          <label className="setting-row">
            <div><strong>Show morning handoff</strong><small>Offer it once when an older day is still open. With Physical day page enabled, the paper becomes the primary gesture and the handoff remains the accessible fallback.</small></div>
            <input type="checkbox" checked={settings?.showDailyPage ?? true} onChange={event => patch({ showDailyPage: event.target.checked })} />
          </label>

          <label className="setting-row">
            <div><strong>Physical day page</strong><small>Place a tactile tear-off calendar on the Today desk. Today can be lifted and flexed; older open pages tear only after carry-forward choices are confirmed.</small></div>
            <input type="checkbox" checked={settings?.todayPaperPhysics ?? false} onChange={event => patch({ todayPaperPhysics: event.target.checked })} />
          </label>

          {settings?.todayPaperPhysics && (
            <>
              <div className="setting-block paper-edition-setting">
                <div><strong>Calendar edition</strong><small>Each edition changes the printed composition, typography and ornament — not only the ink colour. Your tasks, notes and tear/archive rules stay exactly the same.</small></div>
                <div className="paper-edition-picker" role="radiogroup" aria-label="Physical day page edition">
                  {paperThemes.map(theme => {
                    const selected = settings.dailyPageTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={selected ? `paper-edition-choice selected layout-${theme.layout}` : `paper-edition-choice layout-${theme.layout}`}
                        style={{ '--paper-choice-accent': theme.accent, '--paper-choice-soft': theme.accentSoft } as CSSProperties}
                        onClick={() => void patch({ dailyPageTheme: theme.id as DailyPageTheme })}
                      >
                        <DailyCalendarPreview theme={theme.id} size={settings.dailyCalendarSize} />
                        <span className="paper-edition-copy"><strong>{theme.name}</strong><small>{theme.subtitle}</small></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setting-block paper-size-setting">
                <div><strong>Calendar size</strong><small>Choose the object, not a zoom level. Compact is date-first and deliberately sparse; Standard adds one useful line; Large becomes a desk focal point with room for tasks and notes.</small></div>
                <div className="paper-size-picker" role="radiogroup" aria-label="Physical calendar size">
                  {([
                    ['compact', 'Compact', 'Quiet date object'],
                    ['standard', 'Standard', 'Balanced desk presence'],
                    ['large', 'Large', 'Full tactile calendar']
                  ] as const).map(([size, label, detail]) => {
                    const selected = settings.dailyCalendarSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={selected ? `paper-size-choice selected size-${size}` : `paper-size-choice size-${size}`}
                        onClick={() => void patch({ dailyCalendarSize: size as DailyCalendarSize })}
                      >
                        <span className="paper-size-choice__stage">
                          <DailyCalendarPreview theme={settings.dailyPageTheme} size={size} sampleTasks />
                        </span>
                        <span className="paper-size-choice__copy"><strong>{label}</strong><small>{detail}</small></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="setting-row">
                <div><strong>Mini month on paper</strong><small>Print the small month reference on the physical sheet.</small></div>
                <input type="checkbox" checked={settings.showMiniMonth} onChange={event => patch({ showMiniMonth: event.target.checked })} />
              </label>

              <label className="setting-row">
                <div><strong>Paper tear sound</strong><small>Use the locally generated tear texture only when a page actually tears. No audio is streamed.</small></div>
                <input type="checkbox" checked={settings.tearSound} onChange={event => patch({ tearSound: event.target.checked })} />
              </label>
            </>
          )}

          <label className="setting-row">
            <div><strong>Reduce motion</strong><small>Force the calmer motion contract across navigation, controls and feature rooms. Your device’s reduced-motion preference is respected automatically even when this is off. Physical paper becomes display-only while this is enabled.</small></div>
            <input type="checkbox" checked={settings?.reducedMotion ?? false} onChange={event => patch({ reducedMotion: event.target.checked })} />
          </label>
        </section>

        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div><span className="eyebrow">GUIDANCE</span><h3>Help that stays out of the way</h3><p>Every main room can expose one small Guide button. It explains what the room does, how its important interactions work, and where its customization lives.</p></div>
          </div>

          <label className="setting-row">
            <div><strong>Show page Guide buttons</strong><small>Display the small ⓘ Guide control in each main room. Turning this off removes the control everywhere; you can always re-enable it here.</small></div>
            <input type="checkbox" checked={settings?.showGuideButtons ?? true} onChange={event => patch({ showGuideButtons: event.target.checked })} />
          </label>

          <label className="setting-row">
            <div><strong>Show keyboard hints in Guides</strong><small>Include room-specific keyboard shortcuts inside the Guide drawer. This does not change any controls.</small></div>
            <input type="checkbox" checked={settings?.showGuideKeyboardHints ?? true} onChange={event => patch({ showGuideKeyboardHints: event.target.checked })} />
          </label>
        </section>

        <section className="glass-panel ik-surface settings-card experience-settings">
          <div className="settings-section-heading">
            <div><span className="eyebrow">JOURNEY CALENDAR</span><h3>Monthly calendar skin</h3><p>Choose a physical calendar construction or a special seasonal edition. Archived days and planning data stay unchanged.</p></div>
          </div>
          <div
            className={`journey-calendar-demo journey-calendar-demo-${journeyPreviewDefinition.visual}`}
            data-preview-journey-theme={previewJourneyTheme}
            style={journeyPreviewStyle}
            aria-label={`${journeyPreviewDefinition.name} calendar preview`}
          >
            <div className="journey-calendar-demo-stage" aria-hidden="true">
              <div className="journey-calendar-demo-board">
                <div className="journey-calendar-demo-binding"><i /><i /><i /><i /><i /><i /></div>
                <div className="journey-calendar-demo-paper">
                  <div className="journey-calendar-demo-head">
                    <div><span>SEPTEMBER</span><strong>2026</strong></div>
                    <b>09</b>
                  </div>
                  <div className="journey-calendar-demo-weekdays">
                    {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day => <span key={day}>{day}</span>)}
                  </div>
                  <div className="journey-calendar-demo-grid">
                    {journeyPreviewDays.map((day, index) => (
                      <span key={`${day}-${index}`} className={day === 26 ? 'is-marked' : day === 0 ? 'is-empty' : ''}>
                        {day || ''}
                        {day === 9 ? <i /> : null}
                        {day === 18 ? <i /> : null}
                        {day === 26 ? <em>note</em> : null}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <footer>
              <div><strong>{journeyPreviewDefinition.mark} {journeyPreviewDefinition.name}</strong><span>{journeyPreviewDefinition.subtitle}</span></div>
              <p>Hover or focus a skin below to preview a full month here. Click to save it for Journey.</p>
            </footer>
          </div>

          <div
            className="journey-theme-picker"
            role="radiogroup"
            aria-label="Journey calendar skin"
            onPointerLeave={() => {
              if (settings?.journeyCalendarTheme) setPreviewJourneyTheme(settings.journeyCalendarTheme);
            }}
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null) && settings?.journeyCalendarTheme) {
                setPreviewJourneyTheme(settings.journeyCalendarTheme);
              }
            }}
          >
            {[...coreJourneyThemes, ...editionJourneyThemes].map(theme => {
              const selected = settings?.journeyCalendarTheme === theme.id;
              return (
                <button key={theme.id} type="button" role="radio" aria-checked={selected}
                  className={selected ? `journey-theme-choice ${theme.id} ${theme.collection === 'edition' ? 'is-edition ' : ''}is-selected` : `journey-theme-choice ${theme.id} ${theme.collection === 'edition' ? 'is-edition' : ''}`}
                  onPointerEnter={() => setPreviewJourneyTheme(theme.id)} onFocus={() => setPreviewJourneyTheme(theme.id)}
                  onClick={() => { setPreviewJourneyTheme(theme.id); void patch({ journeyCalendarTheme: theme.id }); }}>
                  <span className="journey-theme-mini" aria-hidden="true"><i className="journey-theme-binding" /><i className="journey-theme-month">9</i><i className="journey-theme-grid">{Array.from({ length: 14 }).map((_, index) => <b key={index} />)}</i></span>
                  <span className="journey-theme-copy"><strong>{theme.mark} {theme.name}</strong><small>{theme.subtitle}</small></span>
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

        </> : null}

        {activeTab === 'data' ? <>
          <DataSafetyPanel />
          <DangerZonePanel />
        </> : null}
      </div>
    </div>
  );
}
