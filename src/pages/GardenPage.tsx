import {
  Compass,
  ChevronRight,
  Gauge,
  Leaf,
  Moon,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Trees,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { SanctuaryWorld } from '../components/sanctuary/SanctuaryWorld';
import { useDialogFocus } from '../components/ui/dialogFocus';
import { achievementDefinitions } from '../data/achievements';
import { gardenThemes, getGardenTheme } from '../data/gardenThemes';
import { sanctuaryRegionById, sanctuaryRegions, sanctuaryStillViews, type SanctuaryRegionId, type SanctuaryStillViewId } from '../data/sanctuary';
import { sanctuaryArtifactMessage, sanctuaryArtifactPlacementById, sanctuarySecretById } from '../data/sanctuaryArtifacts';
import { db } from '../db';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { syncAchievements } from '../lib/achievements';
import { playSanctuaryTone, startSanctuaryAmbience, stopSanctuaryAmbience, type SanctuaryAudioZone } from '../lib/sanctuaryAudio';
import { sanctuaryDayPeriod, sanctuaryDayProgress, sanctuaryThemeMood, visibleSanctuarySecrets } from '../lib/sanctuaryDepthCore';
import { ensureSettings, updateSettings } from '../lib/settings';
import { openFamiliar } from '../lib/familiar';
import {
  emptySanctuaryLivingState,
  loadSanctuaryLivingState,
  sanctuaryRegionNarrative,
  type SanctuaryLivingState
} from '../lib/sanctuaryLiving';
import { ensureGarden } from '../lib/tasks';
import { plantStage } from '../lib/rewards';
import type { AchievementDefinition, GardenState, SanctuarySecretId, UserSettings } from '../types';
import '../sanctuary-v022.css';
import '../sanctuary-v023.css';

const STAGES = ['Dormant Seed', 'Awakening Seed', 'Sprout', 'Young Plant', 'Sapling', 'Young Tree', 'Mature Tree', 'Bloom'];

type WorldMessage = {
  label: string;
  title: string;
  detail?: string;
};

const SANCTUARY_TOUR: Array<WorldMessage & { region: SanctuaryRegionId }> = [
  { region: 'threshold', label: 'WELCOME · THE THRESHOLD', title: 'This place grows from the life you record in Ikigai Space.', detail: 'There is nothing extra to maintain here. Sanctuary turns work, reflection, memories and long-term progress into a place you can revisit.' },
  { region: 'home-grove', label: 'GUIDED WALK · HOME GROVE', title: 'Everyday work grows here.', detail: 'Completed tasks feed the Guardian Tree and the life around it. Reopening a task never lets the same work pay out twice.' },
  { region: 'moon-pond', label: 'GUIDED WALK · MOON POND', title: 'Reflection leaves life around the water.', detail: 'Written reflections deepen this part of the world through reeds, lilies and quieter light instead of another score or streak.' },
  { region: 'quiet-pavilion', label: 'GUIDED WALK · QUIET PAVILION', title: 'Memories leave traces without exposing their contents.', detail: 'The world can acknowledge that memories exist while the private text and attachments stay inside Memory Vault.' },
  { region: 'lookout', label: 'GUIDED WALK · THE LOOKOUT', title: 'Plans and proof build the horizon.', detail: 'Roadmap progress, career work and proof slowly give the distant route more structure. Benches can be sat at, and the quiet street leads to a small tea house with no productivity purpose at all.' }
];

function sanctuaryAudioZoneFor(region: SanctuaryRegionId, stillView: SanctuaryStillViewId | null): SanctuaryAudioZone {
  const focus = stillView ?? region;
  if (focus === 'pond-edge' || focus === 'moon-pond') return 'pond';
  if (focus === 'pavilion-veranda' || focus === 'quiet-pavilion') return 'pavilion';
  if (focus === 'lantern-street' || focus === 'tea-house') return 'street';
  if (focus === 'mountain-view' || focus === 'lookout') return 'lookout';
  return 'grove';
}

function stageIndexFor(label: string) {
  return Math.max(0, STAGES.indexOf(label));
}

export function GardenPage() {
  const [garden, setGarden] = useState<GardenState | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [living, setLiving] = useState<SanctuaryLivingState>(() => emptySanctuaryLivingState());
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);
  const [focusedRegion, setFocusedRegion] = useState<SanctuaryRegionId>('home-grove');
  const [hoveredRegion, setHoveredRegion] = useState<SanctuaryRegionId | null>(null);
  const [requestedRegion, setRequestedRegion] = useState<SanctuaryRegionId | null>(null);
  const [requestedRegionKey, setRequestedRegionKey] = useState(0);
  const [worldMessage, setWorldMessage] = useState<WorldMessage | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [period, setPeriod] = useState(() => sanctuaryDayPeriod());
  const [dayProgress, setDayProgress] = useState(() => sanctuaryDayProgress());
  const [audioNeedsGesture, setAudioNeedsGesture] = useState(false);
  const [introPrompted, setIntroPrompted] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const arrivalDialogRef = useDialogFocus<HTMLElement>(introOpen, dismissIntro);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [stillness, setStillness] = useState(false);
  const [freeExplore, setFreeExplore] = useState(false);
  const [stillViewIndex, setStillViewIndex] = useState(0);
  const [stillCameraKey, setStillCameraKey] = useState(0);
  const [stillHudPulse, setStillHudPulse] = useState(0);
  const [stillHudVisible, setStillHudVisible] = useState(true);

  const reducedMotion = useReducedMotionPreference(settings?.reducedMotion ?? false);
  const theme = settings?.gardenTheme ?? 'verdant-sanctuary';
  const activeGardenTheme = getGardenTheme(theme);
  const quality = settings?.sanctuaryQuality ?? 'auto';
  const discoveredSecrets = settings?.sanctuaryDiscoveries ?? [];
  const visibleSecrets = useMemo(() => visibleSanctuarySecrets(living, period), [living, period]);
  const unlockedAchievements = useMemo(
    () => achievementDefinitions.filter(definition => unlockedAchievementIds.includes(definition.id)),
    [unlockedAchievementIds]
  );
  const ambientZone = useMemo(
    () => sanctuaryAudioZoneFor(focusedRegion, stillness ? (sanctuaryStillViews[stillViewIndex]?.id ?? null) : null),
    [focusedRegion, stillViewIndex, stillness]
  );

  useEffect(() => {
    let alive = true;
    void Promise.all([ensureGarden(), ensureSettings()]).catch(error => console.warn('Sanctuary local state could not be initialized.', error));
    const gardenSubscription = liveQuery(() => db.garden.get('main')).subscribe({
      next: nextGarden => { if (alive) setGarden(nextGarden ?? null); },
      error: error => console.warn('Sanctuary Garden growth could not refresh.', error)
    });
    const settingsSubscription = liveQuery(() => db.settings.get('main')).subscribe({
      next: nextSettings => { if (alive && nextSettings) setSettings(nextSettings); },
      error: error => console.warn('Sanctuary settings could not refresh.', error)
    });
    return () => {
      alive = false;
      gardenSubscription.unsubscribe();
      settingsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = liveQuery(() => loadSanctuaryLivingState()).subscribe({
      next: setLiving,
      error: error => console.warn('Sanctuary living-world projection could not refresh.', error)
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    const reconcile = () => {
      void syncAchievements().then(state => {
        if (!alive || !state.newlyUnlocked.length) return;
        const newest = state.newlyUnlocked[state.newlyUnlocked.length - 1];
        setWorldMessage({
          label: 'ACHIEVEMENT · NEW LANDMARK',
          title: `${newest.definition.title} has appeared in the Sanctuary.`,
          detail: newest.definition.rewardLabel
        });
      }).catch(error => console.warn('Sanctuary achievement sync could not refresh.', error));
    };

    const sourceSubscription = liveQuery(() => Promise.all([
      db.tasks.toArray(),
      db.proofItems.toArray(),
      db.weeklyReflections.toArray(),
      db.careerApplications.toArray()
    ])).subscribe({
      next: reconcile,
      error: error => console.warn('Sanctuary achievement sources could not refresh.', error)
    });
    const unlockSubscription = liveQuery(() => db.achievementUnlocks.toArray()).subscribe({
      next: unlocks => { if (alive) setUnlockedAchievementIds(unlocks.map(unlock => unlock.achievementId)); },
      error: error => console.warn('Sanctuary landmarks could not refresh.', error)
    });
    return () => {
      alive = false;
      sourceSubscription.unsubscribe();
      unlockSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncLocalLight = () => {
      const now = new Date();
      setPeriod(sanctuaryDayPeriod(now));
      setDayProgress(sanctuaryDayProgress(now));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncLocalLight();
    };
    const timer = window.setInterval(syncLocalLight, 60_000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', syncLocalLight);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', syncLocalLight);
    };
  }, []);

  useEffect(() => {
    if (!stillness) {
      setStillHudVisible(true);
      return;
    }
    setStillHudVisible(true);
    const timer = window.setTimeout(() => setStillHudVisible(false), 4800);
    return () => window.clearTimeout(timer);
  }, [stillness, stillHudPulse, stillViewIndex]);

  useEffect(() => {
    if (!settings || introPrompted) return;
    setIntroPrompted(true);
    if (!settings.sanctuaryIntroSeen) setIntroOpen(true);
  }, [introPrompted, settings]);

  useEffect(() => {
    if (tourStep === null) return;
    const step = SANCTUARY_TOUR[tourStep];
    if (!step) { setTourStep(null); return; }
    setFocusedRegion(step.region);
    setHoveredRegion(null);
    setRequestedRegion(step.region);
    setRequestedRegionKey(key => key + 1);
    setWorldMessage({ label: step.label, title: step.title, detail: step.detail });
    const timer = window.setTimeout(() => {
      if (tourStep >= SANCTUARY_TOUR.length - 1) {
        setTourStep(null);
        setWorldMessage({ label: 'SANCTUARY · YOURS', title: 'That is all you need to know.', detail: 'Explore when you are curious. Sit when you want nothing from the app at all.' });
      } else {
        setTourStep(current => current === null ? null : current + 1);
      }
    }, reducedMotion ? 3600 : 5200);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, tourStep]);

  useEffect(() => {
    if (!settings?.sanctuaryAmbientSound) {
      setAudioNeedsGesture(false);
      stopSanctuaryAmbience();
      return;
    }
    let cancelled = false;
    void startSanctuaryAmbience(theme, period, ambientZone).then(started => {
      if (!cancelled) setAudioNeedsGesture(!started);
    });
    return () => {
      cancelled = true;
      stopSanctuaryAmbience();
    };
  }, [ambientZone, period, settings?.sanctuaryAmbientSound, theme]);

  const stage = plantStage(garden?.growth ?? 0);
  const stageIndex = stageIndexFor(stage.label);
  const visibleRegionId = hoveredRegion ?? focusedRegion;
  const visibleRegion = useMemo(() => sanctuaryRegionById[visibleRegionId], [visibleRegionId]);
  const visibleNarrative = useMemo(
    () => sanctuaryRegionNarrative(visibleRegionId, living),
    [living, visibleRegionId]
  );

  async function patchSettings(patch: Partial<Omit<UserSettings, 'id'>>) {
    const next = await updateSettings(patch);
    setSettings(next);
  }

  function travel(region: SanctuaryRegionId) {
    setFreeExplore(false);
    setFocusedRegion(region);
    setHoveredRegion(null);
    setWorldMessage(null);
    setRequestedRegion(region);
    setRequestedRegionKey(key => key + 1);
    if (settings?.sanctuaryEffectsSound) void playSanctuaryTone('travel');
  }

  function interactArtifact(definition: AchievementDefinition) {
    const placement = sanctuaryArtifactPlacementById[definition.id];
    if (placement) setFocusedRegion(placement.region);
    setWorldMessage({
      label: 'ACHIEVEMENT · WORLD OBJECT',
      title: sanctuaryArtifactMessage(definition),
      detail: 'This object is earned from your existing Ikigai Space history. It is not a separate collectible you need to maintain.'
    });
    if (settings?.sanctuaryEffectsSound) void playSanctuaryTone('artifact');
  }

  async function interactSecret(id: SanctuarySecretId) {
    const secret = sanctuarySecretById[id];
    const alreadyFound = discoveredSecrets.includes(id);
    setFocusedRegion(secret.region);
    setWorldMessage({
      label: alreadyFound ? 'DISCOVERY · REMEMBERED' : 'DISCOVERY · FOUND',
      title: alreadyFound ? secret.found : secret.title,
      detail: alreadyFound ? secret.hint : secret.found
    });
    if (!alreadyFound) {
      // Read the latest setting before writing so two quick discoveries cannot
      // overwrite one another through a stale React render.
      const latest = await ensureSettings();
      const discoveries = Array.from(new Set([...latest.sanctuaryDiscoveries, id]));
      await patchSettings({ sanctuaryDiscoveries: discoveries });
      if (settings?.sanctuaryEffectsSound) void playSanctuaryTone('secret');
    } else if (settings?.sanctuaryEffectsSound) {
      void playSanctuaryTone('artifact');
    }
  }

  async function resumeAmbience() {
    if (!settings?.sanctuaryAmbientSound) return;
    const started = await startSanctuaryAmbience(theme, period, ambientZone);
    setAudioNeedsGesture(!started);
  }

  function rememberSanctuaryIntro() {
    if (settings?.sanctuaryIntroSeen) return;
    void patchSettings({ sanctuaryIntroSeen: true });
  }

  function beginTour() {
    setFreeExplore(false);
    rememberSanctuaryIntro();
    setIntroOpen(false);
    setControlsOpen(false);
    setStillness(false);
    setTourStep(0);
  }

  function dismissIntro() {
    rememberSanctuaryIntro();
    setIntroOpen(false);
  }

  function stopTour() {
    setTourStep(null);
    setWorldMessage({ label: 'SANCTUARY · YOURS', title: 'Explore at your own pace.', detail: 'The world is a reflection of existing Ikigai Space data, not another system you need to maintain.' });
  }

  function advanceTour() {
    setTourStep(current => {
      if (current === null) return null;
      if (current >= SANCTUARY_TOUR.length - 1) {
        setWorldMessage({ label: 'SANCTUARY · YOURS', title: 'That is all you need to know.', detail: 'Explore when you are curious. Sit when you want nothing from the app at all.' });
        return null;
      }
      return current + 1;
    });
  }

  function enterStillness(viewId?: SanctuaryStillViewId) {
    setFreeExplore(false);
    rememberSanctuaryIntro();
    setIntroOpen(false);
    setTourStep(null);
    setControlsOpen(false);
    setWorldMessage(null);
    if (viewId) {
      const nextIndex = sanctuaryStillViews.findIndex(view => view.id === viewId);
      if (nextIndex >= 0) setStillViewIndex(nextIndex);
    }
    setStillness(true);
    setStillCameraKey(key => key + 1);
  }

  function enterTeaHouse() {
    document.body.style.cursor = '';
    setWorldMessage({
      label: 'LANTERN STREET · TEA HOUSE',
      title: 'The door is open. Nothing is waiting to be completed inside.',
      detail: 'This little room exists only as part of the Sanctuary. Sit by the warm window for as long as you want.'
    });
    enterStillness('tea-house');
  }

  function revealStillnessHud() {
    if (!stillness) return;
    setStillHudPulse(pulse => pulse + 1);
  }

  function cycleStillnessView() {
    setStillViewIndex(index => (index + 1) % sanctuaryStillViews.length);
    setStillCameraKey(key => key + 1);
  }

  function leaveStillness() {
    setStillness(false);
    setRequestedRegion(focusedRegion);
    setRequestedRegionKey(key => key + 1);
  }

  const stillView = sanctuaryStillViews[stillViewIndex];

  return (
    <div className={stillness ? "page sanctuary-page is-stillness" : "page sanctuary-page"}>
      <div className="ik-page-width sanctuary-page-width">
        {!stillness ? <PageHeader
          className="sanctuary-header"
          eyebrow={<><Sparkles size={14} /> SANCTUARY · A LIVING PLACE</>}
          title="A place that changes with you."
          description="A quiet place shaped by the life you record elsewhere in Ikigai Space. Explore it, sit for a while, or leave it open and let the world simply be."
          actions={
            <div className="sanctuary-growth-chip" title="Your original Garden growth remains represented by the Guardian Tree.">
              <Trees size={17} aria-hidden="true" />
              <span><small>Guardian Tree</small><strong>{stage.label}</strong></span>
            </div>
          }
        /> : null}

        {!stillness ? <div className="sanctuary-world-bar">
          <div className="sanctuary-world-bar-current">
            <span className="sanctuary-world-bar-swatches" aria-hidden="true">{activeGardenTheme.swatches.map(color => <i key={color} style={{ background: color }} />)}</span>
            <div><small>WORLD ATMOSPHERE</small><strong>{activeGardenTheme.label}</strong><span>{activeGardenTheme.tagline}</span></div>
          </div>

          <div className="sanctuary-world-tools" onPointerDown={event => event.stopPropagation()}>
            <button type="button" className="sanctuary-sit-trigger" onClick={() => enterStillness()}>
              <Moon size={14} aria-hidden="true" />
              <span>Sit</span>
            </button>
            <button
              type="button"
              className={controlsOpen ? 'sanctuary-world-tools-trigger is-open' : 'sanctuary-world-tools-trigger'}
              aria-expanded={controlsOpen}
              aria-controls="sanctuary-world-controls"
              onClick={() => setControlsOpen(value => !value)}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              <span>World settings</span>
            </button>

            {controlsOpen ? (
              <aside id="sanctuary-world-controls" className="sanctuary-world-controls" aria-label="Sanctuary world controls">
                <header>
                  <div><span>WORLD SETTINGS</span><strong>Atmosphere, sound & quality</strong></div>
                  <button type="button" aria-label="Close world controls" onClick={() => setControlsOpen(false)}><X size={14} /></button>
                </header>

                <section>
                  <div className="sanctuary-world-control-heading"><Palette size={13} /><div><strong>Garden atmosphere</strong><small>Changes planting, garden objects, weather, materials and light while keeping the same earned world.</small></div></div>
                  <div className="sanctuary-theme-grid" role="radiogroup" aria-label="Sanctuary atmosphere">
                    {gardenThemes.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={theme === option.id}
                        className={theme === option.id ? 'is-selected' : ''}
                        onClick={() => { void patchSettings({ gardenTheme: option.id }); }}
                      >
                        <span className="sanctuary-theme-swatches" aria-hidden="true">{option.swatches.map(color => <i key={color} style={{ background: color }} />)}</span>
                        <strong>{option.label}</strong>
                        <small>{option.tagline}</small>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="sanctuary-world-control-heading"><Volume2 size={13} /><div><strong>Soundscape</strong><small>Generated locally in the browser. No audio is streamed.</small></div></div>
                  <label className="sanctuary-world-toggle">
                    <span><strong>Ambient world</strong><small>{audioNeedsGesture ? 'Tap the world once to let the browser start audio.' : 'Soft local sound bed that changes gently between grove, water, pavilion, street and lookout.'}</small></span>
                    <input type="checkbox" checked={settings?.sanctuaryAmbientSound ?? false} onChange={event => { void patchSettings({ sanctuaryAmbientSound: event.target.checked }); }} />
                  </label>
                  <label className="sanctuary-world-toggle">
                    <span><strong>Interaction tones</strong><small>Small cues for travel, landmarks and discoveries.</small></span>
                    <input type="checkbox" checked={settings?.sanctuaryEffectsSound ?? false} onChange={event => { void patchSettings({ sanctuaryEffectsSound: event.target.checked }); }} />
                  </label>
                </section>

                <section>
                  <div className="sanctuary-world-control-heading"><Gauge size={13} /><div><strong>Rendering</strong><small>Auto uses device capacity; Balanced reduces detail; Lush keeps the full scene budget.</small></div></div>
                  <div className="sanctuary-quality-row" role="radiogroup" aria-label="Sanctuary rendering quality">
                    {(['auto', 'balanced', 'lush'] as const).map(option => (
                      <button key={option} type="button" role="radio" aria-checked={quality === option} className={quality === option ? 'is-selected' : ''} onClick={() => { void patchSettings({ sanctuaryQuality: option }); }}>{option}</button>
                    ))}
                  </div>
                </section>

                <button type="button" className="sanctuary-tour-replay" onClick={beginTour}><Sparkles size={12} aria-hidden="true" /><span><strong>Take the guided walk</strong><small>Five short stops explain what changes here and why.</small></span><ChevronRight size={13} aria-hidden="true" /></button>

                <footer>
                  <span>{period} · live local light</span>
                  <span>landmarks emerge from your history · discoveries stay optional</span>
                </footer>
              </aside>
            ) : null}
          </div>
        </div> : null}

        <section
          className={stillness ? "sanctuary-stage sanctuary-depth-stage is-stillness" : "sanctuary-stage sanctuary-depth-stage"}
          aria-label="Living Sanctuary"
          onPointerDownCapture={() => { if (audioNeedsGesture) void resumeAmbience(); revealStillnessHud(); }}
          onPointerMoveCapture={revealStillnessHud}
          onKeyDownCapture={revealStillnessHud}
        >
          <SanctuaryWorld
            growth={garden?.growth ?? 0}
            stageIndex={stageIndex}
            livingState={living}
            reducedMotion={reducedMotion}
            familiarEnabled={settings?.familiarEnabled ?? true}
            familiarColor={settings?.familiarColor ?? 'mint'}
            familiarDesign={settings?.familiarDesign ?? 'sprout'}
            familiarTheme={settings?.familiarTheme ?? 'natural'}
            familiarActivity={settings?.familiarActivity ?? 'calm'}
            familiarName={settings?.familiarName ?? 'Familiar'}
            requestedRegion={requestedRegion}
            requestedRegionKey={requestedRegionKey}
            requestedCamera={stillness ? stillView.camera : null}
            requestedCameraKey={stillCameraKey}
            interactionMode={stillness ? 'stillness' : 'explore'}
            freeExplore={!stillness && freeExplore}
            stillnessViewId={stillness ? stillView.id : null}
            theme={theme}
            period={period}
            dayProgress={dayProgress}
            quality={quality}
            unlockedAchievements={unlockedAchievements}
            visibleSecrets={visibleSecrets}
            discoveredSecrets={discoveredSecrets}
            onRegionFocus={region => { setFocusedRegion(region); setWorldMessage(null); }}
            onRegionHover={setHoveredRegion}
            onArtifactInteract={interactArtifact}
            onSecretInteract={id => { void interactSecret(id); }}
            onStillnessRequest={enterStillness}
            onTeaHouseInteract={enterTeaHouse}
            onFreeExploreExit={() => setFreeExplore(false)}
            onFamiliarInteract={() => {
              setWorldMessage({
                label: 'FAMILIAR · RESIDENT',
                title: `${settings?.familiarName ?? 'Familiar'} lives here too.`,
                detail: 'The Sanctuary resident shares the same form, aura and presence settings as the page Familiar. Open Together for local context or Talk when you actually want AI conversation.'
              });
              openFamiliar('together');
            }}
          />

          {!stillness ? <div className="sanctuary-world-title" aria-hidden="true">
            <span>IKIGAI SPACE SANCTUARY · {sanctuaryThemeMood(theme, period).toUpperCase()}</span>
            <strong>{visibleRegion.label}</strong>
          </div> : null}

          {!stillness ? <div className="sanctuary-context" role="status" aria-live="polite">
            <div>
              <span>{worldMessage?.label ?? visibleRegion.shortLabel.toUpperCase()}</span>
              <strong>{worldMessage?.title ?? visibleRegion.description}</strong>
              <small>{worldMessage?.detail ?? visibleNarrative}</small>
            </div>
          </div> : null}

          {!stillness && !introOpen && tourStep === null ? <div className="sanctuary-world-hint" aria-hidden="true">
            {freeExplore ? <><span>WASD to wander</span><i /><span>drag to look</span><i /><span>Esc to exit</span></> : <><span>drag to look</span><i /><span>click a bench to sit</span><i /><span>the tea house is open</span></>}
          </div> : null}

          {introOpen ? <div className="sanctuary-arrival-backdrop" role="presentation">
            <section ref={arrivalDialogRef} tabIndex={-1} className="sanctuary-arrival" role="dialog" aria-modal="true" aria-labelledby="sanctuary-arrival-title">
              <span>WELCOME TO YOUR SANCTUARY</span>
              <h2 id="sanctuary-arrival-title">This place grows from the life you already live in Ikigai Space.</h2>
              <p>You do not need to maintain anything here. Work, reflection, memories and long-term progress quietly change the world for you. Benches let you sit; the street and tea house are simply here when you want somewhere to stay.</p>
              <div><button type="button" className="primary" onClick={beginTour}>Walk with me <ChevronRight size={14} /></button><button type="button" onClick={dismissIntro}>Let me explore</button></div>
            </section>
          </div> : null}

          {tourStep !== null ? <div className="sanctuary-tour-card" role="status" aria-live="polite">
            <div className="sanctuary-tour-progress" aria-hidden="true">{SANCTUARY_TOUR.map((_, index) => <i key={index} className={index <= tourStep ? 'is-on' : ''} />)}</div>
            <span>{SANCTUARY_TOUR[tourStep]?.label}</span>
            <strong>{SANCTUARY_TOUR[tourStep]?.title}</strong>
            <small>{SANCTUARY_TOUR[tourStep]?.detail}</small>
            <div><button type="button" onClick={stopTour}>Skip</button><button type="button" onClick={advanceTour}>{tourStep >= SANCTUARY_TOUR.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={12} /></button></div>
          </div> : null}

          {stillness ? <div className={`sanctuary-stillness-hud ${stillHudVisible ? 'is-visible' : 'is-hidden'}`}>
            <div><span>STILLNESS · {stillView.label.toUpperCase()}</span><strong>{stillView.note}</strong></div>
            <div className="sanctuary-stillness-actions"><button type="button" onClick={cycleStillnessView}>Change view</button><button type="button" className="primary" onClick={leaveStillness}>Return</button></div>
          </div> : null}

        </section>

        {!stillness ? <nav className={`sanctuary-region-strip ${freeExplore ? 'is-free-explore' : ''}`} aria-label="Sanctuary regions">
          <span className="sanctuary-region-strip-label"><Compass size={15} /> Explore</span>
          <button type="button" className="sanctuary-free-explore-toggle" aria-pressed={freeExplore} onClick={() => setFreeExplore(current => !current)}>
            <span>{freeExplore ? 'Free explore on' : 'Free explore'}</span>
            <small>{freeExplore ? 'WASD · drag · wheel · Esc' : 'Wander inside the island boundary'}</small>
          </button>
          <div>
            {sanctuaryRegions.map((region, index) => (
              <button
                key={region.id}
                type="button"
                className={focusedRegion === region.id ? 'is-active' : ''}
                aria-pressed={focusedRegion === region.id}
                onClick={() => travel(region.id)}
                title={region.meaning}
              >
                <span>{index + 1}</span>
                <strong>{region.shortLabel}</strong>
              </button>
            ))}
          </div>
        </nav> : null}

        {!stillness ? <section className="sanctuary-explainer" aria-label="How Sanctuary grows">
          <article>
            <Leaf size={18} aria-hidden="true" />
            <div><span>YOUR LIFE LEAVES TRACES</span><strong>Progress becomes scenery instead of another list.</strong><p>Milestones can appear as quiet landmarks, while everyday work, reflection and memory change the atmosphere without giving you another place to maintain.</p></div>
          </article>
          <article>
            {settings?.sanctuaryAmbientSound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            <div><span>NOTHING TO COMPLETE HERE</span><strong>Time and atmosphere can be enough.</strong><p>Sanctuary follows your local light, keeps discoveries optional, and gives you places to sit without turning rest into another metric.</p></div>
          </article>
        </section> : null}
      </div>
    </div>
  );
}
