import type { GardenTheme } from '../types';

export type GardenDayPeriod = 'dawn' | 'day' | 'dusk' | 'night';

export interface GardenThemePalette {
  sky: string;
  fog: string;
  ambient: string;
  key: string;
  fill: string;
  ground: string;
  groundAlt: [string, string, string];
  grass: string;
  shrub: string;
  shrubAccent: string;
  trunk: string;
  path: string;
  pathAlt: string;
  stone: string;
  stoneAlt: string;
  soil: string;
  soilRing: string;
  soilEdge: string;
  water: string;
  waterRing: string;
  reed: string;
  flower: [string, string, string];
  mote: [string, string];
  celestial: string;
  plant: string[];
  bloom: [string, string];
  accent: string;
  accentSoft: string;
}

export interface GardenThemeDefinition {
  id: GardenTheme;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  glyph: string;
  decoration: 'grove' | 'moonwell' | 'aether' | 'sunhive';
  swatches: [string, string, string];
  periods: Record<GardenDayPeriod, GardenThemePalette>;
}

const makePeriod = (base: Omit<GardenThemePalette, 'sky' | 'fog' | 'ambient' | 'key' | 'fill' | 'celestial'>, light: Pick<GardenThemePalette, 'sky' | 'fog' | 'ambient' | 'key' | 'fill' | 'celestial'>): GardenThemePalette => ({ ...base, ...light });

const cedarBase = {
  ground: '#556447', groundAlt: ['#4b5d40', '#44543a', '#65674f'] as [string,string,string], grass: '#314a34', shrub: '#425a3d', shrubAccent: '#60704d', trunk: '#4b4033', path: '#777468', pathAlt: '#8a8477', stone: '#686a62', stoneAlt: '#85847b', soil: '#433527', soilRing: '#594735', soilEdge: '#4b5840', water: '#435f60', waterRing: '#9cb5ad', reed: '#536849', flower: ['#caa2a3','#d6c59b','#c0c7bd'] as [string,string,string], mote: ['#d7d1b6','#bbc8b2'] as [string,string], plant: ['#69543f','#755c42','#6f8060','#65795a','#5d7252','#52684c','#485e45','#8a6c64'], bloom: ['#c9a3a5','#e1c7bd'] as [string,string], accent:'#9bb18a', accentSoft:'#d9dfcf'
};

const moonBase = {
  ground: '#37413b', groundAlt: ['#303a35','#28332f','#465047'] as [string,string,string], grass: '#30443a', shrub: '#33483d', shrubAccent: '#536659', trunk: '#3d3933', path: '#656760', pathAlt: '#777870', stone: '#626964', stoneAlt: '#848983', soil: '#34312c', soilRing: '#494740', soilEdge: '#3f4c43', water: '#273f45', waterRing: '#9ba9a2', reed: '#4a5b50', flower: ['#d9d5c8','#c6c9ca','#e3ddd0'] as [string,string,string], mote: ['#e2d5a8','#c9d5c7'] as [string,string], plant: ['#4c514a','#535a51','#64705f','#5c6a5c','#536052','#4b594c','#445144','#a39b7b'], bloom: ['#d9d1bf','#e6dfd0'] as [string,string], accent:'#c8b47f', accentSoft:'#e5dfcf'
};

const sakuraBase = {
  ground: '#7c786a', groundAlt: ['#817d70','#716d61','#8d8777'] as [string,string,string], grass: '#65705b', shrub: '#6b745f', shrubAccent: '#848b70', trunk: '#675448', path: '#aaa394', pathAlt: '#c1b9aa', stone: '#97978f', stoneAlt: '#b0afa7', soil: '#594a40', soilRing: '#725f52', soilEdge: '#727765', water: '#73888a', waterRing: '#c9d6d0', reed: '#707b68', flower: ['#e7b9bd','#f0c8cb','#d9cbc1'] as [string,string,string], mote: ['#eabfc0','#eee2d3'] as [string,string], plant: ['#77604f','#806958','#7d876e','#758067','#6c775f','#637057','#5b6650','#b48284'], bloom: ['#e4afb4','#f0c8c7'] as [string,string], accent:'#d59ca0', accentSoft:'#eee0dc'
};

