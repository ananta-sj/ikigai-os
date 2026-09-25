import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getPaperTheme, type PaperThemeDefinition } from '../../data/paperThemes';
import type { DailyPageTheme } from '../../types';

const COLS = 24;
const ROWS = 32;
const WIDTH = 2.72;
const HEIGHT = 3.92;
const TOP_Y = HEIGHT / 2;
const DAMPING = 0.972;
const CONSTRAINT_ITERATIONS = 9;
const TEAR_THRESHOLD = 0.12;
const GRAB_RADIUS = 0.98;
const WORLD_PER_PIXEL = 1 / 116;

type Phase = 'idle' | 'grabbed' | 'pulling' | 'awaiting' | 'tearing' | 'detached';

export interface PaperDiagnostics {
  phase: Phase;
  grabX: number;
  grabY: number;
  dragPx: number;
  speed: number;
  tension: number;
  attached: number;
}



import { paperAudio } from '../../lib/paperAudio';

interface PaperRigProps {
  date: Date;
  onDiagnostics: (diagnostics: PaperDiagnostics) => void;
  taskLines?: string[];
  memo?: string;
  theme?: DailyPageTheme;
  showMiniMonth?: boolean;
  onDetached?: () => void;
  onTearIntent?: () => void;
  allowTear?: boolean;
  resetNonce?: number;
  interactive?: boolean;
}

interface Constraint {
  a: number;
  b: number;
  length: number;
  topBinding?: boolean;
  stiffness?: number;
}

interface GrabState {
  active: boolean;
  localX: number;
  localY: number;
  startClientX: number;
  startClientY: number;
  clientX: number;
  clientY: number;
  previousClientX: number;
  previousClientY: number;
  previousTime: number;
  speed: number;
  dragPx: number;
  dxWorld: number;
  dyWorld: number;
  liftWorld: number;
}

function indexFor(col: number, row: number) {
  return row * (COLS + 1) + col;
}

function drawPaperGrain(context: CanvasRenderingContext2D, theme: PaperThemeDefinition, width: number, height: number) {
  context.save();
  context.globalAlpha = theme.grainOpacity;
  const count = Math.round(5200 + theme.grainOpacity * 52000);
  for (let i = 0; i < count; i += 1) {
    const shade = 165 + Math.floor(Math.random() * 64);
    context.fillStyle = `rgb(${shade},${Math.max(0, shade - 4)},${Math.max(0, shade - 10)})`;
    const size = Math.random() > .95 ? 2 : 1;
    context.fillRect(Math.random() * width, Math.random() * height, size, size);
  }
  context.restore();
}

function drawMiniMonth(context: CanvasRenderingContext2D, date: Date, theme: PaperThemeDefinition, x: number, y: number) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const start = first.getDay();

  context.save();
  context.textAlign = 'left';
  context.fillStyle = theme.mutedInk;
  context.font = '700 15px Arial, sans-serif';
  context.fillText(new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(), x, y);
  context.font = '600 11px Arial, sans-serif';
  const cell = 18;
  for (let day = 1; day <= days; day += 1) {
    const slot = start + day - 1;
    const col = slot % 7;
    const row = Math.floor(slot / 7);
    context.fillStyle = day === date.getDate() ? theme.accent : theme.mutedInk;
    context.fillText(String(day).padStart(2, '0'), x + col * cell, y + 24 + row * 17);
  }
  context.restore();
}

function drawTaskLines(
  context: CanvasRenderingContext2D,
  taskLines: string[],
  theme: PaperThemeDefinition,
  x: number,
  y: number,
  width: number,
  max = 3
) {
  const visibleTasks = taskLines.slice(0, max);
  context.save();
  context.font = '600 21px Arial, sans-serif';
  visibleTasks.forEach((line, index) => {
    const lineY = y + index * 42;
    context.strokeStyle = theme.rule;
    context.strokeRect(x, lineY - 18, 15, 15);
    context.fillStyle = theme.ink;
    const clip = Math.max(22, Math.floor(width / 12.5));
    const clipped = line.length > clip ? `${line.slice(0, clip - 1)}…` : line;
    context.fillText(clipped, x + 32, lineY - 4);
  });
  context.restore();
}

