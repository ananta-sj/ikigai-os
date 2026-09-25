import { Droplets, Leaf, Sparkles, Sun, TestTube2, Trees } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GardenWorld } from '../components/garden/GardenWorld';
import { PageHeader } from '../components/ui/PageHeader';
import { applyGardenCare, gardenCareMeta, type GardenCareKind } from '../lib/garden';
import { ensureSettings } from '../lib/settings';
import { markAchievementsSeen, syncAchievements, type AchievementState } from '../lib/achievements';
import { ensureGarden } from '../lib/tasks';
import { plantStage } from '../lib/rewards';
import type { GardenState } from '../types';
import '../garden-v2.css';

const STAGES = ['Dormant Seed', 'Awakening Seed', 'Sprout', 'Young Plant', 'Sapling', 'Young Tree', 'Mature Tree', 'Bloom'];

function stageIndexFor(label: string) {
  return Math.max(0, STAGES.indexOf(label));
}

export function GardenPage() {
  const [garden, setGarden] = useState<GardenState | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [effect, setEffect] = useState<{ kind: GardenCareKind; id: number } | null>(null);
  const [message, setMessage] = useState('Your garden changes when your real work changes.');
  const [achievements, setAchievements] = useState<AchievementState | null>(null);

  useEffect(() => {
    void Promise.all([ensureGarden(), ensureSettings(), syncAchievements()]).then(([nextGarden, settings, achievementState]) => {
      setGarden(nextGarden);
      setReducedMotion(settings.reducedMotion);
      setAchievements(achievementState);
      if (achievementState.newlyUnlocked.length) {
        const newest = achievementState.newlyUnlocked[achievementState.newlyUnlocked.length - 1];
        setMessage(`New relic unlocked: ${newest.definition.rewardLabel}.`);
        void markAchievementsSeen(achievementState.newlyUnlocked.map(item => item.unlock.id));
      }
    });
  }, []);

  const stage = plantStage(garden?.growth ?? 0);
  const stageIndex = stageIndexFor(stage.label);
  const nextStage = STAGES[Math.min(STAGES.length - 1, stageIndex + 1)];

  const totalCare = useMemo(() => (
    (garden?.water ?? 0) + (garden?.sunlight ?? 0) + (garden?.fertilizer ?? 0)
  ), [garden]);

  async function nurture(kind: GardenCareKind) {
    const next = await applyGardenCare(kind);
    if (!next) {
      setMessage(`No ${gardenCareMeta[kind].label.toLowerCase()} stored yet. Complete a task to earn some.`);
      return;
    }
    setGarden(next);
    setEffect({ kind, id: Date.now() });
    setMessage(`${gardenCareMeta[kind].label} used · +${gardenCareMeta[kind].growth} growth.`);
  }

  return (
    <div className="page garden-v2-page">
      <div className="ik-page-width">
        <PageHeader
          className="garden-v2-header"
          eyebrow={<><Trees size={14} /> LIVING GARDEN · LOCAL WORLD</>}
          title="A place that grows because you did."
          description="Walk around it. Nurture it. Let the landscape become a physical record of months that otherwise disappear."
          actions={
            <div className="garden-v2-stage-chip">
              <Trees size={17} /><span>{stage.label}</span><b>{Math.round(stage.progress)}%</b>
            </div>
          }
        />

        <section className="garden-v2-shell">
          <GardenWorld stageIndex={stageIndex} progress={stage.progress} growth={garden?.growth ?? 0} effect={effect} reducedMotion={reducedMotion} artifacts={achievements?.unlocked.map(item => item.definition.artifact) ?? []} />

          <div className="garden-v2-overlay garden-v2-overlay-left">
            <span className="garden-v2-kicker">CURRENT LIFE</span>
            <strong>{stage.label}</strong>
            <small>{garden?.growth ?? 0} growth · {nextStage === stage.label ? 'fully bloomed' : `${Math.round(stage.progress)}% toward ${nextStage}`}</small>
            <div className="garden-v2-progress"><i style={{ width: `${stage.progress}%` }} /></div>
          </div>

          <div className="garden-v2-overlay garden-v2-overlay-right" role="status" aria-live="polite">
            <span className="garden-v2-kicker">WORLD SIGNAL</span>
            <strong>{totalCare === 0 ? 'Quiet soil' : `${totalCare} care tokens waiting`}</strong>
            <small>{message}</small>
          </div>
        </section>

        <section className="garden-v2-controls">
          <div className="garden-v2-copy">
            <div className="ik-section-kicker">NURTURE</div>
            <h2>Use what your tasks earned.</h2>
            <p>Task completion still grows the garden directly. Care tokens are optional extra attention: a small ritual you can spend when you visit.</p>
          </div>

          <div className="garden-care-grid">
            <button type="button" className="garden-care-card water ik-surface-flat" disabled={!garden?.water} onClick={() => void nurture('water')}>
              <span className="garden-care-icon"><Droplets size={22} /></span>
              <div><b>{garden?.water ?? 0}</b><strong>Water</strong><small>Roots +{gardenCareMeta.water.growth}</small></div>
            </button>
            <button type="button" className="garden-care-card sunlight ik-surface-flat" disabled={!garden?.sunlight} onClick={() => void nurture('sunlight')}>
              <span className="garden-care-icon"><Sun size={22} /></span>
              <div><b>{garden?.sunlight ?? 0}</b><strong>Sunlight</strong><small>Canopy +{gardenCareMeta.sunlight.growth}</small></div>
            </button>
            <button type="button" className="garden-care-card fertilizer ik-surface-flat" disabled={!garden?.fertilizer} onClick={() => void nurture('fertilizer')}>
              <span className="garden-care-icon"><TestTube2 size={22} /></span>
              <div><b>{garden?.fertilizer ?? 0}</b><strong>Fertilizer</strong><small>Growth +{gardenCareMeta.fertilizer.growth}</small></div>
            </button>
          </div>
        </section>

        <section className="garden-relics-section">
          <div className="garden-relics-heading">
            <div><div className="ik-section-kicker">WORLD RELICS</div><h2>Meaningful work leaves objects behind.</h2><p>Achievements are inferred from your real local data. Once earned, their objects stay in the sanctuary.</p></div>
            <span>{achievements?.unlocked.length ?? 0} / {(achievements?.unlocked.length ?? 0) + (achievements?.locked.length ?? 6)} unlocked</span>
          </div>
          <div className="garden-relic-grid">
            {achievements?.unlocked.map(({ definition }) => (
              <article key={definition.id} className="garden-relic is-unlocked">
                <span>{definition.rewardKind === 'egg' ? '🥚' : definition.rewardKind === 'rare-seed' ? '🌸' : '◈'}</span>
                <div><strong>{definition.title}</strong><small>{definition.rewardLabel}</small><p>{definition.description}</p></div>
              </article>
            ))}
            {achievements?.locked.map(definition => (
              <article key={definition.id} className="garden-relic is-locked">
                <span>·</span><div><strong>{definition.title}</strong><small>Relic waiting</small><p>{definition.description}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="garden-v2-story-grid">
          <article className="garden-v2-story-card ik-surface-flat">
            <Leaf size={18} />
            <div><span>WORLD RULE</span><strong>Nothing dies because you had a bad week.</strong><p>Consistency changes how quickly the sanctuary grows; absence never destroys what you already earned.</p></div>
          </article>
          <article className="garden-v2-story-card ik-surface-flat">
            <Sparkles size={18} />
            <div><span>NEXT LAYER</span><strong>Eggs will hatch later.</strong><p>v0.10 places the first persistent relics in the world. Animal behavior comes after the core achievement system proves itself.</p></div>
          </article>
        </section>
      </div>
    </div>
  );
}
