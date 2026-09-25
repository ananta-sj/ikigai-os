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
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Sprout,
  WandSparkles,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appThemes } from '../data/themes';
import { paperThemes } from '../data/paperThemes';
import { createMilestone } from '../lib/milestones';
import { ensureSettings, updateSettings } from '../lib/settings';
import { ensureGarden } from '../lib/tasks';
import type { AppTheme, DailyPageTheme, MilestoneKind, TaskCategory, UserSettings } from '../types';
import '../onboarding-v050.css';

const focusOptions: Array<{ id: TaskCategory; label: string; detail: string; icon: typeof BrainCircuit }> = [
  { id: 'Projects', label: 'Projects', detail: 'Things you want to make or ship', icon: Rocket },
  { id: 'Learning', label: 'Learning', detail: 'Skills, reading, practice, curiosity', icon: BrainCircuit },
  { id: 'Study', label: 'Study', detail: 'Classes, exams, coursework, research', icon: GraduationCap },
  { id: 'Career', label: 'Career', detail: 'Work, applications, portfolio, proof', icon: BriefcaseBusiness },
  { id: 'Health', label: 'Health', detail: 'Energy, movement, rest, recovery', icon: HeartPulse },
  { id: 'Personal', label: 'Personal', detail: 'Life outside the checklist', icon: Sparkles }
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

const steps = ['Arrival', 'Chapter', 'Dates', 'Atmosphere', 'Paper', 'Ready'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [existing, setExisting] = useState<UserSettings | null>(null);
  const [chapterIntent, setChapterIntent] = useState('');
  const [focusAreas, setFocusAreas] = useState<TaskCategory[]>([]);
  const [importantDates, setImportantDates] = useState<DraftDate[]>([newDraftDate()]);
  const [appTheme, setAppTheme] = useState<AppTheme>('midnight-grove');
  const [paperTheme, setPaperTheme] = useState<DailyPageTheme>('himekuri');
  const [saving, setSaving] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void ensureSettings().then(settings => {
      if (!alive) return;
      setExisting(settings);
      setChapterIntent(settings.chapterIntent ?? '');
      setFocusAreas(settings.focusAreas ?? []);
      setAppTheme(settings.appTheme);
      setPaperTheme(settings.dailyPageTheme);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.dataset.ikigaiTheme = appTheme;
    document.documentElement.style.colorScheme = appTheme === 'washi-sanctuary' ? 'light' : 'dark';
    return () => {
      if (!completedRef.current && existing) {
        document.documentElement.dataset.ikigaiTheme = existing.appTheme;
        document.documentElement.style.colorScheme = existing.appTheme === 'washi-sanctuary' ? 'light' : 'dark';
      }
    };
  }, [appTheme, existing, loaded]);

  const selectedPaper = useMemo(() => paperThemes.find(theme => theme.id === paperTheme) ?? paperThemes[0], [paperTheme]);
  function toggleFocus(area: TaskCategory) {
    setFocusAreas(current => current.includes(area) ? current.filter(item => item !== area) : [...current, area]);
  }

  function updateDate(id: string, patch: Partial<DraftDate>) {
    setImportantDates(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      const completedAt = new Date().toISOString();
      await updateSettings({
        appTheme,
        dailyPageTheme: paperTheme,
        chapterIntent: chapterIntent.trim(),
        focusAreas,
        onboardingComplete: true,
        onboardingCompletedAt: completedAt
      });

      await ensureGarden();

      const validDates = importantDates.filter(item => item.title.trim() && item.date);
      for (const item of validDates) {
        await createMilestone({
          title: item.title.trim(),
          date: item.date,
          kind: item.kind,
          category: item.category
        });
      }

      completedRef.current = true;
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div className="onboarding-boot"><span>生</span><p>Waking Ikigai…</p></div>;
  }

  return (
    <div className="onboarding-world">
      <div className="onboarding-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="onboarding-grain" aria-hidden="true" />

      <header className="onboarding-topbar">
        <button className="onboarding-brand" type="button" onClick={() => preview && navigate(-1)} aria-label="Ikigai OS">
          <span>生</span><div><b>Ikigai OS</b><small>{preview ? 'welcome preview' : 'first light'}</small></div>
        </button>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((label, index) => <i key={label} className={index <= step ? 'active' : ''} title={label} />)}
        </div>
        {preview ? <button className="onboarding-exit" type="button" onClick={() => navigate(-1)}><X size={15} /> Exit preview</button> : <span className="onboarding-private"><ShieldCheck size={14} /> local only</span>}
      </header>

      <main className="onboarding-stage">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section key="arrival" className="onboarding-step arrival-step" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="arrival-symbol" aria-hidden="true"><span>生</span><i /></div>
              <div className="arrival-copy">
                <span className="onboarding-kicker">WELCOME TO YOUR FIRST CHAPTER</span>
                <h1>Your days already pass.<br /><em>Give them somewhere to live.</em></h1>
                <p>Ikigai is a local-first space for the things you are learning, building, protecting and becoming. Nothing here needs to be perfect on day one.</p>
                <button className="onboarding-primary" type="button" onClick={() => setStep(1)}>Begin <ArrowRight size={18} /></button>
              </div>
              <div className="arrival-foot"><span>Tasks become growth.</span><span>Days become pages.</span><span>Progress becomes a place.</span></div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section key="chapter" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">01 · YOUR CHAPTER</span><h2>What deserves to grow with you?</h2><p>Choose the areas you want Ikigai to make visible. You can change all of this later.</p></div>
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

          {step === 2 && (
            <motion.section key="dates" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">02 · PROTECT TIME</span><h2>Which dates should the system remember for you?</h2><p>Deadlines, events, appointments, launches, birthdays — add only the dates that genuinely affect your plans.</p></div>
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
              <div className="date-philosophy"><CalendarDays size={19} /><p>These become milestones, not daily tasks. Ikigai can use them to surface what is approaching without turning every date into a checklist.</p></div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section key="atmosphere" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">03 · ATMOSPHERE</span><h2>Choose the world you want to return to.</h2><p>This changes the workspace, not your data. Pick by instinct; Settings keeps the door open.</p></div>
              <div className="onboarding-theme-grid">
                {appThemes.map(theme => <button type="button" key={theme.id} onClick={() => setAppTheme(theme.id)} className={appTheme === theme.id ? `onboarding-theme-card ${theme.id} selected` : `onboarding-theme-card ${theme.id}`}><div className="theme-scene"><span>{theme.mark}</span><i /><i /><i /></div><div><b>{theme.name}</b><small>{theme.subtitle}</small><p>{theme.description}</p></div>{appTheme === theme.id && <span className="theme-selected"><Check size={14} /> selected</span>}</button>)}
              </div>
            </motion.section>
          )}

          {step === 4 && (
            <motion.section key="paper" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">04 · DAILY RITUAL</span><h2>What should passing time feel like?</h2><p>The Daily Page is optional later. For now choose the paper language you want to meet first.</p></div>
              <div className="paper-choice-layout">
                <div className="paper-theme-list">
                  {paperThemes.map(theme => <button type="button" key={theme.id} className={paperTheme === theme.id ? 'paper-theme-row selected' : 'paper-theme-row'} onClick={() => setPaperTheme(theme.id)}><span className="paper-mark">{theme.mark}</span><span><b>{theme.name}</b><small>{theme.subtitle}</small></span>{paperTheme === theme.id && <Check size={16} />}</button>)}
                </div>
                <motion.div key={paperTheme} className={`onboarding-paper-preview ${selectedPaper.layout}`} style={{ '--paper': selectedPaper.paper, '--ink': selectedPaper.ink, '--accent': selectedPaper.accent, '--rule': selectedPaper.rule } as CSSProperties} initial={{ rotate: 2, opacity: .4, y: 10 }} animate={{ rotate: 0, opacity: 1, y: 0 }}>
                  <div className="paper-holes">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
                  <div className="paper-preview-top"><span>{selectedPaper.mark}</span><b>{new Date().toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()}</b><em>{new Date().toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</em></div>
                  <strong>{new Date().getDate()}</strong>
                  <div className="paper-preview-rule" />
                  <small>TODAY</small><p>{chapterIntent || 'A day worth keeping.'}</p>
                </motion.div>
              </div>
            </motion.section>
          )}

          {step === 5 && (
            <motion.section key="ready" className="onboarding-step plant-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">05 · READY</span><h2>Your world is ready.</h2><p>Enter with a blank slate. Add a quest when you actually have one — setup itself does not create work for you.</p></div>
              <div className="plant-layout ready-layout">
                <div className="first-seed-scene" aria-hidden="true"><div className="seed-orbit"><i /><i /><i /></div><motion.div className="first-seed" initial={{ y: -54, rotate: -16, opacity: 0 }} animate={{ y: 0, rotate: 8, opacity: 1 }} transition={{ type: 'spring', stiffness: 80, damping: 12 }}>🫘</motion.div><div className="seed-soil" /><span>ONE SEED · NO OBLIGATION</span></div>
                <div className="onboarding-ready-panel">
                  <div><Sprout size={18} /><span><b>The Garden starts quietly.</b><small>Your seed is there from day one. Nothing dies if you leave it alone.</small></span></div>
                  <div><Check size={18} /><span><b>No task is created for you.</b><small>Today can stay empty until you choose what deserves your attention.</small></span></div>
                  <div><ShieldCheck size={18} /><span><b>Your choices stay local.</b><small>Theme, paper and any dates you added are saved on this device.</small></span></div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {step > 0 && (
        <footer className="onboarding-controls">
          <button type="button" className="onboarding-back" onClick={() => setStep(current => Math.max(0, current - 1))}><ArrowLeft size={16} /> Back</button>
          <span>{String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span>
          {step < steps.length - 1 ? <button type="button" className="onboarding-primary compact" onClick={() => setStep(current => Math.min(steps.length - 1, current + 1))}>Continue <ArrowRight size={16} /></button> : <button type="button" className="onboarding-primary compact" disabled={saving} onClick={() => void finish()}>{saving ? 'Entering…' : <>Enter Ikigai <WandSparkles size={16} /></>}</button>}
        </footer>
      )}
    </div>
  );
}
