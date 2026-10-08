import { AnimatePresence, motion } from 'framer-motion';
import { LocalStorageRecovery } from '../components/LocalStorageRecovery';
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  ChevronDown,
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
import { completeOnboardingSetup, skipOnboardingTour } from '../lib/onboarding';
import { ensureSettings } from '../lib/settings';
import { IkigaiMark } from '../components/IkigaiMark';
import { FamiliarAvatar, type FamiliarPose } from '../components/familiar/FamiliarAvatar';
import { DailyCalendarPreview } from '../components/settings/DailyCalendarPreview';
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
import '../companion-pet.css';

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

const milestoneKinds: Array<{ value: MilestoneKind; label: string }> = [
  { value: 'event', label: 'Event' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'exam', label: 'Exam' },
  { value: 'release', label: 'Release' },
  { value: 'other', label: 'Other' }
];

function isoParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match
    ? { year: match[1], month: match[2], day: match[3] }
    : { year: '', month: '', day: '' };
}

function dateToIso(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
}

function validDateParts(year: number, month: number, day: number) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    year > 2200 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) return false;

  const candidate = new Date(year, month - 1, day);

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function parseFriendlyDate(value: string) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const friendly = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(trimmed);
  const match = iso ?? friendly;
  if (!match) return null;

  const year = Number(iso ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(iso ? match[3] : match[1]);
  if (!validDateParts(year, month, day)) return null;
  return dateToIso(year, month, day);
}

