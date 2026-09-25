export type TaskCategory =
  | 'Projects'
  | 'Learning'
  | 'Study'
  | 'Career'
  | 'Health'
  | 'Personal';

export type TaskDifficulty = 'small' | 'normal' | 'hard' | 'quest';
export type ActivityCategory = TaskCategory;

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  dueDate?: string;
  notes?: string;
  projectId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Activity {
  id: string;
  date: string;
  category: TaskCategory;
  title: string;
  note?: string;
  durationMinutes: number;
  xp: number;
  createdAt: string;
}

export interface DailyEntry {
  date: string;
  energy?: number;
  mood?: string;
  tomorrowPriority?: string;
  status?: 'meaningful' | 'partial' | 'missed' | 'exceptional' | 'recovery';
  updatedAt: string;
}

export interface GardenState {
  id: 'main';
  seedType: string;
  water: number;
  sunlight: number;
  fertilizer: number;
  growth: number;
  plantedAt: string;
  updatedAt: string;
}

export type AppTheme = 'midnight-grove' | 'washi-sanctuary' | 'kyoto-blueprint' | 'neon-kernel' | 'moonlit-garden';
export type InterfaceStyle = 'soft' | 'quiet' | 'structured';
export type InterfaceScale = 'compact' | 'balanced' | 'large' | 'oversized';
export type InterfaceFont = 'theme' | 'modern' | 'editorial' | 'humanist' | 'technical';
export type InterfaceTextScale = 'small' | 'default' | 'large' | 'xlarge';
export type FamiliarActivity = 'lively' | 'calm' | 'still' | 'hidden';
export type JourneyCalendarTheme = 'nihon-sakura' | 'fuji-seasonal' | 'study-wall' | 'washi-minimal' | 'midnight-desk';
export type DailyPageTheme =
  | 'himekuri'
  | 'warm-paper'
  | 'winter-study'
  | 'christmas'
  | 'sakura-dawn'
  | 'minimal-mono';

export interface UserSettings {
  id: 'main';
  appTheme: AppTheme;
  interfaceStyle: InterfaceStyle;
  interfaceScale: InterfaceScale;
  interfaceFont: InterfaceFont;
  interfaceTextScale: InterfaceTextScale;
  familiarActivity: FamiliarActivity;
  showDailyPage: boolean;
  dailyPageTheme: DailyPageTheme;
  journeyCalendarTheme: JourneyCalendarTheme;
  showMiniMonth: boolean;
  reducedMotion: boolean;
  tearSound: boolean;
  onboardingComplete: boolean;
  onboardingCompletedAt?: string;
  chapterIntent: string;
  focusAreas: TaskCategory[];
  updatedAt: string;
}

export interface DayRecord {
  date: string;
  memo: string;
  status: 'open' | 'closed';
  closedAt?: string;
  completedTaskIds: string[];
  carriedTaskIds: string[];
  leftOpenTaskIds: string[];
  updatedAt: string;
}

export type MilestoneKind = 'exam' | 'deadline' | 'release' | 'event' | 'other';

export interface Milestone {
  id: string;
  title: string;
  date: string;
  kind: MilestoneKind;
  category?: TaskCategory;
  createdAt: string;
}
export interface WeeklyReflection {
  weekStart: string;
  title: string;
  wins: string;
  friction: string;
  nextFocus: string;
  note: string;
  updatedAt: string;
}

export type VaultMemoryKind = 'note' | 'photo' | 'file' | 'link' | 'mixed';
export type MemoryAttachmentKind = 'image' | 'pdf' | 'file';

