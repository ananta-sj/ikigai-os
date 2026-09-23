import { Droplets, Sun, TestTube2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ensureGarden } from '../lib/tasks';
import { plantStage } from '../lib/rewards';
import type { GardenState } from '../types';

export function GardenPage() {
  const [garden, setGarden] = useState<GardenState | null>(null);
  useEffect(() => { ensureGarden().then(setGarden); }, []);

  const stage = plantStage(garden?.growth ?? 0);

  return (
    <div className="page garden-page">
      <header className="page-header compact">
        <div><div className="eyebrow">YOUR GARDEN</div><h1>One seed. For now.</h1><p>Complete real tasks. Earn care. Watch the same living thing change with you.</p></div>
      </header>

      <section className="garden-sanctuary glass-panel">
        <div className="garden-sky" />
        <div className="garden-stage-copy">
          <span className="pill">FIRST SEED</span>
          <h2>{stage.label}</h2>
          <p>{garden?.growth ?? 0} total growth</p>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${stage.progress}%` }} /></div>
          <div className="garden-resources">
            <div><Droplets /><strong>{garden?.water ?? 0}</strong><span>Water</span></div>
            <div><Sun /><strong>{garden?.sunlight ?? 0}</strong><span>Sunlight</span></div>
            <div><TestTube2 /><strong>{garden?.fertilizer ?? 0}</strong><span>Fertilizer</span></div>
          </div>
        </div>
        <div className="garden-centerpiece">
          <div className="garden-halo big" />
          <div className="garden-plant">{stage.emoji}</div>
          <div className="garden-soil" />
          <small>Rare seeds and eggs arrive in later versions.</small>
        </div>
      </section>
    </div>
  );
}
