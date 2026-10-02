import { db } from '../db';
import { deriveSanctuaryLivingState, type SanctuaryLivingState } from './sanctuaryLivingCore';

export * from './sanctuaryLivingCore';

export async function loadSanctuaryLivingState(now = new Date()): Promise<SanctuaryLivingState> {
  const [
    tasks,
    reflections,
    memoryCount,
    attachmentCount,
    roadmapPhaseCount,
    roadmapItems,
    careerProjects,
    proofCount,
    applications
  ] = await Promise.all([
    db.tasks.toArray(),
    db.weeklyReflections.toArray(),
    db.memories.count(),
    db.memoryAttachments.count(),
    db.roadmapPhases.count(),
    db.roadmapItems.toArray(),
    db.careerProjects.toArray(),
    db.proofItems.count(),
    db.careerApplications.toArray()
  ]);

  return deriveSanctuaryLivingState({
    completedTaskDates: tasks.flatMap(task => task.completedAt ? [task.completedAt] : []),
    reflections,
    memoryCount,
    attachmentCount,
    roadmapPhaseCount,
    roadmapStatuses: roadmapItems.map(item => item.status),
    careerProjectStatuses: careerProjects.map(project => project.status),
    proofCount,
    applicationStatuses: applications.map(application => application.status)
  }, now);
}
