import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GardenThemePalette } from '../../data/gardenThemes';
import type { SanctuaryDayPeriod } from '../../lib/sanctuaryDepthCore';

interface SanctuaryTimeLifeProps {
  period: SanctuaryDayPeriod;
  palette: GardenThemePalette;
  lowPower: boolean;
  reducedMotion: boolean;
  pondY: number;
}

type FireflySeed = {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  drift: number;
};

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function PondFireflies({ palette, lowPower, pondY }: Pick<SanctuaryTimeLifeProps, 'palette' | 'lowPower' | 'pondY'>) {
  const points = useRef<THREE.Points>(null);
  const reflections = useRef<THREE.Points>(null);
  const count = lowPower ? 6 : 11;
  const seeds = useMemo<FireflySeed[]>(() => {
    const random = seeded(110923);
    return Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 2.0 + random() * 1.3;
      return {
        x: Math.cos(angle) * radius,
        y: .42 + random() * .76,
        z: Math.sin(angle) * radius * .58,
        phase: random() * Math.PI * 2,
        speed: .42 + random() * .34,
        drift: .06 + random() * .13
      };
    });
  }, [count]);
  const positionArray = useMemo(() => new Float32Array(count * 3), [count]);
  const reflectionArray = useMemo(() => new Float32Array(count * 3), [count]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    seeds.forEach((seed, index) => {
      const offset = index * 3;
      const sway = Math.sin(time * seed.speed + seed.phase);
      const cross = Math.cos(time * (seed.speed * .72) + seed.phase * 1.7);
      positionArray[offset] = seed.x + sway * seed.drift;
      positionArray[offset + 1] = seed.y + Math.sin(time * (seed.speed * 1.4) + seed.phase) * .09;
      positionArray[offset + 2] = seed.z + cross * seed.drift * .7;

      reflectionArray[offset] = positionArray[offset] * .72;
      reflectionArray[offset + 1] = .028;
      reflectionArray[offset + 2] = positionArray[offset + 2] * .86;
    });
    const position = points.current?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (position) position.needsUpdate = true;
    const reflection = reflections.current?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (reflection) reflection.needsUpdate = true;
  });

  const glow = new THREE.Color(palette.accentSoft).lerp(new THREE.Color('#ffe6a8'), .72).getStyle();
  const reflectionGlow = new THREE.Color(palette.waterRing).lerp(new THREE.Color('#ffe2a0'), .58).getStyle();

  return (
    <group position={[-7, pondY, 2.7]}>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positionArray, 3]} />
        </bufferGeometry>
        <pointsMaterial color={glow} size={lowPower ? .075 : .085} sizeAttenuation transparent opacity={.78} depthWrite={false} toneMapped={false} />
      </points>
      <points ref={reflections} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[reflectionArray, 3]} />
        </bufferGeometry>
        <pointsMaterial color={reflectionGlow} size={.05} sizeAttenuation transparent opacity={.22} depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
}

function DayVisitor({ palette, lowPower, pondY }: Pick<SanctuaryTimeLifeProps, 'palette' | 'lowPower' | 'pondY'>) {
  const root = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Mesh>(null);
  const rightWing = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!root.current) return;
    const time = clock.elapsedTime;
    const cycle = (time + 19.5) % (lowPower ? 42 : 34);
    const visibleFor = lowPower ? 7 : 11;
    root.current.visible = cycle < visibleFor;
    if (!root.current.visible) return;

    const travel = cycle / visibleFor;
    const angle = travel * Math.PI * 2 - .9;
    root.current.position.set(
      -7 + Math.cos(angle) * 2.15,
      pondY + .78 + Math.sin(time * 1.15) * .13,
      2.7 + Math.sin(angle) * 1.18
    );
    root.current.rotation.y = -angle + Math.PI * .48;
    const flap = Math.sin(time * 18) * .48;
    if (leftWing.current) leftWing.current.rotation.z = .42 + flap;
    if (rightWing.current) rightWing.current.rotation.z = -.42 - flap;
  });

  const wing = new THREE.Color(palette.accentSoft).lerp(new THREE.Color('#dce9d4'), .48).getStyle();
  return (
    <group ref={root} visible={false}>
      <mesh scale={[.028,.028,.13]} rotation={[Math.PI / 2,0,0]}><cylinderGeometry args={[1,1,1,7]} /><meshStandardMaterial color={palette.trunk} roughness={.8} /></mesh>
      <mesh ref={leftWing} position={[-.055,.015,0]} rotation={[0,.18,.42]} scale={[.11,.012,.065]}><sphereGeometry args={[1,8,5]} /><meshStandardMaterial color={wing} roughness={.72} /></mesh>
      <mesh ref={rightWing} position={[.055,.015,0]} rotation={[0,-.18,-.42]} scale={[.11,.012,.065]}><sphereGeometry args={[1,8,5]} /><meshStandardMaterial color={wing} roughness={.72} /></mesh>
    </group>
  );
}

export function SanctuaryTimeLife({ period, palette, lowPower, reducedMotion, pondY }: SanctuaryTimeLifeProps) {
  if (reducedMotion) return null;
  if (period === 'night' || period === 'dusk') return <PondFireflies palette={palette} lowPower={lowPower} pondY={pondY} />;
  if (period === 'day') return <DayVisitor palette={palette} lowPower={lowPower} pondY={pondY} />;
  return null;
}
