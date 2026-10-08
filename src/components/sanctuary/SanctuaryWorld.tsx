import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { AchievementDefinition, FamiliarActivity, FamiliarColor, FamiliarDesign, FamiliarTheme, GardenTheme, SanctuaryQuality, SanctuarySecretId } from '../../types';
import { emptySanctuaryLivingState, type SanctuaryGrowthTier, type SanctuaryLivingState } from '../../lib/sanctuaryLivingCore';
import {
  sanctuaryHomeCamera,
  sanctuaryRegionById,
  type SanctuaryCameraPreset,
  type SanctuaryRegionId,
  type SanctuaryStillViewId
} from '../../data/sanctuary';
import { getGardenTheme, type GardenThemePalette } from '../../data/gardenThemes';
import { sanctuaryArtifactPlacementById, sanctuarySecretById } from '../../data/sanctuaryArtifacts';
import { resolveSanctuaryQuality, type SanctuaryDayPeriod } from '../../lib/sanctuaryDepthCore';
import { SanctuaryTimeLife } from './SanctuaryAmbientLife';
import { SanctuaryAsset, preloadSanctuaryAssets, sanctuaryAssetUrls } from './SanctuaryAssets';

interface SanctuaryWorldProps {
  growth: number;
  stageIndex: number;
  livingState?: SanctuaryLivingState;
  reducedMotion?: boolean;
  familiarEnabled?: boolean;
  familiarColor?: FamiliarColor;
  familiarDesign?: FamiliarDesign;
  familiarTheme?: FamiliarTheme;
  familiarActivity?: FamiliarActivity;
  familiarName?: string;
  requestedRegion?: SanctuaryRegionId | null;
  /** Monotonic navigation signal so selecting the already-active region recenters it too. */
  requestedRegionKey?: number;
  requestedCamera?: SanctuaryCameraPreset | null;
  requestedCameraKey?: number;
  interactionMode?: 'explore' | 'stillness';
  freeExplore?: boolean;
  stillnessViewId?: SanctuaryStillViewId | null;
  onRegionFocus?: (region: SanctuaryRegionId) => void;
  onRegionHover?: (region: SanctuaryRegionId | null) => void;
  onFamiliarInteract?: () => void;
  onStillnessRequest?: (view: SanctuaryStillViewId) => void;
  onTeaHouseInteract?: () => void;
  onFreeExploreExit?: () => void;
  theme?: GardenTheme;
  period?: SanctuaryDayPeriod;
  /** Local time as a 0..1 fraction of the current day, used for continuous celestial motion. */
  dayProgress?: number;
  quality?: SanctuaryQuality;
  unlockedAchievements?: AchievementDefinition[];
  visibleSecrets?: SanctuarySecretId[];
  discoveredSecrets?: SanctuarySecretId[];
  onArtifactInteract?: (achievement: AchievementDefinition) => void;
  onSecretInteract?: (secret: SanctuarySecretId) => void;
}

type CameraPose = { yaw: number; pitch: number; distance: number };

type CameraTransition = {
  active: boolean;
  elapsed: number;
  duration: number;
  fromPose: CameraPose;
  fromTarget: THREE.Vector3;
  toPose: CameraPose;
  toTarget: THREE.Vector3;
};

type PointerPoint = { x: number; y: number };

class SanctuaryRenderBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Sanctuary renderer recovered from a 3D error.', error);
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="sanctuary-fallback" role="status">
          <strong>The Sanctuary world could not finish rendering.</strong>
          <span>Your progress is still stored locally. Reload this room or choose a lower Sanctuary quality setting and try again.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

const TERRAIN_WIDTH = 34;
const TERRAIN_DEPTH = 28;
const CAMERA_MIN_PITCH = .015;
const CAMERA_GROUND_CLEARANCE = .46;
const SANCTUARY_EXPLORE_RADIUS = 11.4;

const familiarColors: Record<FamiliarColor, { body: string; glow: string; accent: string }> = {
  mint: { body: '#bcecc7', glow: '#84d7a0', accent: '#e9fff0' },
  sakura: { body: '#f0bfd2', glow: '#dc8fb0', accent: '#fff0f6' },
  amber: { body: '#f0cf86', glow: '#dca74a', accent: '#fff4d8' },
  lunar: { body: '#bfc9ea', glow: '#869ad8', accent: '#eef2ff' }
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function smoothHill(x: number, z: number, cx: number, cz: number, sx: number, sz: number, height: number) {
  const dx = (x - cx) / sx;
  const dz = (z - cz) / sz;
  return Math.exp(-(dx * dx + dz * dz) * 1.7) * height;
}

function terrainHeight(x: number, z: number) {
  const broad = 0.13 + Math.sin(x * 0.28) * 0.05 + Math.cos(z * 0.24) * 0.04;
  const backRight = smoothHill(x, z, 7.2, -7.2, 6.3, 4.8, 1.7);
  const backLeft = smoothHill(x, z, -9.5, -6.5, 5.8, 5.2, 1.15);
  const lookout = smoothHill(x, z, 6.6, -5.8, 3.2, 3.1, 0.8);
  const pondBasin = smoothHill(x, z, -7.0, 2.7, 3.5, 2.6, -0.48);
  const thresholdDip = smoothHill(x, z, 0, 8.8, 5.8, 3.2, -0.16);
  return broad + backRight + backLeft + lookout + pondBasin + thresholdDip;
}

function cameraFloorHeight(x: number, z: number) {
  const terrainFloor = terrainHeight(x, z);
  const pondDx = (x + 7) / 2.9;
  const pondDz = (z - 2.7) / 1.82;
  const overPond = pondDx * pondDx + pondDz * pondDz <= 1;
  const pondSurface = terrainHeight(-7, 2.7) + .12;
  return Math.max(terrainFloor, overPond ? pondSurface : terrainFloor) + CAMERA_GROUND_CLEARANCE;
}

function sanctuaryWindAt(time: number, x = 0, z = 0) {
  const broad = Math.sin(time * .42 + x * .13 - z * .07) * .66;
  const slow = Math.sin(time * .17 + z * .11 + .8) * .24;
  const gust = Math.sin(time * .91 + x * .035 + z * .045) * .1;
  return broad + slow + gust;
}

function supportsWebGL() {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function detectLowPower() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return window.innerWidth < 760 || cores <= 4 || memory <= 4;
}

function SkyDome({ palette }: { palette: GardenThemePalette }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(palette.sky) },
      horizonColor: { value: new THREE.Color(palette.fog).lerp(new THREE.Color(palette.ambient), .34) },
      bottomColor: { value: new THREE.Color(palette.ambient).lerp(new THREE.Color(palette.ground), .42) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 color = mix(bottomColor, horizonColor, smoothstep(-0.18, 0.15, h));
        color = mix(color, topColor, smoothstep(0.08, 0.72, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }), [palette.ambient, palette.fog, palette.ground, palette.sky]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={42} material={material}>
      <sphereGeometry args={[1, 32, 18]} />
    </mesh>
  );
}

function Terrain({ lowPower, palette }: { lowPower: boolean; palette: GardenThemePalette }) {
  const geometry = useMemo(() => {
    const cols = lowPower ? 34 : 54;
    const rows = lowPower ? 28 : 44;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const base = new THREE.Color(palette.ground);
    const high = new THREE.Color(palette.groundAlt[2]);
    const low = new THREE.Color(palette.groundAlt[1]);

    for (let row = 0; row <= rows; row += 1) {
      const tz = row / rows;
      const z = (tz - 0.5) * TERRAIN_DEPTH;
      for (let col = 0; col <= cols; col += 1) {
        const tx = col / cols;
        const x = (tx - 0.5) * TERRAIN_WIDTH;
        const y = terrainHeight(x, z);
        positions.push(x, y, z);
        const color = y > 0.85 ? base.clone().lerp(high, Math.min(1, (y - 0.85) / 1.2)) : base.clone().lerp(low, Math.min(1, Math.max(0, (0.15 - y) / 0.65)));
        colors.push(color.r, color.g, color.b);
      }
    }

    const stride = cols + 1;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const a = row * stride + col;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [lowPower, palette.ground, palette.groundAlt]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.98} />
    </mesh>
  );
}

