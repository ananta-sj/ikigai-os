import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GardenCareKind } from '../../lib/garden';
import type { AchievementDefinition } from '../../types';

export interface GardenWorldProps {
  stageIndex: number;
  progress: number;
  growth: number;
  effect?: { kind: GardenCareKind; id: number } | null;
  reducedMotion?: boolean;
  artifacts?: AchievementDefinition['artifact'][];
}

type CameraPose = { yaw: number; pitch: number; distance: number };
type CameraMotion = { yaw: number; pitch: number };
type DayPeriod = 'dawn' | 'day' | 'dusk' | 'night';

const HOME_POSE: CameraPose = { yaw: 0.08, pitch: 0.13, distance: 8.25 };
const FOCUS_POSE: CameraPose = { yaw: 0.03, pitch: 0.09, distance: 5.75 };
const stageColors = ['#7e5f43', '#8a6946', '#75ae78', '#6fa873', '#5b9665', '#4e845c', '#3f7454', '#925f78'];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function getDayPeriod(date = new Date()): DayPeriod {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5.25 && hour < 7.25) return 'dawn';
  if (hour >= 7.25 && hour < 17.25) return 'day';
  if (hour >= 17.25 && hour < 19.25) return 'dusk';
  return 'night';
}

function CameraRig({ poseRef, motionRef, draggingRef, reducedMotion }: {
  poseRef: React.MutableRefObject<CameraPose>;
  motionRef: React.MutableRefObject<CameraMotion>;
  draggingRef: React.MutableRefObject<boolean>;
  reducedMotion: boolean;
}) {
  const { camera, pointer } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 1.1, 0), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!draggingRef.current && !reducedMotion) {
      poseRef.current.yaw += motionRef.current.yaw * delta;
      poseRef.current.pitch = THREE.MathUtils.clamp(
        poseRef.current.pitch + motionRef.current.pitch * delta,
        -0.08,
        0.5
      );
      const friction = Math.pow(0.045, Math.min(delta, 0.05));
      motionRef.current.yaw *= friction;
      motionRef.current.pitch *= friction;
    } else if (reducedMotion) {
      motionRef.current.yaw = 0;
      motionRef.current.pitch = 0;
    }

    const pose = poseRef.current;
    const parallax = reducedMotion ? 0 : 0.105;
    const yaw = pose.yaw + pointer.x * parallax;
    const pitch = pose.pitch - pointer.y * parallax * 0.42;
    const cp = Math.cos(pitch);

    target.set(
      Math.sin(yaw) * cp * pose.distance,
      1.08 + Math.sin(pitch) * pose.distance,
      Math.cos(yaw) * cp * pose.distance
    );

    const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.0015, Math.min(delta, 0.05));
    camera.position.lerp(target, smoothing);
    camera.lookAt(look);
  });

  return null;
}

function Leaf({ position, scale = [0.24, 0.11, 0.14], rotation = [0, 0, 0], color = '#6fa873' }: {
  position: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow>
      <sphereGeometry args={[1, 16, 10]} />
      <meshStandardMaterial color={color} roughness={0.86} />
    </mesh>
  );
}

function Branch({ position, rotation, length = 0.7 }: {
  position: [number, number, number];
  rotation: [number, number, number];
  length?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[0.034, 0.055, length, 7]} />
      <meshStandardMaterial color="#73513b" roughness={0.9} />
    </mesh>
  );
}

