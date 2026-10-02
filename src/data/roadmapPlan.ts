import type { RoadmapLane, RoadmapMode } from '../types';

// Roadmap structure belongs to the user. This module only contains display copy
// for optional phase modes and checkpoint lanes; it intentionally seeds nothing.
export const MODE_COPY: Record<RoadmapMode, { label: string; short: string }> = {
  green: { label: 'NORMAL', short: 'Build normally' },
  amber: { label: 'FOCUS', short: 'Narrow the load' },
  red: { label: 'PROTECTED', short: 'Protect capacity' },
  recovery: { label: 'RECOVERY', short: 'Re-enter gently' }
};

export const LANE_LABELS: Record<RoadmapLane, string> = {
  learning: 'Learning',
  project: 'Project',
  proof: 'Proof',
  career: 'Career',
  university: 'Study'
};
