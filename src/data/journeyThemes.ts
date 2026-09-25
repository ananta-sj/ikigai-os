import type { JourneyCalendarTheme } from '../types';

export type JourneyThemeVisual = 'nihon' | 'landscape' | 'study' | 'washi' | 'night';

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
}

export const journeyThemes: JourneyThemeDefinition[] = [
  {
    id: 'nihon-sakura',
    name: 'Nihon Sakura',
    subtitle: 'Bilingual grid · spring print',
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
    shadow: 'rgba(20,16,12,.22)'
  },
  {
    id: 'fuji-seasonal',
    name: 'Fuji Seasonal',
    subtitle: 'Landscape wall calendar',
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
    shadow: 'rgba(19,25,35,.24)'
  },
  {
    id: 'study-wall',
    name: 'Study Wall',
    subtitle: 'Spiral notes · quiet grid',
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
    shadow: 'rgba(23,32,26,.18)'
  },
  {
    id: 'washi-minimal',
    name: 'Washi Minimal',
    subtitle: 'Warm paper · ink and air',
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
    shadow: 'rgba(48,35,24,.24)'
  },
  {
    id: 'midnight-desk',
    name: 'Midnight Desk',
    subtitle: 'Dark paper · moonlit ink',
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
    shadow: 'rgba(0,0,0,.5)'
  }
];

export function getJourneyTheme(id?: string): JourneyThemeDefinition {
  return journeyThemes.find(theme => theme.id === id) ?? journeyThemes[0];
}