function PlantModel({ stageIndex, reducedMotion }: { stageIndex: number; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const height = stageIndex <= 2 ? 0.8 : stageIndex === 3 ? 1.18 : stageIndex === 4 ? 1.62 : 2.25;
  const trunkRadius = stageIndex < 5 ? 0.045 : 0.11;
  const leafColor = stageColors[Math.min(stageIndex, stageColors.length - 1)];

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.72) * (stageIndex < 5 ? 0.022 : 0.009);
    group.current.rotation.x = Math.cos(clock.elapsedTime * 0.43) * 0.004;
  });

  const canopy = stageIndex >= 5;
  const bloom = stageIndex >= 7;

  return (
    <group ref={group}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[trunkRadius * 0.72, trunkRadius, height, 10]} />
        <meshStandardMaterial color={stageIndex < 5 ? '#4c8c54' : '#73513b'} roughness={0.88} />
      </mesh>

      {stageIndex >= 2 && !canopy && <>
        <Leaf position={[-0.18, height * 0.62, 0]} rotation={[0, 0, 0.5]} color={leafColor} />
        <Leaf position={[0.2, height * 0.78, 0.02]} rotation={[0, 0, -0.55]} color={leafColor} />
      </>}

      {stageIndex >= 3 && !canopy && <>
        <Leaf position={[-0.27, height * 0.84, -0.03]} scale={[0.31, 0.13, 0.18]} rotation={[0.2, 0.15, 0.62]} color={leafColor} />
        <Leaf position={[0.24, height * 0.52, 0.05]} scale={[0.28, 0.12, 0.17]} rotation={[-0.1, -0.2, -0.48]} color={leafColor} />
      </>}

      {canopy && <>
        <Branch position={[-0.16, height * 0.76, 0]} rotation={[0, 0, -1.03]} length={0.82} />
        <Branch position={[0.2, height * 0.82, -0.03]} rotation={[0.08, 0.1, 1.0]} length={0.88} />
        {stageIndex >= 6 && <Branch position={[0.02, height * 0.93, -0.05]} rotation={[0.75, 0.2, 0.2]} length={0.72} />}
        <mesh position={[-0.33, height + 0.08, 0]} scale={[0.68, 0.5, 0.62]} castShadow>
          <sphereGeometry args={[1, 22, 15]} />
          <meshStandardMaterial color={bloom ? '#6f8e67' : '#4f8059'} roughness={0.9} />
        </mesh>
        <mesh position={[0.32, height + 0.1, -0.02]} scale={[0.72, 0.55, 0.66]} castShadow>
          <sphereGeometry args={[1, 22, 15]} />
          <meshStandardMaterial color={bloom ? '#78976d' : '#56875e'} roughness={0.9} />
        </mesh>
        <mesh position={[0, height + 0.52, 0]} scale={[0.74, 0.58, 0.68]} castShadow>
          <sphereGeometry args={[1, 22, 15]} />
          <meshStandardMaterial color={bloom ? '#7f9e72' : '#5b8e62'} roughness={0.9} />
        </mesh>
      </>}

      {bloom && [
        [-0.62, height + 0.35, 0.42], [-0.18, height + 0.86, 0.46], [0.44, height + 0.62, 0.42],
        [0.7, height + 0.2, -0.16], [-0.52, height + 0.76, -0.35], [0.16, height + 0.28, 0.7],
        [0.14, height + 1.02, -0.12]
      ].map((p, index) => (
        <mesh key={index} position={p as [number, number, number]} scale={0.1} castShadow>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={index % 2 ? '#efb5c4' : '#f4c9d1'} roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function SeedModel({ stageIndex, reducedMotion }: { stageIndex: number; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.025;
    group.current.position.y = 0.12 + Math.sin(clock.elapsedTime * 1.1) * 0.012;
  });

  if (stageIndex <= 1) {
    return (
      <group ref={group} position={[0, 0.14, 0]} rotation={[0.18, -0.35, -0.08]}>
        <mesh scale={[0.62, 0.34, 0.38]} castShadow>
          <sphereGeometry args={[1, 28, 18]} />
          <meshStandardMaterial color={stageIndex === 0 ? '#8f5f53' : '#9d6a4e'} roughness={0.72} />
        </mesh>
        <mesh position={[0.29, 0.11, 0.29]} rotation={[0, 0, -0.3]} scale={[0.22, 0.05, 0.04]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#d4a37d" roughness={0.8} />
        </mesh>
      </group>
    );
  }

  return <PlantModel stageIndex={stageIndex} reducedMotion={reducedMotion} />;
}

function IslandTerrain({ period, lowPower }: { period: DayPeriod; lowPower: boolean }) {
  const geometry = useMemo(() => {
    const rings = lowPower ? 13 : 19;
    const segments = lowPower ? 42 : 64;
    const radius = 6.15;
    const positions: number[] = [0, 0.13, 0];
    const indices: number[] = [];
    const random = seeded(7319);
    const phaseA = random() * Math.PI * 2;
    const phaseB = random() * Math.PI * 2;

    for (let ring = 1; ring <= rings; ring += 1) {
      const t = ring / rings;
      const r = radius * t;
      for (let segment = 0; segment < segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const broad = 0.16 * (1 - t * t);
        const ripple = (Math.sin(x * 1.12 + phaseA) + Math.cos(z * 1.34 + phaseB)) * 0.035 * (1 - t * 0.72);
        const micro = Math.sin((x + z) * 2.2) * 0.015 * (1 - t);
        const edgeDrop = t > 0.82 ? Math.pow((t - 0.82) / 0.18, 1.7) * 0.68 : 0;
        positions.push(x, broad + ripple + micro - edgeDrop, z);
      }
    }

    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(0, 1 + next, 1 + segment);
    }

    for (let ring = 1; ring < rings; ring += 1) {
      const innerStart = 1 + (ring - 1) * segments;
      const outerStart = 1 + ring * segments;
      for (let segment = 0; segment < segments; segment += 1) {
        const next = (segment + 1) % segments;
        const a = innerStart + segment;
        const b = innerStart + next;
        const c = outerStart + segment;
        const d = outerStart + next;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [lowPower]);

  const color = period === 'night' ? '#456149' : period === 'dusk' ? '#566d50' : period === 'dawn' ? '#657a59' : '#718a65';

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow castShadow={false}>
      <meshStandardMaterial color={color} roughness={0.98} />
    </mesh>
  );
}

function GrassField({ stageIndex, lowPower, reducedMotion }: { stageIndex: number; lowPower: boolean; reducedMotion: boolean }) {
  const count = Math.round((34 + stageIndex * 10) * (lowPower ? 0.58 : 1));
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    const random = seeded(841 + stageIndex * 17);
    return Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 1.2 + random() * 4.25;
      return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, scale: 0.1 + random() * 0.18, rot: random() * Math.PI, lean: (random() - 0.5) * 0.35 };
    });
  }, [count, stageIndex]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    data.forEach((item, index) => {
      dummy.position.set(item.x, item.scale * 0.55 + 0.04, item.z);
      dummy.scale.set(item.scale * 0.28, item.scale, item.scale * 0.28);
      dummy.rotation.set(item.lean + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.8 + index) * 0.035), item.rot, 0);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow={!lowPower}>
      <coneGeometry args={[0.25, 1, 4]} />
      <meshStandardMaterial color={stageIndex > 4 ? '#496f47' : '#385a3e'} roughness={1} />
    </instancedMesh>
  );
}