const autumnBase = {
  ground: '#65523b', groundAlt: ['#705b40','#584833','#795f40'] as [string,string,string], grass: '#5d5f3a', shrub: '#665a35', shrubAccent: '#8a6d3f', trunk: '#4d3728', path: '#8b765d', pathAlt: '#a58a6a', stone: '#77736a', stoneAlt: '#918a7c', soil: '#483326', soilRing: '#624633', soilEdge: '#68543a', water: '#4e5b59', waterRing: '#b3b19b', reed: '#666542', flower: ['#b86747','#d09355','#dfc28a'] as [string,string,string], mote: ['#c9814e','#e2b76f'] as [string,string], plant: ['#6c4b31','#795536','#857044','#8e7949','#806438','#74532e','#68492a','#a75e42'], bloom: ['#b45d43','#d48a52'] as [string,string], accent:'#c18455', accentSoft:'#dfc7a3'
};

export const gardenThemes: GardenThemeDefinition[] = [
  {
    id: 'verdant-sanctuary', label: 'Cedar Rain', shortLabel: 'Cedar', tagline: 'Moss, wet stone, cedar shade', description: 'A grounded rain-garden atmosphere: dark cedar, damp moss, muted water and stone softened by weather.', glyph: '雨', decoration: 'grove', swatches: ['#556447','#686a62','#9bb18a'],
    periods: {
      dawn: makePeriod(cedarBase, { sky:'#66736a', fog:'#737d74', ambient:'#d8d0bf', key:'#d5b98f', fill:'#aab8aa', celestial:'#e0c69e' }),
      day: makePeriod(cedarBase, { sky:'#747f73', fog:'#7f887d', ambient:'#e2dccb', key:'#dbc49b', fill:'#bac4b4', celestial:'#e7d1a8' }),
      dusk: makePeriod({ ...cedarBase, ground:'#5a654d', groundAlt:['#526049','#4a5742','#686b53'] }, { sky:'#737a70', fog:'#7d8178', ambient:'#e2d6c5', key:'#d2a87f', fill:'#b7c4b6', celestial:'#dcc09b' }),
      night: makePeriod({ ...cedarBase, ground:'#465348', groundAlt:['#404d43','#3a473e','#515d4d'], grass:'#35483b', shrub:'#3a4b3f', shrubAccent:'#536454', reed:'#46594a', mote:['#ded6b7','#c7d3c1'] }, { sky:'#34423d', fog:'#414e48', ambient:'#d1d8d0', key:'#e0e2d7', fill:'#aebeb2', celestial:'#ece4d0' })
    }
  },
  {
    id: 'moonwell', label: 'Moon Courtyard', shortLabel: 'Moon', tagline: 'Slate water, lantern stone, night pine', description: 'A restrained night courtyard with charcoal stone, still water and warm lantern points instead of bioluminescent spectacle.', glyph: '月', decoration: 'moonwell', swatches: ['#37413b','#626964','#c8b47f'],
    periods: {
      dawn: makePeriod(moonBase, { sky:'#59635e', fog:'#666e69', ambient:'#d4d5cb', key:'#c9bd9c', fill:'#a3ada7', celestial:'#ddd4bc' }),
      day: makePeriod({ ...moonBase, ground:'#465149' }, { sky:'#6c7770', fog:'#78817b', ambient:'#e2e1d7', key:'#d8ceb2', fill:'#b7c0b9', celestial:'#e6ddc5' }),
      dusk: makePeriod(moonBase, { sky:'#58625d', fog:'#646c67', ambient:'#d4d2c9', key:'#c9ad89', fill:'#aab5ae', celestial:'#dec9a6' }),
      night: makePeriod({ ...moonBase, ground:'#37413c', groundAlt:['#333d38','#303935','#424b44'], mote:['#eadfb5','#d0d7ce'] }, { sky:'#2f3937', fog:'#3b4541', ambient:'#c8cfca', key:'#e4ddcb', fill:'#9aa9a2', celestial:'#f0e7d1' })
    }
  },
  {
    id: 'aether-bloom', label: 'Sakura Mist', shortLabel: 'Sakura', tagline: 'Pale stone, blossom haze, morning air', description: 'A quiet spring garden of pale rock, dusty blossom and thin morning mist. Soft and real rather than floating fantasy terrain.', glyph: '桜', decoration: 'aether', swatches: ['#7c786a','#d59ca0','#eee0dc'],
    periods: {
      dawn: makePeriod(sakuraBase, { sky:'#b2aaa2', fog:'#c2b8ae', ambient:'#f1e6da', key:'#eac5b7', fill:'#d6d8ce', celestial:'#f1d8c6' }),
      day: makePeriod({ ...sakuraBase, ground:'#898477' }, { sky:'#c0bbb1', fog:'#cec8be', ambient:'#f4eee5', key:'#edd7c8', fill:'#e0e1d7', celestial:'#f5dfd0' }),
      dusk: makePeriod({ ...sakuraBase, ground:'#777167' }, { sky:'#9a8f8a', fog:'#a79c96', ambient:'#eadad3', key:'#dda99d', fill:'#cbccc5', celestial:'#e8beb3' }),
      night: makePeriod({ ...sakuraBase, ground:'#5d5a54', groundAlt:['#625f58','#55524d','#6b655d'], grass:'#5d6558', shrub:'#60665b', shrubAccent:'#777b6b', mote:['#e4c1c3','#e1ded5'] }, { sky:'#454748', fog:'#535253', ambient:'#d1cfcc', key:'#e4dbd5', fill:'#a8aaa5', celestial:'#ece5df' })
    }
  },
  {
    id: 'sunhive', label: 'Autumn Tea Garden', shortLabel: 'Autumn', tagline: 'Maple amber, cedar, late light', description: 'An earthy late-season garden with maple colour, timber details and warm low-angle light instead of geometric gold structures.', glyph: '紅', decoration: 'sunhive', swatches: ['#65523b','#8a6d3f','#c18455'],
    periods: {
      dawn: makePeriod(autumnBase, { sky:'#8a735d', fog:'#917c68', ambient:'#ead8bb', key:'#d8aa72', fill:'#c2aa83', celestial:'#efd0a2' }),
      day: makePeriod({ ...autumnBase, ground:'#705a3e' }, { sky:'#9b846d', fog:'#a18d78', ambient:'#efe0c8', key:'#e0b77f', fill:'#ceb590', celestial:'#f1d5aa' }),
      dusk: makePeriod({ ...autumnBase, ground:'#675039' }, { sky:'#7b6250', fog:'#856d59', ambient:'#e2c8ac', key:'#d99566', fill:'#b39475', celestial:'#e8ad7d' }),
      night: makePeriod({ ...autumnBase, ground:'#4b3d31', groundAlt:['#524235','#44372d','#5c4938'], grass:'#55523a', shrub:'#584b36', shrubAccent:'#735b3d', mote:['#d69868','#dfbd88'] }, { sky:'#3b3431', fog:'#493d37', ambient:'#c8b7a5', key:'#dac2a9', fill:'#918070', celestial:'#e5ceb5' })
    }
  }
];

export const defaultGardenTheme: GardenTheme = 'verdant-sanctuary';

export function normalizeGardenTheme(value: unknown): GardenTheme {
  return gardenThemes.some(theme => theme.id === value) ? value as GardenTheme : defaultGardenTheme;
}

export function getGardenTheme(id: GardenTheme): GardenThemeDefinition {
  return gardenThemes.find(theme => theme.id === id) ?? gardenThemes[0];
}
