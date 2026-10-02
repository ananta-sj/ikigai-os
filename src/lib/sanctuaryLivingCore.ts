import type { ApplicationStatus, CareerProjectStatus, RoadmapItemStatus, WeeklyReflection } from '../types';
import type { SanctuaryRegionId } from '../data/sanctuary';

export type SanctuaryGrowthTier = 0 | 1 | 2 | 3 | 4;

export interface SanctuaryLivingSource {
  completedTaskDates: string[];
  reflections: Array<Pick<WeeklyReflection, 'title' | 'wins' | 'friction' | 'nextFocus' | 'note'>>;
  memoryCount: number;
  attachmentCount: number;
  roadmapPhaseCount: number;
  roadmapStatuses: RoadmapItemStatus[];
  careerProjectStatuses: CareerProjectStatus[];
  proofCount: number;
  applicationStatuses: ApplicationStatus[];
}

export interface SanctuaryLivingState {
  homeGrove: {
    tier: SanctuaryGrowthTier;
    completedTasks: number;
    recentCompletedTasks: number;
    activeDays: number;
    flowerCount: number;
  };
  moonPond: {
    tier: SanctuaryGrowthTier;
    reflections: number;
    lilyCount: number;
  };
  quietPavilion: {
    tier: SanctuaryGrowthTier;
    memories: number;
    attachments: number;
    lanternCount: number;
  };
  lookout: {
    tier: SanctuaryGrowthTier;
    roadmapTier: SanctuaryGrowthTier;
    careerTier: SanctuaryGrowthTier;
    roadmapPhases: number;
    roadmapDone: number;
    roadmapActive: number;
    routeMarkers: number;
    projects: number;
    proof: number;
    activeApplications: number;
  };
  threshold: {
    tier: SanctuaryGrowthTier;
    totalTraces: number;
  };
  worldTier: SanctuaryGrowthTier;
}

const EMPTY_SOURCE: SanctuaryLivingSource = {
  completedTaskDates: [],
  reflections: [],
  memoryCount: 0,
  attachmentCount: 0,
  roadmapPhaseCount: 0,
  roadmapStatuses: [],
  careerProjectStatuses: [],
  proofCount: 0,
  applicationStatuses: []
};

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(Number.isFinite(value) ? value : 0)));
}