function MeadowFlowers({ stageIndex }: { stageIndex: number }) {
  const count = Math.max(0, (stageIndex - 2) * 4);
  const points = useMemo(() => {
    const random = seeded(1221 + stageIndex);
    return Array.from({ length: count }, () => {
      const a = random() * Math.PI * 2;
      const r = 1.5 + random() * 3.4;
      return [Math.cos(a) * r, 0.13, Math.sin(a) * r] as [number, number, number];
    });
  }, [count, stageIndex]);

  return <>{points.map((point, index) => (
    <group key={index} position={point} scale={0.65 + (index % 3) * 0.12}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.24, 5]} />
        <meshStandardMaterial color="#46724f" />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshStandardMaterial color={index % 3 === 0 ? '#e9b3bf' : index % 3 === 1 ? '#d9c58a' : '#b6c7df'} />
      </mesh>
    </group>
  ))}</>;
}

function GroundPatches({ period }: { period: DayPeriod }) {
  const patches = useMemo(() => {
    const random = seeded(4177);
    return Array.from({ length: 16 }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const radius = 1.3 + random() * 4.15;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        sx: 0.42 + random() * 0.75,
        sz: 0.24 + random() * 0.5,
        rot: random() * Math.PI,
        tone: index % 3
      };
    });
  }, []);
  const colors = period === 'night'
    ? ['#39523d', '#324a39', '#4b5a40']
    : period === 'dusk'
      ? ['#4d6648', '#455d43', '#687052']
      : ['#617b58', '#58714f', '#798365'];

  return <>{patches.map((patch, index) => (
    <mesh key={index} position={[patch.x, 0.145 + (index % 2) * 0.004, patch.z]} rotation={[-Math.PI / 2, 0, patch.rot]} scale={[patch.sx, patch.sz, 1]} receiveShadow>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color={colors[patch.tone]} roughness={1} transparent opacity={0.38} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  ))}</>;
}

function ShrubClusters({ stageIndex, period, lowPower }: { stageIndex: number; period: DayPeriod; lowPower: boolean }) {
  const count = lowPower ? 6 : 10;
  const clusters = useMemo(() => {
    const random = seeded(6021 + stageIndex * 3);
    return Array.from({ length: count }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const radius = 3.4 + random() * 1.65;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.28 + random() * 0.22,
        pieces: 2 + (index % 3)
      };
    });
  }, [count, stageIndex]);
  const foliage = period === 'night' ? '#31503b' : period === 'dusk' ? '#456046' : '#547451';
  const accent = period === 'night' ? '#3d6247' : '#698760';

  return <>{clusters.map((cluster, index) => (
    <group key={index} position={[cluster.x, 0.16, cluster.z]} rotation={[0, index * 0.63, 0]}>
      {Array.from({ length: cluster.pieces }, (_, piece) => {
        const offset = (piece - (cluster.pieces - 1) / 2) * cluster.scale * 0.78;
        return (
          <mesh key={piece} position={[offset, cluster.scale * (0.72 + piece * 0.08), (piece % 2 ? 1 : -1) * cluster.scale * 0.16]} scale={[cluster.scale * (1.05 - piece * 0.08), cluster.scale * (0.9 + piece * 0.12), cluster.scale]} castShadow={!lowPower}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={piece % 2 ? accent : foliage} roughness={1} />
          </mesh>
        );
      })}
    </group>
  ))}</>;
}

