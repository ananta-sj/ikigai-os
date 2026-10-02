import type { AchievementDefinition, SanctuarySecretId } from '../types';
import type { SanctuaryRegionId } from './sanctuary';

export interface SanctuaryArtifactPlacement {
  achievementId: string;
  region: SanctuaryRegionId;
  position: [number, number];
  rotation?: number;
  scale?: number;
}

export const sanctuaryArtifactPlacements: SanctuaryArtifactPlacement[] = [
  { achievementId: 'first-footstep', region: 'threshold', position: [-1.75, 7.15], rotation: .18 },
  { achievementId: 'deep-roots', region: 'moon-pond', position: [-8.72, 1.18], rotation: -.25 },
  { achievementId: 'seven-days-seen', region: 'home-grove', position: [-3.25, -.25], rotation: .42, scale: .68 },
  { achievementId: 'proof-exists', region: 'lookout', position: [7.18, -4.62], rotation: -.2 },
  { achievementId: 'week-kept', region: 'moon-pond', position: [-5.25, 3.2], rotation: .84, scale: .74 },
  { achievementId: 'open-door', region: 'quiet-pavilion', position: [7.68, 4.65], rotation: -.45 }
];

export const sanctuaryArtifactPlacementById = Object.fromEntries(
  sanctuaryArtifactPlacements.map(item => [item.achievementId, item])
) as Record<string, SanctuaryArtifactPlacement>;

export function sanctuaryArtifactMessage(definition: AchievementDefinition) {
  return `${definition.title} · ${definition.rewardLabel}. ${definition.description}`;
}

export interface SanctuarySecretDefinition {
  id: SanctuarySecretId;
  title: string;
  hint: string;
  found: string;
  region: SanctuaryRegionId;
  position: [number, number];
}

export const sanctuarySecrets: SanctuarySecretDefinition[] = [
  {
    id: 'old-cairn',
    title: 'Old Cairn',
    hint: 'A small stack of stones sits off the main route.',
    found: 'You found an old cairn tucked behind the ridge. Nothing to collect—just a quiet place that was already here.',
    region: 'lookout',
    position: [9.45, -7.35]
  },
  {
    id: 'moon-moth',
    title: 'Moon Moth',
    hint: 'At dusk and night, a pale light sometimes circles the pond.',
    found: 'A moon moth circles once above the water before settling into the reeds. It appears only when the pond has begun to remember reflections.',
    region: 'moon-pond',
    position: [-8.55, 3.5]
  },
  {
    id: 'paper-crane',
    title: 'Paper Crane',
    hint: 'Something folded rests near the pavilion after the first memory arrives.',
    found: 'A tiny folded crane rests near the pavilion. It carries no memory text—only the fact that something worth keeping exists.',
    region: 'quiet-pavilion',
    position: [5.22, 4.58]
  }
];

export const sanctuarySecretById = Object.fromEntries(
  sanctuarySecrets.map(secret => [secret.id, secret])
) as Record<SanctuarySecretId, SanctuarySecretDefinition>;
