import type { JourneyCalendarTheme } from '../types';

export type JourneyThemeVisual = 'nihon' | 'landscape' | 'study' | 'washi' | 'night' | 'letterpress' | 'kraft' | 'newsprint' | 'hanami' | 'winter' | 'holi' | 'diwali' | 'momentum';

export interface JourneyThemeDefinition {
  id: JourneyCalendarTheme;
  name: string;
  subtitle: string;
  mark: string;
  visual: JourneyThemeVisual;
  paper: string;
  paperAlt: string;
  ink: string;
  mutedInk: string;
  rule: string;
  accent: string;
  sunday: string;
  saturday: string;
  board: string;
  binding: string;
  shadow: string;
  collection?: 'core' | 'edition';
}

export const journeyThemes: JourneyThemeDefinition[] = [
  {
    id: 'nihon-sakura',
    name: 'Nihon Sakura',
    subtitle: 'Hanging print · bilingual dates',
    mark: '桜',
    visual: 'nihon',
    paper: '#fffdf8',
    paperAlt: '#f8f5ee',
    ink: '#171717',
    mutedInk: '#6f6a62',
    rule: '#2c2b29',
    accent: '#d36f91',
    sunday: '#bd3f3f',
    saturday: '#3d73a8',
    board: '#e9e4da',
    binding: '#8d8a83',
    shadow: 'rgba(20,16,12,.22)',
    collection: 'core'
  },
  {
    id: 'fuji-seasonal',
    name: 'Fuji Seasonal',
    subtitle: 'Scenic poster · calendar below',
    mark: '富',
    visual: 'landscape',
    paper: '#fffefa',
    paperAlt: '#f7f4ec',
    ink: '#202224',
    mutedInk: '#77756f',
    rule: '#c7c4bc',
    accent: '#273c8d',
    sunday: '#b83f45',
    saturday: '#273c8d',
    board: '#ece8df',
    binding: '#75736f',
    shadow: 'rgba(19,25,35,.24)',
    collection: 'core'
  },
  {
    id: 'study-wall',
    name: 'Study Wall',
    subtitle: 'Side-bound study planner',
    mark: '学',
    visual: 'study',
    paper: '#f7f8f6',
    paperAlt: '#eef1ee',
    ink: '#343837',
    mutedInk: '#8a908d',
    rule: '#d2d7d3',
    accent: '#839b8d',
    sunday: '#c88d91',
    saturday: '#6f8ca0',
    board: '#dfe4df',
    binding: '#676d69',
    shadow: 'rgba(23,32,26,.18)',
    collection: 'core'
  },
  {
    id: 'washi-minimal',
    name: 'Washi Minimal',
    subtitle: 'Handmade sheet · open rhythm',
    mark: '紙',
    visual: 'washi',
    paper: '#f2eadc',
    paperAlt: '#e8decd',
    ink: '#28211a',
    mutedInk: '#817464',
    rule: '#b9aa96',
    accent: '#9b5a43',
    sunday: '#9b4a43',
    saturday: '#506477',
    board: '#cfc0aa',
    binding: '#705f4b',
    shadow: 'rgba(48,35,24,.24)',
    collection: 'core'
  },
  {
    id: 'midnight-desk',
    name: 'Midnight Desk',
    subtitle: 'Desk pad · modular day tiles',
    mark: '月',
    visual: 'night',
    paper: '#151a19',
    paperAlt: '#101413',
    ink: '#eef2e9',
    mutedInk: '#87938d',
    rule: '#34413b',
    accent: '#91c8a7',
    sunday: '#d58a88',
    saturday: '#86aac7',
    board: '#0b0f0e',
    binding: '#9aa69f',
    shadow: 'rgba(0,0,0,.5)',
    collection: 'core'
  },
  {
    id: 'letterpress-ledger',
    name: 'Letterpress Ledger',
    subtitle: 'Bound ledger · split-page month',
    mark: '活',
    visual: 'letterpress',
    paper: '#f3ead8',
    paperAlt: '#e8dcc6',
    ink: '#2d2922',
    mutedInk: '#766c5e',
    rule: '#9e8f79',
    accent: '#8d3f31',
    sunday: '#973f38',
    saturday: '#53687a',
    board: '#b9aa90',
    binding: '#4c4035',
    shadow: 'rgba(55,39,24,.28)',
    collection: 'core'
  },
  {
    id: 'kraft-clip',
    name: 'Kraft Clip',
    subtitle: 'Clipboard planner · tall sheet',
    mark: '留',
    visual: 'kraft',
    paper: '#cdb58e',
    paperAlt: '#bda47e',
    ink: '#30281e',
    mutedInk: '#6f5d47',
    rule: '#806d53',
    accent: '#87643c',
    sunday: '#8f473c',
    saturday: '#455d68',
    board: '#8a7559',
    binding: '#a77a3c',
    shadow: 'rgba(43,31,20,.34)',
    collection: 'core'
  },
  {
    id: 'newsprint-month',
    name: 'Newsprint Month',
    subtitle: 'Broadsheet · editorial columns',
    mark: '報',
    visual: 'newsprint',
    paper: '#deddd5',
    paperAlt: '#cfcec7',
    ink: '#242522',
    mutedInk: '#666760',
    rule: '#8f9089',
    accent: '#343a3d',
    sunday: '#9a463f',
    saturday: '#445f71',
    board: '#bcbcb4',
    binding: '#5e605b',
    shadow: 'rgba(25,26,24,.25)',
    collection: 'core'
  },
  {
    id: 'hanami-scroll',
    name: 'Hanami Scroll',
    subtitle: 'Spring hanging scroll · blossom margins',
    mark: '花',
    visual: 'hanami',
    paper: '#fffaf6',
    paperAlt: '#f7eee9',
    ink: '#2f2928',
    mutedInk: '#8a7774',
    rule: '#d9bfc1',
    accent: '#cf6f89',
    sunday: '#bb4f63',
    saturday: '#6d7f9d',
    board: '#cdb9a6',
    binding: '#7d5f53',
    shadow: 'rgba(79,48,44,.22)',
    collection: 'edition'
  },
  {
    id: 'winter-advent',
    name: 'Winter Advent',
    subtitle: 'Folded card month · evergreen markers',
    mark: '冬',
    visual: 'winter',
    paper: '#fbf7ea',
    paperAlt: '#eee8d8',
    ink: '#26352e',
    mutedInk: '#728078',
    rule: '#b9c2b9',
    accent: '#8e3337',
    sunday: '#9d393f',
    saturday: '#416759',
    board: '#66755f',
    binding: '#b59a72',
    shadow: 'rgba(38,53,44,.25)',
    collection: 'edition'
  },
  {
    id: 'holi-powder',
    name: 'Holi Powder',
    subtitle: 'Festival poster · colour-field days',
    mark: 'रंग',
    visual: 'holi',
    paper: '#fffaf3',
    paperAlt: '#f5eee6',
    ink: '#302d2c',
    mutedInk: '#786f6a',
    rule: '#d8c9c0',
    accent: '#d64d85',
    sunday: '#d64d85',
    saturday: '#4479b5',
    board: '#e8d8c9',
    binding: '#6b4e70',
    shadow: 'rgba(84,51,72,.23)',
    collection: 'edition'
  },
  {
    id: 'diwali-diya',
    name: 'Diwali Diya',
    subtitle: 'Night ledger · illuminated month',
    mark: 'दी',
    visual: 'diwali',
    paper: '#17213a',
    paperAlt: '#11182b',
    ink: '#fff3cf',
    mutedInk: '#c8b98e',
    rule: '#715b31',
    accent: '#f2b84b',
    sunday: '#ef8c65',
    saturday: '#78a9c7',
    board: '#0d1324',
    binding: '#c79845',
    shadow: 'rgba(2,6,18,.55)',
    collection: 'edition'
  },
  {
    id: 'momentum-month',
    name: 'Momentum Month',
    subtitle: 'Planning board · weekly checkpoints',
    mark: '↗',
    visual: 'momentum',
    paper: '#f8f5ec',
    paperAlt: '#eee9dd',
    ink: '#242729',
    mutedInk: '#74777a',
    rule: '#c8c4ba',
    accent: '#d96832',
    sunday: '#b85a45',
    saturday: '#53738c',
    board: '#c7c1b3',
    binding: '#383b3d',
    shadow: 'rgba(43,42,38,.23)',
    collection: 'edition'
  }

];

export function getJourneyTheme(id?: string): JourneyThemeDefinition {
  return journeyThemes.find(theme => theme.id === id) ?? journeyThemes[0];
}