function PondReeds({ period }: { period: DayPeriod }) {
  const reeds = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const angle = -0.35 + (index / 11) * Math.PI * 1.25;
    const radius = 1.03 + (index % 3) * 0.08;
    return {
      x: -3.2 + Math.cos(angle) * radius,
      z: 1.8 + Math.sin(angle) * radius,
      h: 0.34 + (index % 4) * 0.06,
      lean: (index % 2 ? -1 : 1) * (0.05 + (index % 3) * 0.03)
    };
  }), []);
  const color = period === 'night' ? '#3c5f47' : '#5d7650';

  return <>{reeds.map((reed, index) => (
    <group key={index} position={[reed.x, 0.08, reed.z]} rotation={[reed.lean, index * 0.31, 0]}>
      <mesh position={[0, reed.h / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.018, reed.h, 5]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {index % 3 === 0 && <mesh position={[0, reed.h + 0.045, 0]} scale={[0.035, 0.1, 0.035]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#806f50" roughness={1} />
      </mesh>}
    </group>
  ))}</>;
}

function AmbientMotes({ stageIndex, period, reducedMotion, lowPower }: {
  stageIndex: number;
  period: DayPeriod;
  reducedMotion: boolean;
  lowPower: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const baseCount = period === 'night' || period === 'dusk' ? 5 + stageIndex * 2 : 4 + stageIndex;
  const count = Math.max(3, Math.round(baseCount * (lowPower ? 0.6 : 1)));
  const motes = useMemo(() => {
    const random = seeded(9384 + stageIndex + period.length * 11);
    return Array.from({ length: count }, (_, index) => ({
      x: (random() - 0.5) * 8,
      y: 0.7 + random() * 2.4,
      z: (random() - 0.5) * 8,
      speed: 0.25 + random() * 0.45,
      phase: index + random() * 5
    }));
  }, [count, period, stageIndex]);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.children.forEach((child, index) => {
      const mote = motes[index];
      child.position.y = mote.y + Math.sin(clock.elapsedTime * mote.speed + mote.phase) * 0.24;
      child.position.x = mote.x + Math.cos(clock.elapsedTime * mote.speed * 0.55 + mote.phase) * 0.2;
      child.position.z = mote.z + Math.sin(clock.elapsedTime * mote.speed * 0.33 + mote.phase) * 0.12;
    });
  });

  const nightLike = period === 'night' || period === 'dusk';
  const colors = nightLike ? ['#c7f5a7', '#f3ddb0'] : ['#f2dfbd', '#e5ebce'];
  const size = nightLike ? 0.024 : 0.014;

  return <group ref={group}>{motes.map((mote, index) => (
    <mesh key={index} position={[mote.x, mote.y, mote.z]}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshBasicMaterial color={colors[index % colors.length]} transparent opacity={nightLike ? 0.9 : 0.46} toneMapped={false} />
    </mesh>
  ))}</group>;
}

function Pond({ reducedMotion }: { reducedMotion: boolean }) {
  const surface = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (surface.current) surface.current.rotation.z = 0.22 + Math.sin(t * 0.18) * 0.015;
    if (ringA.current) {
      const s = 0.94 + ((t * 0.08) % 1) * 0.18;
      ringA.current.scale.setScalar(s);
    }
    if (ringB.current) {
      const s = 1.0 + (((t * 0.08 + 0.5) % 1)) * 0.16;
      ringB.current.scale.setScalar(s);
    }
  });

  return (
    <group position={[-3.2, 0.045, 1.8]} rotation={[-Math.PI / 2, 0, 0.22]}>
      <mesh ref={surface} receiveShadow>
        <circleGeometry args={[1.05, 48]} />
        <meshStandardMaterial color="#3b6970" roughness={0.16} metalness={0.08} transparent opacity={0.78} />
      </mesh>
      <mesh ref={ringA} position={[0, 0, 0.006]}>
        <ringGeometry args={[0.47, 0.485, 48]} />
        <meshBasicMaterial color="#a8ccd0" transparent opacity={0.22} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} position={[0, 0, 0.007]}>
        <ringGeometry args={[0.68, 0.692, 48]} />
        <meshBasicMaterial color="#a8ccd0" transparent opacity={0.14} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.014]} scale={1.16}>
        <ringGeometry args={[0.92, 1.15, 40]} />
        <meshStandardMaterial color="#516145" roughness={0.98} />
      </mesh>
    </group>
  );
}

function Stones() {
  const positions: Array<[number, number, number, number]> = [[2.1, 0.17, 1.55, 0.3], [2.55, 0.13, 1.0, 0.22], [2.92, 0.15, 0.42, 0.26], [-1.8, 0.13, -2.2, 0.24], [-2.25, 0.11, -1.86, 0.18]];
  return <>{positions.map(([x, y, z, s], index) => (
    <mesh key={index} position={[x, y, z]} scale={[s * 1.3, s * 0.65, s]} rotation={[0.12, index * 0.7, 0.08]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={index % 2 ? '#77786e' : '#686d62'} roughness={1} />
    </mesh>
  ))}</>;
}

function SteppingPath({ stageIndex }: { stageIndex: number }) {
  const count = 5 + Math.min(3, Math.floor(stageIndex / 2));
  return <>{Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    const z = 4.8 - t * 3.65;
    const x = 0.65 * Math.sin(t * Math.PI * 1.3 + 0.2) + 0.25;
    const scale = 0.28 + t * 0.05;
    return (
      <mesh key={index} position={[x, 0.11 + (index % 2) * 0.015, z]} scale={[scale * 1.45, 0.09, scale]} rotation={[0.02, 0.2 + index * 0.19, 0.01]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1.08, 1, 8]} />
        <meshStandardMaterial color={index % 2 ? '#7b7c72' : '#6f7468'} roughness={1} />
      </mesh>
    );
  })}</>;
}

