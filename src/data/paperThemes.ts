import type { DailyPageTheme } from '../types';

export type PaperLayout = 'himekuri' | 'editorial' | 'winter' | 'festive' | 'sakura' | 'minimal';

export interface PaperThemeDefinition {
  id: DailyPageTheme;
  name: string;
  subtitle: string;
  description: string;
  mark: string;
  layout: PaperLayout;
  paper: string;
  backSheet: string;
  ink: string;
  mutedInk: string;
  accent: string;
  accentSoft: string;
  rule: string;
  hardware: string;
  hardwareHighlight: string;
  grainOpacity: number;
  roughness: number;
  metalness: number;
}

export const paperThemes: PaperThemeDefinition[] = [
  {
    id: 'himekuri',
    name: 'Japanese Himekuri',
    subtitle: 'Vermilion · market calendar',
    description: 'A traditional Japanese tear-off composition with dense date metadata, bold numerals, vermilion registration and a ruled memo field.',
    mark: '日',
    layout: 'himekuri',
    paper: '#f4f0e7',
    backSheet: '#ddd4c4',
    ink: '#171512',
    mutedInk: '#5d5850',
    accent: '#c64a3f',
    accentSoft: '#e8c1b9',
    rule: 'rgba(45,40,34,.26)',
    hardware: '#b9b6ae',
    hardwareHighlight: '#dedbd4',
    grainOpacity: 0.075,
    roughness: 0.93,
    metalness: 0.58
  },
  {
    id: 'warm-paper',
    name: 'Warm Paper',
    subtitle: 'Letterpress · study desk',
    description: 'Warm letterpress stationery with a serif date, side rule and generous note rhythm for an old study-desk feel.',
    mark: '紙',
    layout: 'editorial',
    paper: '#f2eadb',
    backSheet: '#d6c8b4',
    ink: '#29231d',
    mutedInk: '#75695c',
    accent: '#9f5f3f',
    accentSoft: '#dfc9af',
    rule: 'rgba(73,57,43,.25)',
    hardware: '#8e806f',
    hardwareHighlight: '#c9baa6',
    grainOpacity: 0.095,
    roughness: 0.97,
    metalness: 0.28
  },
  {
    id: 'winter-study',
    name: 'Winter Study',
    subtitle: 'Indigo · quiet grid',
    description: 'A cool indigo study edition with a printed masthead, geometric field and crisp note grid.',
    mark: '雪',
    layout: 'winter',
    paper: '#edf2f3',
    backSheet: '#d2dde0',
    ink: '#1c2a30',
    mutedInk: '#647980',
    accent: '#4f7890',
    accentSoft: '#c7dce6',
    rule: 'rgba(42,73,87,.24)',
    hardware: '#9aa9ae',
    hardwareHighlight: '#d5e0e3',
    grainOpacity: 0.055,
    roughness: 0.9,
    metalness: 0.48
  },
  {
    id: 'christmas',
    name: 'Christmas',
    subtitle: 'Evergreen · winter print',
    description: 'A restrained winter print with evergreen framing, ribbon-red ink and a small celebratory mark.',
    mark: '✦',
    layout: 'festive',
    paper: '#f5efe2',
    backSheet: '#d8cbb7',
    ink: '#213027',
    mutedInk: '#6d756d',
    accent: '#a73532',
    accentSoft: '#d9b4a2',
    rule: 'rgba(39,65,49,.24)',
    hardware: '#846f55',
    hardwareHighlight: '#c8b58f',
    grainOpacity: 0.08,
    roughness: 0.94,
    metalness: 0.34
  },
  {
    id: 'sakura-dawn',
    name: 'Sakura Dawn',
    subtitle: 'Blush · spring print',
    description: 'A spring edition with asymmetric blossom linework, a blush sun disc and a softer serif date.',
    mark: '桜',
    layout: 'sakura',
    paper: '#f7eee9',
    backSheet: '#dfccc8',
    ink: '#342a2a',
    mutedInk: '#806d70',
    accent: '#b76d7b',
    accentSoft: '#ead0d6',
    rule: 'rgba(81,53,59,.20)',
    hardware: '#a78c8f',
    hardwareHighlight: '#dec9cc',
    grainOpacity: 0.06,
    roughness: 0.95,
    metalness: 0.32
  },
  {
    id: 'minimal-mono',
    name: 'Minimal Mono',
    subtitle: 'Monochrome · typographic grid',
    description: 'A near-monochrome typographic edition with hard rules, disciplined spacing and deliberate negative space.',
    mark: '—',
    layout: 'minimal',
    paper: '#f3f3ef',
    backSheet: '#d7d7d2',
    ink: '#111210',
    mutedInk: '#696a66',
    accent: '#111210',
    accentSoft: '#d7d7d2',
    rule: 'rgba(17,18,16,.25)',
    hardware: '#8f918d',
    hardwareHighlight: '#d6d7d3',
    grainOpacity: 0.025,
    roughness: 0.88,
    metalness: 0.62
  }
];

export const defaultPaperTheme: DailyPageTheme = 'himekuri';

export function getPaperTheme(id?: DailyPageTheme | string): PaperThemeDefinition {
  return paperThemes.find(theme => theme.id === id) ?? paperThemes[0];
}

export function normalizePaperTheme(id?: string): DailyPageTheme {
  if (!id) return defaultPaperTheme;
  const legacy: Record<string, DailyPageTheme> = {
    sakura: 'himekuri',
    paper: 'warm-paper',
    winter: 'winter-study'
  };
  const normalized = legacy[id] ?? id;
  return paperThemes.some(theme => theme.id === normalized)
    ? normalized as DailyPageTheme
    : defaultPaperTheme;
}
