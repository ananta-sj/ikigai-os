import { Canvas } from '@react-three/fiber';
import { ArrowLeft, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaperRig, type PaperDiagnostics } from '../components/paper/PaperRig';
import { paperAudio, type TearSampleId } from '../lib/paperAudio';

const initialDiagnostics: PaperDiagnostics = {
  phase: 'idle',
  grabX: 0,
  grabY: 0,
  dragPx: 0,
  speed: 0,
  tension: 0,
  attached: 100
};

export function PaperLabPage() {
  const [resetKey, setResetKey] = useState(0);
  const [diagnostics, setDiagnostics] = useState<PaperDiagnostics>(initialDiagnostics);
  const [sample, setSample] = useState<TearSampleId>('a');
  const date = useMemo(() => new Date(), []);

  function chooseSample(next: TearSampleId) {
    setSample(next);
    paperAudio.setSample(next);
  }

  return (
    <div className="paper-lab-page">
      <header className="paper-lab-header">
        <div>
          <span className="paper-lab-kicker">IKIGAI PAPER LAB · v0.2.11</span>
          <h1>Touch the paper anywhere.</h1>
          <p>Pinch, lift, pull, twist. The top edge is the only thing holding the sheet.</p>
        </div>
        <div className="paper-lab-actions">
          <Link className="paper-lab-button ghost" to="/"><ArrowLeft size={16} /> Today</Link>
          <label className="paper-lab-audio-select">
            <span>tear reference</span>
            <select
              value={sample}
              onChange={(event) => chooseSample(event.target.value as TearSampleId)}
              aria-label="Paper tear reference recording"
            >
              <option value="a">A</option>
              <option value="b">B</option>
              <option value="c">C</option>
            </select>
          </label>
          <button className="paper-lab-button ghost" type="button" onClick={() => paperAudio.test(sample)}><Volume2 size={16} /> Hear recording</button>
          <button className="paper-lab-button" type="button" onClick={() => setResetKey(key => key + 1)}><RotateCcw size={16} /> Reset sheet</button>
        </div>
      </header>

      <div className="paper-lab-workbench">
        <section className="paper-lab-canvas-wrap" aria-label="Interactive paper physics experiment">
          <Canvas
            orthographic
            camera={{ position: [0, 0, 9], zoom: 132, near: 0.1, far: 100 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={2.1} />
            <directionalLight position={[-3, 5, 8]} intensity={2.4} />
            <directionalLight position={[4, -2, 4]} intensity={0.75} />
            <PaperRig key={resetKey} date={date} onDiagnostics={setDiagnostics} />
          </Canvas>
          <div className="paper-lab-caption"><Sparkles size={14} /> No handle. No prescribed direction. The sheet reacts to where you grab it.</div>
        </section>

        <aside className="paper-lab-diagnostics" aria-live="polite">
          <span className="paper-lab-kicker">LIVE PHYSICS</span>
          <div className={`paper-lab-phase phase-${diagnostics.phase}`}>{diagnostics.phase}</div>
          <dl>
            <div><dt>Grab point</dt><dd>{Math.round(diagnostics.grabX)}%, {Math.round(diagnostics.grabY)}%</dd></div>
            <div><dt>Pointer travel</dt><dd>{Math.round(diagnostics.dragPx)} px</dd></div>
            <div><dt>Pull speed</dt><dd>{Math.round(diagnostics.speed)} px/s</dd></div>
            <div><dt>Binding tension</dt><dd>{Math.round(diagnostics.tension)}%</dd></div>
            <div><dt>Still attached</dt><dd>{Math.round(diagnostics.attached)}%</dd></div>
          </dl>
          <div className="paper-lab-meter"><i style={{ width: `${Math.min(100, diagnostics.tension)}%` }} /></div>
          <p>A/B/C are temporary real-reference recordings. Pick whichever texture best matches the physical tear; the lab controls disappear later.</p>
        </aside>
      </div>
    </div>
  );
}