function DistantTrees({ stageIndex, period, lowPower }: { stageIndex: number; period: DayPeriod; lowPower: boolean }) {
  const count = lowPower ? 8 : 13;
  const trees = useMemo(() => {
    const random = seeded(5512 + stageIndex);
    return Array.from({ length: count }, (_, index) => {
      const angle = Math.PI * (0.12 + (index / Math.max(1, count - 1)) * 0.76);
      const radius = 5.2 + random() * 0.5;
      return {
        x: Math.cos(angle) * radius,
        z: -Math.sin(angle) * radius,
        height: 0.75 + random() * 0.8,
        width: 0.28 + random() * 0.22
      };
    });
  }, [count, stageIndex]);

  const trunk = period === 'night' ? '#374137' : '#535244';
  const foliage = period === 'night' ? '#294333' : period === 'dusk' ? '#38513d' : '#49634a';

  return <>{trees.map((tree, index) => (
    <group key={index} position={[tree.x, 0.02, tree.z]}>
      <mesh position={[0, tree.height * 0.36, 0]} castShadow={!lowPower}>
        <cylinderGeometry args={[0.035, 0.055, tree.height * 0.72, 6]} />
        <meshStandardMaterial color={trunk} roughness={1} />
      </mesh>
      <mesh position={[0, tree.height * 0.72, 0]} scale={[tree.width * 1.08, tree.height * 0.34, tree.width * 1.08]} castShadow={!lowPower}>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color={foliage} roughness={1} />
      </mesh>
      <mesh position={[0, tree.height * 1.02, 0]} scale={[tree.width * 0.78, tree.height * 0.32, tree.width * 0.78]} castShadow={!lowPower}>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color={period === 'night' ? '#31503c' : '#547052'} roughness={1} />
      </mesh>
    </group>
  ))}</>;
}