function SegmentedDateField({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = isoParts(value);
  const editingRef = useRef(false);

  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);
  const [invalidDate, setInvalidDate] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selected = value ? new Date(`${value}T12:00:00`) : null;
  const today = new Date();

  const [viewYear, setViewYear] = useState(
    selected?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selected?.getMonth() ?? today.getMonth()
  );

  useEffect(() => {
    if (editingRef.current) return;
    const next = isoParts(value);
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
    setInvalidDate(false);
  }, [value]);

  function applyIso(iso: string) {
    const parts = isoParts(iso);
    setDay(parts.day);
    setMonth(parts.month);
    setYear(parts.year);
    setInvalidDate(false);
    onChange(iso);
  }

  function commit(nextDay: string, nextMonth: string, nextYear: string) {
    const hasAny = Boolean(nextDay || nextMonth || nextYear);
    const complete = nextDay.length === 2 && nextMonth.length === 2 && nextYear.length === 4;

    if (!hasAny) {
      setInvalidDate(false);
      onChange('');
      return;
    }

    if (!complete) {
      // Clear the stored draft while manual editing is incomplete so an old
      // valid date can never be saved behind a half-edited visible date.
      setInvalidDate(false);
      onChange('');
      return;
    }

    const d = Number(nextDay);
    const m = Number(nextMonth);
    const y = Number(nextYear);
    if (validDateParts(y, m, d)) {
      setInvalidDate(false);
      onChange(dateToIso(y, m, d));
      return;
    }

    // Keep the authored text visible for correction, but never retain a stale
    // previously-valid date in the onboarding data model.
    setInvalidDate(true);
    onChange('');
  }

  function updateDay(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, 2);
    setDay(clean);
    commit(clean, month, year);
  }

  function updateMonth(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, 2);
    setMonth(clean);
    commit(day, clean, year);
  }

  function updateYear(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, 4);
    setYear(clean);
    commit(day, month, clean);
  }

  function chooseDate(nextDay: number) {
    applyIso(dateToIso(viewYear, viewMonth + 1, nextDay));
    setCalendarOpen(false);
  }

  function shiftMonth(amount: number) {
    const next = new Date(viewYear, viewMonth + amount, 1);
    const nextYear = next.getFullYear();
    if (nextYear < 1900 || nextYear > 2200) return;
    setViewYear(nextYear);
    setViewMonth(next.getMonth());
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const mondayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const cells = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];

  const monthName = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric'
  }).format(new Date(viewYear, viewMonth, 1));

  return (
    <div
      className="ik-date-field"
      onFocusCapture={() => { editingRef.current = true; }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          editingRef.current = false;
          setCalendarOpen(false);
        }
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && calendarOpen) {
          event.preventDefault();
          setCalendarOpen(false);
        }
      }}
    >
      <div
        className={`ik-date-segments ${invalidDate ? 'is-invalid' : ''}`}
        aria-label="Protected date"
        onPaste={event => {
          const iso = parseFriendlyDate(event.clipboardData.getData('text'));
          if (!iso) return;
          event.preventDefault();
          applyIso(iso);
        }}
      >
        <input
          aria-label="Day"
          aria-invalid={invalidDate || undefined}
          inputMode="numeric"
          maxLength={2}
          value={day}
          onFocus={event => event.currentTarget.select()}
          onChange={event => updateDay(event.target.value)}
          placeholder="DD"
        />

        <span>/</span>

        <input
          aria-label="Month"
          aria-invalid={invalidDate || undefined}
          inputMode="numeric"
          maxLength={2}
          value={month}
          onFocus={event => event.currentTarget.select()}
          onChange={event => updateMonth(event.target.value)}
          placeholder="MM"
        />

        <span>/</span>

        <input
          aria-label="Year"
          aria-invalid={invalidDate || undefined}
          inputMode="numeric"
          maxLength={4}
          value={year}
          onFocus={event => event.currentTarget.select()}
          onChange={event => updateYear(event.target.value)}
          placeholder="YYYY"
          className="year"
        />

        <button
          type="button"
          className="ik-date-calendar-trigger"
          aria-label="Open calendar"
          aria-expanded={calendarOpen}
          onClick={() => {
            if (selected && !Number.isNaN(selected.getTime())) {
              setViewYear(selected.getFullYear());
              setViewMonth(selected.getMonth());
            }

            setCalendarOpen(open => !open);
          }}
        >
          <Calendar size={16} />
        </button>
      </div>

      {invalidDate ? <small className="ik-date-error" role="status">Check the day, month and year.</small> : null}

      {calendarOpen ? (
        <div className="ik-date-calendar" role="dialog" aria-label={`Choose a date in ${monthName}`}>
          <header>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              ‹
            </button>

            <strong>{monthName}</strong>

            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              ›
            </button>
          </header>

          <div className="ik-calendar-weekdays" aria-hidden="true">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(label => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="ik-calendar-days">
            {cells.map((calendarDay, index) => {
              if (calendarDay === null) {
                return <span key={`blank-${index}`} />;
              }

              const iso = dateToIso(viewYear, viewMonth + 1, calendarDay);
              const calendarDate = new Date(viewYear, viewMonth, calendarDay);
              const isSelected = iso === value;
              const isToday =
                calendarDay === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();

              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(calendarDate)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  className={[
                    isSelected ? 'selected' : '',
                    isToday ? 'today' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => chooseDate(calendarDay)}
                >
                  {calendarDay}
                </button>
              );
            })}
          </div>

          <footer>
            <button
              type="button"
              onClick={() => {
                setDay('');
                setMonth('');
                setYear('');
                setInvalidDate(false);
                onChange('');
                setCalendarOpen(false);
              }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => {
                applyIso(dateToIso(today.getFullYear(), today.getMonth() + 1, today.getDate()));
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setCalendarOpen(false);
              }}
            >
              Today
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function MilestoneTypePicker({
  value,
  onChange
}: {
  value: MilestoneKind;
  onChange: (value: MilestoneKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = Math.max(0, milestoneKinds.findIndex(option => option.value === value));
  const selected = milestoneKinds[selectedIndex];

  function focusOption(index: number) {
    const wrapped = (index + milestoneKinds.length) % milestoneKinds.length;
    window.requestAnimationFrame(() => optionRefs.current[wrapped]?.focus());
  }

  function openMenu(index = selectedIndex) {
    setOpen(true);
    focusOption(index);
  }

  function choose(kind: MilestoneKind) {
    onChange(kind);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div
      className="ik-milestone-picker"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="ik-milestone-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu(selectedIndex);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(selectedIndex);
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <span>{selected.label}</span>
        <ChevronDown size={15} />
      </button>

      {open ? (
        <div className="ik-milestone-menu" role="listbox" aria-label="Protected date type">
          {milestoneKinds.map((option, index) => (
            <button
              type="button"
              ref={node => { optionRefs.current[index] = node; }}
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={value === option.value ? 'selected' : ''}
              onClick={() => choose(option.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setOpen(false);
                  triggerRef.current?.focus();
                } else if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  focusOption(index + 1);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  focusOption(index - 1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  focusOption(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  focusOption(milestoneKinds.length - 1);
                }
              }}
            >
              <span>{option.label}</span>
              {value === option.value ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  const [storageFailed, setStorageFailed] = useState(false);
  const worldRef = useRef<HTMLDivElement>(null);
  const journeyPreviewStageRef = useRef<HTMLDivElement>(null);
  const journeyPreviewCanvasRef = useRef<HTMLDivElement>(null);
  const journeyPreviewBoardRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const [journeyPreviewFit, setJourneyPreviewFit] = useState({ scale: 1, height: 260 });

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => { if (alive) setStorageFailed(true); }, 10_000);
    void ensureSettings().then(settings => {
      if (!alive) return;
      setStorageFailed(false);
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
    }).catch(() => { if (alive) setStorageFailed(true); }).finally(() => window.clearTimeout(timer));
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Each First Light page starts at its own beginning. On short/narrow windows
    // earlier steps can scroll; carrying that scroll offset into the next step
    // makes its heading look clipped even though the content still exists.
    worldRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [loaded, step]);

  useEffect(() => {
    if (!loaded || step !== 7) return;
    const stage = journeyPreviewStageRef.current;
    const canvas = journeyPreviewCanvasRef.current;
    const board = journeyPreviewBoardRef.current;
    if (!stage || !canvas || !board) return;

    let frame = 0;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const availableWidth = Math.max(1, stage.clientWidth - 24);
        const naturalWidth = Math.max(1, board.offsetWidth);
        const naturalHeight = Math.max(1, board.offsetHeight);
        const scale = Math.min(1, availableWidth / naturalWidth);
        const height = Math.ceil((naturalHeight * scale) + 24);

        setJourneyPreviewFit(current => (
          Math.abs(current.scale - scale) < 0.002 && current.height === height
            ? current
            : { scale, height }
        ));
      });
    };

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(stage);
    observer?.observe(board);
    window.addEventListener('resize', measure);
    measure();

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      window.cancelAnimationFrame(frame);
    };
  }, [journeyCalendarTheme, loaded, step]);

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
  const familiarPreviewPose: FamiliarPose = familiarActivity === 'lively' ? 'play' : familiarActivity === 'still' || familiarActivity === 'hidden' ? 'rest' : 'awake';
  const journeyPreviewStyle = {
    '--preview-calendar-paper': selectedJourneyTheme.paper,
    '--preview-calendar-paper-alt': selectedJourneyTheme.paperAlt,
    '--preview-calendar-ink': selectedJourneyTheme.ink,
    '--preview-calendar-muted': selectedJourneyTheme.mutedInk,
    '--preview-calendar-rule': selectedJourneyTheme.rule,
    '--preview-calendar-accent': selectedJourneyTheme.accent,
    '--preview-calendar-sunday': selectedJourneyTheme.sunday,
    '--preview-calendar-saturday': selectedJourneyTheme.saturday,
    '--preview-calendar-board': selectedJourneyTheme.board,
    '--preview-calendar-binding': selectedJourneyTheme.binding,
    '--preview-calendar-shadow': selectedJourneyTheme.shadow
  } as CSSProperties;
  const journeyPreviewDays = [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 0];

  function toggleFocus(area: TaskCategory) {
    setFocusAreas(current => current.includes(area) ? current.filter(item => item !== area) : [...current, area]);
  }

  function updateDate(id: string, patch: Partial<DraftDate>) {
    setImportantDates(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function nextStep() {
    setStep(current => Math.min(steps.length - 1, current + 1));
  }

  async function skipTour() {
    if (saving || preview) return;
    setSaving(true);
    setSaveError('');
    try {
      await skipOnboardingTour();
      navigate('/', { replace: true });
    } catch {
      setSaveError('Ikigai Space could not save your choice to skip the tour. Please try again.');
    } finally {
      setSaving(false);
    }
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
      console.error('Ikigai Space onboarding could not be finalized.', cause);
      setSaveError('Ikigai Space could not save your setup. Nothing was finalized, so it is safe to try again.');
    } finally {
      setSaving(false);
    }
  }

  if (storageFailed) return <LocalStorageRecovery />;
  if (!loaded) return <div className="onboarding-boot"><span className="onboarding-boot-mark"><IkigaiMark /></span><p>Waking Ikigai Space…</p></div>;

  return (
    <div ref={worldRef} className="onboarding-world">
      <div className="onboarding-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="onboarding-grain" aria-hidden="true" />

      <header className="onboarding-topbar">
        <button className="onboarding-brand" type="button" onClick={() => preview && navigate(-1)} aria-label="Ikigai Space">
          <span className="onboarding-brand-mark"><IkigaiMark /></span><div><b>Ikigai Space</b><small>{preview ? 'welcome preview' : 'first light'}</small></div>
        </button>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((label, index) => <i key={label} className={index <= step ? 'active' : ''} title={label} />)}
        </div>
        {preview ? <button className="onboarding-exit" type="button" onClick={() => navigate(-1)}><X size={15} /> Exit preview</button> : (
          <button className="onboarding-exit" type="button" disabled={saving} onClick={() => void skipTour()} title="Open Today with your saved preferences. Changes made in this tour will not be saved.">{saving ? 'Saving…' : 'Skip tour'} <ArrowRight size={15} /></button>
        )}
      </header>

      <main className="onboarding-stage">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section key="arrival" className="onboarding-step arrival-step" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="arrival-symbol" aria-hidden="true"><span><IkigaiMark /></span><i /></div>
              <div className="arrival-copy">
                <span className="onboarding-kicker">WELCOME TO YOUR FIRST CHAPTER</span>
                <h1>Your days already pass.<br /><em>Give them somewhere to live.</em></h1>
                <p>Not a dashboard for measuring your life. A place for inhabiting it.</p>
                <p>First Light is optional setup, not an intake form. Tell Ikigai Space what is useful, or skip the tour to open Today immediately. You can change any preference later in Settings.</p>
                <aside className="onboarding-privacy-card" aria-label="Local data and encryption disclosure">
                  <ShieldCheck size={18} />
                  <div><strong>Your data, plainly.</strong><p>Life data is stored in this browser with IndexedDB. Ikigai Space does <b>not</b> add application-level encryption at rest, and exported JSON backups are readable files. SHA-256 checksums protect backup integrity; they do not hide the contents. Passwords, API keys and provider tokens are deliberately not requested in this tour.</p></div>
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
                  <input value={profileName} maxLength={48} onChange={event => setProfileName(event.target.value)} placeholder="What should Ikigai Space call you?" />
                  <small>{profileName.trim() ? `Today can say “Good evening, ${profileName.trim().slice(0, 48)}.”` : 'No name stored · generic greetings stay exactly as they are.'}</small>
                </label>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="chapter" className="onboarding-step" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="onboarding-step-head"><span className="onboarding-kicker">02 · YOUR CHAPTER</span><h2>What deserves to grow with you?</h2><p>Choose only the areas you want Ikigai Space to make visible. A sentence can give the current chapter a little context.</p><small className="onboarding-optional">Optional · leave the sentence and focus areas blank if you would rather decide later.</small></div>
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
                    <SegmentedDateField value={item.date} onChange={date => updateDate(item.id, { date })} />
                    <MilestoneTypePicker value={item.kind} onChange={kind => updateDate(item.id, { kind })} />
                    <button type="button" aria-label="Remove date" onClick={() => setImportantDates(current => current.filter(date => date.id !== item.id))}><X size={15} /></button>
                  </div>
                ))}
                {importantDates.length < 5 && <button type="button" className="add-date-row" onClick={() => setImportantDates(current => [...current, newDraftDate()])}><Plus size={16} /> Add another protected date</button>}
              </div>
              <div className="date-philosophy"><CalendarDays size={19} /><p>These become milestones, not daily tasks. Ikigai Space can surface what is approaching without turning every date into a checklist.</p></div>
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
              <div className="onboarding-familiar-stage">
                <div className="onboarding-familiar-config">
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
                </div>
                <aside className={`onboarding-familiar-preview side-${familiarSide} ${familiarActivity === 'hidden' ? 'is-home-only' : ''}`} aria-label="Live Familiar preview">
                  <span className="onboarding-preview-label">LIVE PREVIEW</span>
                  <div className="familiar-preview-room" aria-hidden="true">
                    <i className="familiar-preview-moon" />
                    <i className="familiar-preview-floor" />
                    <div className="familiar-preview-nook">
                      <FamiliarAvatar design={familiarDesign} color={familiarColor} theme={familiarTheme} pose={familiarPreviewPose} size="xl" />
                    </div>
                  </div>
                  <div className="familiar-preview-copy">
                    <strong>{familiarName.trim() || 'Familiar'}</strong>
                    <span>{familiarDesigns.find(option => option.value === familiarDesign)?.label} · {familiarMaterials.find(option => option.value === familiarTheme)?.label} · {familiarColors.find(option => option.value === familiarColor)?.label}</span>
                    <small>{familiarActivity === 'hidden' ? 'Home-only presence · appears in Companion and Sanctuary.' : `${familiarActivities.find(option => option.value === familiarActivity)?.label} presence · nook on the ${familiarSide}.`}</small>
                  </div>
                </aside>
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
              <div className="onboarding-paper-live-layout">
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
                <aside className="onboarding-time-preview" aria-label="Live paper and calendar preview">
                  <span className="onboarding-preview-label">LIVE PAPER & TIME</span>
                  <div className="onboarding-time-preview-grid">
                    <div className="onboarding-daily-preview">
                      <DailyCalendarPreview theme={paperTheme} size="standard" sampleTasks />
                      <div><strong>{selectedPaper.name}</strong><small>daily paper</small></div>
                    </div>
                    <div
                      className={`journey-calendar-demo journey-calendar-demo-${selectedJourneyTheme.visual} onboarding-journey-live`}
                      data-preview-journey-theme={journeyCalendarTheme}
                      style={journeyPreviewStyle}
                    >
                      <div
                        ref={journeyPreviewStageRef}
                        className="journey-calendar-demo-stage onboarding-journey-fit-stage"
                        aria-hidden="true"
                        style={{ height: `${journeyPreviewFit.height}px` }}
                      >
                        <div
                          ref={journeyPreviewCanvasRef}
                          className="onboarding-journey-fit-canvas"
                          style={{ transform: `scale(${journeyPreviewFit.scale})` }}
                        >
                          <div ref={journeyPreviewBoardRef} className="journey-calendar-demo-board">
                            <div className="journey-calendar-demo-binding"><i /><i /><i /><i /><i /><i /></div>
                            <div className="journey-calendar-demo-paper">
                              <div className="journey-calendar-demo-head"><div><span>OCTOBER</span><strong>2026</strong></div><b>10</b></div>
                              <div className="journey-calendar-demo-weekdays">{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day => <span key={day}>{day}</span>)}</div>
                              <div className="journey-calendar-demo-grid">
                                {journeyPreviewDays.map((day, index) => <span key={`${day}-${index}`} className={day === 18 ? 'is-marked' : day === 0 ? 'is-empty' : ''}>{day || ''}{day === 4 || day === 26 ? <i /> : null}{day === 18 ? <em>note</em> : null}</span>)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <footer><div><strong>{selectedJourneyTheme.mark} {selectedJourneyTheme.name}</strong><span>{selectedJourneyTheme.subtitle}</span></div></footer>
                    </div>
                  </div>
                  <small className="onboarding-time-preview-note">Changes here are presentation-only. Your archived dates and planning records do not move.</small>
                </aside>
              </div>
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
                  <div><ShieldCheck size={18} /><span><b>{preview ? 'This is a safe preview.' : 'Your setup stays local by default.'}</b><small>{preview ? 'Closing the preview restores your current appearance and does not create milestones.' : 'Life data goes to IndexedDB. Ikigai Space does not claim app-level at-rest encryption; backups remain readable JSON unless you protect them outside Ikigai Space.'}</small></span></div>
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
          {step < steps.length - 1 ? <button type="button" className="onboarding-primary compact" onClick={nextStep}>Keep & continue <ArrowRight size={16} /></button> : <button type="button" className="onboarding-primary compact" disabled={saving} onClick={() => void finish()}>{saving ? 'Saving…' : preview ? <>Close preview <X size={16} /></> : <>Enter Ikigai Space <WandSparkles size={16} /></>}</button>}
        </footer>
      )}
    </div>
  );
}
