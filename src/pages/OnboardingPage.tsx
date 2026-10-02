import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  GraduationCap,
  HeartPulse,
  Info,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Sprout,
  UserRound,
  WandSparkles,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gardenThemes } from '../data/gardenThemes';
import { journeyThemes } from '../data/journeyThemes';
import { paperThemes } from '../data/paperThemes';
import { appThemes, isLightAppTheme } from '../data/themes';
import { completeOnboardingSetup } from '../lib/onboarding';
import { ensureSettings } from '../lib/settings';
import { IkigaiMark } from '../components/IkigaiMark';
import type {
  AppTheme,
  DailyPageTheme,
  FamiliarActivity,
  FamiliarColor,
  FamiliarDesign,
  FamiliarSide,
  FamiliarTheme,
  GardenTheme,
  InterfaceFont,
  InterfaceScale,
  InterfaceStyle,
  InterfaceTextScale,
  JourneyCalendarTheme,
  MilestoneKind,
  SanctuaryQuality,
  TaskCategory,
  UserSettings
} from '../types';
import '../onboarding-v050.css';

const focusOptions: Array<{ id: TaskCategory; label: string; detail: string; icon: typeof BrainCircuit }> = [
  { id: 'Projects', label: 'Projects', detail: 'Things you want to make or ship', icon: Rocket },
  { id: 'Learning', label: 'Learning', detail: 'Skills, reading, practice, curiosity', icon: BrainCircuit },
  { id: 'Study', label: 'Study', detail: 'Classes, exams, coursework, research', icon: GraduationCap },
  { id: 'Career', label: 'Career', detail: 'Work, applications, portfolio, proof', icon: BriefcaseBusiness },
  { id: 'Health', label: 'Health', detail: 'Energy, movement, rest, recovery', icon: HeartPulse },
  { id: 'Personal', label: 'Personal', detail: 'Life outside the checklist', icon: Sparkles }
];

const interfaceStyles: Array<{ value: InterfaceStyle; label: string; note: string }> = [
  { value: 'soft', label: 'Soft', note: 'Rounded and layered' },
  { value: 'quiet', label: 'Quiet', note: 'Low chrome' },
  { value: 'structured', label: 'Structured', note: 'Sharper frames' }
];
const interfaceScales: Array<{ value: InterfaceScale; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'large', label: 'Roomy' },
  { value: 'oversized', label: 'Extra roomy' }
];
const textScales: Array<{ value: InterfaceTextScale; label: string }> = [
  { value: 'small', label: '90%' },
  { value: 'default', label: '100%' },
  { value: 'large', label: '115%' },
  { value: 'xlarge', label: '130%' }
];
const interfaceFonts: Array<{ value: InterfaceFont; label: string }> = [
  { value: 'theme', label: 'Theme' },
  { value: 'modern', label: 'Modern' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'humanist', label: 'Humanist' },
  { value: 'technical', label: 'Technical' }
];

const familiarDesigns: Array<{ value: FamiliarDesign; label: string }> = [
  { value: 'sprout', label: 'Sprout' },
  { value: 'wisp', label: 'Wisp' },
  { value: 'mossling', label: 'Mossling' }
];
const familiarColors: Array<{ value: FamiliarColor; label: string }> = [
  { value: 'mint', label: 'Mint' },
  { value: 'sakura', label: 'Sakura' },
  { value: 'amber', label: 'Amber' },
  { value: 'lunar', label: 'Lunar' }
];
const familiarMaterials: Array<{ value: FamiliarTheme; label: string }> = [
  { value: 'natural', label: 'Ceramic' },
  { value: 'terracotta', label: 'Terracotta' },
  { value: 'moss', label: 'Moss' },
  { value: 'dream', label: 'Moonstone' },
  { value: 'minimal', label: 'Ink clay' }
];
const familiarActivities: Array<{ value: FamiliarActivity; label: string; note: string }> = [
  { value: 'still', label: 'Quiet', note: 'Minimal autonomous motion' },
  { value: 'calm', label: 'Nearby', note: 'Calm default presence' },
  { value: 'lively', label: 'Playful', note: 'More expressive idle movement' },
  { value: 'hidden', label: 'Home only', note: 'Companion + Sanctuary only' }
];