function CareEffect({ effect, reducedMotion }: { effect?: GardenWorldProps['effect']; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const started = useRef(0);
  const lastId = useRef(0);
  const particles = useMemo(() => {
    const random = seeded((effect?.id ?? 1) * 17 + 44);
    return Array.from({ length: 34 }, () => ({ x: (random() - 0.5) * 3.2, y: random() * 3, z: (random() - 0.5) * 2.7, speed: 0.6 + random() * 0.8 }));
  }, [effect?.id]);

  useFrame(({ clock }) => {
    if (!group.current || !effect || reducedMotion) return;
    if (lastId.current !== effect.id) {
      lastId.current = effect.id;
      started.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - started.current;
    group.current.visible = elapsed < 2.2;
    group.current.children.forEach((child, index) => {
      const p = particles[index];
      if (effect.kind === 'water') child.position.set(p.x, 3.5 - ((elapsed * p.speed * 3.2 + p.y) % 4), p.z);
      else if (effect.kind === 'sunlight') {
        child.position.set(p.x * 0.6, 0.4 + ((elapsed * p.speed + p.y) % 2.8), p.z * 0.6);
        child.scale.setScalar(0.6 + Math.sin(elapsed * 5 + index) * 0.2);
      } else child.position.set(p.x * 0.8, 0.2 + ((elapsed * p.speed * 0.75 + p.y) % 1.8), p.z * 0.8);
    });
  });

  if (!effect) return null;
  const color = effect.kind === 'water' ? '#78c7df' : effect.kind === 'sunlight' ? '#ffe0a1' : '#d7b56d';
  return <group ref={group}>{particles.map((p, index) => (
    <mesh key={index} position={[p.x, p.y, p.z]} scale={effect.kind === 'water' ? [0.018, 0.16, 0.018] : 0.035}>
      {effect.kind === 'water' ? <boxGeometry args={[1, 1, 1]} /> : <sphereGeometry args={[1, 6, 6]} />}
      <meshBasicMaterial color={color} transparent opacity={0.72} toneMapped={false} />
    </mesh>
  ))}</group>;
}


function GardenArtifacts({ artifacts, reducedMotion }: { artifacts: AchievementDefinition['artifact'][]; reducedMotion: boolean }) {
  const has = (artifact: AchievementDefinition['artifact']) => artifacts.includes(artifact);
  const sakura = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!sakura.current || reducedMotion) return;
    sakura.current.rotation.z = Math.sin(clock.elapsedTime * 0.48) * 0.012;
  });

  return (
    <>
      {has('stone-lantern') && (
        <group position={[-2.3, 0.17, -0.55]} rotation={[0, 0.35, 0]}>
          <mesh position={[0, 0.18, 0]} castShadow><boxGeometry args={[0.34, 0.12, 0.34]} /><meshStandardMaterial color="#77756b" roughness={0.98} /></mesh>
          <mesh position={[0, 0.52, 0]} castShadow><cylinderGeometry args={[0.08, 0.11, 0.58, 8]} /><meshStandardMaterial color="#6c6d65" roughness={1} /></mesh>
          <mesh position={[0, 0.82, 0]} castShadow><boxGeometry args={[0.38, 0.3, 0.38]} /><meshStandardMaterial color="#88877d" roughness={0.96} /></mesh>
          <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.34, 0.18, 4]} /><meshStandardMaterial color="#686960" roughness={1} /></mesh>
          <pointLight position={[0, 0.83, 0.02]} intensity={0.16} distance={2.2} color="#f1d39b" />
        </group>
      )}

      {has('moonstone') && (
        <group position={[2.75, 0.18, -1.75]} rotation={[0.1, 0.45, -0.08]}>
          <mesh castShadow scale={[0.42, 0.55, 0.38]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#72898d" emissive="#9fc2c4" emissiveIntensity={0.08} roughness={0.68} metalness={0.04} />
          </mesh>
          <pointLight position={[0, 0.6, 0]} intensity={0.12} distance={2.1} color="#bde2df" />
        </group>
      )}

      {has('sakura-sapling') && (
        <group ref={sakura} position={[3.25, 0.15, 1.35]}>
          <mesh position={[0, 0.72, 0]} castShadow><cylinderGeometry args={[0.045, 0.075, 1.42, 8]} /><meshStandardMaterial color="#715140" roughness={0.92} /></mesh>
          <Branch position={[0.05, 1.03, 0]} rotation={[0, 0, -0.82]} length={0.58} />
          <Branch position={[-0.04, 0.86, 0]} rotation={[0, 0, 0.9]} length={0.48} />
          {[[0,1.48,0],[0.28,1.34,0.03],[-0.26,1.24,-0.02],[0.2,1.12,0.1],[-0.16,1.05,0.08]].map((pos, index) => (
            <mesh key={index} position={pos as [number, number, number]} scale={[0.24,0.16,0.2]} castShadow>
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color={index % 2 ? '#e7a8b9' : '#f0bdc7'} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {has('proof-marker') && (
        <group position={[3.95, 0.14, -0.45]} rotation={[0, -0.5, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.08, 0.9, 0.08]} /><meshStandardMaterial color="#674d37" roughness={0.96} /></mesh>
          <mesh position={[0, 0.78, 0]} castShadow><boxGeometry args={[0.72, 0.34, 0.07]} /><meshStandardMaterial color="#9b835f" roughness={0.94} /></mesh>
          <mesh position={[0, 0.78, 0.041]}><circleGeometry args={[0.055, 14]} /><meshStandardMaterial color="#d4bd86" roughness={0.85} /></mesh>
        </group>
      )}

      {has('reflection-bench') && (
        <group position={[-4.05, 0.18, -2.65]} rotation={[0, 0.42, 0]}>
          <mesh position={[0, 0.34, 0]} castShadow><boxGeometry args={[1.45, 0.12, 0.42]} /><meshStandardMaterial color="#6c5038" roughness={0.95} /></mesh>
          <mesh position={[0, 0.7, -0.17]} rotation={[0.1,0,0]} castShadow><boxGeometry args={[1.45, 0.1, 0.48]} /><meshStandardMaterial color="#73553d" roughness={0.95} /></mesh>
          <mesh position={[-0.52, 0.16, 0]}><boxGeometry args={[0.1,0.35,0.1]} /><meshStandardMaterial color="#4f453a" roughness={1} /></mesh>
          <mesh position={[0.52, 0.16, 0]}><boxGeometry args={[0.1,0.35,0.1]} /><meshStandardMaterial color="#4f453a" roughness={1} /></mesh>
        </group>
      )}

      {has('nest-egg') && (
        <group position={[-3.25, 0.16, 1.65]} rotation={[-0.02, 0.2, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[0.65,0.65,0.23]} castShadow><torusGeometry args={[0.42,0.16,7,18]} /><meshStandardMaterial color="#6f5339" roughness={1} /></mesh>
          <mesh position={[0, 0.32, 0]} scale={[0.26,0.36,0.26]} castShadow><sphereGeometry args={[1,18,12]} /><meshStandardMaterial color="#d7c9a2" roughness={0.78} /></mesh>
          <mesh position={[0.04, 0.39, 0.22]} scale={[0.06,0.03,0.02]}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color="#8f8069" roughness={1} /></mesh>
        </group>
      )}
    </>
  );
}

function World({ stageIndex, progress, growth, effect, reducedMotion, artifacts, poseRef, motionRef, draggingRef, period, lowPower }: GardenWorldProps & {
  poseRef: React.MutableRefObject<CameraPose>;
  motionRef: React.MutableRefObject<CameraMotion>;
  draggingRef: React.MutableRefObject<boolean>;
  period: DayPeriod;
  lowPower: boolean;
}) {
  const palette = {
    dawn: { sky: '#657f71', fog: '#708779', ambient: '#ffe0bf', key: '#ffd19a', fill: '#b8d5c2' },
    day: { sky: '#789685', fog: '#7f9684', ambient: '#f8ead3', key: '#ffe0ae', fill: '#c6dfcf' },
    dusk: { sky: '#51685c', fog: '#566c60', ambient: '#e1cfbf', key: '#efb07d', fill: '#9fc1af' },
    night: { sky: '#1c3027', fog: '#243a2f', ambient: '#c0d8ca', key: '#d5e5ff', fill: '#8fbfa8' }
  }[period];

  const night = period === 'night';

  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.fog, night ? 8.6 : 9.5, night ? 20 : 22]} />
      <CameraRig poseRef={poseRef} motionRef={motionRef} draggingRef={draggingRef} reducedMotion={reducedMotion} />
      <ambientLight intensity={night ? 1.12 : 0.98} color={palette.ambient} />
      <hemisphereLight intensity={night ? 0.98 : 1.0} color={palette.fill} groundColor={night ? '#31483a' : '#42563d'} />
      <directionalLight castShadow={!lowPower} position={night ? [-4, 7, 3] : [5, 8, 4]} intensity={night ? 1.35 : 1.62} color={palette.key} shadow-mapSize-width={lowPower ? 512 : 1024} shadow-mapSize-height={lowPower ? 512 : 1024} shadow-camera-far={20} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} />
      <directionalLight position={[4, 4, 6]} intensity={night ? 0.58 : 0.3} color={palette.fill} />
      <pointLight position={[0.4, 3.1, 2.6]} intensity={night ? 0.38 : 0.16} distance={9} decay={2} color={night ? '#d4e9c8' : '#ffe8bc'} />

      <IslandTerrain period={period} lowPower={lowPower} />
      <GroundPatches period={period} />
      <ShrubClusters stageIndex={stageIndex} period={period} lowPower={lowPower} />
      <DistantTrees stageIndex={stageIndex} period={period} lowPower={lowPower} />
      <Pond reducedMotion={reducedMotion} />
      <PondReeds period={period} />
      <Stones />
      <SteppingPath stageIndex={stageIndex} />
      <GrassField stageIndex={stageIndex} lowPower={lowPower} reducedMotion={reducedMotion} />
      <MeadowFlowers stageIndex={stageIndex} />

      <group position={[0.25, 0.16, -0.1]}>
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.18, 38]} />
          <meshStandardMaterial color="#4a3a28" roughness={1} />
        </mesh>
        <mesh position={[0, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.54, 1.06, 38]} />
          <meshStandardMaterial color="#5a452e" roughness={1} transparent opacity={0.62} />
        </mesh>
        <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.18, 1.48, 38]} />
          <meshStandardMaterial color="#516143" roughness={1} />
        </mesh>
        <SeedModel stageIndex={stageIndex} reducedMotion={reducedMotion} />
      </group>

      <AmbientMotes stageIndex={stageIndex} period={period} reducedMotion={reducedMotion} lowPower={lowPower} />
      <CareEffect effect={effect} reducedMotion={reducedMotion} />
      <GardenArtifacts artifacts={artifacts ?? []} reducedMotion={reducedMotion} />

      <mesh position={[period === 'night' ? -1.6 : 1.2, 7, -6]}>
        <sphereGeometry args={[period === 'night' ? 0.7 : 1.05, 28, 18]} />
        <meshBasicMaterial color={period === 'night' ? '#d9e6d6' : period === 'dusk' ? '#f1b78f' : '#ffe4aa'} transparent opacity={period === 'night' ? 0.58 : 0.78} toneMapped={false} />
      </mesh>

      <group position={[-4.8, 0.34, -3.5]}>
        <mesh scale={[1.7, 0.08, 0.6]} rotation={[0, 0.35, 0]} receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#574535" roughness={1} />
        </mesh>
      </group>

      <group visible={growth >= 300} position={[4.1, 0.38, -2.6]}>
        <mesh castShadow><cylinderGeometry args={[0.06, 0.09, 0.65, 8]} /><meshStandardMaterial color="#66503b" roughness={1} /></mesh>
        <mesh position={[0, 0.48, 0]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.8, 0.32, 0.08]} /><meshStandardMaterial color="#8c7656" roughness={0.95} /></mesh>
      </group>

      <group visible={progress > 60 && stageIndex >= 4} position={[-4.4, 0.24, -0.8]}>
        <mesh rotation={[-Math.PI / 2, 0, 0.1]}><ringGeometry args={[0.26, 0.34, 22]} /><meshStandardMaterial color="#a38b64" roughness={0.9} /></mesh>
      </group>
    </>
  );
}