function drawMemo(context: CanvasRenderingContext2D, memo: string, theme: PaperThemeDefinition, x: number, y: number, width: number) {
  context.save();
  context.fillStyle = theme.mutedInk;
  context.font = '700 18px Arial, sans-serif';
  context.fillText('MEMO', x, y);
  context.font = 'italic 500 18px Georgia, serif';
  const clean = memo.trim().replace(/\s+/g, ' ');
  if (clean) {
    const clip = Math.max(32, Math.floor(width / 10));
    const line = clean.length > clip ? `${clean.slice(0, clip - 1)}…` : clean;
    context.fillText(line, x, y + 34);
  }
  context.strokeStyle = theme.rule;
  for (let lineY = y + 54; lineY <= y + 108; lineY += 27) {
    context.beginPath();
    context.moveTo(x, lineY);
    context.lineTo(x + width, lineY);
    context.stroke();
  }
  context.restore();
}

function makeCalendarTexture(
  date: Date,
  themeId: DailyPageTheme = 'himekuri',
  taskLines: string[] = [],
  memo = '',
  showMiniMonth = true
) {
  const theme = getPaperTheme(themeId);
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1280;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable.');

  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase();
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase();
  const year = date.getFullYear();
  const day = date.getDate();
  const jp = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

  context.fillStyle = theme.paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawPaperGrain(context, theme, canvas.width, canvas.height);

  if (theme.layout === 'himekuri') {
    context.fillStyle = theme.accent;
    context.fillRect(70, 96, 760, 7);
    context.fillStyle = theme.ink;
    context.font = '800 34px Arial, sans-serif';
    context.fillText(`${year}`, 76, 72);
    context.textAlign = 'right';
    context.fillText(monthShort, 824, 72);
    context.textAlign = 'left';

    context.save();
    context.translate(102, 270);
    context.font = '900 54px Arial, sans-serif';
    context.fillText(jp, 0, 0);
    context.font = '800 24px Arial, sans-serif';
    for (let i = 0; i < weekday.length; i += 1) context.fillText(weekday[i], 6, 54 + i * 29);
    context.restore();

    context.fillStyle = theme.ink;
    context.textAlign = 'center';
    context.font = '900 610px Impact, Arial Black, sans-serif';
    context.fillText(String(day), 500, 785);
    context.fillStyle = theme.accent;
    context.font = '900 42px Arial, sans-serif';
    context.fillText(`${date.getMonth() + 1}月`, 500, 900);

    context.strokeStyle = theme.rule;
    context.lineWidth = 2;
    context.beginPath(); context.moveTo(92, 944); context.lineTo(808, 944); context.stroke();
    context.textAlign = 'left';
    context.fillStyle = theme.mutedInk;
    context.font = '700 19px Arial, sans-serif';
    context.fillText('TODAY', 100, 987);
    drawTaskLines(context, taskLines, theme, 100, 1030, 690, 2);
    drawMemo(context, memo, theme, 100, 1157, 700);
    if (showMiniMonth) drawMiniMonth(context, date, theme, 660, 175);
  }

  if (theme.layout === 'editorial') {
    context.fillStyle = theme.accent;
    context.fillRect(64, 58, 10, 1160);
    context.fillStyle = theme.ink;
    context.font = '700 24px Georgia, serif';
    context.fillText(`${weekday} · ${monthLong}`, 108, 90);
    context.fillStyle = theme.mutedInk;
    context.font = '600 17px Arial, sans-serif';
    context.fillText(`${year} / DAY ${String(Math.floor((+date - +new Date(year, 0, 0)) / 86400000)).padStart(3, '0')}`, 108, 124);
    context.fillStyle = theme.ink;
    context.font = '500 560px Georgia, Times New Roman, serif';
    context.fillText(String(day), 130, 700);
    context.fillStyle = theme.accent;
    context.font = 'italic 600 34px Georgia, serif';
    context.fillText('one day · one page', 114, 770);
    context.strokeStyle = theme.rule;
    context.beginPath(); context.moveTo(110, 808); context.lineTo(790, 808); context.stroke();
    drawTaskLines(context, taskLines, theme, 112, 875, 640, 3);
    drawMemo(context, memo, theme, 112, 1090, 640);
    if (showMiniMonth) drawMiniMonth(context, date, theme, 622, 120);
  }

  if (theme.layout === 'winter') {
    context.fillStyle = theme.accentSoft;
    context.fillRect(0, 0, canvas.width, 150);
    context.fillStyle = theme.ink;
    context.font = '800 26px Arial, sans-serif';
    context.fillText('WINTER STUDY', 70, 72);
    context.fillStyle = theme.mutedInk;
    context.font = '600 16px Arial, sans-serif';
    context.fillText(`${weekday} · ${monthLong} ${year}`, 70, 110);
    for (let i = 0; i < 26; i += 1) {
      const x = 58 + ((i * 83) % 800);
      const y = 178 + ((i * 137) % 760);
      context.fillStyle = i % 3 === 0 ? theme.accentSoft : 'rgba(79,120,144,.14)';
      context.beginPath(); context.arc(x, y, i % 4 === 0 ? 4 : 2, 0, Math.PI * 2); context.fill();
    }
    context.fillStyle = theme.ink;
    context.textAlign = 'center';
    context.font = '900 560px Inter, Arial Black, sans-serif';
    context.fillText(String(day), 460, 725);
    context.fillStyle = theme.accent;
    context.font = '800 25px Arial, sans-serif';
    context.fillText(`${monthShort} · QUIET FOCUS`, 460, 784);
    context.textAlign = 'left';
    drawTaskLines(context, taskLines, theme, 92, 855, 700, 3);
    drawMemo(context, memo, theme, 92, 1085, 710);
    if (showMiniMonth) drawMiniMonth(context, date, theme, 655, 188);
  }

  if (theme.layout === 'festive') {
    context.strokeStyle = '#315b42';
    context.lineWidth = 5;
    context.strokeRect(44, 44, 812, 1192);
    context.fillStyle = theme.accent;
    context.fillRect(44, 44, 812, 46);
    context.fillStyle = '#315b42';
    for (let i = 0; i < 7; i += 1) {
      const x = 100 + i * 112;
      context.beginPath(); context.moveTo(x, 130); context.lineTo(x - 24, 182); context.lineTo(x + 24, 182); context.closePath(); context.fill();
      context.beginPath(); context.moveTo(x, 157); context.lineTo(x - 32, 220); context.lineTo(x + 32, 220); context.closePath(); context.fill();
    }
    context.fillStyle = theme.ink;
    context.font = '700 24px Georgia, serif';
    context.fillText(`${weekday} · ${year}`, 88, 275);
    context.fillStyle = theme.accent;
    context.font = '800 30px Arial, sans-serif';
    context.textAlign = 'right'; context.fillText(monthLong, 810, 275); context.textAlign = 'left';
    context.fillStyle = theme.ink;
    context.textAlign = 'center';
    context.font = '900 560px Georgia, Times New Roman, serif';
    context.fillText(String(day), 450, 760);
    context.fillStyle = theme.accent;
    context.font = '700 30px Georgia, serif';
    context.fillText('MAKE ROOM FOR WHAT MATTERS', 450, 830);
    context.textAlign = 'left';
    drawTaskLines(context, taskLines, theme, 95, 900, 700, 2);
    drawMemo(context, memo, theme, 95, 1090, 710);
    if (showMiniMonth) drawMiniMonth(context, date, theme, 650, 318);
  }

  if (theme.layout === 'sakura') {
    context.fillStyle = theme.accentSoft;
    context.fillRect(0, 0, canvas.width, 22);
    for (let i = 0; i < 22; i += 1) {
      const x = 80 + ((i * 137) % 760);
      const y = 90 + ((i * 211) % 1040);
      context.save();
      context.translate(x, y); context.rotate((i * .63) % Math.PI);
      context.fillStyle = i % 3 === 0 ? 'rgba(183,109,123,.22)' : 'rgba(183,109,123,.12)';
      context.beginPath(); context.ellipse(0, 0, 11, 5, .4, 0, Math.PI * 2); context.fill();
      context.restore();
    }
    context.fillStyle = theme.ink;
    context.font = '700 25px Georgia, serif';
    context.fillText(`${weekday}`, 82, 95);
    context.fillStyle = theme.accent;
    context.font = '800 22px Arial, sans-serif';
    context.textAlign = 'right'; context.fillText(`${monthLong} · ${year}`, 815, 95); context.textAlign = 'left';
    context.fillStyle = theme.ink;
    context.textAlign = 'center';
    context.font = '500 590px Georgia, Times New Roman, serif';
    context.fillText(String(day), 450, 760);
    context.fillStyle = theme.accent;
    context.font = '700 42px Georgia, serif';
    context.fillText(jp, 450, 830);
    context.textAlign = 'left';
    drawTaskLines(context, taskLines, theme, 90, 900, 700, 2);
    drawMemo(context, memo, theme, 90, 1090, 710);
    if (showMiniMonth) drawMiniMonth(context, date, theme, 650, 145);
  }

  if (theme.layout === 'minimal') {
    context.fillStyle = theme.ink;
    context.fillRect(62, 62, 776, 4);
    context.font = '700 18px Arial, sans-serif';
    context.fillText(`${year}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(day).padStart(2, '0')}`, 70, 104);
    context.textAlign = 'right'; context.fillText(weekday, 830, 104); context.textAlign = 'left';
    context.font = '900 650px Arial Black, Impact, sans-serif';
    context.fillText(String(day), 52, 785);
    context.fillStyle = theme.mutedInk;
    context.font = '700 17px Arial, sans-serif';
    context.fillText('TODAY / ONE THING AT A TIME', 72, 848);
    context.strokeStyle = theme.rule;
    context.beginPath(); context.moveTo(72, 880); context.lineTo(828, 880); context.stroke();
    drawTaskLines(context, taskLines, theme, 72, 940, 730, 3);
    drawMemo(context, memo, theme, 72, 1122, 730);
    if (showMiniMonth) drawMiniMonth(context, date, theme, 670, 142);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function buildGeometry() {
  const vertices = (COLS + 1) * (ROWS + 1);
  const positions = new Float32Array(vertices * 3);
  const uvs = new Float32Array(vertices * 2);
  const indices: number[] = [];
  const constraints: Constraint[] = [];

  for (let row = 0; row <= ROWS; row += 1) {
    const v = row / ROWS;
    const y = -HEIGHT / 2 + v * HEIGHT;
    for (let col = 0; col <= COLS; col += 1) {
      const u = col / COLS;
      const x = -WIDTH / 2 + u * WIDTH;
      const index = indexFor(col, row);
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = 0;
      uvs[index * 2] = u;
      uvs[index * 2 + 1] = v;
    }
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const a = indexFor(col, row);
      const b = indexFor(col + 1, row);
      const c = indexFor(col, row + 1);
      const d = indexFor(col + 1, row + 1);
      indices.push(a, b, d, a, d, c);
    }
  }

  const horizontal = WIDTH / COLS;
  const vertical = HEIGHT / ROWS;
  const diagonal = Math.hypot(horizontal, vertical);

  for (let row = 0; row <= ROWS; row += 1) {
    for (let col = 0; col <= COLS; col += 1) {
      const a = indexFor(col, row);
      if (col < COLS) constraints.push({ a, b: indexFor(col + 1, row), length: horizontal, stiffness: 0.84 });
      if (row < ROWS) constraints.push({
        a,
        b: indexFor(col, row + 1),
        length: vertical,
        topBinding: row === ROWS - 1,
        stiffness: row === ROWS - 1 ? 0.97 : 0.84
      });
      if (col < COLS && row < ROWS) constraints.push({ a, b: indexFor(col + 1, row + 1), length: diagonal, stiffness: 0.72 });
      if (col > 0 && row < ROWS) constraints.push({ a, b: indexFor(col - 1, row + 1), length: diagonal, stiffness: 0.72 });

      // Distance-two constraints provide bending stiffness. Without them the sheet behaves
      // like loose cloth and can collapse into the crumpled/self-intersecting shape seen in v0.2.7.
      if (col + 2 <= COLS) constraints.push({ a, b: indexFor(col + 2, row), length: horizontal * 2, stiffness: 0.24 });
      if (row + 2 <= ROWS) constraints.push({ a, b: indexFor(col, row + 2), length: vertical * 2, stiffness: 0.22 });
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return { geometry, rest: new Float32Array(positions), constraints };
}

function PaperSheet({ date, onDiagnostics, taskLines = [], memo = '', theme = 'himekuri', showMiniMonth = true, onDetached, onTearIntent, allowTear = true, resetNonce = 0, interactive = true }: PaperRigProps) {
  const { gl } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryData = useMemo(() => buildGeometry(), []);
  const themeDef = useMemo(() => getPaperTheme(theme), [theme]);
  const texture = useMemo(() => makeCalendarTexture(date, theme, taskLines, memo, showMiniMonth), [date, theme, taskLines, memo, showMiniMonth]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: texture,
    color: '#ffffff',
    roughness: themeDef.roughness,
    metalness: 0,
    side: THREE.DoubleSide
  }), [texture, themeDef.roughness]);

  const positions = useRef(new Float32Array(geometryData.rest));
  const previous = useRef(new Float32Array(geometryData.rest));
  const pinned = useRef(new Uint8Array(COLS + 1).fill(1));
  const phase = useRef<Phase>('idle');
  const tearOrder = useRef<number[]>([]);
  const tearCursor = useRef(0);
  const tearAccumulator = useRef(0);
  const lastTension = useRef(0);
  const frameCounter = useRef(0);
  const pendingStress = useRef<Float32Array | null>(null);
  const tearIntentSent = useRef(false);
  const grab = useRef<GrabState>({
    active: false,
    localX: 0,
    localY: 0,
    startClientX: 0,
    startClientY: 0,
    clientX: 0,
    clientY: 0,
    previousClientX: 0,
    previousClientY: 0,
    previousTime: performance.now(),
    speed: 0,
    dragPx: 0,
    dxWorld: 0,
    dyWorld: 0,
    liftWorld: 0
  });

  useEffect(() => () => {
    geometryData.geometry.dispose();
    material.dispose();
    texture.dispose();
    paperAudio.cancelTear();
  }, [geometryData.geometry, material, texture]);

  useEffect(() => {
    // Parent can ask the physical sheet to return to a pristine page after the
    // close-day dialog is cancelled.
    positions.current.set(geometryData.rest);
    previous.current.set(geometryData.rest);
    pinned.current.fill(1);
    phase.current = 'idle';
    tearOrder.current = [];
    tearCursor.current = 0;
    tearAccumulator.current = 0;
    pendingStress.current = null;
    tearIntentSent.current = false;
    grab.current.active = false;
    paperAudio.cancelTear();

    const attribute = geometryData.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.array.set(geometryData.rest);
    attribute.needsUpdate = true;
    geometryData.geometry.computeVertexNormals();
  }, [resetNonce, geometryData.geometry, geometryData.rest]);

  useEffect(() => {
    if (allowTear && phase.current === 'awaiting' && pendingStress.current) {
      startTear(pendingStress.current);
      pendingStress.current = null;
    }
  }, [allowTear]);

  useEffect(() => {
    const element = gl.domElement;

    function pointerMove(event: PointerEvent) {
      if (!grab.current.active || phase.current === 'detached' || phase.current === 'awaiting') return;
      const now = performance.now();
      const dt = Math.max(8, now - grab.current.previousTime);
      const step = Math.hypot(event.clientX - grab.current.previousClientX, event.clientY - grab.current.previousClientY);
      grab.current.speed = (step / dt) * 1000;
      grab.current.previousClientX = event.clientX;
      grab.current.previousClientY = event.clientY;
      grab.current.previousTime = now;
      grab.current.clientX = event.clientX;
      grab.current.clientY = event.clientY;
      const dx = event.clientX - grab.current.startClientX;
      const dy = event.clientY - grab.current.startClientY;
      grab.current.dragPx = Math.hypot(dx, dy);
      grab.current.dxWorld = dx * WORLD_PER_PIXEL;
      grab.current.dyWorld = -dy * WORLD_PER_PIXEL;
      // The cursor is 2D; distance from the original grab becomes implicit lift toward the viewer.
      grab.current.liftWorld = Math.min(1.48, grab.current.dragPx * WORLD_PER_PIXEL * 0.56);
      if (grab.current.dragPx > 4 && phase.current === 'grabbed') phase.current = 'pulling';
    }

    function pointerUp() {
      if (!grab.current.active) return;
      grab.current.active = false;
      if (phase.current === 'tearing') {
        // Once the sheet has audibly started ripping, don't magically glue it back together.
        tearAccumulator.current += 2.4;
      } else if (phase.current !== 'detached' && phase.current !== 'awaiting') {
        phase.current = 'idle';
      }
    }

    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    return () => {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      element.style.cursor = '';
    };
  }, [gl]);

  function beginGrab(event: ThreeEvent<PointerEvent>) {
    if (!interactive || !event.uv || phase.current === 'detached' || phase.current === 'tearing' || phase.current === 'awaiting') return;
    event.stopPropagation();
    const u = event.uv.x;
    const v = event.uv.y;
    const now = performance.now();
    grab.current = {
      active: true,
      localX: -WIDTH / 2 + u * WIDTH,
      localY: -HEIGHT / 2 + v * HEIGHT,
      startClientX: event.clientX,
      startClientY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      previousClientX: event.clientX,
      previousClientY: event.clientY,
      previousTime: now,
      speed: 0,
      dragPx: 0,
      dxWorld: 0,
      dyWorld: 0,
      liftWorld: 0
    };
    void paperAudio.unlock();
    phase.current = 'grabbed';
    gl.domElement.style.cursor = 'grabbing';
  }

  function solveConstraint(constraint: Constraint, stress: Float32Array) {
    const pos = positions.current;
    const a3 = constraint.a * 3;
    const b3 = constraint.b * 3;
    let dx = pos[b3] - pos[a3];
    let dy = pos[b3 + 1] - pos[a3 + 1];
    let dz = pos[b3 + 2] - pos[a3 + 2];
    const distance = Math.max(0.00001, Math.hypot(dx, dy, dz));
    const error = (distance - constraint.length) / distance;

    if (constraint.topBinding) {
      const col = constraint.a % (COLS + 1);
      stress[col] = Math.max(stress[col], Math.max(0, (distance - constraint.length) / constraint.length));
    }

    const aRow = Math.floor(constraint.a / (COLS + 1));
    const bRow = Math.floor(constraint.b / (COLS + 1));
    const aPinned = aRow === ROWS && pinned.current[constraint.a % (COLS + 1)] === 1;
    const bPinned = bRow === ROWS && pinned.current[constraint.b % (COLS + 1)] === 1;
    if (aPinned && bPinned) return;

    const stiffness = constraint.stiffness ?? (constraint.topBinding ? 0.97 : 0.78);
    const correction = error * stiffness;
    dx *= correction;
    dy *= correction;
    dz *= correction;

    if (aPinned) {
      pos[b3] -= dx;
      pos[b3 + 1] -= dy;
      pos[b3 + 2] -= dz;
    } else if (bPinned) {
      pos[a3] += dx;
      pos[a3 + 1] += dy;
      pos[a3 + 2] += dz;
    } else {
      pos[a3] += dx * 0.5;
      pos[a3 + 1] += dy * 0.5;
      pos[a3 + 2] += dz * 0.5;
      pos[b3] -= dx * 0.5;
      pos[b3 + 1] -= dy * 0.5;
      pos[b3 + 2] -= dz * 0.5;
    }
  }

  function startTear(stress: Float32Array) {
    let origin = 0;
    let highest = -1;
    for (let col = 0; col <= COLS; col += 1) {
      if (stress[col] > highest) {
        highest = stress[col];
        origin = col;
      }
    }
    const order: number[] = [origin];
    for (let distance = 1; distance <= COLS; distance += 1) {
      const right = origin + distance;
      const left = origin - distance;
      if (right <= COLS) order.push(right);
      if (left >= 0) order.push(left);
    }
    tearOrder.current = order;
    tearCursor.current = 0;
    tearAccumulator.current = 0;
    phase.current = 'tearing';
    tearIntentSent.current = false;
    paperAudio.startTear(grab.current.speed);
  }

  useFrame((_, rawDelta) => {
    const dt = Math.min(0.028, rawDelta);
    const pos = positions.current;
    const prev = previous.current;
    const rest = geometryData.rest;
    const detached = phase.current === 'detached';
    const interacting = grab.current.active && !detached;

    // Verlet integration. Attached paper wants to return to its printed plane;
    // detached paper gets gravity and keeps the momentum from the final pull.
    for (let vertex = 0; vertex < pos.length / 3; vertex += 1) {
      const base = vertex * 3;
      const row = Math.floor(vertex / (COLS + 1));
      const col = vertex % (COLS + 1);
      const isPinned = row === ROWS && pinned.current[col] === 1;
      if (isPinned) {
        pos[base] = rest[base];
        pos[base + 1] = rest[base + 1];
        pos[base + 2] = rest[base + 2];
        prev[base] = pos[base];
        prev[base + 1] = pos[base + 1];
        prev[base + 2] = pos[base + 2];
        continue;
      }

      const vx = (pos[base] - prev[base]) * DAMPING;
      const vy = (pos[base + 1] - prev[base + 1]) * DAMPING;
      const vz = (pos[base + 2] - prev[base + 2]) * DAMPING;
      prev[base] = pos[base];
      prev[base + 1] = pos[base + 1];
      prev[base + 2] = pos[base + 2];

      pos[base] += vx;
      pos[base + 1] += vy + (detached ? -3.6 * dt * dt : 0);
      pos[base + 2] += vz;

      if (!detached && !interacting && phase.current !== 'tearing' && phase.current !== 'awaiting') {
        const returnStrength = 0.055;
        pos[base] += (rest[base] - pos[base]) * returnStrength;
        pos[base + 1] += (rest[base + 1] - pos[base + 1]) * returnStrength;
        pos[base + 2] += (rest[base + 2] - pos[base + 2]) * 0.095;
      }
    }

    if (interacting) {
      // Clamp the pointer displacement that is injected directly into the mesh. The page can
      // still travel farther through accumulated velocity, but one frame can no longer yank a
      // tiny patch several sheet-widths away and invert the triangles around the grab point.
      const pullX = THREE.MathUtils.clamp(grab.current.dxWorld, -1.9, 1.9);
      const pullY = THREE.MathUtils.clamp(grab.current.dyWorld, -2.05, 2.05);
      const targetX = grab.current.localX + pullX;
      const targetY = grab.current.localY + pullY;
      const directionBias = Math.sign(pullX || 1);
      for (let vertex = 0; vertex < pos.length / 3; vertex += 1) {
        const base = vertex * 3;
        const rx = rest[base] - grab.current.localX;
        const ry = rest[base + 1] - grab.current.localY;
        const distance = Math.hypot(rx, ry);
        if (distance > GRAB_RADIUS) continue;
        const normalized = 1 - distance / GRAB_RADIUS;
        const influence = normalized * normalized * (3 - 2 * normalized);
        const localTargetX = rest[base] + (targetX - grab.current.localX) * influence;
        const localTargetY = rest[base + 1] + (targetY - grab.current.localY) * influence;
        const twist = (rx / GRAB_RADIUS) * grab.current.liftWorld * 0.14 * directionBias;
        const localTargetZ = grab.current.liftWorld * influence + twist;
        const grip = 0.42 * influence;

        const stepX = THREE.MathUtils.clamp((localTargetX - pos[base]) * grip, -0.09, 0.09);
        const stepY = THREE.MathUtils.clamp((localTargetY - pos[base + 1]) * grip, -0.09, 0.09);
        const stepZ = THREE.MathUtils.clamp((localTargetZ - pos[base + 2]) * grip, -0.11, 0.11);
        pos[base] += stepX;
        pos[base + 1] += stepY;
        pos[base + 2] += stepZ;
      }
    }

    const stress = new Float32Array(COLS + 1);
    for (let iteration = 0; iteration < CONSTRAINT_ITERATIONS; iteration += 1) {
      for (const constraint of geometryData.constraints) solveConstraint(constraint, stress);
    }

    // Mild curvature regularization: paper can fold, but adjacent vertices should not form
    // needle-like spikes or dive through the sheet stack while it is still attached.
    if (!detached) {
      const zSnapshot = new Float32Array((COLS + 1) * (ROWS + 1));
      for (let vertex = 0; vertex < zSnapshot.length; vertex += 1) zSnapshot[vertex] = pos[vertex * 3 + 2];
      for (let row = 1; row < ROWS; row += 1) {
        for (let col = 1; col < COLS; col += 1) {
          const vertex = indexFor(col, row);
          const base = vertex * 3;
          const average = (
            zSnapshot[indexFor(col - 1, row)] +
            zSnapshot[indexFor(col + 1, row)] +
            zSnapshot[indexFor(col, row - 1)] +
            zSnapshot[indexFor(col, row + 1)]
          ) * 0.25;
          pos[base + 2] += (average - pos[base + 2]) * 0.055;
          pos[base + 2] = Math.max(-0.035, pos[base + 2]);
        }
      }
    }

    let maxStress = 0;
    for (const value of stress) maxStress = Math.max(maxStress, value);
    lastTension.current = THREE.MathUtils.lerp(lastTension.current, Math.min(1.3, maxStress / TEAR_THRESHOLD), 0.18);

    const pullEnergy = grab.current.dragPx / 150 + grab.current.speed / 1350;
    if (phase.current === 'pulling' && maxStress >= TEAR_THRESHOLD && pullEnergy > 0.78) {
      if (allowTear) {
        startTear(stress);
      } else {
        phase.current = 'awaiting';
        grab.current.active = false;
        pendingStress.current = new Float32Array(stress);
        previous.current.set(positions.current);
        if (!tearIntentSent.current) {
          tearIntentSent.current = true;
          onTearIntent?.();
        }
        gl.domElement.style.cursor = 'default';
      }
    }

    if (phase.current === 'tearing') {
      const speedContribution = Math.max(0.35, grab.current.speed / 650);
      tearAccumulator.current += dt * (5.2 + speedContribution * 8.4);
      const shouldRelease = Math.floor(tearAccumulator.current);
      let releasedThisFrame = 0;
      while (tearCursor.current < Math.min(tearOrder.current.length, shouldRelease)) {
        pinned.current[tearOrder.current[tearCursor.current]] = 0;
        tearCursor.current += 1;
        releasedThisFrame += 1;
      }
      if (releasedThisFrame > 0) {
        paperAudio.updateTear(
          grab.current.speed,
          tearCursor.current / Math.max(1, tearOrder.current.length),
          releasedThisFrame
        );
      }

      if (tearCursor.current >= tearOrder.current.length) {
        phase.current = 'detached';
        paperAudio.finishTear(grab.current.speed);
        onDetached?.();
        grab.current.active = false;
        gl.domElement.style.cursor = 'default';
        // Transfer the final pointer impulse into every vertex so a fast yank
        // throws the page while a slow peel lets it droop away.
        const impulseX = THREE.MathUtils.clamp(grab.current.dxWorld * 0.045, -0.08, 0.08);
        const impulseY = THREE.MathUtils.clamp(grab.current.dyWorld * 0.035, -0.08, 0.09);
        const impulseZ = THREE.MathUtils.clamp(grab.current.liftWorld * 0.055, 0.015, 0.09);
        for (let vertex = 0; vertex < pos.length / 3; vertex += 1) {
          const base = vertex * 3;
          prev[base] -= impulseX;
          prev[base + 1] -= impulseY;
          prev[base + 2] -= impulseZ;
        }
      }
    }

    const attribute = geometryData.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.array.set(pos);
    attribute.needsUpdate = true;
    if (frameCounter.current % 2 === 0) geometryData.geometry.computeVertexNormals();

    frameCounter.current += 1;
    if (frameCounter.current % 7 === 0) {
      const attachedCount = pinned.current.reduce((sum, item) => sum + item, 0);
      onDiagnostics({
        phase: phase.current,
        grabX: ((grab.current.localX + WIDTH / 2) / WIDTH) * 100,
        grabY: ((grab.current.localY + HEIGHT / 2) / HEIGHT) * 100,
        dragPx: grab.current.dragPx,
        speed: grab.current.speed,
        tension: lastTension.current * 100,
        attached: (attachedCount / (COLS + 1)) * 100
      });
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometryData.geometry}
      material={material}
      position={[0, -0.08, 0.06]}
      castShadow
      receiveShadow
      onPointerDown={beginGrab}
      onPointerOver={() => { if (interactive && phase.current !== 'detached' && phase.current !== 'awaiting') gl.domElement.style.cursor = 'grab'; }}
      onPointerOut={() => { if (!grab.current.active && phase.current !== 'detached') gl.domElement.style.cursor = 'default'; }}
    />
  );
}

function StaticSheet({ date, z, scale = 1, theme, showMiniMonth = true }: { date: Date; z: number; scale?: number; theme: DailyPageTheme; showMiniMonth?: boolean }) {
  const themeDef = useMemo(() => getPaperTheme(theme), [theme]);
  const texture = useMemo(() => makeCalendarTexture(date, theme, [], '', showMiniMonth), [date, theme, showMiniMonth]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, -0.08, z]} scale={scale}>
      <planeGeometry args={[WIDTH, HEIGHT]} />
      <meshStandardMaterial map={texture} roughness={themeDef.roughness} color="#ffffff" />
    </mesh>
  );
}

