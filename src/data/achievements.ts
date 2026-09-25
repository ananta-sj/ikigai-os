import type { AchievementDefinition } from '../types';

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'first-footstep',
    title: 'First Footstep',
    description: 'Complete your first quest. The sanctuary remembers the day you began moving.',
    rewardKind: 'landmark',
    rewardLabel: 'Stone lantern',
    artifact: 'stone-lantern'
  },
  {
    id: 'deep-roots',
    title: 'Deep Roots',
    description: 'Finish a hard task or milestone quest.',
    rewardKind: 'landmark',
    rewardLabel: 'Moonstone',
    artifact: 'moonstone'
  },
  {
    id: 'seven-days-seen',
    title: 'Seven Days Seen',
    description: 'Complete meaningful work on seven different days.',
    rewardKind: 'rare-seed',
    rewardLabel: 'Sakura sapling',
    artifact: 'sakura-sapling'
  },
  {
    id: 'proof-exists',
    title: 'Proof Exists',
    description: 'Add your first inspectable proof artifact to Career.',
    rewardKind: 'landmark',
    rewardLabel: 'Proof marker',
    artifact: 'proof-marker'
  },
  {
    id: 'week-kept',
    title: 'The Week Was Kept',
    description: 'Save your first written weekly reflection.',
    rewardKind: 'landmark',
    rewardLabel: 'Reflection bench',
    artifact: 'reflection-bench'
  },
  {
    id: 'open-door',
    title: 'Open Door',
    description: 'Move an opportunity to Applied, Interview or Offer.',
    rewardKind: 'egg',
    rewardLabel: 'Unhatched garden egg',
    artifact: 'nest-egg'
  }
];