export interface VaultMemory {
  id: string;
  title: string;
  body: string;
  date: string;
  linkUrl?: string;
  tags: string[];
  taskId?: string;
  kind: VaultMemoryKind;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryAttachment {
  id: string;
  memoryId: string;
  name: string;
  mimeType: string;
  size: number;
  kind: MemoryAttachmentKind;
  blob: Blob;
  createdAt: string;
}


export type RoadmapMode = 'green' | 'amber' | 'red' | 'recovery';

export interface RoadmapPhase {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  mode: RoadmapMode;
  intent: string;
  note: string;
  source: 'user' | 'agent' | 'imported';
  createdAt: string;
  updatedAt: string;
}

export type RoadmapLane = 'learning' | 'project' | 'proof' | 'career' | 'university';
export type RoadmapItemStatus = 'planned' | 'active' | 'done' | 'paused';

export interface RoadmapItem {
  id: string;
  phaseId: string;
  title: string;
  detail: string;
  lane: RoadmapLane;
  targetDate?: string;
  status: RoadmapItemStatus;
  projectId?: string;
  notes?: string;
  source: 'plan' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export type CareerProjectStatus = 'idea' | 'building' | 'beta' | 'released' | 'maintaining' | 'archived';

export interface CareerProject {
  id: string;
  title: string;
  summary: string;
  status: CareerProjectStatus;
  category?: TaskCategory;
  startedAt?: string;
  targetDate?: string;
  repoUrl?: string;
  demoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProofKind = 'project' | 'certificate' | 'github' | 'linkedin' | 'resume' | 'demo' | 'writing' | 'internship' | 'other';

export interface ProofItem {
  id: string;
  title: string;
  kind: ProofKind;
  date: string;
  url?: string;
  note?: string;
  projectId?: string;
  roadmapItemId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = 'watching' | 'preparing' | 'applied' | 'interview' | 'offer' | 'closed';

export interface CareerApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  sourceUrl?: string;
  deadline?: string;
  appliedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type AchievementRewardKind = 'landmark' | 'rare-seed' | 'egg';

export interface AchievementUnlock {
  id: string;
  achievementId: string;
  unlockedAt: string;
  seenAt?: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  rewardKind: AchievementRewardKind;
  rewardLabel: string;
  artifact: 'stone-lantern' | 'sakura-sapling' | 'moonstone' | 'nest-egg' | 'proof-marker' | 'reflection-bench';
}


export type CompanionProposalKind = 'move-task' | 'unschedule-task' | 'create-task' | 'create-roadmap-phase' | 'create-roadmap-item';
export type CompanionProposalStatus = 'pending' | 'applied' | 'dismissed' | 'failed';

export interface CompanionProposal {
  id: string;
  kind: CompanionProposalKind;
  title: string;
  reason: string;
  status: CompanionProposalStatus;
  taskId?: string;
  fromDate?: string;
  toDate?: string;
  newTask?: {
    title: string;
    category: TaskCategory;
    difficulty: TaskDifficulty;
    dueDate?: string;
    notes?: string;
  };
  newPhase?: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    mode: RoadmapMode;
    intent: string;
    note: string;
  };
  newRoadmapItem?: {
    phaseId: string;
    title: string;
    detail: string;
    lane: RoadmapLane;
    targetDate?: string;
  };
  appliedAt?: string;
  error?: string;
}

export type CompanionMessageRole = 'user' | 'assistant';

export interface CompanionMessage {
  id: string;
  role: CompanionMessageRole;
  content: string;
  createdAt: string;
  model?: string;
  proposals?: CompanionProposal[];
}

export type CompanionProvider = 'ollama' | 'api';

export interface CompanionState {
  id: 'main';
  provider: CompanionProvider;
  endpoint: string;
  model: string;
  contextScope: 'today' | 'week' | 'broader';
  lastConnectedAt?: string;
  updatedAt: string;
}

export type SyncOperation = 'upsert' | 'delete';

export type SyncTableName =
  | 'activities'
  | 'dailyEntries'
  | 'tasks'
  | 'garden'
  | 'settings'
  | 'dayRecords'
  | 'milestones'
  | 'weeklyReflections'
  | 'memories'
  | 'memoryAttachments'
  | 'roadmapPhases'
  | 'roadmapItems'
  | 'careerProjects'
  | 'proofItems'
  | 'careerApplications'
  | 'achievementUnlocks'
  | 'companionMessages';

export interface SyncQueueItem {
  id: string;
  table: SyncTableName;
  recordId: string;
  operation: SyncOperation;
  changedAt: string;
}

export interface SyncState {
  id: 'main';
  deviceId: string;
  deviceName: string;
  provider: 'none';
  transportEnabled: boolean;
  lastBackupAt?: string;
  lastRestoreAt?: string;
  lastManifestAt?: string;
  lastManifestHash?: string;
  updatedAt: string;
}

