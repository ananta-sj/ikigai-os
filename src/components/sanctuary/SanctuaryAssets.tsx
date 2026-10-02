import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const sanctuaryAssetUrls = {
  guardianTree: '/assets/sanctuary/guardian_tree.glb',
  reflectionBench: '/assets/sanctuary/reflection_bench.glb',
  quietPavilion: '/assets/sanctuary/quiet_pavilion.glb',
  waystoneGate: '/assets/sanctuary/waystone_gate.glb'
} as const;

export function preloadSanctuaryAssets() {
  Object.values(sanctuaryAssetUrls).forEach(url => useLoader.preload(GLTFLoader, url));
}

export function SanctuaryAsset({
  src,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  castShadow = true,
  receiveShadow = true,
  tint,
  tintStrength = .14
}: {
  src: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  tint?: string;
  tintStrength?: number;
}) {
  const gltf = useLoader(GLTFLoader, src);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = castShadow;
      object.receiveShadow = receiveShadow;
      const tone = tint ? new THREE.Color(tint) : null;
      const tune = (material: THREE.Material) => {
        const cloned = material.clone();
        if (tone && 'color' in cloned && cloned.color instanceof THREE.Color) cloned.color.lerp(tone, tintStrength);
        return cloned;
      };
      if (Array.isArray(object.material)) {
        object.material = object.material.map(tune);
      } else if (object.material) {
        object.material = tune(object.material);
      }
    });
    return () => {
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material?.dispose();
      });
    };
  }, [castShadow, receiveShadow, scene, tint, tintStrength]);

  return <primitive object={scene} position={position} rotation={rotation} scale={scale} />;
}