export function GardenWorld({ stageIndex, progress, growth, effect, reducedMotion = false, artifacts = [] }: GardenWorldProps) {
  const poseRef = useRef<CameraPose>({ ...HOME_POSE });
  const motionRef = useRef<CameraMotion>({ yaw: 0, pitch: 0 });
  const draggingRef = useRef(false);
  const worldRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; time: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; cameraDistance: number } | null>(null);
  const [period, setPeriod] = useState<DayPeriod>(() => getDayPeriod());
  const [lowPower] = useState(() => {
    if (typeof window === 'undefined') return false;
    const cores = navigator.hardwareConcurrency || 8;
    return window.innerWidth < 760 || cores <= 4;
  });

  useEffect(() => {
    const timer = window.setInterval(() => setPeriod(getDayPeriod()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? 360
          : 1;
      const delta = event.deltaY * unit;
      poseRef.current.distance = THREE.MathUtils.clamp(poseRef.current.distance + delta * 0.007, 6.2, 12.8);
    };

    world.addEventListener('wheel', handleWheel, { passive: false });
    return () => world.removeEventListener('wheel', handleWheel);
  }, []);

  const updatePinch = () => {
    const points = Array.from(pointers.current.values());
    if (points.length < 2) {
      pinch.current = null;
      return false;
    }
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    if (!pinch.current) {
      pinch.current = { distance, cameraDistance: poseRef.current.distance };
      return true;
    }
    const ratio = pinch.current.distance / Math.max(distance, 30);
    poseRef.current.distance = THREE.MathUtils.clamp(pinch.current.cameraDistance * ratio, 6.2, 12.8);
    return true;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    motionRef.current = { yaw: 0, pitch: 0 };
    draggingRef.current = true;

    if (pointers.current.size === 1) {
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        yaw: poseRef.current.yaw,
        pitch: poseRef.current.pitch,
        time: performance.now()
      };
    } else {
      drag.current = null;
      updatePinch();
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2) {
      updatePinch();
      return;
    }

    const activeDrag = drag.current;
    if (!activeDrag) return;

    const dx = event.clientX - activeDrag.x;
    const dy = event.clientY - activeDrag.y;
    const nextYaw = activeDrag.yaw - dx * 0.006;
    const nextPitch = THREE.MathUtils.clamp(activeDrag.pitch + dy * 0.004, -0.08, 0.5);
    const now = performance.now();
    const elapsed = Math.max(16, now - activeDrag.time);

    motionRef.current = {
      yaw: THREE.MathUtils.clamp((-dx * 0.006) / (elapsed / 1000), -1.8, 1.8) * 0.11,
      pitch: THREE.MathUtils.clamp((dy * 0.004) / (elapsed / 1000), -1.25, 1.25) * 0.09
    };
    poseRef.current.yaw = nextYaw;
    poseRef.current.pitch = nextPitch;
  };

  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    if (pointers.current.size === 0) {
      drag.current = null;
      pinch.current = null;
      draggingRef.current = false;
    } else if (pointers.current.size === 1) {
      const point = Array.from(pointers.current.values())[0];
      drag.current = {
        x: point.x,
        y: point.y,
        yaw: poseRef.current.yaw,
        pitch: poseRef.current.pitch,
        time: performance.now()
      };
      pinch.current = null;
    }
  };

  const setCamera = (pose: CameraPose) => {
    motionRef.current = { yaw: 0, pitch: 0 };
    poseRef.current = { ...pose };
  };

  return (
    <div
      ref={worldRef}
      className="garden-world"
      data-period={period}
      data-quality={lowPower ? 'balanced' : 'lush'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onDoubleClick={() => setCamera(FOCUS_POSE)}
      onContextMenu={event => event.preventDefault()}
    >
      <Canvas
        shadows={!lowPower}
        dpr={lowPower ? [1, 1.2] : [1, 1.65]}
        camera={{ position: [0, 2.5, 9.2], fov: 42, near: 0.1, far: 45 }}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMappingExposure = period === 'night' ? 1.2 : period === 'day' ? 1.06 : 1.12; }}
      >
        <World
          stageIndex={stageIndex}
          progress={progress}
          growth={growth}
          effect={effect}
          reducedMotion={reducedMotion}
          poseRef={poseRef}
          motionRef={motionRef}
          draggingRef={draggingRef}
          period={period}
          lowPower={lowPower}
          artifacts={artifacts}
        />
      </Canvas>

      <div className="garden-world-status" aria-hidden="true">
        <span>{period}</span><i /> <span>{lowPower ? 'balanced render' : 'lush render'}</span>
      </div>
      <div className="garden-world-hint">Drag to look · wheel / pinch to zoom · double-click to focus</div>
      <div className="garden-camera-actions">
        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => setCamera(FOCUS_POSE)}>Focus plant</button>
        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => setCamera(HOME_POSE)}>Reset view</button>
      </div>
    </div>
  );
}
