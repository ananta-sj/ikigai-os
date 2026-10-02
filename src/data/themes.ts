import type { AppTheme } from '../types';

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  subtitle: string;
  description: string;
  mark: string;
  inspiration: string;
  scheme: 'light' | 'dark';
  collection?: 'core' | 'edition';
}

export const appThemes: ThemeDefinition[] = [
  {
    id: 'midnight-grove',
    name: 'Cedar Study',
    subtitle: 'Flax paper · moss ink',
    description: 'A warm cedar-and-flax workspace with moss ink, soft wood grain and enough daylight for long sessions.',
    mark: '森',
    inspiration: 'Japanese cedar, flax paper and moss-bound notebooks',
    scheme: 'light',
    collection: 'core'
  },
  {
    id: 'washi-sanctuary',
    name: 'Washi Sanctuary',
    subtitle: 'Ivory paper · vermilion ink',
    description: 'A light editorial workspace inspired by Japanese stationery, soft fibres and tactile paper.',
    mark: '紙',
    inspiration: 'Wabi-sabi paper layout',
    scheme: 'light',
    collection: 'core'
  },
  {
    id: 'kyoto-blueprint',
    name: 'Indigo Draft',
    subtitle: 'Mist blue · indigo rule',
    description: 'A calm drafting-paper workspace with pale blue-grey stock, indigo construction lines and restrained brass notes.',
    mark: '図',
    inspiration: 'Aizome cloth, architect notebooks and pale cyanotype paper',
    scheme: 'light',
    collection: 'core'
  },
  {
    id: 'neon-kernel',
    name: 'Sumi Workshop',
    subtitle: 'Warm stone · sumi ink',
    description: 'A warm grey workshop of sumi ink, mineral paper and vermilion editorial marks without the weight of a black interface.',
    mark: '墨',
    inspiration: 'Sumi-e ink, mineral paper and workshop labels',
    scheme: 'light',
    collection: 'core'
  },
  {
    id: 'moonlit-garden',
    name: 'Moonlit Ledger',
    subtitle: 'Dusk slate · antique brass',
    description: 'A softened evening ledger with blue-grey slate, warm cream text and restrained bronze details rather than near-black chrome.',
    mark: '月',
    inspiration: 'Evening journals, brass stationery and blue-grey slate',
    scheme: 'dark',
    collection: 'core'
  },
  {
    id: 'hanami-atelier',
    name: 'Hanami Atelier',
    subtitle: 'Petal paper · charcoal ink',
    description: 'A spring stationery edition with pale blossom paper, charcoal text, asymmetric margins and quiet petal marks.',
    mark: '花',
    inspiration: 'Hanami season, stationery wrappers and pale blossom prints',
    scheme: 'light',
    collection: 'edition'
  },
  {
    id: 'winter-hearth',
    name: 'Winter Hearth',
    subtitle: 'Cream card · pine ink',
    description: 'A warm winter desk with cream card, evergreen ink, cranberry details and a restrained woven texture.',
    mark: '冬',
    inspiration: 'Winter cards, evergreen branches and candlelit desks',
    scheme: 'light',
    collection: 'edition'
  },
  {
    id: 'holi-pigment',
    name: 'Holi Pigment',
    subtitle: 'Cotton paper · colour dust',
    description: 'A bright but readable edition where restrained gulal-like pigment blooms sit around a clean cotton-paper workspace.',
    mark: 'रंग',
    inspiration: 'Holi colour, cotton paper and hand-thrown pigment',
    scheme: 'light',
    collection: 'edition'
  },
  {
    id: 'diwali-lantern',
    name: 'Diwali Lantern',
    subtitle: 'Indigo night · diya gold',
    description: 'A luminous evening edition with deep indigo surfaces, warm diya-gold highlights and subtle rangoli geometry.',
    mark: 'दी',
    inspiration: 'Diya light, indigo evenings and geometric rangoli patterns',
    scheme: 'dark',
    collection: 'edition'
  },
  {
    id: 'momentum-board',
    name: 'Momentum Board',
    subtitle: 'Ivory board · signal orange',
    description: 'A crisp motivational workspace built from index cards, ruled planning lines and one energetic signal colour.',
    mark: '↗',
    inspiration: 'Studio pinboards, index cards and visible progress without streak pressure',
    scheme: 'light',
    collection: 'edition'
  }

];

export const defaultAppTheme: AppTheme = 'midnight-grove';

export function isLightAppTheme(id: AppTheme) {
  return (appThemes.find(theme => theme.id === id) ?? appThemes[0]).scheme === 'light';
}