function tierFromScore(score: number, thresholds: [number, number, number, number]): SanctuaryGrowthTier {
  if (score >= thresholds[3]) return 4;
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

function hasReflectionContent(reflection: SanctuaryLivingSource['reflections'][number]) {
  return [reflection.title, reflection.wins, reflection.friction, reflection.nextFocus, reflection.note]
    .some(value => value.trim().length > 0);
}

function safeTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function emptySanctuaryLivingState(): SanctuaryLivingState {
  return deriveSanctuaryLivingState(EMPTY_SOURCE, new Date(0));
}

export function deriveSanctuaryLivingState(
  source: SanctuaryLivingSource,
  now = new Date()
): SanctuaryLivingState {
  const nowTime = now.getTime();
  const recentCutoff = nowTime - 30 * 24 * 60 * 60 * 1000;
  const futureTolerance = nowTime + 24 * 60 * 60 * 1000;
  const completedEntries = source.completedTaskDates
    .map(value => ({ value, time: safeTime(value) }))
    .filter((entry): entry is { value: string; time: number } => entry.time !== null && entry.time <= futureTolerance);
  const completedTimes = completedEntries.map(entry => entry.time);
  const completedTasks = completedTimes.length;
  const recentCompletedTasks = completedTimes.filter(value => value >= recentCutoff).length;
  const activeDays = new Set(completedEntries.map(entry => {
    const date = new Date(entry.time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })).size;
  const taskScore = completedTasks + recentCompletedTasks * 1.35 + Math.min(activeDays, 10) * .45;
  const homeTier = tierFromScore(taskScore, [1, 6, 18, 45]);

  const reflectionCount = source.reflections.filter(hasReflectionContent).length;
  const reflectionTier = tierFromScore(reflectionCount, [1, 3, 8, 18]);

  const memoryCount = clampInt(source.memoryCount, 0, 100000);
  const attachmentCount = clampInt(source.attachmentCount, 0, 100000);
  const memoryScore = memoryCount + Math.min(attachmentCount, memoryCount * 3 + 8) * .35;
  const memoryTier = tierFromScore(memoryScore, [1, 5, 14, 36]);

  const roadmapDone = source.roadmapStatuses.filter(status => status === 'done').length;
  const roadmapActive = source.roadmapStatuses.filter(status => status === 'active').length;
  const roadmapScore = source.roadmapPhaseCount + roadmapDone * 2.2 + roadmapActive * 1.2 + source.roadmapStatuses.length * .2;
  const roadmapTier = tierFromScore(roadmapScore, [1, 5, 14, 34]);

  const projectCount = source.careerProjectStatuses.length;
  const shippedProjects = source.careerProjectStatuses.filter(status => status === 'released' || status === 'maintaining').length;
  const buildingProjects = source.careerProjectStatuses.filter(status => status === 'building' || status === 'beta').length;
  const activeApplications = source.applicationStatuses.filter(status => status !== 'closed').length;
  const careerScore = source.proofCount * 2.2 + shippedProjects * 2.4 + buildingProjects * 1.1 + activeApplications * .65 + projectCount * .2;
  const careerTier = tierFromScore(careerScore, [1, 5, 14, 32]);
  const lookoutTier = Math.max(roadmapTier, careerTier) as SanctuaryGrowthTier;

  const totalTraces = completedTasks + reflectionCount + memoryCount + roadmapDone + source.proofCount + shippedProjects;
  const thresholdTier = tierFromScore(totalTraces, [1, 12, 35, 80]);
  const worldTier = Math.max(
    thresholdTier,
    Math.min(4, Math.round((homeTier + reflectionTier + memoryTier + lookoutTier) / 4)) as SanctuaryGrowthTier
  ) as SanctuaryGrowthTier;

  return {
    homeGrove: {
      tier: homeTier,
      completedTasks,
      recentCompletedTasks,
      activeDays,
      flowerCount: [0, 5, 11, 19, 28][homeTier]
    },
    moonPond: {
      tier: reflectionTier,
      reflections: reflectionCount,
      lilyCount: [0, 2, 4, 7, 10][reflectionTier]
    },
    quietPavilion: {
      tier: memoryTier,
      memories: memoryCount,
      attachments: attachmentCount,
      lanternCount: [0, 1, 3, 6, 10][memoryTier]
    },
    lookout: {
      tier: lookoutTier,
      roadmapTier,
      careerTier,
      roadmapPhases: clampInt(source.roadmapPhaseCount, 0, 100000),
      roadmapDone,
      roadmapActive,
      routeMarkers: Math.min(8, roadmapDone + Math.min(2, roadmapActive) + Math.min(2, source.roadmapPhaseCount)),
      projects: projectCount,
      proof: clampInt(source.proofCount, 0, 100000),
      activeApplications
    },
    threshold: {
      tier: thresholdTier,
      totalTraces
    },
    worldTier
  };
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

export function sanctuaryRegionNarrative(region: SanctuaryRegionId, state: SanctuaryLivingState) {
  switch (region) {
    case 'threshold':
      return state.threshold.totalTraces
        ? `The Sanctuary now carries ${plural(state.threshold.totalTraces, 'local trace')} from work you already recorded elsewhere.`
        : 'A quiet beginning. The world can stay sparse until your ordinary Ikigai activity gives it something to remember.';
    case 'home-grove':
      if (!state.homeGrove.completedTasks) return 'The grove is resting. Completed tasks will gradually add ground cover, flowers and younger growth here.';
      return `${plural(state.homeGrove.completedTasks, 'completed task')} have enriched the grove${state.homeGrove.recentCompletedTasks ? `, including ${state.homeGrove.recentCompletedTasks} in the last 30 days` : ''}.`;
    case 'moon-pond':
      return state.moonPond.reflections
        ? `${plural(state.moonPond.reflections, 'written weekly reflection')} now leave lilies, reeds and a calmer glow around the water.`
        : 'The pond is intentionally still. Writing a weekly reflection will leave a subtle trace here without creating another score.';
    case 'quiet-pavilion':
      if (!state.quietPavilion.memories) return 'The pavilion is mostly unlit. Memories in the Vault will become quiet lantern traces around this place.';
      return `${plural(state.quietPavilion.memories, 'memory', 'memories')} and ${plural(state.quietPavilion.attachments, 'attachment')} are represented here as lanterns and small light traces.`;
    case 'lookout': {
      const roadmap = state.lookout.roadmapDone || state.lookout.roadmapActive
        ? `${plural(state.lookout.roadmapDone, 'checkpoint')} complete${state.lookout.roadmapActive ? ` and ${state.lookout.roadmapActive} active` : ''}`
        : 'no completed roadmap checkpoints yet';
      const career = state.lookout.proof || state.lookout.projects
        ? `${plural(state.lookout.proof, 'proof item')} across ${plural(state.lookout.projects, 'project')}`
        : 'no career proof yet';
      return `The ridge reflects ${roadmap}; the beacon reflects ${career}.`;
    }
  }
}
