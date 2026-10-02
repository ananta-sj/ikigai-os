import { db } from '../db';
import { isDateKey } from './integrityCore';
import { reflectionHasWriting } from './continuityCore';
import { listRoadmapPhases, localDateKey, phaseForDate } from './career';
import { dateFromKey, weekStartKey } from './weeklyReflection';
import { workspaceIdParam } from './workspaceContinuityCore';

export interface FamiliarRoomSignal {
  label: string;
  title: string;
  detail: string;
}

function searchParams(search: string) {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

export async function loadFamiliarRoomSignal(pathname: string, search = ''): Promise<FamiliarRoomSignal | null> {
  const params = searchParams(search);

  if (pathname === '/roadmap') {
    const checkpointId = workspaceIdParam(params.get('checkpoint'));
    if (checkpointId) {
      const checkpoint = await db.roadmapItems.get(checkpointId);
      if (checkpoint) {
        const proofCount = await db.proofItems.where('roadmapItemId').equals(checkpointId).count();
        return {
          label: 'ROOM NOTE',
          title: proofCount
            ? `${proofCount} ${proofCount === 1 ? 'proof item is' : 'proof items are'} linked to this checkpoint.`
            : 'This checkpoint has no proof linked yet.',
          detail: proofCount
            ? 'Career holds the evidence; Roadmap only keeps the thread visible.'
            : 'If evidence exists later, Career can attach it here without turning the Roadmap into a portfolio.'
        };
      }
    }

    const phases = await listRoadmapPhases();
    const current = phaseForDate(phases, localDateKey());
    if (!current) {
      return { label: 'ROOM NOTE', title: 'No Roadmap chapter covers today.', detail: 'A gap can stay a gap until another phase is genuinely useful.' };
    }
    const items = await db.roadmapItems.where('phaseId').equals(current.id).toArray();
    const openCount = items.filter(item => item.status !== 'done').length;
    return {
      label: 'ROOM NOTE',
      title: openCount ? `${openCount} ${openCount === 1 ? 'checkpoint remains' : 'checkpoints remain'} open in the current chapter.` : 'The current chapter has no open checkpoints.',
      detail: 'This is context, not a score. The Familiar does not judge the pace of the chapter.'
    };
  }

  if (pathname === '/career') {
    const proofId = workspaceIdParam(params.get('proof'));
    if (proofId) {
      const proof = await db.proofItems.get(proofId);
      if (proof) {
        const anchors = Number(Boolean(proof.projectId)) + Number(Boolean(proof.roadmapItemId));
        return {
          label: 'ROOM NOTE',
          title: anchors === 2 ? 'This proof is anchored to both a project and a Roadmap checkpoint.' : anchors === 1 ? 'This proof has one local anchor.' : 'This proof is intentionally standalone.',
          detail: 'The Familiar can notice the connection without reading or repeating the proof note.'
        };
      }
    }

    const [proofCount, applications] = await Promise.all([
      db.proofItems.count(),
      db.careerApplications.toArray()
    ]);
    const openOpportunities = applications.filter(item => item.status !== 'closed').length;
    return {
      label: 'ROOM NOTE',
      title: proofCount ? `${proofCount} ${proofCount === 1 ? 'piece of proof lives' : 'pieces of proof live'} here.` : 'No proof has been kept here yet.',
      detail: openOpportunities ? `${openOpportunities} ${openOpportunities === 1 ? 'opportunity is' : 'opportunities are'} still open. Nothing here is scored.` : 'There are no open opportunities asking for attention.'
    };
  }

  if (pathname === '/memories') {
    const date = params.get('date');
    if (isDateKey(date)) {
      const memoryCount = await db.memories.where('date').equals(date).count();
      return {
        label: 'ROOM NOTE',
        title: memoryCount ? `${memoryCount} ${memoryCount === 1 ? 'memory belongs' : 'memories belong'} to this day.` : 'Nothing has been kept from this day yet.',
        detail: 'Only the count leaves the vault. Memory titles and text stay inside this room.'
      };
    }
  }

  if (pathname === '/reflection') {
    const week = params.get('week');
    if (isDateKey(week)) {
      const normalizedWeek = weekStartKey(dateFromKey(week));
      const reflection = await db.weeklyReflections.get(normalizedWeek);
      const started = reflectionHasWriting(reflection);
      return {
        label: 'ROOM NOTE',
        title: started ? 'This week already has a Reflection in progress.' : 'This week is still unwritten.',
        detail: 'The Familiar notices whether writing exists, never the private words themselves.'
      };
    }
  }

  if (pathname === '/calendar') {
    const date = params.get('date');
    if (isDateKey(date)) {
      const week = weekStartKey(dateFromKey(date));
      const [memoryCount, reflection] = await Promise.all([
        db.memories.where('date').equals(date).count(),
        db.weeklyReflections.get(week)
      ]);
      const reflectionStarted = reflectionHasWriting(reflection);
      return {
        label: 'ROOM NOTE',
        title: memoryCount ? `${memoryCount} ${memoryCount === 1 ? 'memory is' : 'memories are'} anchored to this day.` : 'This day has no saved memories.',
        detail: reflectionStarted ? 'Its week also has a Reflection in progress.' : 'Its weekly Reflection is still quiet.'
      };
    }
  }

  return null;
}