export function PaperRig({
  date,
  onDiagnostics,
  taskLines = [],
  memo = '',
  theme = 'himekuri',
  showMiniMonth = true,
  onDetached,
  onTearIntent,
  allowTear = true,
  resetNonce = 0,
  interactive = true
}: PaperRigProps) {
  const tomorrow = useMemo(() => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return next;
  }, [date]);
  const themeDef = useMemo(() => getPaperTheme(theme), [theme]);
  const dayAfter = useMemo(() => {
    const next = new Date(date);
    next.setDate(next.getDate() + 2);
    return next;
  }, [date]);

  return (
    <group position={[0, 0.12, 0]}>
      <mesh position={[0.05, -0.02, -0.14]} rotation={[0, 0, -0.008]}>
        <planeGeometry args={[WIDTH * 1.015, HEIGHT * 1.012]} />
        <meshStandardMaterial color={themeDef.backSheet} roughness={1} />
      </mesh>
      <StaticSheet date={dayAfter} z={-0.095} scale={1.006} theme={theme} showMiniMonth={showMiniMonth} />
      <StaticSheet date={tomorrow} z={-0.045} theme={theme} showMiniMonth={showMiniMonth} />
      <PaperSheet
        date={date}
        onDiagnostics={onDiagnostics}
        taskLines={taskLines}
        memo={memo}
        theme={theme}
        showMiniMonth={showMiniMonth}
        onDetached={onDetached}
        onTearIntent={onTearIntent}
        allowTear={allowTear}
        resetNonce={resetNonce}
        interactive={interactive}
      />

      {/* Clamp/hardware remains independent from the deforming sheet. */}
      <mesh position={[0, TOP_Y + 0.07, 0.24]}>
        <boxGeometry args={[WIDTH + 0.17, 0.23, 0.11]} />
        <meshStandardMaterial color={themeDef.hardware} metalness={themeDef.metalness} roughness={0.34} />
      </mesh>
      <mesh position={[-WIDTH * 0.38, TOP_Y + 0.07, 0.305]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.05, 24]} />
        <meshStandardMaterial color={themeDef.hardwareHighlight} metalness={Math.min(0.82, themeDef.metalness + 0.14)} roughness={0.28} />
      </mesh>
      <mesh position={[WIDTH * 0.38, TOP_Y + 0.07, 0.305]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.05, 24]} />
        <meshStandardMaterial color={themeDef.hardwareHighlight} metalness={Math.min(0.82, themeDef.metalness + 0.14)} roughness={0.28} />
      </mesh>
    </group>
  );
}
