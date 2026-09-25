import type { AppTheme } from '../types';

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  subtitle: string;
  description: string;
  mark: string;
  inspiration: string;
}

export const appThemes: ThemeDefinition[] = [
  {
    id: 'midnight-grove',
    name: 'Midnight Grove',
    subtitle: 'Quiet dark · living green',
    description: 'The default Ikigai atmosphere: matte graphite, botanical green and warm ivory.',
    mark: '森',
    inspiration: 'Dark editorial / garden layouts'
  },
  {
    id: 'washi-sanctuary',
    name: 'Washi Sanctuary',
    subtitle: 'Ivory paper · vermilion ink',
    description: 'A light editorial workspace inspired by Japanese stationery and tactile paper.',
    mark: '紙',
    inspiration: 'Wabi-sabi paper layout'
  },
  {
    id: 'kyoto-blueprint',
    name: 'Kyoto Blueprint',
    subtitle: 'Navy grid · cyan drafting ink',
    description: 'Technical, precise and architectural without turning the product into a CAD tool.',
    mark: '図',
    inspiration: 'Architectural blueprint layout'
  },
  {
    id: 'neon-kernel',
    name: 'Neon Kernel',
    subtitle: 'Black terminal · acid lime',
    description: 'The most expressive option: terminal energy, hard geometry and luminous status lines.',
    mark: '核',
    inspiration: 'Cyber / terminal layouts'
  },
  {
    id: 'moonlit-garden',
    name: 'Moonlit Garden',
    subtitle: 'Charcoal · moss · aged bronze',
    description: 'A softer dark theme with serif accents, subtle contour lines and a contemplative mood.',
    mark: '月',
    inspiration: 'Dark Japanese editorial layout'
  }
];

export const defaultAppTheme: AppTheme = 'midnight-grove';