function PathRibbon({ points, width = 0.8, color = '#b8a783' }: {
  points: Array<[number, number]>;
  width?: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.035, z)), false, 'catmullrom', 0.35);
    const count = 72;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();

    for (let index = 0; index <= count; index += 1) {
      const t = index / count;
      const point = curve.getPoint(t);
      curve.getTangent(t, tangent).normalize();
      side.crossVectors(up, tangent).normalize().multiplyScalar(width / 2);
      positions.push(point.x + side.x, point.y, point.z + side.z, point.x - side.x, point.y, point.z - side.z);
      uvs.push(0, t * 5, 1, t * 5);
      if (index < count) {
        const a = index * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [points, width]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={1} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

function Pond({ reducedMotion, palette, lowPower, period }: { reducedMotion: boolean; palette: GardenThemePalette; lowPower: boolean; period: SanctuaryDayPeriod }) {
  const surface = useRef<THREE.Mesh>(null);
  const sheen = useRef<THREE.Mesh>(null);
  const koi = useRef<THREE.Group>(null);
  const rippleRefs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    if (surface.current && !reducedMotion) surface.current.rotation.z = Math.sin(clock.elapsedTime * 0.18) * 0.012;
    if (sheen.current && !reducedMotion) {
      sheen.current.position.x = .66 + Math.sin(clock.elapsedTime * .11) * .16;
      sheen.current.rotation.z = -.18 + Math.sin(clock.elapsedTime * .09) * .035;
    }
    if (koi.current && !reducedMotion) koi.current.rotation.y = clock.elapsedTime * .11;
    if (!reducedMotion) rippleRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const phase = (clock.elapsedTime * .085 + index * .31) % 1;
      const scale = .55 + phase * 1.35;
      mesh.scale.set(scale, scale, scale);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - phase) * .11;
    });
  });

  const y = terrainHeight(-7, 2.7) + 0.12;
  const reeds = useMemo(() => {
    const random = seeded(73021);
    return Array.from({ length: lowPower ? 11 : 20 }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const radiusX = 2.55 + random() * .48;
      const radiusZ = 1.55 + random() * .3;
      return { x: Math.cos(angle) * radiusX, z: Math.sin(angle) * radiusZ, h: .34 + random() * .42, angle, index };
    });
  }, [lowPower]);
  const basin = new THREE.Color(palette.water).multiplyScalar(.48).getStyle();
  const shore = new THREE.Color(palette.ground).lerp(new THREE.Color(palette.stoneAlt), .34).getStyle();
  const shoreEdge = new THREE.Color(palette.stone).lerp(new THREE.Color(palette.groundAlt[0]), .42).getStyle();
  const waterSurface = new THREE.Color(palette.water).lerp(new THREE.Color(palette.sky), period === 'night' ? .08 : .2).getStyle();
  const highlight = new THREE.Color(palette.waterRing).lerp(new THREE.Color('#ffffff'), .36).getStyle();
  const skySheen = new THREE.Color(palette.sky).lerp(new THREE.Color(palette.waterRing), .44).getStyle();
  const shoreStones = [
    [-2.62,.52,.52,.22,.4], [2.42,-.7,.62,.23,.46], [-1.92,-1.32,.42,.18,.34],
    [2.02,1.02,.48,.22,.39], [-.62,1.68,.35,.15,.3], [1.02,-1.55,.31,.13,.27]
  ] as const;
  return (
    <group position={[-7, y, 2.7]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,-.085,0]} scale={[3.36,2.08,1]} receiveShadow>
        <circleGeometry args={[1,64]} />
        <meshStandardMaterial color={shore} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,-.055,0]} scale={[3.13,1.94,1]} receiveShadow>
        <ringGeometry args={[.91,1,64]} />
        <meshStandardMaterial color={shoreEdge} roughness={.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,-.045,0]} scale={[2.98,1.9,1]} receiveShadow>
        <circleGeometry args={[1,64]} />
        <meshStandardMaterial color={basin} roughness={.58} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[2.86, 1.79, 1]} receiveShadow>
        <circleGeometry args={[1, 64]} />
        <meshPhysicalMaterial color={waterSurface} roughness={.13} metalness={.03} clearcoat={.72} clearcoatRoughness={.16} transparent opacity={.91} />
      </mesh>
      <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]} position={[-.48, 0.018, -.24]} scale={[1.4,.7,1]}>
        <circleGeometry args={[1, 54]} />
        <meshBasicMaterial color={highlight} transparent opacity={.055} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={sheen} rotation={[-Math.PI / 2, 0, -.18]} position={[.66,.021,-.46]} scale={[1.12,.23,1]}>
        <circleGeometry args={[1,48]} />
        <meshBasicMaterial color={skySheen} transparent opacity={period === 'night' ? .035 : .075} depthWrite={false} toneMapped={false} />
      </mesh>
      {[0,1,2].slice(0,lowPower ? 2 : 3).map(index => <mesh key={index} ref={node => { rippleRefs.current[index] = node; }} rotation={[-Math.PI/2,0,0]} position={[.45 - index*.5,.022,.28 - index*.22]}>
        <ringGeometry args={[.34,.355,48]} />
        <meshBasicMaterial color={palette.waterRing} transparent opacity={.08} depthWrite={false} toneMapped={false} />
      </mesh>)}
      <group ref={koi} position={[0,.02,0]}>
        {[
          [1.1,.28,.11,'#d58a53'],[-.72,-.54,.09,'#eee5cf'],[.3,.78,.08,'#c45e4f']
        ].map(([x,z,scale,color], index) => (
          <group key={index} position={[Number(x),-.015,Number(z)]} rotation={[0,index * 2.05,0]} scale={Number(scale)}>
            <mesh position={[.04,-.22,.03]} rotation={[-Math.PI/2,0,0]} scale={[1.5,.5,1]}>
              <circleGeometry args={[1,14]} /><meshBasicMaterial color="#27362f" transparent opacity={.12} depthWrite={false} />
            </mesh>
            <mesh scale={[1.65,.28,.46]} rotation={[0,.2,0]}><sphereGeometry args={[1,12,8]} /><meshStandardMaterial color={String(color)} roughness={.72} /></mesh>
            <mesh position={[.32,.2,.08]} scale={[.62,.055,.18]} rotation={[0,.2,0]}><sphereGeometry args={[1,8,5]} /><meshBasicMaterial color="#fff4dd" transparent opacity={.2} depthWrite={false} toneMapped={false} /></mesh>
            <mesh position={[-1.55,0,0]} rotation={[0,0,.72]} scale={[.65,.08,.42]}><coneGeometry args={[1,1,3]} /><meshStandardMaterial color={String(color)} roughness={.78} /></mesh>
          </group>
        ))}
      </group>
      {reeds.map(reed => <group key={reed.index} position={[reed.x,.03,reed.z]} rotation={[0,reed.angle,0]}>
        <mesh position={[0,reed.h*.5,0]}><cylinderGeometry args={[.015,.022,reed.h,5]} /><meshStandardMaterial color={palette.grass} roughness={1} /></mesh>
        <mesh position={[.035,reed.h*.72,.01]} rotation={[0,0,-.2]} scale={[.08,.22,.04]}><sphereGeometry args={[1,7,5]} /><meshStandardMaterial color={palette.shrubAccent} roughness={1} /></mesh>
      </group>)}
      {shoreStones.slice(0, lowPower ? 4 : shoreStones.length).map(([x,z,sx,sy,sz], index) => (
        <mesh key={index} position={[x, .08 + sy * .12, z]} rotation={[0,index * .8,0]} scale={[sx,sy,sz]} castShadow={!lowPower}>
          <dodecahedronGeometry args={[1,0]} />
          <meshStandardMaterial color={index % 2 ? palette.stone : palette.stoneAlt} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
function StylizedTree({ position, scale = 1, variant = 0, lowPower, palette }: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
  lowPower: boolean;
  palette?: GardenThemePalette;
}) {
  const trunk = palette?.trunk ?? (variant % 2 ? '#765d48' : '#6b5340');
  const foliage = palette ? (variant % 3 === 0 ? palette.shrub : variant % 3 === 1 ? palette.grass : palette.shrubAccent) : (variant % 3 === 0 ? '#536f58' : variant % 3 === 1 ? '#607c5d' : '#6d865f');
  return (
    <group position={position} scale={scale} rotation={[0, variant * 0.73, 0]}>
      <mesh position={[0, .78, 0]} castShadow={!lowPower}>
        <cylinderGeometry args={[.09,.15,1.56,7]} />
        <meshStandardMaterial color={trunk} roughness={1} />
      </mesh>
      <mesh position={[-.25,1.65,.04]} scale={[.65,.6,.58]} castShadow={!lowPower}>
        <icosahedronGeometry args={[1,1]} />
        <meshStandardMaterial color={foliage} roughness={1} />
      </mesh>
      <mesh position={[.32,1.78,-.08]} scale={[.72,.66,.64]} castShadow={!lowPower}>
        <icosahedronGeometry args={[1,1]} />
        <meshStandardMaterial color={foliage} roughness={1} />
      </mesh>
      <mesh position={[.04,2.16,.08]} scale={[.76,.69,.7]} castShadow={!lowPower}>
        <icosahedronGeometry args={[1,1]} />
        <meshStandardMaterial color={palette ? (variant % 2 ? palette.shrubAccent : palette.shrub) : (variant % 2 ? '#68815e' : '#5e795d')} roughness={1} />
      </mesh>
    </group>
  );
}

function TreeLine({ lowPower, palette }: { lowPower: boolean; palette: GardenThemePalette }) {
  const trees = useMemo(() => {
    const random = seeded(2109);
    const count = lowPower ? 18 : 31;
    return Array.from({ length: count }, (_, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (9.6 + random() * 5.9);
      const z = -8.5 + random() * 17.5;
      const edgeBack = index % 5 === 0;
      const px = edgeBack ? -12 + random() * 24 : x;
      const pz = edgeBack ? -10.5 - random() * 2.3 : z;
      return {
        position: [px, terrainHeight(px, pz), pz] as [number, number, number],
        scale: .75 + random() * .85,
        variant: index
      };
    });
  }, [lowPower]);

  return <>{trees.map((tree, index) => <StylizedTree key={index} {...tree} lowPower={lowPower} palette={palette} />)}</>;
}

function GroundDetails({ lowPower, palette, reducedMotion }: { lowPower: boolean; palette: GardenThemePalette; reducedMotion: boolean }) {
  const grass = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = lowPower ? 110 : 230;
  const data = useMemo(() => {
    const random = seeded(9921);
    return Array.from({ length: count }, (_, index) => {
      let x = (random() - .5) * 30;
      let z = (random() - .5) * 23;
      if (Math.hypot(x, z) < 2.4) x += x > 0 ? 2.7 : -2.7;
      const nearPond = Math.pow((x + 7) / 3.2, 2) + Math.pow((z - 2.7) / 2.2, 2) < 1;
      if (nearPond) z -= 2.4;
      return { x, z, scale: .15 + random() * .24, rot: random() * Math.PI, index };
    });
  }, [count]);

  const writeMatrices = (time: number, animate: boolean) => {
    if (!grass.current) return;
    for (let index = 0; index < data.length; index += 1) {
      const item = data[index];
      const wind = animate ? sanctuaryWindAt(time, item.x, item.z) : 0;
      dummy.position.set(item.x, terrainHeight(item.x, item.z) + item.scale * .42, item.z);
      dummy.scale.set(item.scale * .28, item.scale, item.scale * .25);
      dummy.rotation.set(wind * .028, item.rot, wind * .052);
      dummy.updateMatrix();
      grass.current.setMatrixAt(index, dummy.matrix);
    }
    grass.current.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    if (reducedMotion) writeMatrices(0, false);
    // The instanced blades only need a single matrix write when motion is reduced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, reducedMotion]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    writeMatrices(clock.elapsedTime, true);
  });

  return (
    <instancedMesh ref={grass} args={[undefined, undefined, count]} castShadow={!lowPower}>
      <coneGeometry args={[.2,1,3]} />
      <meshStandardMaterial color={palette.grass} roughness={1} />
    </instancedMesh>
  );
}


function GardenStream({ palette, lowPower }: { palette: GardenThemePalette; lowPower: boolean }) {
  return (
    <group>
      <PathRibbon points={[[-9.25,-6.9],[-8.85,-5.2],[-8.55,-3.4],[-8.05,-1.5],[-7.55,.5],[-7.25,1.65]]} width={.34} color={palette.water} />
      {[
        [-8.72,-4.45,.23],[-8.25,-2.25,.18],[-7.72,-.2,.2]
      ].slice(0,lowPower ? 2 : 3).map(([x,z,scale],index) => (
        <mesh key={index} position={[x,terrainHeight(x,z)+.12,z]} rotation={[.1,index*.8,.14]} scale={[scale,.09,scale*.8]} castShadow={!lowPower}>
          <dodecahedronGeometry args={[1,0]} />
          <meshStandardMaterial color={index % 2 ? palette.stoneAlt : palette.stone} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function DistantMountainLandscape({ palette, lowPower, period }: { palette: GardenThemePalette; lowPower: boolean; period: SanctuaryDayPeriod }) {
  const snow = period === 'night' ? '#d7dde0' : '#edf0ea';
  const mountain = period === 'night'
    ? new THREE.Color(palette.stoneAlt).multiplyScalar(.58).getStyle()
    : new THREE.Color(palette.stoneAlt).lerp(new THREE.Color(palette.fog), .18).getStyle();
  const ridge = new THREE.Color(palette.groundAlt[0]).lerp(new THREE.Color(palette.fog), .24).getStyle();
  return (
    <group>
      {/* A distant, Fuji-inspired silhouette: an original low-poly landmark rather than a copied asset. */}
      <group position={[0, -1.1, -24.5]}>
        <mesh scale={[6.8, 4.1, 6.2]} rotation={[0, .08, 0]} receiveShadow>
          <coneGeometry args={[1, 1, lowPower ? 18 : 32, 1, false]} />
          <meshStandardMaterial color={mountain} roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 2.8, 0]} scale={[2.35, 1.45, 2.15]} rotation={[0, .08, 0]}>
          <coneGeometry args={[1, 1, lowPower ? 16 : 28, 1, false]} />
          <meshStandardMaterial color={snow} roughness={.96} flatShading />
        </mesh>
      </group>
      <group position={[-10.8, -.9, -18.2]} rotation={[0,.16,0]}>
        <mesh scale={[7.4,2.3,3.4]}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color={ridge} roughness={1} flatShading /></mesh>
      </group>
      <group position={[11.2, -.8, -18.8]} rotation={[0,-.22,0]}>
        <mesh scale={[7.8,2.6,3.7]}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color={ridge} roughness={1} flatShading /></mesh>
      </group>
    </group>
  );
}

function PondBridge({ palette, lowPower }: { palette: GardenThemePalette; lowPower: boolean }) {
  const y = terrainHeight(-6.2, 2.75) + .24;
  return (
    <group position={[-6.15, y, 2.75]} rotation={[0, 0, 0]}>
      {Array.from({ length: lowPower ? 7 : 9 }, (_, index) => {
        const offset = (index - (lowPower ? 3 : 4)) * .28;
        const lift = Math.cos((offset / 1.3) * Math.PI / 2) * .09;
        return (
          <mesh key={index} position={[offset,lift,0]} scale={[.25,.055,.72]} castShadow={!lowPower} receiveShadow>
            <boxGeometry args={[1,1,1]} />
            <meshStandardMaterial color={palette.trunk} roughness={.96} />
          </mesh>
        );
      })}
      {[-.72,.72].map((z, rail) => <group key={rail} position={[0,.33,z]}>
        <mesh scale={[1.45,.045,.045]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
        {[-1.18,-.58,0,.58,1.18].map(x => <mesh key={x} position={[x/2,-.17,0]} scale={[.035,.35,.035]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>)}
      </group>)}
    </group>
  );
}

function PaperLantern({ position, palette, lit, lowPower }: {
  position: [number, number, number]; palette: GardenThemePalette; lit: boolean; lowPower: boolean;
}) {
  return (
    <group position={position}>
      <mesh scale={[.09,.16,.09]} castShadow={!lowPower}>
        <cylinderGeometry args={[1,1,1,10]} />
        <meshStandardMaterial
          color={lit ? '#f3d8a6' : palette.pathAlt}
          emissive={lit ? '#d9854d' : '#000000'}
          emissiveIntensity={lit ? .75 : 0}
          roughness={.78}
        />
      </mesh>
      <mesh position={[0,.18,0]} scale={[.055,.035,.055]}><cylinderGeometry args={[1,1,1,8]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      <mesh position={[0,-.18,0]} scale={[.055,.035,.055]}><cylinderGeometry args={[1,1,1,8]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
    </group>
  );
}

function WarmLightPool({ position, scale = [1, .46], strength = .09 }: {
  position: [number, number, number]; scale?: [number, number]; strength?: number;
}) {
  return <mesh position={position} rotation={[-Math.PI / 2,0,0]} scale={[scale[0],scale[1],1]}>
    <circleGeometry args={[1,32]} />
    <meshBasicMaterial color="#f2bd77" transparent opacity={strength} depthWrite={false} toneMapped={false} />
  </mesh>;
}

function StreetHouse({ position, rotation = 0, scale = 1, palette, lit, lowPower, shop = false }: {
  position: [number, number, number]; rotation?: number; scale?: number; palette: GardenThemePalette; lit: boolean; lowPower: boolean; shop?: boolean;
}) {
  const wall = new THREE.Color(palette.pathAlt).lerp(new THREE.Color(shop ? '#d7ccb9' : '#ddd6c8'), .52).getStyle();
  const roof = new THREE.Color(palette.trunk).multiplyScalar(.72).getStyle();
  return (
    <group position={position} rotation={[0,rotation,0]} scale={scale}>
      <mesh position={[0,.72,0]} castShadow={!lowPower} receiveShadow><boxGeometry args={[1.55,1.35,1.15]} /><meshStandardMaterial color={wall} roughness={.92} /></mesh>
      <mesh position={[0,1.48,0]} rotation={[0,0,Math.PI/4]} scale={[1.18,.1,.92]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={roof} roughness={1} /></mesh>
      {shop ? <>
        <mesh position={[0,.57,.61]} scale={[.72,.42,.035]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={lit ? '#ead6a7' : palette.stoneAlt} emissive={lit ? '#b97c44' : '#000'} emissiveIntensity={lit ? .22 : 0} roughness={.72} /></mesh>
        <mesh position={[0,1.04,.66]} rotation={[.12,0,0]} scale={[.82,.055,.36]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.accent} roughness={.88} /></mesh>
        <PaperLantern position={[-.54,.94,.72]} palette={palette} lit={lit} lowPower={lowPower} />
        <PaperLantern position={[.54,.94,.72]} palette={palette} lit={lit} lowPower={lowPower} />
        {lit ? <WarmLightPool position={[0,.02,.92]} scale={[.9,.38]} strength={.085} /> : null}
      </> : <>
        <mesh position={[0,.58,.59]} scale={[.62,.42,.03]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.stoneAlt} roughness={.8} /></mesh>
        <mesh position={[.42,.82,.61]} scale={[.19,.27,.025]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={lit ? palette.accentSoft : palette.stone} emissive={lit ? palette.accent : '#000'} emissiveIntensity={lit ? .22 : 0} roughness={.7} /></mesh>
        <mesh position={[-.42,.82,.61]} scale={[.19,.27,.025]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={lit ? palette.accentSoft : palette.stone} emissive={lit ? palette.accent : '#000'} emissiveIntensity={lit ? .16 : 0} roughness={.7} /></mesh>
        {lit ? <WarmLightPool position={[0,.02,.88]} scale={[.68,.3]} strength={.065} /> : null}
      </>}
    </group>
  );
}

function TeaHouse({ position, rotation, palette, lit, lowPower, onInteract }: {
  position: [number, number, number]; rotation: number; palette: GardenThemePalette; lit: boolean; lowPower: boolean; onInteract?: () => void;
}) {
  const wall = new THREE.Color(palette.pathAlt).lerp(new THREE.Color('#c9c1b2'), .48).getStyle();
  const roof = new THREE.Color(palette.trunk).multiplyScalar(.62).getStyle();
  const warm = lit ? '#f1c17e' : '#d3b88a';
  return (
    <group position={position} rotation={[0,rotation,0]}>
      <mesh position={[0,.78,0]} castShadow={!lowPower} receiveShadow><boxGeometry args={[1.72,1.5,1.22]} /><meshStandardMaterial color={wall} roughness={.96} /></mesh>
      <mesh position={[0,1.62,0]} rotation={[0,0,Math.PI/4]} scale={[1.3,.12,.98]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={roof} roughness={1} /></mesh>
      <mesh position={[0,.12,.72]} scale={[1.95,.12,.52]} receiveShadow><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      {[-.24,0,.24].map((x,index) => <mesh key={`noren-${index}`} position={[x,1.02,.685]} scale={[.20,.42,.018]}>
        <planeGeometry args={[1,1]} />
        <meshStandardMaterial color={index === 1 ? palette.accentSoft : palette.accent} roughness={.92} side={THREE.DoubleSide} />
      </mesh>)}
      <mesh position={[-.46,.54,.63]} scale={[.36,.62,.045]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={.92} /></mesh>
      <mesh position={[.36,.78,.635]} scale={[.47,.38,.04]}>
        <boxGeometry args={[1,1,1]} />
        <meshStandardMaterial color={warm} emissive={lit ? '#b76d36' : '#000'} emissiveIntensity={lit ? .42 : 0} roughness={.68} />
      </mesh>
      <mesh position={[.36,1.25,.66]} scale={[.42,.10,.05]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.accent} roughness={.86} /></mesh>
      <group position={[.98,1.3,.7]} rotation={[0,0,-.025]}>
        <mesh scale={[.22,.34,.035]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={.94} /></mesh>
        <mesh position={[0,.02,.04]} scale={[.13,.22,.012]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.accentSoft} roughness={.88} /></mesh>
      </group>
      <PaperLantern position={[-.72,1.04,.73]} palette={palette} lit={lit} lowPower={lowPower} />
      {lit ? <WarmLightPool position={[.28,.025,1.02]} scale={[1.16,.48]} strength={.13} /> : null}
      <mesh
        position={[0,.92,.68]}
        scale={[1.08,1.02,.12]}
        onClick={event => { event.stopPropagation(); onInteract?.(); }}
        onPointerOver={event => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <boxGeometry args={[1,1,1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group position={[-1.12,.08,.72]}>
        <mesh scale={[.28,.16,.28]} castShadow={!lowPower}><cylinderGeometry args={[1.1,1.25,1,10]} /><meshStandardMaterial color={palette.stone} roughness={1} /></mesh>
        <mesh position={[0,.14,0]} scale={[.21,.045,.21]}><cylinderGeometry args={[1,1,1,12]} /><meshPhysicalMaterial color={palette.water} roughness={.18} clearcoat={.52} clearcoatRoughness={.14} /></mesh>
      </group>
      <group position={[1.05,.12,.72]}>
        <mesh scale={[.26,.18,.26]} castShadow={!lowPower}><cylinderGeometry args={[.78,1,1,10]} /><meshStandardMaterial color={palette.pathAlt} roughness={1} /></mesh>
        <mesh position={[0,.34,0]} scale={[.34,.28,.32]}><icosahedronGeometry args={[1,1]} /><meshStandardMaterial color={palette.shrubAccent} roughness={1} /></mesh>
      </group>
      {!lowPower && lit ? <pointLight position={[.3,.85,.82]} color="#e8aa66" intensity={.28} distance={3.1} decay={2} /> : null}
    </group>
  );
}

function QuietStreet({ palette, period, lowPower, onTeaHouseInteract }: {
  palette: GardenThemePalette; period: SanctuaryDayPeriod; lowPower: boolean; onTeaHouseInteract?: () => void;
}) {
  const lit = period === 'night' || period === 'dusk' || period === 'dawn';
  const buildings = [
    { x: 11.45, z: 2.55, r: -.18, s: .82, shop: true },
    { x: 11.75, z: -.05, r: -.06, s: .76, shop: false },
    { x: 10.9, z: -2.25, r: .12, s: .68, shop: false }
  ];
  const teaHouseX = 10.5;
  const teaHouseZ = 5.25;
  return (
    <group>
      <PathRibbon points={[[8.35,6.2],[9.2,4.25],[9.7,1.9],[9.85,-.5],[9.4,-2.8]]} width={1.12} color={palette.pathAlt} />
      <TeaHouse position={[teaHouseX,terrainHeight(teaHouseX,teaHouseZ),teaHouseZ]} rotation={-.34} palette={palette} lit={lit} lowPower={lowPower} onInteract={onTeaHouseInteract} />
      <StreetLanternLine palette={palette} period={period} lowPower={lowPower} />
      {buildings.slice(0, lowPower ? 2 : 3).map((item,index) => (
        <StreetHouse key={index} position={[item.x,terrainHeight(item.x,item.z),item.z]} rotation={item.r} scale={item.s} palette={palette} lit={lit} lowPower={lowPower} shop={item.shop} />
      ))}
      {[4.5,1.5,-1.4].slice(0, lowPower ? 2 : 3).map((z,index) => {
        const x = 9.2 + index * .12;
        const y = terrainHeight(x,z);
        return <group key={z} position={[x,y,z]}>
          <mesh position={[0,.7,0]} scale={[.035,.72,.035]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
          <mesh position={[0,1.43,0]} scale={[.11,.14,.11]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={lit ? palette.accentSoft : palette.stoneAlt} emissive={lit ? palette.accent : '#000'} emissiveIntensity={lit ? .5 : 0} roughness={.6} /></mesh>
          {lit && !lowPower ? <pointLight position={[0,1.42,.1]} color={palette.accent} intensity={.18} distance={2.2} decay={2} /> : null}
        </group>;
      })}
      {!lowPower ? <>
        <mesh position={[9.34,terrainHeight(9.34,3.15)+2.05,3.15]} scale={[.035,2.05,.035]}><cylinderGeometry args={[1,1,1,8]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
        <mesh position={[9.55,terrainHeight(9.55,-.4)+2.0,-.4]} scale={[.035,2,.035]}><cylinderGeometry args={[1,1,1,8]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
        <mesh position={[9.45,2.82,1.38]} rotation={[0,0,-.055]} scale={[.018,.018,1.78]}><cylinderGeometry args={[1,1,1,6]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      </> : null}
    </group>
  );
}

function StreetLanternLine({ palette, period, lowPower }: { palette: GardenThemePalette; period: SanctuaryDayPeriod; lowPower: boolean }) {
  const lit = period === 'night' || period === 'dusk' || period === 'dawn';
  const lanterns = [
    [8.95, 5.3, 1.9], [9.25, 3.35, 1.78], [9.42, 1.25, 1.72], [9.48, -.85, 1.7]
  ] as const;
  return <group>{lanterns.slice(0, lowPower ? 3 : lanterns.length).map(([x,z,h],index) => {
    const y = terrainHeight(x,z);
    return <group key={index} position={[x,y,z]}>
      <mesh position={[0,h/2,0]} scale={[.025,h/2,.025]}><cylinderGeometry args={[1,1,1,7]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      <PaperLantern position={[0,h,.03]} palette={palette} lit={lit} lowPower={lowPower} />
      {lit && !lowPower ? <pointLight position={[0,h,.15]} color="#efb06d" intensity={.24} distance={2.65} decay={2} /> : null}
    </group>;
  })}</group>;
}

function PavilionGarden({ palette, period, lowPower }: { palette: GardenThemePalette; period: SanctuaryDayPeriod; lowPower: boolean }) {
  const lit = period === 'night' || period === 'dusk';
  const stones = [[5.25,3.85],[5.62,3.68],[6.02,3.52],[6.38,3.4],[6.8,3.22]] as const;
  return <group>
    {stones.map(([x,z],index) => <mesh key={`step-${index}`} position={[x,terrainHeight(x,z)+.055,z]} rotation={[0,index*.43,.05]} scale={[.28,.07,.22]} receiveShadow>
      <dodecahedronGeometry args={[1,0]} /><meshStandardMaterial color={index % 2 ? palette.stoneAlt : palette.stone} roughness={1} />
    </mesh>)}
    {[[-1.15,.2],[1.2,-.12]].map(([dx,dz],index) => {
      const x=6.6+dx, z=3.4+dz, y=terrainHeight(x,z);
      return <group key={`lantern-${index}`} position={[x,y,z]}>
        <mesh position={[0,.34,0]}><cylinderGeometry args={[.10,.16,.68,6]} /><meshStandardMaterial color={palette.stone} roughness={1} /></mesh>
        <mesh position={[0,.72,0]} scale={[.23,.14,.23]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.stoneAlt} roughness={1} /></mesh>
        <mesh position={[0,.74,.1]} scale={.045}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={lit ? '#f2d5a0' : palette.accentSoft} emissive={lit ? '#d98b4d' : '#000'} emissiveIntensity={lit ? .72 : 0} roughness={.5} /></mesh>
        {lit && !lowPower ? <pointLight position={[0,.75,.1]} color="#efb36f" intensity={.2} distance={2.25} decay={2} /> : null}
      </group>;
    })}
    {!lowPower ? <group position={[7.9,terrainHeight(7.9,4.15),4.15]} rotation={[0,-.42,0]}>
      {[-.75,-.38,0,.38,.75].map((x,index) => <mesh key={index} position={[x,.52,0]} scale={[.035,.55,.035]}><cylinderGeometry args={[1,1,1,7]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>)}
      <mesh position={[0,.28,0]} scale={[.9,.025,.025]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      <mesh position={[0,.8,0]} scale={[.9,.025,.025]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
    </group> : null}
  </group>;
}


function BlossomTree({ position, scale = 1, variant = 0, palette, lowPower }: {
  position: [number, number, number]; scale?: number; variant?: number; palette: GardenThemePalette; lowPower: boolean;
}) {
  const blossomA = new THREE.Color(palette.accentSoft).lerp(new THREE.Color('#eec3cf'), .58).getStyle();
  const blossomB = new THREE.Color(palette.accent).lerp(new THREE.Color('#f4d6dc'), .72).getStyle();
  return (
    <group position={position} scale={scale} rotation={[0,variant * .67,0]}>
      <mesh position={[0,.8,0]} castShadow={!lowPower}><cylinderGeometry args={[.07,.13,1.62,7]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      {[
        [-.34,1.64,.05,.62], [.31,1.75,-.08,.68], [.02,2.12,.08,.72], [-.18,2.22,-.2,.5], [.42,2.03,.2,.48]
      ].slice(0, lowPower ? 3 : 5).map((item,index) => (
        <mesh key={index} position={[item[0],item[1],item[2]]} scale={item[3]} castShadow={!lowPower}>
          <icosahedronGeometry args={[1,1]} />
          <meshStandardMaterial color={index % 2 ? blossomA : blossomB} roughness={.95} />
        </mesh>
      ))}
    </group>
  );
}

function BlossomGrove({ palette, lowPower, reducedMotion }: { palette: GardenThemePalette; lowPower: boolean; reducedMotion: boolean }) {
  const grove = useRef<THREE.Group>(null);
  const trees = [
    [7.9,4.8,.96,1], [8.45,2.1,.8,2], [8.15,-.9,.72,3], [5.35,4.25,.74,4], [-4.0,4.4,.66,5]
  ] as const;
  useFrame(({ clock }) => {
    if (!grove.current || reducedMotion) return;
    const wind = sanctuaryWindAt(clock.elapsedTime, 7, 2.5);
    grove.current.rotation.z = wind * .0055;
    grove.current.rotation.x = wind * .0018;
  });
  return <group ref={grove}>{trees.slice(0, lowPower ? 3 : trees.length).map(([x,z,scale,variant]) => (
    <BlossomTree key={`${x}:${z}`} position={[x,terrainHeight(x,z),z]} scale={scale} variant={variant} palette={palette} lowPower={lowPower} />
  ))}</group>;
}

function DistantVillage({ palette, lowPower, period }: { palette: GardenThemePalette; lowPower: boolean; period: SanctuaryDayPeriod }) {
  const lit = period === 'night' || period === 'dusk';
  const houses = useMemo(() => {
    const random = seeded(7604);
    return Array.from({ length: lowPower ? 5 : 9 }, (_, index) => ({
      x: -7.5 + index * 1.85 + random() * .4,
      z: -14.1 - random() * 1.4,
      s: .28 + random() * .15,
      r: -.18 + random() * .36
    }));
  }, [lowPower]);
  return <group>
    {houses.map((house,index) => {
      const y = terrainHeight(house.x, house.z) + .1;
      return <group key={index} position={[house.x,y,house.z]} rotation={[0,house.r,0]} scale={house.s}>
        <mesh position={[0,.62,0]}><boxGeometry args={[1.7,1.1,1.05]} /><meshStandardMaterial color={palette.pathAlt} roughness={1} /></mesh>
        <mesh position={[0,1.28,0]} rotation={[0,0,Math.PI/4]} scale={[1.25,.1,.84]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
        <mesh position={[.32,.7,.55]} scale={[.28,.25,.03]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={lit ? palette.accentSoft : palette.stoneAlt} emissive={lit ? palette.accent : '#000'} emissiveIntensity={lit ? .22 : 0} /></mesh>
      </group>;
    })}
  </group>;
}

function CloudBank({ palette, lowPower, reducedMotion }: { palette: GardenThemePalette; lowPower: boolean; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const bankLayers = useMemo(() => [
    { x:-12,y:8.2,z:-19,s:2.1 }, { x:2,y:9.3,z:-22,s:2.5 }, { x:13,y:7.6,z:-18,s:1.8 }
  ].slice(0,lowPower ? 2 : 3), [lowPower]);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.position.x = Math.sin(clock.elapsedTime * .025) * .55;
  });
  const color = new THREE.Color(palette.fog).lerp(new THREE.Color('#ffffff'), .58).getStyle();
  return <group ref={root}>{bankLayers.map((cloud,index) => <group key={index} position={[cloud.x,cloud.y,cloud.z]} scale={cloud.s}>
    {[[-.42,0,0,.55],[0,.12,0,.75],[.55,.02,0,.52],[.12,-.12,.12,.58]].map((part,partIndex) => <mesh key={partIndex} position={[part[0],part[1],part[2]]} scale={part[3]}>
      <sphereGeometry args={[1,lowPower ? 10 : 16,lowPower ? 7 : 10]} /><meshStandardMaterial color={color} transparent opacity={.5} depthWrite={false} roughness={1} />
    </mesh>)}</group>)}</group>;
}

function HorizonMist({ palette, lowPower, reducedMotion }: { palette: GardenThemePalette; lowPower: boolean; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.position.x = Math.sin(clock.elapsedTime * .018) * .38;
    root.current.position.z = Math.cos(clock.elapsedTime * .013) * .18;
  });
  const mist = new THREE.Color(palette.fog).lerp(new THREE.Color('#ffffff'), .28).getStyle();
  const layers = lowPower ? 3 : 5;
  return <group ref={root}>{Array.from({ length: layers }, (_, index) => {
    const x = -10 + index * (20 / Math.max(1, layers - 1));
    const z = -10.8 - (index % 2) * 2.2;
    return <mesh key={index} position={[x, 1.2 + (index % 3) * .28, z]} scale={[4.8, .6, 1.8]}>
      <sphereGeometry args={[1, lowPower ? 10 : 16, lowPower ? 6 : 9]} />
      <meshBasicMaterial color={mist} transparent opacity={.11 + (index % 2) * .025} depthWrite={false} toneMapped={false} />
    </mesh>;
  })}</group>;
}

function BoundaryMist({ palette, lowPower, reducedMotion }: { palette: GardenThemePalette; lowPower: boolean; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const bankMesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const halfWidth = TERRAIN_WIDTH / 2;
  const halfDepth = TERRAIN_DEPTH / 2;
  const edgeInset = .22;
  const mist = new THREE.Color(palette.fog).lerp(new THREE.Color('#ffffff'), .18).getStyle();
  const curtain = new THREE.Color(palette.fog).lerp(new THREE.Color(palette.ambient), .12).getStyle();
  const sea = new THREE.Color(palette.fog).lerp(new THREE.Color(palette.sky), .1).getStyle();
  const longSideCount = lowPower ? 8 : 12;
  const shortSideCount = lowPower ? 7 : 10;
  const curtainHeight = 14;
  const curtainY = 5.6;

  const banks = useMemo(() => {
    const random = seeded(73141);
    const result: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; phase: number }> = [];

    const addLongSide = (zSign: -1 | 1) => {
      for (let index = 0; index < longSideCount; index += 1) {
        const t = index / (longSideCount - 1);
        const x = THREE.MathUtils.lerp(-halfWidth - 1.6, halfWidth + 1.6, t) + (random() - .5) * 1.1;
        const z = zSign * (halfDepth - .05 + random() * .72);
        result.push({
          x,
          y: terrainHeight(x, z) + 1.05 + random() * .72,
          z,
          sx: 4.15 + random() * 2.1,
          sy: 1.18 + random() * .72,
          sz: 1.8 + random() * 1.05,
          phase: random() * Math.PI * 2
        });
      }
    };

    const addShortSide = (xSign: -1 | 1) => {
      for (let index = 0; index < shortSideCount; index += 1) {
        const t = index / (shortSideCount - 1);
        const x = xSign * (halfWidth - .05 + random() * .72);
        const z = THREE.MathUtils.lerp(-halfDepth - 1.2, halfDepth + 1.2, t) + (random() - .5) * 1.05;
        result.push({
          x,
          y: terrainHeight(x, z) + 1.05 + random() * .72,
          z,
          sx: 1.8 + random() * 1.05,
          sy: 1.18 + random() * .72,
          sz: 3.8 + random() * 2.1,
          phase: random() * Math.PI * 2
        });
      }
    };

    addLongSide(-1);
    addLongSide(1);
    addShortSide(-1);
    addShortSide(1);
    return result;
  }, [halfDepth, halfWidth, longSideCount, shortSideCount]);

  useEffect(() => {
    if (!bankMesh.current) return;
    banks.forEach((bank, index) => {
      dummy.position.set(bank.x, bank.y, bank.z);
      dummy.scale.set(bank.sx, bank.sy, bank.sz);
      dummy.rotation.y = bank.phase * .08;
      dummy.updateMatrix();
      bankMesh.current?.setMatrixAt(index, dummy.matrix);
    });
    bankMesh.current.instanceMatrix.needsUpdate = true;
  }, [banks, dummy]);

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.position.x = Math.sin(clock.elapsedTime * .009) * .1;
    root.current.position.z = Math.cos(clock.elapsedTime * .008) * .08;
    root.current.position.y = Math.sin(clock.elapsedTime * .014) * .025;
  });

  const curtains: Array<{ position: [number, number, number]; rotation: [number, number, number]; width: number }> = [
    { position: [0, curtainY, -halfDepth + edgeInset], rotation: [0, 0, 0], width: TERRAIN_WIDTH + 4.5 },
    { position: [0, curtainY, halfDepth - edgeInset], rotation: [0, Math.PI, 0], width: TERRAIN_WIDTH + 4.5 },
    { position: [-halfWidth + edgeInset, curtainY, 0], rotation: [0, Math.PI / 2, 0], width: TERRAIN_DEPTH + 4.5 },
    { position: [halfWidth - edgeInset, curtainY, 0], rotation: [0, -Math.PI / 2, 0], width: TERRAIN_DEPTH + 4.5 }
  ];

  return (
    <group ref={root}>
      {/* A low fog sea replaces the literal outside ground so high camera angles still see atmosphere, not a void. */}
      <mesh position={[0, -.5, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
        <planeGeometry args={[92, 92]} />
        <meshBasicMaterial color={sea} transparent opacity={.94} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Four overlapping curtains make the terrestrial world beyond Sanctuary intentionally unknowable. */}
      {curtains.map((wall, index) => (
        <mesh key={index} position={wall.position} rotation={wall.rotation} renderOrder={1}>
          <planeGeometry args={[wall.width, curtainHeight]} />
          <meshBasicMaterial
            color={curtain}
            transparent
            opacity={lowPower ? .9 : .88}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Organic banks hide the geometric edge of the curtains and make the boundary read as weather. */}
      <instancedMesh ref={bankMesh} args={[undefined, undefined, banks.length]} frustumCulled={false} renderOrder={2}>
        <sphereGeometry args={[1, lowPower ? 9 : 13, lowPower ? 6 : 8]} />
        <meshBasicMaterial color={mist} transparent opacity={lowPower ? .64 : .58} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function BirdFlock({ palette, lowPower, reducedMotion }: { palette: GardenThemePalette; lowPower: boolean; reducedMotion: boolean }) {
  const flock = useRef<THREE.Group>(null);
  const birds = useMemo(() => {
    const random = seeded(44117);
    return Array.from({ length: lowPower ? 3 : 7 }, (_, index) => ({
      x: -8 + random() * 15,
      y: 6.2 + random() * 2.8,
      z: -8.5 - random() * 5,
      scale: .72 + random() * .55,
      phase: index * .71 + random() * 2
    }));
  }, [lowPower]);
  useFrame(({ clock }) => {
    if (!flock.current || reducedMotion) return;
    flock.current.position.x = ((clock.elapsedTime * .34) % 20) - 10;
    flock.current.position.y = Math.sin(clock.elapsedTime * .22) * .12;
    flock.current.children.forEach((child, index) => {
      child.rotation.z = Math.sin(clock.elapsedTime * 2.15 + birds[index].phase) * .08;
    });
  });
  const color = new THREE.Color(palette.stoneAlt).multiplyScalar(.5).getStyle();
  return <group ref={flock}>{birds.map((bird, index) => <group key={index} position={[bird.x,bird.y,bird.z]} scale={bird.scale} rotation={[0,.25,0]}>
    <mesh position={[-.08,0,0]} rotation={[0,0,.36]} renderOrder={4}><planeGeometry args={[.18,.045]} /><meshBasicMaterial color={color} transparent opacity={.96} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position={[.08,0,0]} rotation={[0,0,-.36]} renderOrder={4}><planeGeometry args={[.18,.045]} /><meshBasicMaterial color={color} transparent opacity={.96} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>)}</group>;
}

function DriftingLeaves({ theme, palette, lowPower, reducedMotion }: { theme: GardenTheme; palette: GardenThemePalette; lowPower: boolean; reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = lowPower ? 12 : 26;
  const particles = useMemo(() => {
    const random = seeded(55091);
    return Array.from({ length: count }, (_, index) => ({
      x: -10 + random() * 20,
      y: 2.3 + random() * 6.2,
      z: -4 + random() * 12,
      speed: .13 + random() * .18,
      drift: .4 + random() * .8,
      spin: random() * Math.PI * 2,
      phase: index * .63 + random() * 4
    }));
  }, [count]);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    particles.forEach((particle, index) => {
      const travel = reducedMotion ? 0 : clock.elapsedTime * particle.speed;
      const wrapped = ((particle.y - 1.2 - travel) % 8 + 8) % 8;
      const y = 1.2 + wrapped;
      const wind = reducedMotion ? 0 : sanctuaryWindAt(clock.elapsedTime, particle.x, particle.z);
      const x = particle.x + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * .42 + particle.phase) * particle.drift + wind * .36);
      dummy.position.set(x, y, particle.z);
      dummy.rotation.set(particle.spin + travel * .8, particle.spin + travel, particle.spin * .4 + travel * .5);
      dummy.scale.setScalar(.65 + (index % 4) * .08);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  const color = theme === 'aether-bloom'
    ? new THREE.Color('#efc4d1').lerp(new THREE.Color(palette.accentSoft), .35).getStyle()
    : theme === 'sunhive'
      ? new THREE.Color('#c98954').lerp(new THREE.Color(palette.accent), .3).getStyle()
      : new THREE.Color(palette.shrubAccent).lerp(new THREE.Color(palette.accentSoft), .22).getStyle();
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
    <planeGeometry args={[.11,.17]} />
    <meshStandardMaterial color={color} roughness={.9} side={THREE.DoubleSide} />
  </instancedMesh>;
}

function ForegroundFraming({ palette, lowPower, reducedMotion }: { palette: GardenThemePalette; lowPower: boolean; reducedMotion: boolean }) {
  const frame = useRef<THREE.Group>(null);
  const shrubs = [
    [-12.4,7.6,1.45,91],[-10.9,9.1,1.12,92],[11.8,7.9,1.35,93],[13.2,5.9,1.08,94]
  ] as const;
  useFrame(({ clock }) => {
    if (!frame.current || reducedMotion) return;
    frame.current.rotation.z = sanctuaryWindAt(clock.elapsedTime, 11, 7) * .0045;
  });
  return <group ref={frame}>{shrubs.slice(0, lowPower ? 3 : 4).map(([x,z,scale,variant]) => (
    <StylizedTree key={variant} position={[x,terrainHeight(x,z),z]} scale={scale} variant={variant} lowPower={lowPower} palette={palette} />
  ))}</group>;
}

function AtmosphericLightRig({ palette, period, dayProgress, lowPower }: { palette: GardenThemePalette; period: SanctuaryDayPeriod; dayProgress: number; lowPower: boolean }) {
  const progress = Number.isFinite(dayProgress) ? THREE.MathUtils.clamp(dayProgress, 0, .999999) : .5;
  const solarAngle = (progress - .25) * Math.PI * 2;
  const solarElevation = Math.sin(solarAngle);
  const daylight = THREE.MathUtils.clamp((solarElevation + .12) / .8, 0, 1);
  const sunPosition: [number, number, number] = [Math.cos(solarAngle) * 18, Math.max(-4, solarElevation * 15), -12 + Math.sin(solarAngle * .45) * 2];
  const moonPosition: [number, number, number] = [-sunPosition[0] * .82, Math.max(4, -solarElevation * 13), -14];
  const isNight = period === 'night';
  const isDusk = period === 'dusk';
  const keyIntensity = isNight ? .82 : isDusk ? 1.52 : .95 + daylight * 1.28;
  return <>
    <ambientLight intensity={isNight ? .68 : isDusk ? .82 : .9} color={palette.ambient} />
    <hemisphereLight intensity={isNight ? .86 : isDusk ? 1 : 1.06} color={palette.fill} groundColor={palette.groundAlt[1]} />
    <directionalLight
      castShadow={!lowPower}
      position={sunPosition}
      intensity={keyIntensity}
      color={palette.key}
      shadow-mapSize-width={lowPower ? 512 : 1024}
      shadow-mapSize-height={lowPower ? 512 : 1024}
      shadow-camera-left={-16}
      shadow-camera-right={16}
      shadow-camera-top={14}
      shadow-camera-bottom={-14}
      shadow-camera-far={40}
    />
    <directionalLight position={[-7,7,-5]} intensity={isNight ? .9 : isDusk ? .66 : .54} color={palette.fill} />
    {solarElevation > -.14 ? <group position={sunPosition}>
      <mesh renderOrder={4}><sphereGeometry args={[1.08,24,16]} /><meshBasicMaterial color={palette.celestial} transparent opacity={.54 + daylight * .22} depthWrite={false} toneMapped={false} /></mesh>
      {!lowPower ? <pointLight color={palette.celestial} intensity={.45 + daylight * .35} distance={10} decay={2} /> : null}
    </group> : null}
    {solarElevation < .18 ? <group position={moonPosition}>
      <mesh renderOrder={4}><sphereGeometry args={[.72,20,14]} /><meshBasicMaterial color={palette.celestial} transparent opacity={isNight ? .8 : .42} depthWrite={false} toneMapped={false} /></mesh>
    </group> : null}
  </>;
}

function ScenicSeat({ view, position, rotation = 0, palette, lowPower, onSit }: {
  view: SanctuaryStillViewId; position: [number, number, number]; rotation?: number; palette: GardenThemePalette; lowPower: boolean; onSit?: (view: SanctuaryStillViewId) => void;
}) {
  return <group position={position} rotation={[0,rotation,0]}>
    <mesh position={[0,.42,0]} scale={[.86,.08,.28]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={.96} /></mesh>
    <mesh position={[-.31,.2,0]} scale={[.07,.42,.22]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
    <mesh position={[.31,.2,0]} scale={[.07,.42,.22]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
    <mesh
      position={[0,.45,.06]}
      scale={[1.05,.65,.7]}
      onClick={event => { event.stopPropagation(); onSit?.(view); }}
      onPointerOver={event => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <boxGeometry args={[1,1,1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>;
}

function ScenicSeats({ palette, lowPower, onSit }: { palette: GardenThemePalette; lowPower: boolean; onSit?: (view: SanctuaryStillViewId) => void }) {
  const seats: Array<{ view: SanctuaryStillViewId; x:number; z:number; r:number }> = [
    { view:'pond-edge', x:-4.65, z:4.15, r:-.62 },
    { view:'pavilion-veranda', x:5.05, z:2.12, r:.72 },
    { view:'guardian-grove', x:2.25, z:.95, r:-.28 },
    { view:'lantern-street', x:8.58, z:3.75, r:.18 }
  ];
  return <>{seats.map(seat => <ScenicSeat key={seat.view} view={seat.view} position={[seat.x,terrainHeight(seat.x,seat.z),seat.z]} rotation={seat.r} palette={palette} lowPower={lowPower} onSit={onSit} />)}</>;
}

function RockScatter({ lowPower, palette }: { lowPower: boolean; palette: GardenThemePalette }) {
  const rocks = useMemo(() => {
    const random = seeded(5517);
    const count = lowPower ? 17 : 28;
    return Array.from({ length: count }, (_, index) => {
      const x = (random() - .5) * 29;
      const z = (random() - .5) * 22;
      return { x, z, s: .18 + random() * .38, r: random() * Math.PI, index };
    });
  }, [lowPower]);

  return <>{rocks.map(rock => (
    <mesh key={rock.index} position={[rock.x, terrainHeight(rock.x, rock.z) + rock.s * .18, rock.z]} rotation={[rock.s * .2, rock.r, rock.s * .14]} scale={[rock.s, rock.s * .55, rock.s * .8]} castShadow={!lowPower} receiveShadow>
      <dodecahedronGeometry args={[1,0]} />
      <meshStandardMaterial color={rock.index % 3 === 0 ? palette.stoneAlt : palette.stone} roughness={1} />
    </mesh>
  ))}</>;
}

function AmbientMotes({ reducedMotion, lowPower, palette }: { reducedMotion: boolean; lowPower: boolean; palette: GardenThemePalette }) {
  const group = useRef<THREE.Group>(null);
  const motes = useMemo(() => {
    const random = seeded(11901);
    const count = lowPower ? 18 : 34;
    return Array.from({ length: count }, (_, index) => ({
      x: (random() - .5) * 20,
      y: .8 + random() * 3.5,
      z: (random() - .5) * 15,
      speed: .24 + random() * .36,
      phase: index * .73 + random() * 2
    }));
  }, [lowPower]);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.children.forEach((child, index) => {
      const mote = motes[index];
      child.position.y = mote.y + Math.sin(clock.elapsedTime * mote.speed + mote.phase) * .23;
      child.position.x = mote.x + Math.cos(clock.elapsedTime * mote.speed * .55 + mote.phase) * .18;
    });
  });

  return (
    <group ref={group}>
      {motes.map((mote, index) => (
        <mesh key={index} position={[mote.x,mote.y,mote.z]}>
          <sphereGeometry args={[index % 4 === 0 ? .025 : .014,6,6]} />
          <meshBasicMaterial color={index % 3 === 0 ? palette.mote[0] : palette.mote[1]} transparent opacity={.72} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}


function HomeGroveLife({ state, lowPower, palette }: {
  state: SanctuaryLivingState['homeGrove'];
  lowPower: boolean;
  palette: GardenThemePalette;
}) {
  const flowers = useMemo(() => {
    const random = seeded(22021);
    const count = lowPower ? Math.min(state.flowerCount, 16) : state.flowerCount;
    return Array.from({ length: count }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const radius = 1.55 + random() * 3.15;
      const x = .2 + Math.cos(angle) * radius;
      const z = -.5 + Math.sin(angle) * radius * .78;
      return {
        x,
        z,
        scale: .7 + random() * .55,
        hue: index % 4
      };
    });
  }, [lowPower, state.flowerCount]);

  const blossomColors = [palette.flower[0], palette.flower[1], palette.flower[2], palette.accentSoft];
  const saplings = state.tier >= 3 ? (state.tier === 4 ? 3 : 2) : 0;
  return (
    <group>
      {flowers.map((flower, index) => {
        const y = terrainHeight(flower.x, flower.z);
        return (
          <group key={index} position={[flower.x, y, flower.z]} scale={flower.scale}>
            <mesh position={[0,.13,0]} castShadow={!lowPower}>
              <cylinderGeometry args={[.012,.018,.27,5]} />
              <meshStandardMaterial color={palette.grass} roughness={1} />
            </mesh>
            <mesh position={[0,.29,0]} rotation={[Math.PI / 2,0,index * .73]} castShadow={!lowPower}>
              <octahedronGeometry args={[.065,0]} />
              <meshStandardMaterial color={blossomColors[flower.hue]} roughness={.86} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: saplings }, (_, index) => {
        const points: Array<[number, number]> = [[-2.8,-2.35],[3.05,-1.9],[-2.65,1.75]];
        const [x,z] = points[index];
        return <StylizedTree key={`sapling-${index}`} position={[x, terrainHeight(x,z), z]} scale={.42 + index * .05} variant={70 + index} lowPower={lowPower} palette={palette} />;
      })}
      {state.recentCompletedTasks > 0 ? (
        <pointLight position={[.2, terrainHeight(.2,-.5) + 2.4, -.5]} color={palette.accent} intensity={Math.min(.68, .2 + state.recentCompletedTasks * .025)} distance={5.2} decay={2} />
      ) : null}
    </group>
  );
}

function MoonPondLife({ state, reducedMotion, lowPower, palette }: {
  state: SanctuaryLivingState['moonPond'];
  reducedMotion: boolean;
  lowPower: boolean;
  palette: GardenThemePalette;
}) {
  const group = useRef<THREE.Group>(null);
  const pads = useMemo(() => {
    const random = seeded(22022);
    const count = lowPower ? Math.min(state.lilyCount, 7) : state.lilyCount;
    return Array.from({ length: count }, (_, index) => ({
      angle: random() * Math.PI * 2,
      radius: .48 + random() * 1.65,
      scale: .16 + random() * .10,
      flower: state.tier >= 3 && index % 3 === 0
    }));
  }, [lowPower, state.lilyCount, state.tier]);
  const baseY = terrainHeight(-7,2.7) + .145;

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * .08) * .018;
  });

  return (
    <group ref={group} position={[-7,baseY,2.7]}>
      {pads.map((pad,index) => {
        const x = Math.cos(pad.angle) * pad.radius * 1.2;
        const z = Math.sin(pad.angle) * pad.radius * .72;
        return (
          <group key={index} position={[x,.012,z]} rotation={[0,-pad.angle,0]}>
            <mesh rotation={[-Math.PI / 2,0,0]} scale={[1,.72,1]}>
              <circleGeometry args={[pad.scale,18]} />
              <meshStandardMaterial color={index % 2 ? palette.shrub : palette.shrubAccent} roughness={.7} />
            </mesh>
            {pad.flower ? (
              <mesh position={[.02,.045,0]} scale={.065}>
                <octahedronGeometry args={[1,0]} />
                <meshStandardMaterial color={palette.flower[index % 3]} emissive={palette.accent} emissiveIntensity={.08} roughness={.72} />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {state.tier >= 2 ? Array.from({ length: lowPower ? 4 : 7 }, (_, index) => {
        const angle = (index / (lowPower ? 4 : 7)) * Math.PI * 2 + .3;
        const x = Math.cos(angle) * 2.65;
        const z = Math.sin(angle) * 1.55;
        return (
          <group key={`reed-${index}`} position={[x,0,z]} rotation={[0,-angle,0]}>
            {Array.from({ length: 3 }, (_, reed) => (
              <mesh key={reed} position={[(reed-1)*.055,.22 + reed*.025,0]} rotation={[0,0,(reed-1)*.07]}>
                <cylinderGeometry args={[.012,.018,.48 + reed*.05,5]} />
                <meshStandardMaterial color={palette.reed} roughness={1} />
              </mesh>
            ))}
          </group>
        );
      }) : null}
      {state.tier >= 1 ? (
        <pointLight position={[0,1.1,0]} color={palette.waterRing} intensity={.18 + state.tier * .08} distance={4.4} decay={2} />
      ) : null}
    </group>
  );
}

function PavilionMemoryTraces({ state, reducedMotion, lowPower, palette }: {
  state: SanctuaryLivingState['quietPavilion'];
  reducedMotion: boolean;
  lowPower: boolean;
  palette: GardenThemePalette;
}) {
  const lanterns = useMemo(() => {
    const random = seeded(22023);
    const count = lowPower ? Math.min(state.lanternCount, 7) : state.lanternCount;
    return Array.from({ length: count }, (_, index) => {
      const angle = -.8 + (index / Math.max(1,count-1)) * 1.6;
      const radius = 2.1 + random() * .8;
      return {
        x: 6.6 + Math.cos(angle) * radius,
        z: 3.4 + Math.sin(angle) * radius,
        height: .7 + random() * .55,
        phase: index * .73
      };
    });
  }, [lowPower, state.lanternCount]);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.children.forEach((child,index) => {
      const lantern = lanterns[index];
      child.position.y = terrainHeight(lantern.x, lantern.z) + Math.sin(clock.elapsedTime * .7 + lantern.phase) * .025;
    });
  });

  return (
    <group ref={group}>
      {lanterns.map((lantern,index) => {
        const ground = terrainHeight(lantern.x, lantern.z);
        return (
          <group key={index} position={[lantern.x,ground,lantern.z]}>
            <mesh position={[0,lantern.height/2,0]}>
              <cylinderGeometry args={[.018,.022,lantern.height,5]} />
              <meshStandardMaterial color={palette.trunk} roughness={1} />
            </mesh>
            <mesh position={[0,lantern.height + .05,0]} scale={[.11,.15,.11]}>
              <sphereGeometry args={[1,10,8]} />
              <meshStandardMaterial color={palette.accentSoft} emissive={palette.accent} emissiveIntensity={.45} roughness={.48} />
            </mesh>
            {!lowPower && state.tier >= 2 ? <pointLight position={[0,lantern.height + .05,0]} color={palette.accent} intensity={.22} distance={1.5} decay={2} /> : null}
          </group>
        );
      })}
    </group>
  );
}

const LOOKOUT_ROUTE_POINTS: Array<[number, number]> = [
  [1.35,-1.55],[2.25,-2.35],[3.18,-3.05],[4.02,-3.82],[4.82,-4.55],[5.52,-5.14],[6.02,-5.58],[6.42,-5.84]
];

function LookoutDevelopment({ state, lowPower, palette }: {
  state: SanctuaryLivingState['lookout'];
  lowPower: boolean;
  palette: GardenThemePalette;
}) {
  const markerCount = Math.min(state.routeMarkers, lowPower ? 6 : LOOKOUT_ROUTE_POINTS.length);
  const beaconX = 8.05;
  const beaconZ = -5.75;
  const beaconY = terrainHeight(beaconX,beaconZ);
  const careerTier = state.careerTier;

  return (
    <group>
      {LOOKOUT_ROUTE_POINTS.slice(0,markerCount).map(([x,z],index) => (
        <group key={index} position={[x,terrainHeight(x,z),z]} rotation={[0,index*.37,0]}>
          <mesh position={[0,.17,0]} scale={[.18,.32,.14]} castShadow={!lowPower}>
            <dodecahedronGeometry args={[1,0]} />
            <meshStandardMaterial color={index % 2 ? palette.stoneAlt : palette.stone} roughness={1} />
          </mesh>
          <mesh position={[0,.36,.08]} scale={[.025,.025,.012]}>
            <sphereGeometry args={[1,7,6]} />
            <meshBasicMaterial color={palette.accent} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {careerTier > 0 ? (
        <group position={[beaconX,beaconY,beaconZ]} rotation={[0,-.28,0]}>
          <mesh position={[0,.12,0]} scale={[.85,.22,.7]} castShadow={!lowPower} receiveShadow>
            <dodecahedronGeometry args={[1,1]} />
            <meshStandardMaterial color={palette.stone} roughness={1} />
          </mesh>
          <mesh position={[0,.65,0]} castShadow={!lowPower}>
            <cylinderGeometry args={[.07,.09,1.1,7]} />
            <meshStandardMaterial color={palette.trunk} roughness={1} />
          </mesh>
          {careerTier >= 2 ? (
            <>
              <mesh position={[-.52,.55,0]} castShadow={!lowPower}><boxGeometry args={[.08,.9,.08]} /><meshStandardMaterial color="#735942" roughness={1} /></mesh>
              <mesh position={[.52,.55,0]} castShadow={!lowPower}><boxGeometry args={[.08,.9,.08]} /><meshStandardMaterial color="#735942" roughness={1} /></mesh>
              <mesh position={[0,1.0,0]} castShadow={!lowPower}><boxGeometry args={[1.12,.08,.09]} /><meshStandardMaterial color="#806246" roughness={1} /></mesh>
            </>
          ) : null}
          {careerTier >= 3 ? (
            <mesh position={[0,1.35,0]} castShadow={!lowPower}>
              <cylinderGeometry args={[.035,.055,.72,6]} />
              <meshStandardMaterial color="#68503c" roughness={1} />
            </mesh>
          ) : null}
          {careerTier >= 4 ? (
            <>
              <mesh position={[0,1.78,0]} scale={.13}>
                <icosahedronGeometry args={[1,1]} />
                <meshStandardMaterial color={palette.accentSoft} emissive={palette.accent} emissiveIntensity={.78} roughness={.38} />
              </mesh>
              {!lowPower ? <pointLight position={[0,1.78,0]} color={palette.accent} intensity={.65} distance={4.2} decay={2} /> : null}
            </>
          ) : null}
          {state.proof > 0 && careerTier >= 2 ? Array.from({ length: Math.min(3,state.proof) }, (_,index) => (
            <mesh key={`flag-${index}`} position={[.15 + index*.08,1.25 + index*.16,0]} rotation={[0,0,-.05]}>
              <planeGeometry args={[.28,.13]} />
              <meshStandardMaterial color={index % 2 ? '#b98961' : '#c4a16b'} side={THREE.DoubleSide} roughness={.8} />
            </mesh>
          )) : null}
        </group>
      ) : null}
    </group>
  );
}

function ThresholdLife({ tier, lowPower, palette }: { tier: SanctuaryGrowthTier; lowPower: boolean; palette: GardenThemePalette }) {
  if (tier === 0) return null;
  const count = Math.min(lowPower ? 3 : 5, tier + 1);
  return (
    <group>
      {Array.from({ length: count }, (_,index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const step = Math.floor(index / 2);
        const x = side * (1.2 + step * .7);
        const z = 7.1 - step * .45;
        const y = terrainHeight(x,z);
        return (
          <group key={index} position={[x,y,z]}>
            <mesh position={[0,.28,0]}><cylinderGeometry args={[.025,.03,.56,5]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
            <mesh position={[0,.61,0]} scale={.075}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={palette.accentSoft} emissive={palette.accent} emissiveIntensity={.42} roughness={.5} /></mesh>
          </group>
        );
      })}
    </group>
  );
}


function DistanceDetail({ center, maxDistance, children }: {
  center: [number, number, number];
  maxDistance: number;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const centerPoint = useMemo(() => new THREE.Vector3(...center), [center]);
  const tick = useRef(0);
  useFrame(() => {
    tick.current = (tick.current + 1) % 12;
    if (tick.current || !group.current) return;
    group.current.visible = camera.position.distanceTo(centerPoint) <= maxDistance;
  });
  return <group ref={group}>{children}</group>;
}

function NightStars({ palette, lowPower }: { palette: GardenThemePalette; lowPower: boolean }) {
  const stars = useMemo(() => {
    const random = seeded(23001);
    const count = lowPower ? 28 : 58;
    return Array.from({ length: count }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const radius = 22 + random() * 10;
      return {
        x: Math.cos(angle) * radius,
        y: 10 + random() * 15,
        z: Math.sin(angle) * radius,
        scale: index % 9 === 0 ? .05 : .025
      };
    });
  }, [lowPower]);
  return <>{stars.map((star,index) => (
    <mesh key={index} position={[star.x,star.y,star.z]} scale={star.scale} renderOrder={4}>
      <sphereGeometry args={[1,5,5]} />
      <meshBasicMaterial color={palette.celestial} transparent opacity={index % 4 === 0 ? .82 : .5} depthWrite={false} toneMapped={false} />
    </mesh>
  ))}</>;
}


function ThemeWeather({ theme, palette, lowPower, reducedMotion }: {
  theme: GardenTheme;
  palette: GardenThemePalette;
  lowPower: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const particles = useMemo(() => {
    const random = seeded(23002 + (theme === 'moonwell' ? 11 : theme === 'aether-bloom' ? 23 : theme === 'sunhive' ? 37 : 0));
    const count = lowPower ? 8 : 16;
    return Array.from({ length: count }, (_, index) => ({
      x: (random() - .5) * 24,
      y: 1 + random() * 7,
      z: (random() - .5) * 18,
      phase: random() * Math.PI * 2,
      speed: .14 + random() * .24,
      scale: .018 + random() * .025,
      index
    }));
  }, [lowPower, theme]);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.children.forEach((child,index) => {
      const particle = particles[index];
      const time = clock.elapsedTime * particle.speed + particle.phase;
      if (theme === 'moonwell') {
        // Firefly / lantern dust: slow, bounded hovering rather than rising neon.
        child.position.x = particle.x + Math.sin(time * 1.2) * .28;
        child.position.y = particle.y + Math.cos(time * .8) * .22;
      } else if (theme === 'aether-bloom') {
        // Blossom petals drift down and sideways.
        child.position.x = particle.x + Math.sin(time * .7) * .7;
        child.position.y = 1 + ((particle.y - time * .32 + 14) % 7);
        child.rotation.z = time * .7;
      } else if (theme === 'sunhive') {
        // Dry maple leaves fall in a slightly heavier arc.
        child.position.x = particle.x + Math.sin(time * .55) * .42;
        child.position.y = 1 + ((particle.y - time * .42 + 14) % 7);
        child.rotation.z = time;
      } else {
        // Cedar rain atmosphere uses sparse mist/pollen motion, not visible rain streaks.
        child.position.x = particle.x + Math.sin(time) * .34;
        child.position.y = particle.y + Math.cos(time * .62) * .14;
      }
    });
  });

  return <group ref={group}>{particles.map(particle => (
    <mesh
      key={particle.index}
      position={[particle.x,particle.y,particle.z]}
      scale={theme === 'aether-bloom' || theme === 'sunhive' ? [particle.scale * 1.8, particle.scale * .55, particle.scale] : particle.scale}
    >
      {theme === 'sunhive' ? <octahedronGeometry args={[1,0]} /> : <sphereGeometry args={[1,6,5]} />}
      <meshBasicMaterial
        color={particle.index % 2 ? palette.mote[0] : palette.mote[1]}
        transparent
        opacity={theme === 'verdant-sanctuary' ? .34 : theme === 'moonwell' ? .48 : .42}
        toneMapped={false}
      />
    </mesh>
  ))}</group>;
}

function ThemeEnvironment({ theme, palette, period, lowPower, reducedMotion }: {
  theme: GardenTheme;
  palette: GardenThemePalette;
  period: SanctuaryDayPeriod;
  lowPower: boolean;
  reducedMotion: boolean;
}) {
  const livingGroup = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!livingGroup.current || reducedMotion) return;
    livingGroup.current.rotation.y = Math.sin(clock.elapsedTime * .045) * .01;
  });

  if (theme === 'moonwell') {
    const lanterns = [[-10,-2.2],[9,1.1],[3.8,-8.2],[-11,6.4]] as Array<[number,number]>;
    return <group ref={livingGroup}>
      {lanterns.slice(0, lowPower ? 3 : 4).map(([x,z],index) => (
        <DistanceDetail key={index} center={[x,terrainHeight(x,z),z]} maxDistance={22}>
          <group position={[x,terrainHeight(x,z),z]} rotation={[0,index*.8,0]}>
            <mesh position={[0,.26,0]} castShadow={!lowPower}><cylinderGeometry args={[.12,.17,.52,6]} /><meshStandardMaterial color={palette.stone} roughness={1} /></mesh>
            <mesh position={[0,.57,0]} scale={[.24,.13,.22]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.stoneAlt} roughness={1} /></mesh>
            <mesh position={[0,.60,.1]} scale={.045}><sphereGeometry args={[1,7,6]} /><meshStandardMaterial color={palette.accentSoft} emissive={palette.accent} emissiveIntensity={period === 'night' ? .72 : .14} roughness={.5} /></mesh>
            {period === 'night' && !lowPower ? <pointLight position={[0,.6,.1]} color={palette.accent} intensity={.22} distance={2.4} decay={2} /> : null}
          </group>
        </DistanceDetail>
      ))}
    </group>;
  }

  if (theme === 'aether-bloom') {
    const blossomTrees = [[-8,-7],[9,-5],[-11,3],[10,5]] as Array<[number,number]>;
    return <group ref={livingGroup}>
      {blossomTrees.slice(0, lowPower ? 2 : 4).map(([x,z],index) => (
        <DistanceDetail key={index} center={[x,terrainHeight(x,z),z]} maxDistance={24}>
          <group position={[x,terrainHeight(x,z),z]} rotation={[0,index*.7,0]}>
            <mesh position={[0,.9,0]} castShadow={!lowPower}><cylinderGeometry args={[.08,.13,1.8,7]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
            {[[0,1.75,0],[-.42,1.55,.08],[.4,1.58,-.06],[.05,1.45,.4]].slice(0, lowPower ? 3 : 4).map((pos, blossom) => (
              <mesh key={blossom} position={pos as [number,number,number]} scale={blossom ? .46 : .58} castShadow={!lowPower}>
                <icosahedronGeometry args={[1,1]} />
                <meshStandardMaterial color={blossom % 2 ? palette.bloom[0] : palette.bloom[1]} roughness={.92} />
              </mesh>
            ))}
          </group>
        </DistanceDetail>
      ))}
    </group>;
  }

  if (theme === 'sunhive') {
    const teaGarden = [[-9,-4],[10,-1],[-7,7],[8,7]] as Array<[number,number]>;
    return <group>
      {teaGarden.slice(0,lowPower ? 3 : 4).map(([x,z],index) => (
        <group key={index} position={[x,terrainHeight(x,z),z]} rotation={[0,index*.42,0]}>
          <mesh position={[0,.22,0]} scale={[.7,.13,.25]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
          <mesh position={[-.48,.11,0]} scale={[.1,.22,.18]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
          <mesh position={[.48,.11,0]} scale={[.1,.22,.18]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
          {!lowPower ? <mesh position={[.2,.72,.18]} scale={[.48,.34,.45]} castShadow><icosahedronGeometry args={[1,1]} /><meshStandardMaterial color={index % 2 ? palette.flower[0] : palette.flower[1]} roughness={1} /></mesh> : null}
        </group>
      ))}
    </group>;
  }

  const cedarDetails = [[-9,5.8],[10,5.3],[-8,-6.4]] as Array<[number,number]>;
  return <group>
    {cedarDetails.slice(0,lowPower ? 2 : 3).map(([x,z],index) => (
      <group key={index} position={[x,terrainHeight(x,z)+.18,z]} rotation={[0,index*.9,.18]}>
        <mesh rotation={[0,0,Math.PI/2]} scale={[.24,.95,.24]} castShadow={!lowPower}>
          <cylinderGeometry args={[1,1,1,7]} />
          <meshStandardMaterial color={palette.trunk} roughness={1} />
        </mesh>
        <mesh position={[0,.12,.1]} scale={[.3,.08,.22]}>
          <icosahedronGeometry args={[1,1]} />
          <meshStandardMaterial color={palette.shrubAccent} roughness={1} />
        </mesh>
      </group>
    ))}
  </group>;
}

function ArtifactObject({ definition, palette, lowPower, onInteract }: {
  definition: AchievementDefinition;
  palette: GardenThemePalette;
  lowPower: boolean;
  onInteract?: (achievement: AchievementDefinition) => void;
}) {
  const placement = sanctuaryArtifactPlacementById[definition.id];
  if (!placement) return null;
  const [x,z] = placement.position;
  const y = terrainHeight(x,z);
  const common = {
    onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onInteract?.(definition); },
    onPointerOver: (event: { stopPropagation: () => void }) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = ''; }
  };

  if (definition.artifact === 'reflection-bench') {
    return <group {...common}><SanctuaryAsset src={sanctuaryAssetUrls.reflectionBench} position={[x,y,z]} scale={placement.scale ?? .74} rotation={[0,placement.rotation ?? .84,0]} tint={palette.accent} tintStrength={.08} /></group>;
  }
  if (definition.artifact === 'sakura-sapling') {
    return <group {...common} position={[x,y,z]} rotation={[0,placement.rotation ?? 0,0]}>
      <mesh position={[0,.7,0]} castShadow={!lowPower}><cylinderGeometry args={[.065,.1,1.4,7]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      {[[0,1.42,0],[-.3,1.25,.03],[.3,1.28,-.05]].map((pos,index) => <mesh key={index} position={pos as [number,number,number]} scale={index ? .42 : .52} castShadow={!lowPower}><icosahedronGeometry args={[1,1]} /><meshStandardMaterial color={index === 1 ? '#efb6ca' : '#e8c1cf'} emissive="#b8708d" emissiveIntensity={.04} roughness={.86} /></mesh>)}
    </group>;
  }
  if (definition.artifact === 'stone-lantern') {
    return <group {...common} position={[x,y,z]} rotation={[0,placement.rotation ?? 0,0]}>
      <mesh position={[0,.28,0]} castShadow={!lowPower}><cylinderGeometry args={[.12,.18,.56,6]} /><meshStandardMaterial color={palette.stone} roughness={1} /></mesh>
      <mesh position={[0,.61,0]} scale={[.22,.15,.22]} castShadow={!lowPower}><boxGeometry args={[1,1,1]} /><meshStandardMaterial color={palette.stoneAlt} roughness={1} /></mesh>
      <mesh position={[0,.64,.12]} scale={.055}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={palette.accentSoft} emissive={palette.accent} emissiveIntensity={.65} roughness={.4} /></mesh>
      {!lowPower ? <pointLight position={[0,.65,.1]} color={palette.accent} intensity={.32} distance={2.2} decay={2} /> : null}
    </group>;
  }
  if (definition.artifact === 'moonstone') {
    return <group {...common} position={[x,y+.26,z]} rotation={[.12,placement.rotation ?? 0,.08]}>
      <mesh scale={[.38,.55,.32]} castShadow={!lowPower}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color={palette.accentSoft} emissive={palette.accent} emissiveIntensity={.24} roughness={.44} /></mesh>
    </group>;
  }
  if (definition.artifact === 'proof-marker') {
    return <group {...common} position={[x,y,z]} rotation={[0,placement.rotation ?? 0,0]}>
      <mesh position={[0,.48,0]} castShadow={!lowPower}><boxGeometry args={[.09,.96,.09]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      <mesh position={[.18,.78,0]} rotation={[0,0,-.08]}><planeGeometry args={[.42,.24]} /><meshStandardMaterial color={palette.accent} side={THREE.DoubleSide} roughness={.75} /></mesh>
    </group>;
  }
  return <group {...common} position={[x,y,z]} rotation={[0,placement.rotation ?? 0,0]}>
    <mesh position={[0,.1,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.32,.07,7,18]} /><meshStandardMaterial color={palette.pathAlt} roughness={1} /></mesh>
    <mesh position={[0,.28,0]} scale={[.2,.28,.2]} castShadow={!lowPower}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color={palette.accentSoft} emissive={palette.accent} emissiveIntensity={.08} roughness={.7} /></mesh>
  </group>;
}

function AchievementArtifacts({ achievements, palette, lowPower, onInteract }: {
  achievements: AchievementDefinition[];
  palette: GardenThemePalette;
  lowPower: boolean;
  onInteract?: (achievement: AchievementDefinition) => void;
}) {
  return <>{achievements.map(definition => <ArtifactObject key={definition.id} definition={definition} palette={palette} lowPower={lowPower} onInteract={onInteract} />)}</>;
}

function SecretLandmarks({ visible, discovered, palette, period, reducedMotion, onInteract }: {
  visible: SanctuarySecretId[];
  discovered: SanctuarySecretId[];
  palette: GardenThemePalette;
  period: SanctuaryDayPeriod;
  reducedMotion: boolean;
  onInteract?: (secret: SanctuarySecretId) => void;
}) {
  const moth = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!moth.current || reducedMotion) return;
    moth.current.rotation.y = clock.elapsedTime * .7;
    moth.current.position.y = Math.sin(clock.elapsedTime * 1.2) * .15;
  });

  return <>{visible.map(id => {
    const secret = sanctuarySecretById[id];
    const [x,z] = secret.position;
    const y = terrainHeight(x,z);
    const found = discovered.includes(id);
    const events = {
      onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); onInteract?.(id); },
      onPointerOver: (event: { stopPropagation: () => void }) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; },
      onPointerOut: () => { document.body.style.cursor = ''; }
    };
    if (id === 'old-cairn') return <group key={id} {...events} position={[x,y,z]} rotation={[0,.4,0]}>
      {[0,.17,.31].map((height,index) => <mesh key={index} position={[0,height,0]} scale={[.32-index*.055,.13,.25-index*.04]} rotation={[index*.1,index*.65,index*.04]} castShadow><dodecahedronGeometry args={[1,0]} /><meshStandardMaterial color={index % 2 ? palette.stoneAlt : palette.stone} roughness={1} /></mesh>)}
      {found ? <mesh position={[0,.52,0]} scale={.04}><sphereGeometry args={[1,6,6]} /><meshBasicMaterial color={palette.accent} toneMapped={false} /></mesh> : null}
    </group>;
    if (id === 'moon-moth') return <group key={id} {...events} position={[x,y+1.2,z]}>
      <group ref={moth}>
        <mesh scale={[.05,.09,.03]}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color={palette.accentSoft} toneMapped={false} /></mesh>
        <mesh position={[-.08,0,0]} rotation={[0,0,.35]} scale={[.11,.035,.02]}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color={palette.accent} transparent opacity={.78} toneMapped={false} /></mesh>
        <mesh position={[.08,0,0]} rotation={[0,0,-.35]} scale={[.11,.035,.02]}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color={palette.accent} transparent opacity={.78} toneMapped={false} /></mesh>
        {period === 'night' && found ? <pointLight color={palette.accent} intensity={.32} distance={2.6} decay={2} /> : null}
      </group>
    </group>;
    return <group key={id} {...events} position={[x,y+.08,z]} rotation={[0,.5,0]}>
      <mesh rotation={[0,0,.3]} scale={[.16,.04,.11]}><octahedronGeometry args={[1,0]} /><meshStandardMaterial color={palette.accentSoft} emissive={found ? palette.accent : '#000000'} emissiveIntensity={found ? .12 : 0} roughness={.75} /></mesh>
      <mesh position={[.12,.03,0]} rotation={[0,0,-.45]} scale={[.13,.025,.08]}><octahedronGeometry args={[1,0]} /><meshStandardMaterial color={palette.accentSoft} roughness={.8} /></mesh>
    </group>;
  })}</>;
}

function SanctuaryFamiliar({ color, design, theme, activity, reducedMotion, onInteract, activeRegion, period, stillnessViewId }: {
  color: FamiliarColor;
  design: FamiliarDesign;
  theme: FamiliarTheme;
  activity: FamiliarActivity;
  reducedMotion: boolean;
  onInteract?: () => void;
  activeRegion?: SanctuaryRegionId | null;
  period: SanctuaryDayPeriod;
  stillnessViewId?: SanctuaryStillViewId | null;
}) {
  const group = useRef<THREE.Group>(null);
  const palette = familiarColors[color];
  const residentStops = useMemo(() => [
    { id: 'guardian-rest', x: -.95, z: .35, yaw: .5 },
    { id: 'watch-koi', x: -5.45, z: 2.0, yaw: -1.15 },
    { id: 'pavilion-step', x: 5.42, z: 2.95, yaw: .88 },
    { id: 'lantern-pause', x: 8.65, z: 1.55, yaw: .72 },
    { id: 'tea-step', x: 9.28, z: 4.35, yaw: .3 },
    { id: 'lookout-rest', x: 6.2, z: -2.75, yaw: -.52 },
    { id: 'grove-return', x: 1.5, z: -2.05, yaw: -1.1 }
  ] as const, []);
  const route = useMemo(() => new THREE.CatmullRomCurve3(
    residentStops.map(stop => new THREE.Vector3(stop.x, 0, stop.z)),
    true,
    'catmullrom',
    .42
  ), [residentStops]);
  const regionRestStop = useMemo<Record<SanctuaryRegionId, number>>(() => ({
    threshold: 0,
    'home-grove': 0,
    'moon-pond': 1,
    'quiet-pavilion': 2,
    lookout: 5
  }), []);
  const roam = useRef({
    phase: 'rest' as 'rest' | 'walk',
    currentIndex: 0,
    previousIndex: -1,
    nextIndex: 0,
    elapsed: 0,
    duration: 6.5,
    fromT: 0,
    deltaT: 0,
    direction: 1 as 1 | -1,
    legsSinceTurn: 0,
    turnAfter: 2
  });
  const routePoint = useMemo(() => new THREE.Vector3(), []);
  const routeTangent = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  const chooseNextResidentStop = (currentIndex: number, previousIndex: number, direction: 1 | -1) => {
    const count = residentStops.length;
    const attentionIndex = activeRegion ? regionRestStop[activeRegion] : -1;
    const weighted = residentStops.map((stop, index) => {
      if (index === currentIndex || index === previousIndex) return 0;
      const forwardSteps = direction === 1
        ? (index - currentIndex + count) % count
        : (currentIndex - index + count) % count;
      if (forwardSteps === 0 || forwardSteps > 3) return 0;
      let weight = forwardSteps === 1 ? 6.4 : forwardSteps === 2 ? 1.45 : .18;

      // Roaming is random, but it commits to a direction for a few legs before turning around.
      if (index === attentionIndex) weight *= activity === 'lively' ? 1.18 : 1.38;

      if (period === 'night') {
        if (stop.id === 'lantern-pause' || stop.id === 'tea-step' || stop.id === 'pavilion-step') weight *= 1.3;
        if (stop.id === 'watch-koi') weight *= .72;
      } else {
        if (stop.id === 'watch-koi' || stop.id === 'guardian-rest' || stop.id === 'grove-return') weight *= 1.18;
      }
      return weight;
    });
    const total = weighted.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    for (let index = 0; index < weighted.length; index += 1) {
      roll -= weighted[index];
      if (roll <= 0 && weighted[index] > 0) return index;
    }
    return (currentIndex + direction + count) % count;
  };

  const residentRestDuration = (stopId: string) => {
    const lively = activity === 'lively';
    const base = lively ? 4.2 + Math.random() * 3.8 : 7.5 + Math.random() * 6.5;
    const nightBias = period === 'night' ? (lively ? 1.5 : 3.5) + Math.random() * 3.5 : 0;
    const interactionBias = stopId === 'watch-koi' || stopId === 'lantern-pause' || stopId === 'tea-step'
      ? 2.2 + Math.random() * 3.4
      : 0;
    return base + nightBias + interactionBias;
  };

  const residentWalkSpeed = () => {
    const base = activity === 'lively' ? .52 : .38;
    return period === 'night' ? base * .78 : base;
  };
  const restAnchors = useMemo<Record<SanctuaryStillViewId, [number, number, number]>>(() => ({
    'pond-edge': [-5.45, 1.38, 2.0],
    'pavilion-veranda': [5.42, 1.16, 2.95],
    'mountain-view': [-.85, 1.02, -2.05],
    'guardian-grove': [-.95, 1.02, .35],
    'lantern-street': [8.65, 1.1, 1.55],
    'tea-house': [9.35, 1.04, 4.35]
  }), []);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const elapsed = clock.elapsedTime;
    const frameDelta = Math.min(delta, .05);
    const fixedRest = reducedMotion || activity === 'still' || Boolean(stillnessViewId);
    const residentRoam = roam.current;

    if (!fixedRest) {
      residentRoam.elapsed += frameDelta;
      if (residentRoam.phase === 'rest' && residentRoam.elapsed >= residentRoam.duration) {
        const lingerChance = activity === 'lively' ? .12 : .28;
        if (Math.random() < lingerChance) {
          residentRoam.elapsed = 0;
          residentRoam.duration = residentRestDuration(residentStops[residentRoam.currentIndex].id) * .55;
        } else {
          if (residentRoam.legsSinceTurn >= residentRoam.turnAfter) {
            residentRoam.direction = residentRoam.direction === 1 ? -1 : 1;
            residentRoam.legsSinceTurn = 0;
            residentRoam.turnAfter = 2 + Math.floor(Math.random() * 3);
          }
          const destinationIndex = chooseNextResidentStop(residentRoam.currentIndex, residentRoam.previousIndex, residentRoam.direction);
          const fromT = residentRoam.currentIndex / residentStops.length;
          const toT = destinationIndex / residentStops.length;
          let deltaT = toT - fromT;
          if (residentRoam.direction === 1 && deltaT <= 0) deltaT += 1;
          if (residentRoam.direction === -1 && deltaT >= 0) deltaT -= 1;

          const routeDistance = route.getLength() * Math.abs(deltaT);
          residentRoam.phase = 'walk';
          residentRoam.nextIndex = destinationIndex;
          residentRoam.fromT = fromT;
          residentRoam.deltaT = deltaT;
          residentRoam.elapsed = 0;
          residentRoam.duration = Math.max(6.5, routeDistance / residentWalkSpeed());
          residentRoam.legsSinceTurn += 1;
        }
      } else if (residentRoam.phase === 'walk' && residentRoam.elapsed >= residentRoam.duration) {
        residentRoam.previousIndex = residentRoam.currentIndex;
        residentRoam.currentIndex = residentRoam.nextIndex;
        residentRoam.phase = 'rest';
        residentRoam.elapsed = 0;
        residentRoam.duration = residentRestDuration(residentStops[residentRoam.currentIndex].id);
      }
    }

    const walking = !fixedRest && residentRoam.phase === 'walk';
    const walkProgress = walking
      ? THREE.MathUtils.clamp(residentRoam.elapsed / Math.max(.001, residentRoam.duration), 0, 1)
      : 1;
    const easedWalk = THREE.MathUtils.smootherstep(walkProgress, 0, 1);
    const routeT = walking
      ? ((residentRoam.fromT + residentRoam.deltaT * easedWalk) % 1 + 1) % 1
      : residentRoam.currentIndex / residentStops.length;
    route.getPoint(routeT, routePoint);
    route.getTangent(routeT, routeTangent);
    if (walking && residentRoam.deltaT < 0) routeTangent.multiplyScalar(-1);
    const destinationStop = residentStops[walking ? residentRoam.nextIndex : residentRoam.currentIndex];

    let px = routePoint.x;
    let pz = routePoint.z;
    let restingYaw: number = destinationStop.yaw;
    let restingId: string = destinationStop.id;
    if (stillnessViewId) {
      const anchor = restAnchors[stillnessViewId];
      px = anchor[0];
      pz = anchor[2];
      restingYaw = .32;
      restingId = stillnessViewId;
    } else if (fixedRest) {
      const stopIndex = activeRegion ? regionRestStop[activeRegion] : residentRoam.currentIndex;
      const stop = residentStops[stopIndex];
      px = stop.x;
      pz = stop.z;
      restingYaw = stop.yaw;
      restingId = stop.id;
    } else if (!walking) {
      px = destinationStop.x;
      pz = destinationStop.z;
    } else if (activeRegion && activeRegion !== 'home-grove') {
      const region = sanctuaryRegionById[activeRegion];
      const attention = activity === 'lively' ? .1 : .065;
      px = THREE.MathUtils.lerp(px, region.position[0], attention);
      pz = THREE.MathUtils.lerp(pz, region.position[2], attention);
    }

    const ground = terrainHeight(px, pz);
    const bodyHeight = design === 'mossling' ? .27 : design === 'wisp' ? .34 : .3;
    const walkRate = activity === 'lively' ? 5.2 : 4.0;
    const stride = walking && !reducedMotion ? Math.sin(elapsed * walkRate) : 0;
    const bob = walking && !reducedMotion ? Math.abs(stride) * .035 : 0;

    let idleLift = 0;
    let targetPitch = 0;
    let targetRoll = walking && !reducedMotion ? stride * .035 : 0;
    let yawOffset = 0;
    let restSquash = 0;

    if (!walking && !reducedMotion) {
      const slow = Math.sin(elapsed * .72);
      if (restingId === 'watch-koi' || restingId === 'pond-edge') {
        targetPitch = .085 + Math.max(0, Math.sin(elapsed * .46)) * .025;
        yawOffset = Math.sin(elapsed * .38) * .055;
        idleLift = Math.max(0, slow) * .008;
      } else if (restingId === 'lantern-pause' || restingId === 'lantern-street') {
        targetPitch = -.035;
        targetRoll = Math.sin(elapsed * .55) * .025;
        yawOffset = Math.sin(elapsed * .31) * .09;
        idleLift = Math.max(0, slow) * .012;
      } else if (restingId === 'tea-step' || restingId === 'tea-house' || restingId === 'pavilion-step' || restingId === 'pavilion-veranda') {
        targetPitch = .018;
        targetRoll = Math.sin(elapsed * .42) * .014;
        restSquash = .025 + Math.sin(elapsed * 1.05) * .006;
      } else if (restingId === 'guardian-rest' || restingId === 'guardian-grove' || restingId === 'grove-return' || restingId === 'mountain-view') {
        targetPitch = Math.sin(elapsed * .36) * .02;
        yawOffset = Math.sin(elapsed * .27) * .075;
        restSquash = .018 + Math.max(0, Math.sin(elapsed * .5)) * .018;
      } else if (restingId === 'lookout-rest') {
        yawOffset = Math.sin(elapsed * .32) * .16;
        targetRoll = Math.sin(elapsed * .47) * .012;
      }
    }

    targetPosition.set(px, ground + bodyHeight + bob + idleLift, pz);
    const positionLambda = reducedMotion ? 100 : walking ? 13 : 5.2;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, targetPosition.x, positionLambda, frameDelta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetPosition.y, reducedMotion ? 100 : walking ? 11 : 5.2, frameDelta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, targetPosition.z, positionLambda, frameDelta);

    const desiredYaw = (walking ? Math.atan2(routeTangent.x, routeTangent.z) : restingYaw) + yawOffset;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, desiredYaw, reducedMotion ? 100 : walking ? 7.5 : 4.4, frameDelta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetPitch, reducedMotion ? 100 : 5.5, frameDelta);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, targetRoll, reducedMotion ? 100 : 6.2, frameDelta);

    const restingScale = walking ? 1 : design === 'wisp' ? .92 : .84;
    const breathe = reducedMotion ? 0 : Math.sin(elapsed * 1.2) * .014;
    const targetScaleX = 1 + breathe * .35 + restSquash * .34;
    const targetScaleY = restingScale - breathe - restSquash;
    const targetScaleZ = 1 + breathe * .35 + restSquash * .34;
    group.current.scale.x = THREE.MathUtils.damp(group.current.scale.x, targetScaleX, reducedMotion ? 100 : 5.2, frameDelta);
    group.current.scale.y = THREE.MathUtils.damp(group.current.scale.y, targetScaleY, reducedMotion ? 100 : 5.2, frameDelta);
    group.current.scale.z = THREE.MathUtils.damp(group.current.scale.z, targetScaleZ, reducedMotion ? 100 : 5.2, frameDelta);
  });
  const bodyScale: [number, number, number] = design === 'mossling' ? [.3,.24,.28] : design === 'wisp' ? [.24,.24,.24] : [.25,.27,.24];
  const bodyColor = theme === 'terracotta'
    ? '#b86f52'
    : theme === 'moss'
      ? '#5f7658'
      : theme === 'minimal'
        ? new THREE.Color(palette.body).multiplyScalar(.43).getStyle()
        : theme === 'dream'
          ? new THREE.Color(palette.body).lerp(new THREE.Color('#eef2f5'), .38).getStyle()
          : palette.body;
  const bodyRoughness = theme === 'moss' ? 1 : theme === 'terracotta' ? .92 : theme === 'minimal' ? .95 : theme === 'dream' ? .3 : design === 'wisp' ? .46 : .58;
  const bodyMetalness = theme === 'dream' ? .08 : 0;
  const bodyEmission = theme === 'dream' ? .24 : theme === 'moss' ? .05 : .11;
  const glow = theme === 'dream' ? (period === 'night' ? .72 : .42) : theme === 'minimal' ? .14 : period === 'night' ? .48 : .3;
  const showLeaves = design !== 'wisp' || theme !== 'minimal';
  const showWisps = theme !== 'minimal';

  return (
    <group
      ref={group}
      onClick={event => { event.stopPropagation(); onInteract?.(); }}
      onPointerOver={event => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <mesh castShadow scale={bodyScale}>
        <icosahedronGeometry args={[1, design === 'wisp' ? 2 : 1]} />
        <meshStandardMaterial color={bodyColor} emissive={palette.glow} emissiveIntensity={bodyEmission} roughness={bodyRoughness} metalness={bodyMetalness} />
      </mesh>
      <mesh position={[0,-.055,-.24]} rotation={[.18,0,0]} scale={design === 'mossling' ? [.13,.12,.24] : [.10,.09,.19]} castShadow>
        <sphereGeometry args={[1,10,7]} />
        <meshStandardMaterial color={bodyColor} emissive={palette.glow} emissiveIntensity={bodyEmission * .55} roughness={Math.max(.52, bodyRoughness)} metalness={bodyMetalness} transparent={false} opacity={1} />
      </mesh>
      {showLeaves ? <>
        <mesh position={[-.22,.1,.01]} rotation={[0,0,.72]} scale={design === 'mossling' ? [.25,.08,.13] : [.2,.065,.1]}>
          <sphereGeometry args={[1,10,7]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={.08} roughness={.72} />
        </mesh>
        <mesh position={[.22,.1,.01]} rotation={[0,0,-.72]} scale={design === 'mossling' ? [.25,.08,.13] : [.2,.065,.1]}>
          <sphereGeometry args={[1,10,7]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={.08} roughness={.72} />
        </mesh>
      </> : null}
      {design === 'mossling' ? <mesh position={[0,-.17,0]} scale={[.28,.09,.24]}><sphereGeometry args={[1,10,7]} /><meshStandardMaterial color={bodyColor} roughness={Math.max(.72, bodyRoughness)} metalness={bodyMetalness} /></mesh> : null}
      <mesh position={[-.075,.035,.215]} scale={.028}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color="#223027" /></mesh>
      <mesh position={[.075,.035,.215]} scale={.028}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color="#223027" /></mesh>
      {showWisps ? <>
        <mesh position={[-.36,.28,.05]} scale={.035}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color={palette.glow} transparent opacity={theme === 'dream' ? .75 : .46} toneMapped={false} /></mesh>
        <mesh position={[.34,.36,-.04]} scale={.026}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color={palette.glow} transparent opacity={theme === 'dream' ? .64 : .36} toneMapped={false} /></mesh>
      </> : null}
      <pointLight color={palette.glow} intensity={glow} distance={theme === 'dream' ? 3.2 : 2.4} decay={2} />
    </group>
  );
}


function RegionHotspot({ region, active, onFocus, onHover }: {
  region: SanctuaryRegionId;
  active: boolean;
  onFocus: (region: SanctuaryRegionId) => void;
  onHover: (region: SanctuaryRegionId | null) => void;
}) {
  const definition = sanctuaryRegionById[region];
  const [x, , z] = definition.position;
  const y = terrainHeight(x, z) + .05;
  return (
    <group position={[x,y,z]}>
      <mesh
        rotation={[-Math.PI / 2,0,0]}
        onClick={event => { event.stopPropagation(); onFocus(region); }}
        onPointerOver={event => { event.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(region); }}
        onPointerOut={() => { document.body.style.cursor = ''; onHover(null); }}
      >
        <circleGeometry args={[region === 'home-grove' ? 2.2 : 1.5,24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active ? (
        <mesh position={[0,.02,0]} rotation={[-Math.PI / 2,0,0]}>
          <ringGeometry args={[.52,.6,32]} />
          <meshBasicMaterial color="#efe0b7" transparent opacity={.55} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function CameraRig({
  pose,
  goal,
  target,
  targetGoal,
  transition,
  dragging,
  inertia,
  reducedMotion,
  cinematicDrift = false
}: {
  pose: React.MutableRefObject<CameraPose>;
  goal: React.MutableRefObject<CameraPose>;
  target: React.MutableRefObject<THREE.Vector3>;
  targetGoal: React.MutableRefObject<THREE.Vector3>;
  transition: React.MutableRefObject<CameraTransition>;
  dragging: React.MutableRefObject<boolean>;
  inertia: React.MutableRefObject<{ yaw: number; pitch: number }>;
  reducedMotion: boolean;
  cinematicDrift?: boolean;
}) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, .05);
    const travel = transition.current;

    if (reducedMotion && travel.active) {
      pose.current = { ...travel.toPose };
      target.current.copy(travel.toTarget);
      goal.current = { ...travel.toPose };
      targetGoal.current.copy(travel.toTarget);
      travel.active = false;
    }

    if (travel.active && !reducedMotion) {
      travel.elapsed += dt;
      const progress = THREE.MathUtils.clamp(travel.elapsed / travel.duration, 0, 1);
      const targetProgress = THREE.MathUtils.smoothstep(Math.min(1, progress * 1.14), 0, 1);
      const poseProgress = THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((progress - .055) / .945, 0, 1), 0, 1);

      pose.current.yaw = THREE.MathUtils.lerp(travel.fromPose.yaw, travel.toPose.yaw, poseProgress);
      pose.current.pitch = THREE.MathUtils.lerp(travel.fromPose.pitch, travel.toPose.pitch, poseProgress);
      pose.current.distance = THREE.MathUtils.lerp(travel.fromPose.distance, travel.toPose.distance, poseProgress);
      target.current.lerpVectors(travel.fromTarget, travel.toTarget, targetProgress);

      if (progress >= 1) {
        pose.current = { ...travel.toPose };
        target.current.copy(travel.toTarget);
        goal.current = { ...travel.toPose };
        targetGoal.current.copy(travel.toTarget);
        travel.active = false;
      }
    } else {
      if (!reducedMotion && !dragging.current) {
        goal.current.yaw += inertia.current.yaw * dt;
        goal.current.pitch = THREE.MathUtils.clamp(goal.current.pitch + inertia.current.pitch * dt, CAMERA_MIN_PITCH, .5);
        inertia.current.yaw = THREE.MathUtils.damp(inertia.current.yaw, 0, 7.2, dt);
        inertia.current.pitch = THREE.MathUtils.damp(inertia.current.pitch, 0, 8.8, dt);
      } else if (reducedMotion) {
        inertia.current.yaw = 0;
        inertia.current.pitch = 0;
      }

      if (dragging.current && !reducedMotion) {
        // Direct manipulation should stay under the pointer. Smoothing the goal, pose,
        // and final camera transform at the same time made orbiting feel one beat late.
        pose.current.yaw = goal.current.yaw;
        pose.current.pitch = goal.current.pitch;
        pose.current.distance = goal.current.distance;
        target.current.copy(targetGoal.current);
      } else {
        const poseLambda = reducedMotion ? 100 : 9.5;
        const targetLambda = reducedMotion ? 100 : 8.5;
        pose.current.yaw = THREE.MathUtils.damp(pose.current.yaw, goal.current.yaw, poseLambda, dt);
        pose.current.pitch = THREE.MathUtils.damp(pose.current.pitch, goal.current.pitch, poseLambda, dt);
        pose.current.distance = THREE.MathUtils.damp(pose.current.distance, goal.current.distance, reducedMotion ? 100 : 10.5, dt);
        target.current.x = THREE.MathUtils.damp(target.current.x, targetGoal.current.x, targetLambda, dt);
        target.current.y = THREE.MathUtils.damp(target.current.y, targetGoal.current.y, targetLambda, dt);
        target.current.z = THREE.MathUtils.damp(target.current.z, targetGoal.current.z, targetLambda, dt);
      }
    }

    const cp = Math.cos(pose.current.pitch);
    desired.set(
      target.current.x + Math.sin(pose.current.yaw) * cp * pose.current.distance,
      target.current.y + Math.sin(pose.current.pitch) * pose.current.distance,
      target.current.z + Math.cos(pose.current.yaw) * cp * pose.current.distance
    );
    const cameraT = reducedMotion || dragging.current
      ? 1
      : travel.active
        ? 1 - Math.exp(-16 * dt)
        : 1 - Math.exp(-18 * dt);
    if (cinematicDrift && !reducedMotion && !dragging.current && !travel.active) {
      desired.x += Math.sin(clock.elapsedTime * .055) * .11;
      desired.y += Math.sin(clock.elapsedTime * .041) * .045;
      desired.z += Math.cos(clock.elapsedTime * .047) * .08;
    }
    desired.y = Math.max(desired.y, cameraFloorHeight(desired.x, desired.z));
    camera.position.lerp(desired, cameraT);
    camera.position.y = Math.max(camera.position.y, cameraFloorHeight(camera.position.x, camera.position.z));
    camera.lookAt(target.current);
  });

  return null;
}
function SanctuaryScene({
  growth,
  stageIndex,
  livingState = emptySanctuaryLivingState(),
  reducedMotion = false,
  familiarEnabled = true,
  familiarColor,
  familiarDesign,
  familiarTheme,
  familiarActivity,
  interactionMode = 'explore',
  stillnessViewId = null,
  activeRegion,
  onFocus,
  onHover,
  onFamiliarInteract,
  onStillnessRequest,
  onTeaHouseInteract,
  onFreeExploreExit,
  theme = 'verdant-sanctuary',
  period = 'day',
  dayProgress = .5,
  unlockedAchievements = [],
  visibleSecrets = [],
  discoveredSecrets = [],
  onArtifactInteract,
  onSecretInteract,
  pose,
  goal,
  target,
  targetGoal,
  transition,
  dragging,
  inertia,
  lowPower
}: SanctuaryWorldProps & {
  activeRegion: SanctuaryRegionId | null;
  onFocus: (region: SanctuaryRegionId) => void;
  onHover: (region: SanctuaryRegionId | null) => void;
  pose: React.MutableRefObject<CameraPose>;
  goal: React.MutableRefObject<CameraPose>;
  target: React.MutableRefObject<THREE.Vector3>;
  targetGoal: React.MutableRefObject<THREE.Vector3>;
  transition: React.MutableRefObject<CameraTransition>;
  dragging: React.MutableRefObject<boolean>;
  inertia: React.MutableRefObject<{ yaw: number; pitch: number }>;
  lowPower: boolean;
}) {
  const themeDefinition = getGardenTheme(theme);
  const palette = themeDefinition.periods[period];
  const isNight = period === 'night';
  const isDusk = period === 'dusk';
  const safeGrowth = Number.isFinite(growth) && growth > 0 ? growth : 0;
  const normalizedGrowth = Math.min(1, Math.sqrt(safeGrowth / 800));
  const normalizedStage = Math.min(1, Math.max(0, stageIndex / 7));
  // Reward growth moves the Guardian Tree continuously, while stage thresholds keep
  // the long-term silhouette aligned with the named Garden stages.
  const guardianScale = .46 + Math.min(1, normalizedGrowth * .72 + normalizedStage * .28) * .54;
  const guardianY = terrainHeight(.2, -.5);
  const pavilionY = terrainHeight(6.6, 3.4);
  const gateY = terrainHeight(0, 8.4);
  const pondY = terrainHeight(-7, 2.7) + .12;

  return (
    <>
      <SkyDome palette={palette} />
      <fog attach="fog" args={[palette.fog, isNight ? 17 : isDusk ? 18 : 19, isNight ? 38 : isDusk ? 42 : 45]} />
      <CameraRig pose={pose} goal={goal} target={target} targetGoal={targetGoal} transition={transition} dragging={dragging} inertia={inertia} reducedMotion={Boolean(reducedMotion)} cinematicDrift={interactionMode === 'stillness'} />

      <AtmosphericLightRig palette={palette} period={period} dayProgress={dayProgress} lowPower={lowPower} />

      {/* Beyond the garden there is no authored terrestrial scene: only mist, sky, and ambient life. */}
      <BoundaryMist palette={palette} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} />
      <BirdFlock palette={palette} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} />
      <Terrain lowPower={lowPower} palette={palette} />
      <PathRibbon points={[[0,9.2],[.2,6.4],[-.5,3.6],[.1,.7]]} width={1.02} color={palette.path} />
      <PathRibbon points={[[.2,.5],[-2.7,1.2],[-4.6,2.4],[-5.2,3.1]]} width={.72} color={palette.pathAlt} />
      <PathRibbon points={[[.6,.4],[2.8,1.2],[4.8,2.6],[6.3,3.3]]} width={.76} color={palette.pathAlt} />
      <PathRibbon points={[[.4,-.7],[2.5,-2.4],[4.3,-4.2],[6.2,-5.7]]} width={.68} color={palette.path} />

      <GardenStream palette={palette} lowPower={lowPower} />
      <Pond reducedMotion={Boolean(reducedMotion)} palette={palette} lowPower={lowPower} period={period} />
      <SanctuaryTimeLife period={period} palette={palette} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} pondY={pondY} />
      <PondBridge palette={palette} lowPower={lowPower} />
      <QuietStreet palette={palette} period={period} lowPower={lowPower} onTeaHouseInteract={interactionMode === 'explore' ? onTeaHouseInteract : undefined} />
      <BlossomGrove palette={palette} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} />
      <ForegroundFraming palette={palette} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} />
      <DriftingLeaves theme={theme} palette={palette} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} />
      <ScenicSeats palette={palette} lowPower={lowPower} onSit={interactionMode === 'explore' ? onStillnessRequest : undefined} />
      <TreeLine lowPower={lowPower} palette={palette} />
      <GroundDetails lowPower={lowPower} palette={palette} reducedMotion={reducedMotion} />
      <RockScatter lowPower={lowPower} palette={palette} />
      <AmbientMotes reducedMotion={Boolean(reducedMotion)} lowPower={lowPower} palette={palette} />
      <ThemeWeather theme={theme} palette={palette} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} />
      <ThemeEnvironment theme={theme} palette={palette} period={period} lowPower={lowPower} reducedMotion={Boolean(reducedMotion)} />
      {isNight ? <NightStars palette={palette} lowPower={lowPower} /> : null}
      <ThresholdLife tier={livingState.threshold.tier} lowPower={lowPower} palette={palette} />
      <HomeGroveLife state={livingState.homeGrove} lowPower={lowPower} palette={palette} />
      <MoonPondLife state={livingState.moonPond} reducedMotion={Boolean(reducedMotion)} lowPower={lowPower} palette={palette} />
      <PavilionMemoryTraces state={livingState.quietPavilion} reducedMotion={Boolean(reducedMotion)} lowPower={lowPower} palette={palette} />
      <LookoutDevelopment state={livingState.lookout} lowPower={lowPower} palette={palette} />

      <SanctuaryAsset src={sanctuaryAssetUrls.waystoneGate} position={[0, gateY, 8.35]} scale={.92} tint={palette.accent} tintStrength={.08} />
      <SanctuaryAsset src={sanctuaryAssetUrls.guardianTree} position={[.2, guardianY, -.5]} scale={guardianScale} rotation={[0,-.28,0]} tint={palette.shrubAccent} tintStrength={.1} />
      <PavilionGarden palette={palette} period={period} lowPower={lowPower} />
      <SanctuaryAsset src={sanctuaryAssetUrls.quietPavilion} position={[6.6, pavilionY, 3.4]} scale={.92} rotation={[0,-.56,0]} tint={palette.accent} tintStrength={.1} />
      <AchievementArtifacts achievements={unlockedAchievements} palette={palette} lowPower={lowPower} onInteract={onArtifactInteract} />
      <SecretLandmarks visible={visibleSecrets} discovered={discoveredSecrets} palette={palette} period={period} reducedMotion={Boolean(reducedMotion)} onInteract={onSecretInteract} />

      <group position={[6.5, terrainHeight(6.5,-6.1) + .28, -6.1]} rotation={[0,-.35,0]}>
        <mesh castShadow receiveShadow scale={[2.4,.36,1.55]}>
          <dodecahedronGeometry args={[1,1]} />
          <meshStandardMaterial color={palette.stone} roughness={1} />
        </mesh>
        <mesh position={[0,1.05,0]} rotation={[0,.2,0]} castShadow>
          <boxGeometry args={[1.5,.13,.38]} />
          <meshStandardMaterial color={palette.trunk} roughness={1} />
        </mesh>
        <mesh position={[-.55,.62,0]} castShadow><boxGeometry args={[.12,.9,.12]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
        <mesh position={[.55,.62,0]} castShadow><boxGeometry args={[.12,.9,.12]} /><meshStandardMaterial color={palette.trunk} roughness={1} /></mesh>
      </group>

      {familiarEnabled ? <SanctuaryFamiliar color={familiarColor ?? 'mint'} design={familiarDesign ?? 'sprout'} theme={familiarTheme ?? 'natural'} activity={familiarActivity ?? 'calm'} reducedMotion={Boolean(reducedMotion)} onInteract={onFamiliarInteract} activeRegion={activeRegion} period={period} stillnessViewId={stillnessViewId} /> : null}

      {interactionMode === 'explore' ? (['threshold','home-grove','moon-pond','quiet-pavilion','lookout'] as SanctuaryRegionId[]).map(region => (
        <RegionHotspot key={region} region={region} active={activeRegion === region} onFocus={onFocus} onHover={onHover} />
      )) : null}

      <group position={[-11.5, terrainHeight(-11.5,-8.6) + 1.2, -8.6]}>
        <mesh scale={[5.3,1.45,3.2]} rotation={[0,.25,0]} receiveShadow>
          <dodecahedronGeometry args={[1,1]} />
          <meshStandardMaterial color={palette.groundAlt[1]} roughness={1} />
        </mesh>
      </group>
      <group position={[12, terrainHeight(12,-9) + 1.6, -9]}>
        <mesh scale={[6.1,1.9,3.7]} rotation={[0,-.18,0]} receiveShadow>
          <dodecahedronGeometry args={[1,1]} />
          <meshStandardMaterial color={palette.groundAlt[0]} roughness={1} />
        </mesh>
      </group>

      <group position={[0,0,-12.8]}>
        {Array.from({ length: 9 }, (_, index) => {
          const x = -12 + index * 3;
          const z = -1 + Math.sin(index * .8) * .7;
          return <StylizedTree key={index} position={[x, terrainHeight(x,-12.8+z), z]} scale={1.4 + (index % 3) * .25} variant={index+40} lowPower={lowPower} palette={palette} />;
        })}
      </group>

      {/* Keep the prototype continuity visible without turning growth into a HUD. */}
      <mesh visible={growth > 0} position={[.2, guardianY + .025, -.5]} rotation={[-Math.PI / 2,0,0]}>
        <ringGeometry args={[1.1 * guardianScale,1.18 * guardianScale,36]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={.12} toneMapped={false} />
      </mesh>
    </>
  );
}

export function SanctuaryWorld({
  growth,
  stageIndex,
  livingState = emptySanctuaryLivingState(),
  reducedMotion = false,
  familiarEnabled = true,
  familiarColor = 'mint',
  familiarDesign = 'sprout',
  familiarTheme = 'natural',
  familiarActivity = 'calm',
  familiarName = 'Familiar',
  requestedRegion = null,
  requestedRegionKey = 0,
  requestedCamera = null,
  requestedCameraKey = 0,
  interactionMode = 'explore',
  freeExplore = false,
  stillnessViewId = null,
  onRegionFocus,
  onRegionHover,
  onFamiliarInteract,
  onStillnessRequest,
  onTeaHouseInteract,
  onFreeExploreExit,
  theme = 'verdant-sanctuary',
  period = 'day',
  dayProgress = .5,
  quality = 'auto',
  unlockedAchievements = [],
  visibleSecrets = [],
  discoveredSecrets = [],
  onArtifactInteract,
  onSecretInteract
}: SanctuaryWorldProps) {
  const initial = sanctuaryHomeCamera;
  const pose = useRef<CameraPose>({ yaw: initial.yaw, pitch: initial.pitch, distance: initial.distance });
  const goal = useRef<CameraPose>({ yaw: initial.yaw, pitch: initial.pitch, distance: initial.distance });
  const target = useRef(new THREE.Vector3(...initial.target));
  const targetGoal = useRef(new THREE.Vector3(...initial.target));
  const transition = useRef<CameraTransition>({
    active: false,
    elapsed: 0,
    duration: 0,
    fromPose: { yaw: initial.yaw, pitch: initial.pitch, distance: initial.distance },
    fromTarget: new THREE.Vector3(...initial.target),
    toPose: { yaw: initial.yaw, pitch: initial.pitch, distance: initial.distance },
    toTarget: new THREE.Vector3(...initial.target)
  });
  const dragging = useRef(false);
  const inertia = useRef({ yaw: 0, pitch: 0 });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; lastX: number; lastY: number; lastTime: number } | null>(null);
  const pointers = useRef(new Map<number, PointerPoint>());
  const pinch = useRef<{ distance: number; cameraDistance: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [detectedLowPower, setDetectedLowPower] = useState(() => detectLowPower());
  const resolvedQuality = resolveSanctuaryQuality(quality, detectedLowPower);
  const lowPower = resolvedQuality === 'balanced';
  const [renderActive, setRenderActive] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const [webglAvailable] = useState(() => supportsWebGL());
  const [activeRegion, setActiveRegion] = useState<SanctuaryRegionId | null>('home-grove');

  useEffect(() => { preloadSanctuaryAssets(); }, []);

  useEffect(() => {
    if (!freeExplore || interactionMode === 'stillness') return;
    // The Explore toggle lives outside the canvas. Move focus into the world so
    // WASD works immediately instead of requiring a second click on the scene.
    rootRef.current?.focus({ preventScroll: true });
  }, [freeExplore, interactionMode]);

  useEffect(() => {
    const handleResize = () => setDetectedLowPower(detectLowPower());
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    let inView = true;
    let pageVisible = document.visibilityState !== 'hidden';
    const commit = () => setRenderActive(inView && pageVisible);
    const observer = new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting ?? true;
      commit();
    }, { threshold: .02 });
    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden';
      commit();
    };
    observer.observe(root);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const cancelCameraTransition = () => {
    if (!transition.current.active) return;
    transition.current.active = false;
    goal.current = { ...pose.current };
    targetGoal.current.copy(target.current);
    inertia.current.yaw = 0;
    inertia.current.pitch = 0;
  };

  const applyCamera = (preset: SanctuaryCameraPreset, options: { immediate?: boolean; cinematic?: boolean } = {}) => {
    const { immediate = false, cinematic = false } = options;
    inertia.current.yaw = 0;
    inertia.current.pitch = 0;
    goal.current = { yaw: preset.yaw, pitch: preset.pitch, distance: preset.distance };
    targetGoal.current.set(...preset.target);
    if (immediate || reducedMotion) {
      transition.current.active = false;
      pose.current = { ...goal.current };
      target.current.copy(targetGoal.current);
    } else if (cinematic) {
      transition.current = {
        active: true,
        elapsed: 0,
        duration: 1.95,
        fromPose: { ...pose.current },
        fromTarget: target.current.clone(),
        toPose: { ...goal.current },
        toTarget: targetGoal.current.clone()
      };
    } else {
      transition.current.active = false;
    }
  };

  const focusRegion = (region: SanctuaryRegionId) => {
    setActiveRegion(region);
    applyCamera(sanctuaryRegionById[region].camera);
    onRegionFocus?.(region);
  };

  useEffect(() => {
    if (requestedRegion) focusRegion(requestedRegion);
    // Parent uses requestedRegion as an explicit navigation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedRegion, requestedRegionKey]);

  useEffect(() => {
    if (requestedCamera) {
      setActiveRegion(null);
      applyCamera(requestedCamera, { cinematic: true });
    }
    // The key lets the same stillness view intentionally recenter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedCamera, requestedCameraKey]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (event: WheelEvent) => {
      if (interactionMode === 'stillness') return;
      if (!freeExplore && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      cancelCameraTransition();
      const next = THREE.MathUtils.clamp(goal.current.distance + event.deltaY * .008, 5.5, 17.5);
      goal.current.distance = next;
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [freeExplore, interactionMode]);

  const updatePinch = () => {
    const points = Array.from(pointers.current.values());
    if (points.length < 2) { pinch.current = null; return false; }
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    if (!pinch.current) {
      pinch.current = { distance, cameraDistance: goal.current.distance };
      return true;
    }
    const ratio = pinch.current.distance / Math.max(distance, 30);
    goal.current.distance = THREE.MathUtils.clamp(pinch.current.cameraDistance * ratio, 5.5, 17.5);
    return true;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode === 'stillness') return;
    if ((event.target as HTMLElement).closest('button')) return;
    cancelCameraTransition();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    inertia.current.yaw = 0;
    inertia.current.pitch = 0;
    dragging.current = true;
    if (pointers.current.size === 1) {
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      drag.current = { x: event.clientX, y: event.clientY, yaw: goal.current.yaw, pitch: goal.current.pitch, lastX: event.clientX, lastY: event.clientY, lastTime: now };
    } else {
      drag.current = null;
      updatePinch();
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode === 'stillness' || !pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) { updatePinch(); return; }
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    goal.current.yaw = state.yaw - dx * .0054;
    goal.current.pitch = THREE.MathUtils.clamp(state.pitch + dy * .0037, CAMERA_MIN_PITCH, .5);

    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    const dt = Math.max(12, now - state.lastTime) / 1000;
    const stepX = event.clientX - state.lastX;
    const stepY = event.clientY - state.lastY;
    inertia.current.yaw = THREE.MathUtils.clamp((-stepX * .0054 / dt) * .16, -1.35, 1.35);
    inertia.current.pitch = THREE.MathUtils.clamp((stepY * .0037 / dt) * .11, -.65, .65);
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.lastTime = now;
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      dragging.current = false;
      drag.current = null;
      pinch.current = null;
    } else if (pointers.current.size === 1) {
      const point = Array.from(pointers.current.values())[0];
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      drag.current = { x: point.x, y: point.y, yaw: goal.current.yaw, pitch: goal.current.pitch, lastX: point.x, lastY: point.y, lastTime: now };
      pinch.current = null;
    }
  };

  const nudgeExplore = (forward: number, right: number) => {
    if (!freeExplore || interactionMode === 'stillness') return;
    cancelCameraTransition();
    const yaw = goal.current.yaw;
    const step = .82;
    const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * step;
    const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * step;
    let nextX = targetGoal.current.x + dx;
    let nextZ = targetGoal.current.z + dz;
    const radius = Math.hypot(nextX, nextZ);
    if (radius > SANCTUARY_EXPLORE_RADIUS) {
      const scale = SANCTUARY_EXPLORE_RADIUS / radius;
      nextX *= scale;
      nextZ *= scale;
    }
    const nextY = Math.max(.28, terrainHeight(nextX, nextZ) + .62);
    targetGoal.current.set(nextX, nextY, nextZ);
    setActiveRegion(null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactionMode === 'stillness') return;
    cancelCameraTransition();
    const key = event.key.toLowerCase();
    if (freeExplore && event.key === 'Escape') {
      event.preventDefault();
      onFreeExploreExit?.();
    } else if (freeExplore && ['w', 'a', 's', 'd'].includes(key)) {
      event.preventDefault();
      if (key === 'w') nudgeExplore(1, 0);
      if (key === 's') nudgeExplore(-1, 0);
      if (key === 'a') nudgeExplore(0, -1);
      if (key === 'd') nudgeExplore(0, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      goal.current.yaw += event.key === 'ArrowLeft' ? .16 : -.16;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      goal.current.pitch = THREE.MathUtils.clamp(goal.current.pitch + (event.key === 'ArrowUp' ? -.07 : .07), CAMERA_MIN_PITCH, .5);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      goal.current.distance = THREE.MathUtils.clamp(goal.current.distance - .7, 5.5, 17.5);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      goal.current.distance = THREE.MathUtils.clamp(goal.current.distance + .7, 5.5, 17.5);
    } else if (key === 'r' || event.key === 'Home' || event.key === '0') {
      event.preventDefault();
      setActiveRegion(null);
      applyCamera(sanctuaryHomeCamera);
    } else if (!freeExplore && event.key.toLowerCase() === 's' && onTeaHouseInteract) {
      event.preventDefault();
      onTeaHouseInteract();
    } else if (/^[1-5]$/.test(event.key)) {
      event.preventDefault();
      const ids: SanctuaryRegionId[] = ['threshold','home-grove','moon-pond','quiet-pavilion','lookout'];
      focusRegion(ids[Number(event.key) - 1]);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`sanctuary-world ${interactionMode === 'stillness' ? 'is-stillness' : 'is-explore'} ${freeExplore ? 'is-free-explore' : ''}`}
      data-quality={resolvedQuality}
      data-period={period}
      data-theme={theme}
      tabIndex={0}
      role="region"
      aria-roledescription={interactionMode === 'stillness' ? 'scenic 3D sanctuary' : 'interactive 3D sanctuary'}
      aria-label={interactionMode === 'stillness' ? 'Sanctuary stillness view. The camera is resting in a fixed scenic composition.' : freeExplore ? 'Living Sanctuary free explore. Use W A S D to move within the island, drag to look, and the wheel to change distance. Press R to reset.' : 'Living Sanctuary. Drag to orbit. Pinch or Control plus mouse wheel to zoom. Use region buttons or keys 1 through 5 to travel. Press R to reset the view.'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      onContextMenu={event => event.preventDefault()}
    >
      {webglAvailable ? (
        <SanctuaryRenderBoundary resetKey={`${theme}:${resolvedQuality}`}>
          <Canvas
            shadows={!lowPower}
            frameloop={renderActive ? 'always' : 'never'}
            dpr={lowPower ? [1,1.15] : [1,1.6]}
            camera={{ position: [0,4.2,13.5], fov: 42, near: .1, far: 70 }}
            gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
              gl.outputColorSpace = THREE.SRGBColorSpace;
            }}
          >
            <SanctuaryScene
            growth={growth}
            stageIndex={stageIndex}
            livingState={livingState}
            reducedMotion={reducedMotion}
            familiarEnabled={familiarEnabled}
            familiarColor={familiarColor}
            familiarDesign={familiarDesign}
            familiarTheme={familiarTheme}
            familiarActivity={familiarActivity}
            interactionMode={interactionMode}
            stillnessViewId={stillnessViewId}
            activeRegion={activeRegion}
            onFocus={focusRegion}
            onHover={region => onRegionHover?.(region)}
            onFamiliarInteract={onFamiliarInteract}
            onStillnessRequest={onStillnessRequest}
            onTeaHouseInteract={onTeaHouseInteract}
            theme={theme}
            period={period}
            dayProgress={dayProgress}
            quality={quality}
            unlockedAchievements={unlockedAchievements}
            visibleSecrets={visibleSecrets}
            discoveredSecrets={discoveredSecrets}
            onArtifactInteract={onArtifactInteract}
            onSecretInteract={onSecretInteract}
            pose={pose}
            goal={goal}
            target={target}
            targetGoal={targetGoal}
            transition={transition}
            dragging={dragging}
            inertia={inertia}
            lowPower={lowPower}
            />
          </Canvas>
        </SanctuaryRenderBoundary>
      ) : (
        <div className="sanctuary-fallback" role="status">
          <strong>Sanctuary 3D is unavailable here.</strong>
          <span>Your local progress is safe. This device could not start WebGL, so the rest of Ikigai Space remains available without the 3D world.</span>
        </div>
      )}

      {interactionMode === 'explore' ? <button
        type="button"
        className="sanctuary-reset"
        onPointerDown={event => event.stopPropagation()}
        onClick={() => { setActiveRegion(null); applyCamera(sanctuaryHomeCamera); }}
      >
        Reset view
      </button> : null}
    </div>
  );
}