interface DraftDate {
  id: string;
  title: string;
  date: string;
  kind: MilestoneKind;
  category: TaskCategory;
}

function newDraftDate(): DraftDate {
  return { id: crypto.randomUUID(), title: '', date: '', kind: 'event', category: 'Personal' };
}

const steps = ['Arrival', 'You', 'Chapter', 'Dates', 'Comfort', 'Familiar', 'Atmosphere', 'Paper', 'Ready'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [existing, setExisting] = useState<UserSettings | null>(null);
  const [profileName, setProfileName] = useState('');
  const [chapterIntent, setChapterIntent] = useState('');
  const [focusAreas, setFocusAreas] = useState<TaskCategory[]>([]);
  const [importantDates, setImportantDates] = useState<DraftDate[]>([newDraftDate()]);
  const [appTheme, setAppTheme] = useState<AppTheme>('midnight-grove');
  const [paperTheme, setPaperTheme] = useState<DailyPageTheme>('himekuri');
  const [journeyCalendarTheme, setJourneyCalendarTheme] = useState<JourneyCalendarTheme>('nihon-sakura');
  const [interfaceStyle, setInterfaceStyle] = useState<InterfaceStyle>('soft');
  const [interfaceScale, setInterfaceScale] = useState<InterfaceScale>('balanced');
  const [interfaceFont, setInterfaceFont] = useState<InterfaceFont>('theme');
  const [interfaceTextScale, setInterfaceTextScale] = useState<InterfaceTextScale>('default');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showGuideButtons, setShowGuideButtons] = useState(true);
  const [showGuideKeyboardHints, setShowGuideKeyboardHints] = useState(true);
  const [showDailyPage, setShowDailyPage] = useState(true);
  const [familiarActivity, setFamiliarActivity] = useState<FamiliarActivity>('calm');
  const [familiarDesign, setFamiliarDesign] = useState<FamiliarDesign>('sprout');
  const [familiarColor, setFamiliarColor] = useState<FamiliarColor>('mint');
  const [familiarTheme, setFamiliarTheme] = useState<FamiliarTheme>('natural');
  const [familiarName, setFamiliarName] = useState('Familiar');
  const [familiarSide, setFamiliarSide] = useState<FamiliarSide>('right');
  const [familiarReactions, setFamiliarReactions] = useState(true);
  const [familiarSounds, setFamiliarSounds] = useState(false);
  const [familiarContextHints, setFamiliarContextHints] = useState(true);
  const [familiarPlay, setFamiliarPlay] = useState(true);
  const [gardenTheme, setGardenTheme] = useState<GardenTheme>('verdant-sanctuary');
  const [sanctuaryQuality, setSanctuaryQuality] = useState<SanctuaryQuality>('auto');
  const [sanctuaryAmbientSound, setSanctuaryAmbientSound] = useState(false);
  const [sanctuaryEffectsSound, setSanctuaryEffectsSound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const completedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void ensureSettings().then(settings => {
      if (!alive) return;
      setExisting(settings);
      setProfileName(settings.profileName ?? '');
      setChapterIntent(settings.chapterIntent ?? '');
      setFocusAreas(settings.focusAreas ?? []);
      setAppTheme(settings.appTheme);
      setPaperTheme(settings.dailyPageTheme);
      setJourneyCalendarTheme(settings.journeyCalendarTheme);
      setInterfaceStyle(settings.interfaceStyle);
      setInterfaceScale(settings.interfaceScale);
      setInterfaceFont(settings.interfaceFont);
      setInterfaceTextScale(settings.interfaceTextScale);
      setReducedMotion(settings.reducedMotion);
      setShowGuideButtons(settings.showGuideButtons);
      setShowGuideKeyboardHints(settings.showGuideKeyboardHints);
      setShowDailyPage(settings.showDailyPage);
      setFamiliarActivity(settings.familiarActivity);
      setFamiliarDesign(settings.familiarDesign);
      setFamiliarColor(settings.familiarColor);
      setFamiliarTheme(settings.familiarTheme);
      setFamiliarName(settings.familiarName);
      setFamiliarSide(settings.familiarSide);
      setFamiliarReactions(settings.familiarReactions);
      setFamiliarSounds(settings.familiarSounds);
      setFamiliarContextHints(settings.familiarContextHints);
      setFamiliarPlay(settings.familiarPlay);
      setGardenTheme(settings.gardenTheme);
      setSanctuaryQuality(settings.sanctuaryQuality);
      setSanctuaryAmbientSound(settings.sanctuaryAmbientSound);
      setSanctuaryEffectsSound(settings.sanctuaryEffectsSound);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.dataset.ikigaiTheme = appTheme;
    root.dataset.ikigaiUiStyle = interfaceStyle;
    root.dataset.ikigaiUiScale = interfaceScale;
    root.dataset.ikigaiFont = interfaceFont;
    root.dataset.ikigaiTextScale = interfaceTextScale;
    root.dataset.ikigaiMotion = reducedMotion ? 'reduced' : 'full';
    root.style.colorScheme = isLightAppTheme(appTheme) ? 'light' : 'dark';
    return () => {
      if (!completedRef.current && existing) {
        root.dataset.ikigaiTheme = existing.appTheme;
        root.dataset.ikigaiUiStyle = existing.interfaceStyle;
        root.dataset.ikigaiUiScale = existing.interfaceScale;
        root.dataset.ikigaiFont = existing.interfaceFont;
        root.dataset.ikigaiTextScale = existing.interfaceTextScale;
        root.dataset.ikigaiMotion = existing.reducedMotion ? 'reduced' : 'full';
        root.style.colorScheme = isLightAppTheme(existing.appTheme) ? 'light' : 'dark';
      }
    };
  }, [appTheme, existing, interfaceFont, interfaceScale, interfaceStyle, interfaceTextScale, loaded, reducedMotion]);

  const selectedPaper = useMemo(() => paperThemes.find(theme => theme.id === paperTheme) ?? paperThemes[0], [paperTheme]);
  const selectedAppTheme = useMemo(() => appThemes.find(theme => theme.id === appTheme) ?? appThemes[0], [appTheme]);
  const selectedJourneyTheme = useMemo(() => journeyThemes.find(theme => theme.id === journeyCalendarTheme) ?? journeyThemes[0], [journeyCalendarTheme]);
  const selectedGardenTheme = useMemo(() => gardenThemes.find(theme => theme.id === gardenTheme) ?? gardenThemes[0], [gardenTheme]);
  const protectedDateCount = useMemo(() => importantDates.filter(item => item.title.trim() && item.date).length, [importantDates]);

  function toggleFocus(area: TaskCategory) {
    setFocusAreas(current => current.includes(area) ? current.filter(item => item !== area) : [...current, area]);
  }

  function updateDate(id: string, patch: Partial<DraftDate>) {
    setImportantDates(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function nextStep() {
    setStep(current => Math.min(steps.length - 1, current + 1));
  }

  async function finish() {
    if (saving) return;
    setSaveError('');

    if (preview) {
      navigate(-1);
      return;
    }

    setSaving(true);
    try {
      await completeOnboardingSetup({
        profileName,
        appTheme,
        interfaceStyle,
        interfaceScale,
        interfaceFont,
        interfaceTextScale,
        reducedMotion,
        showGuideButtons,
        showGuideKeyboardHints,
        showDailyPage,
        dailyPageTheme: paperTheme,
        journeyCalendarTheme,
        chapterIntent,
        focusAreas,
        familiarActivity,
        familiarDesign,
        familiarColor,
        familiarTheme,
        familiarName,
        familiarSide,
        familiarReactions,
        familiarSounds,
        familiarContextHints,
        familiarPlay,
        gardenTheme,
        sanctuaryQuality,
        sanctuaryAmbientSound,
        sanctuaryEffectsSound,
        importantDates
      });
      completedRef.current = true;
      navigate('/', { replace: true });
    } catch (cause) {
      console.error('Ikigai onboarding could not be finalized.', cause);
      setSaveError('Ikigai could not save your setup. Nothing was finalized, so it is safe to try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div className="onboarding-boot"><span className="onboarding-boot-mark"><IkigaiMark /></span><p>Waking Ikigai…</p></div>;

  return (
    <div className="onboarding-world">
      <div className="onboarding-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="onboarding-grain" aria-hidden="true" />

      <header className="onboarding-topbar">
        <button className="onboarding-brand" type="button" onClick={() => preview && navigate(-1)} aria-label="Ikigai OS">
          <span className="onboarding-brand-mark"><IkigaiMark /></span><div><b>Ikigai OS</b><small>{preview ? 'welcome preview' : 'first light'}</small></div>
        </button>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((label, index) => <i key={label} className={index <= step ? 'active' : ''} title={label} />)}
        </div>
        {preview ? <button className="onboarding-exit" type="button" onClick={() => navigate(-1)}><X size={15} /> Exit preview</button> : <span className="onboarding-private"><ShieldCheck size={14} /> local-first</span>}
      </header>

      <main className="onboarding-stage">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section key="arrival" className="onboarding-step arrival-step" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="arrival-symbol" aria-hidden="true"><span><IkigaiMark /></span><i /></div>
              <div className="arrival-copy">
                <span className="onboarding-kicker">WELCOME TO YOUR FIRST CHAPTER</span>
                <h1>Your days already pass.<br /><em>Give them somewhere to live.</em></h1>
                <p>First Light is optional setup, not an intake form. Tell Ikigai what is useful, skip what is not, and change any preference later.</p>
                <aside className="onboarding-privacy-card" aria-label="Local data and encryption disclosure">
                  <ShieldCheck size={18} />
                  <div><strong>Your data, plainly.</strong><p>Life data is stored in this browser with IndexedDB. Ikigai does <b>not</b> add application-level encryption at rest, and exported JSON backups are readable files. SHA-256 checksums protect backup integrity; they do not hide the contents. Passwords, API keys and provider tokens are deliberately not requested in this tour.</p></div>
                </aside>
                <button className="onboarding-primary" type="button" onClick={nextStep}>Begin <ArrowRight size={18} /></button>
              </div>
              <div className="arrival-foot"><span>Add only what helps.</span><span>Skip anything.</span><span>No cloud account required.</span></div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section key="you" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">01 · YOU</span><h2>How should this place greet you?</h2><p>A name or nickname is enough. It is used for small local touches such as Today’s greeting; it is not required.</p><small className="onboarding-optional">Optional · leave this blank for neutral greetings.</small></div>
              <div className="onboarding-profile-layout">
                <label className="onboarding-profile-card">
                  <UserRound size={22} />
                  <span>Preferred name or nickname</span>
                  <input value={profileName} maxLength={48} onChange={event => setProfileName(event.target.value)} placeholder="What should Ikigai call you?" />
                  <small>{profileName.trim() ? `Today can say “Good evening, ${profileName.trim().slice(0, 48)}.”` : 'No name stored · generic greetings stay exactly as they are.'}</small>
                </label>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="chapter" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">02 · YOUR CHAPTER</span><h2>What deserves to grow with you?</h2><p>Choose only the areas you want Ikigai to make visible. A sentence can give the current chapter a little context.</p><small className="onboarding-optional">Optional · leave the sentence and focus areas blank if you would rather decide later.</small></div>
              <div className="chapter-layout">
                <label className="chapter-intent-card">
                  <span>One sentence for this chapter</span>
                  <textarea value={chapterIntent} onChange={event => setChapterIntent(event.target.value)} maxLength={180} placeholder="e.g. Make more room for the work and people that matter." />
                  <small>{chapterIntent.length}/180 · optional</small>
                </label>
                <div className="focus-grid">
                  {focusOptions.map(option => {
                    const Icon = option.icon;
                    const selected = focusAreas.includes(option.id);
                    return <button type="button" key={option.id} className={selected ? 'focus-choice selected' : 'focus-choice'} onClick={() => toggleFocus(option.id)}><Icon size={18} /><span><b>{option.label}</b><small>{option.detail}</small></span>{selected && <Check size={15} />}</button>;
                  })}
                </div>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section key="dates" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">03 · PROTECT TIME</span><h2>Which dates should the system remember for you?</h2><p>Deadlines, events, appointments, launches, birthdays — add only dates that genuinely affect your plans.</p><small className="onboarding-optional">Optional · empty rows are ignored and no date becomes a task.</small></div>
              <div className="important-date-list">
                {importantDates.map((item, index) => (
                  <div className="important-date-row" key={item.id}>
                    <span className="date-row-number">{String(index + 1).padStart(2, '0')}</span>
                    <input aria-label="Date title" value={item.title} onChange={event => updateDate(item.id, { title: event.target.value })} placeholder="What happens?" />
                    <input aria-label="Date" type="date" value={item.date} onChange={event => updateDate(item.id, { date: event.target.value })} />
                    <select aria-label="Date type" value={item.kind} onChange={event => updateDate(item.id, { kind: event.target.value as MilestoneKind })}><option value="exam">Exam</option><option value="deadline">Deadline</option><option value="release">Release</option><option value="event">Event</option><option value="other">Other</option></select>
                    <button type="button" aria-label="Remove date" onClick={() => setImportantDates(current => current.filter(date => date.id !== item.id))}><X size={15} /></button>
                  </div>
                ))}
                {importantDates.length < 5 && <button type="button" className="add-date-row" onClick={() => setImportantDates(current => [...current, newDraftDate()])}><Plus size={16} /> Add another protected date</button>}
              </div>
              <div className="date-philosophy"><CalendarDays size={19} /><p>These become milestones, not daily tasks. Ikigai can surface what is approaching without turning every date into a checklist.</p></div>
            </motion.section>
          )}

          {step === 4 && (
            <motion.section key="comfort" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">04 · COMFORT</span><h2>Make the interface meet you halfway.</h2><p>These are presentation preferences only. Pick what feels comfortable, or skip the whole step and keep the defaults.</p><small className="onboarding-optional">Optional · changes preview immediately and remain editable in Settings.</small></div>
              <div className="onboarding-preference-grid">
                <fieldset className="onboarding-pref-card"><legend>Control style</legend><div className="onboarding-choice-row">{interfaceStyles.map(option => <button key={option.value} type="button" className={interfaceStyle === option.value ? 'selected' : ''} onClick={() => setInterfaceStyle(option.value)}><b>{option.label}</b><small>{option.note}</small></button>)}</div></fieldset>
                <fieldset className="onboarding-pref-card"><legend>Interface size</legend><div className="onboarding-choice-row four">{interfaceScales.map(option => <button key={option.value} type="button" className={interfaceScale === option.value ? 'selected' : ''} onClick={() => setInterfaceScale(option.value)}>{option.label}</button>)}</div></fieldset>
                <fieldset className="onboarding-pref-card"><legend>Text size</legend><div className="onboarding-choice-row four">{textScales.map(option => <button key={option.value} type="button" className={interfaceTextScale === option.value ? 'selected' : ''} onClick={() => setInterfaceTextScale(option.value)}>{option.label}</button>)}</div></fieldset>
                <fieldset className="onboarding-pref-card"><legend>Typography</legend><div className="onboarding-choice-row five">{interfaceFonts.map(option => <button key={option.value} type="button" className={interfaceFont === option.value ? 'selected' : ''} onClick={() => setInterfaceFont(option.value)}>{option.label}</button>)}</div></fieldset>
              </div>
              <div className="onboarding-toggle-grid">
                <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /><span><b>Reduce motion</b><small>Keep the interactions; remove unnecessary movement.</small></span></label>
                <label><input type="checkbox" checked={showGuideButtons} onChange={event => setShowGuideButtons(event.target.checked)} /><span><b>Room Guide buttons</b><small>Small help controls in the main rooms.</small></span></label>
                <label><input type="checkbox" checked={showGuideKeyboardHints} disabled={!showGuideButtons} onChange={event => setShowGuideKeyboardHints(event.target.checked)} /><span><b>Keyboard hints</b><small>Include shortcuts inside room Guides.</small></span></label>
                <label><input type="checkbox" checked={showDailyPage} onChange={event => setShowDailyPage(event.target.checked)} /><span><b>Morning Handoff</b><small>Offer one catch-up sheet when an older day is still open.</small></span></label>
              </div>
            </motion.section>
          )}

          {step === 5 && (
            <motion.section key="familiar" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">05 · FAMILIAR</span><h2>Would you like a small resident nearby?</h2><p>The Familiar is a local character layer, not a neediness mechanic. Name it, shape it, keep it quiet, or keep it home-only.</p><small className="onboarding-optional">Optional · every interaction toggle can be changed later.</small></div>
              <div className="onboarding-familiar-layout">
                <label className="onboarding-familiar-name"><span>Name</span><input value={familiarName} maxLength={28} onChange={event => setFamiliarName(event.target.value)} placeholder="Familiar" /><small>No AI is required for the Familiar to exist.</small></label>
                <fieldset><legend>Form</legend><div className="onboarding-choice-row">{familiarDesigns.map(option => <button key={option.value} type="button" className={familiarDesign === option.value ? 'selected' : ''} onClick={() => setFamiliarDesign(option.value)}>{option.label}</button>)}</div></fieldset>
                <fieldset><legend>Material</legend><div className="onboarding-choice-row">{familiarMaterials.map(option => <button key={option.value} type="button" className={familiarTheme === option.value ? 'selected' : ''} onClick={() => setFamiliarTheme(option.value)}>{option.label}</button>)}</div></fieldset>
                <fieldset><legend>Aura accent</legend><div className="onboarding-choice-row four">{familiarColors.map(option => <button key={option.value} type="button" className={familiarColor === option.value ? 'selected' : ''} onClick={() => setFamiliarColor(option.value)}>{option.label}</button>)}</div></fieldset>
                <fieldset className="familiar-presence-wide"><legend>Presence</legend><div className="onboarding-choice-row four">{familiarActivities.map(option => <button key={option.value} type="button" className={familiarActivity === option.value ? 'selected' : ''} onClick={() => setFamiliarActivity(option.value)}><b>{option.label}</b><small>{option.note}</small></button>)}</div></fieldset>
                <fieldset><legend>Nook side</legend><div className="onboarding-choice-row"><button type="button" className={familiarSide === 'left' ? 'selected' : ''} onClick={() => setFamiliarSide('left')}>Left</button><button type="button" className={familiarSide === 'right' ? 'selected' : ''} onClick={() => setFamiliarSide('right')}>Right</button></div></fieldset>
              </div>
              <div className="onboarding-toggle-grid familiar-toggles">
                <label><input type="checkbox" checked={familiarReactions} onChange={event => setFamiliarReactions(event.target.checked)} /><span><b>Quiet work reactions</b><small>Small acknowledgements only.</small></span></label>
                <label><input type="checkbox" checked={familiarContextHints} onChange={event => setFamiliarContextHints(event.target.checked)} /><span><b>Room context</b><small>Local hints without calling AI.</small></span></label>
                <label><input type="checkbox" checked={familiarPlay} onChange={event => setFamiliarPlay(event.target.checked)} /><span><b>Small play interactions</b><small>Nothing scored or rewarded.</small></span></label>
                <label><input type="checkbox" checked={familiarSounds} onChange={event => setFamiliarSounds(event.target.checked)} /><span><b>Interaction tones</b><small>Locally generated and off by default.</small></span></label>
              </div>
            </motion.section>
          )}

          {step === 6 && (
            <motion.section key="atmosphere" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">06 · ATMOSPHERE</span><h2>Choose the spaces you want to return to.</h2><p>Workspace material and Sanctuary atmosphere are independent. Pick either, both, or keep the defaults.</p></div>
              <div className="onboarding-theme-grid compact-themes">
                {appThemes.map(theme => <button type="button" key={theme.id} onClick={() => setAppTheme(theme.id)} className={appTheme === theme.id ? `onboarding-theme-card ${theme.id} selected` : `onboarding-theme-card ${theme.id}`}><div className="theme-scene"><span>{theme.mark}</span><i /><i /><i /></div><div><b>{theme.name}</b><small>{theme.subtitle}</small></div>{appTheme === theme.id && <span className="theme-selected"><Check size={14} /> selected</span>}</button>)}
              </div>
              <div className="onboarding-world-choice">
                <div className="onboarding-subheading"><span>Sanctuary world</span><small>World atmosphere only · no planning data changes</small></div>
                <div className="onboarding-garden-grid">
                  {gardenThemes.map(theme => <button type="button" key={theme.id} className={gardenTheme === theme.id ? 'selected' : ''} onClick={() => setGardenTheme(theme.id)}><span className="garden-swatches">{theme.swatches.map(color => <i key={color} style={{ background: color }} />)}</span><b>{theme.glyph} · {theme.label}</b><small>{theme.tagline}</small></button>)}
                </div>
                <div className="onboarding-world-options">
                  <fieldset><legend>World detail</legend><div className="onboarding-choice-row">{(['auto', 'balanced', 'lush'] as SanctuaryQuality[]).map(value => <button key={value} type="button" className={sanctuaryQuality === value ? 'selected' : ''} onClick={() => setSanctuaryQuality(value)}>{value === 'auto' ? 'Auto' : value[0].toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
                  <label><input type="checkbox" checked={sanctuaryAmbientSound} onChange={event => setSanctuaryAmbientSound(event.target.checked)} /><span><b>Ambient sound</b><small>Off by default.</small></span></label>
                  <label><input type="checkbox" checked={sanctuaryEffectsSound} onChange={event => setSanctuaryEffectsSound(event.target.checked)} /><span><b>Interaction sounds</b><small>Only when you act.</small></span></label>
                </div>
              </div>
            </motion.section>
          )}

          {step === 7 && (
            <motion.section key="paper" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">07 · PAPER & TIME</span><h2>What should time look like on the page?</h2><p>Choose a daily paper language and a physical Journey calendar. These change presentation, never archived dates or planning records.</p></div>
              <div className="onboarding-paper-calendar-layout">
                <div className="paper-theme-list">
                  <div className="onboarding-subheading"><span>Daily paper</span><small>Optional legacy Daily Page language</small></div>
                  {paperThemes.map(theme => <button type="button" key={theme.id} className={paperTheme === theme.id ? 'paper-theme-row selected' : 'paper-theme-row'} onClick={() => setPaperTheme(theme.id)}><span className="paper-mark">{theme.mark}</span><span><b>{theme.name}</b><small>{theme.subtitle}</small></span>{paperTheme === theme.id && <Check size={16} />}</button>)}
                </div>
                <div>
                  <div className="onboarding-subheading"><span>Journey calendar</span><small>Core constructions + seasonal editions</small></div>
                  <div className="onboarding-journey-grid">
                    {journeyThemes.map(theme => <button type="button" key={theme.id} className={journeyCalendarTheme === theme.id ? `${theme.id} selected` : theme.id} onClick={() => setJourneyCalendarTheme(theme.id)} style={{ '--journey-paper': theme.paper, '--journey-ink': theme.ink, '--journey-accent': theme.accent, '--journey-binding': theme.binding } as CSSProperties}><span className="journey-mini"><i /><b>{theme.mark}</b><em /></span><strong>{theme.name}</strong><small>{theme.subtitle}</small></button>)}
                  </div>
                </div>
              </div>
              <div className="onboarding-paper-summary"><span><b>{selectedPaper.name}</b><small>daily paper</small></span><span><b>{selectedJourneyTheme.name}</b><small>Journey calendar</small></span></div>
            </motion.section>
          )}

          {step === 8 && (
            <motion.section key="ready" className="onboarding-step plant-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">08 · READY</span><h2>{profileName.trim() ? `${profileName.trim()}, your world is ready.` : 'Your world is ready.'}</h2><p>Nothing in setup creates work for you. Empty choices stay empty, defaults stay quiet, and every preference remains editable.</p></div>
              <div className="ready-layout">
                <div className="first-seed-scene" aria-hidden="true"><div className="seed-orbit"><i /><i /><i /></div><motion.div className="first-seed" initial={{ y: -54, rotate: -16, opacity: 0 }} animate={{ y: 0, rotate: 8, opacity: 1 }} transition={{ type: 'spring', stiffness: 80, damping: 12 }}>🫘</motion.div><div className="seed-soil" /><span>ONE SEED · NO OBLIGATION</span></div>
                <div className="onboarding-ready-panel">
                  <div><Sprout size={18} /><span><b>The Garden starts quietly.</b><small>Your seed is there from day one. Nothing dies if you leave it alone.</small></span></div>
                  <div><Check size={18} /><span><b>No task is created for you.</b><small>Today can stay empty until you choose what deserves your attention.</small></span></div>
                  <div><ShieldCheck size={18} /><span><b>{preview ? 'This is a safe preview.' : 'Your setup stays local by default.'}</b><small>{preview ? 'Closing the preview restores your current appearance and does not create milestones.' : 'Life data goes to IndexedDB. Ikigai does not claim app-level at-rest encryption; backups remain readable JSON unless you protect them outside Ikigai.'}</small></span></div>
                  <div><Info size={18} /><span><b>Connections wait until you ask.</b><small>GitHub, Spotify and AI/provider credentials are not collected during First Light.</small></span></div>
                </div>
                <div className="onboarding-ready-summary" aria-label="Setup summary">
                  <span><small>Name</small><b>{profileName.trim() || 'Neutral'}</b></span>
                  <span><small>Workspace</small><b>{selectedAppTheme.name}</b></span>
                  <span><small>Sanctuary</small><b>{selectedGardenTheme.label}</b></span>
                  <span><small>Journey</small><b>{selectedJourneyTheme.name}</b></span>
                  <span><small>Focus areas</small><b>{focusAreas.length || 'None yet'}</b></span>
                  <span><small>Protected dates</small><b>{protectedDateCount || 'None yet'}</b></span>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <div className={step === 0 ? 'onboarding-reassurance standalone' : 'onboarding-reassurance'} role="note">
        <Info size={12} aria-hidden="true" />
        <span><b>Nothing here is permanent.</b> Change or clear any choice later in Settings. These setup choices stay local. External services are separate and only connect when you choose.</span>
      </div>
      {saveError ? <div className="onboarding-save-error" role="alert">{saveError}</div> : null}
      {step > 0 && (
        <footer className="onboarding-controls">
          <button type="button" className="onboarding-back" onClick={() => setStep(current => Math.max(0, current - 1))}><ArrowLeft size={16} /> Back</button>
          <div className="onboarding-control-center">{step < steps.length - 1 ? <button type="button" className="onboarding-skip" onClick={nextStep}>Skip this</button> : null}<span>{String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span></div>
          {step < steps.length - 1 ? <button type="button" className="onboarding-primary compact" onClick={nextStep}>Keep & continue <ArrowRight size={16} /></button> : <button type="button" className="onboarding-primary compact" disabled={saving} onClick={() => void finish()}>{saving ? 'Saving…' : preview ? <>Close preview <X size={16} /></> : <>Enter Ikigai <WandSparkles size={16} /></>}</button>}
        </footer>
      )}
    </div>
  );
}
