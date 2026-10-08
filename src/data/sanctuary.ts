export type SanctuaryRegionId = 'threshold' | 'home-grove' | 'moon-pond' | 'quiet-pavilion' | 'lookout';

export interface SanctuaryCameraPreset {
  target: [number, number, number];
  yaw: number;
  pitch: number;
  distance: number;
}

export interface SanctuaryRegion {
  id: SanctuaryRegionId;
  label: string;
  shortLabel: string;
  description: string;
  meaning: string;
  position: [number, number, number];
  camera: SanctuaryCameraPreset;
}

export const sanctuaryRegions: SanctuaryRegion[] = [
  {
    id: 'threshold',
    label: 'The Threshold',
    shortLabel: 'Entrance',
    description: 'The path into your Sanctuary. A calm starting point rather than another dashboard.',
    meaning: 'The shared entrance reflects the overall amount of life that has accumulated across Ikigai Space.',
    position: [0, 0.2, 8.2],
    camera: { target: [0, 0.8, 4.8], yaw: 0.02, pitch: 0.16, distance: 11.8 }
  },
  {
    id: 'home-grove',
    label: 'Home Grove',
    shortLabel: 'Grove',
    description: 'The heart of the world. Your existing Garden growth is represented here for continuity.',
    meaning: 'Completed everyday work enriches the grove with flowers, younger growth and small ground details.',
    position: [0.2, 0.25, -0.5],
    camera: { target: [0.2, 1.35, -0.5], yaw: -0.14, pitch: 0.13, distance: 7.4 }
  },
  {
    id: 'moon-pond',
    label: 'Moon Pond',
    shortLabel: 'Pond',
    description: 'A quiet edge of the Sanctuary where the world slows down and reflections have room to breathe.',
    meaning: 'Written weekly reflections deepen the pond through lilies, reeds and a restrained reflective glow.',
    position: [-7.1, 0.08, 2.6],
    camera: { target: [-6.6, 0.65, 2.3], yaw: -0.74, pitch: 0.16, distance: 7.9 }
  },
  {
    id: 'quiet-pavilion',
    label: 'Quiet Pavilion',
    shortLabel: 'Pavilion',
    description: 'A sheltered place where memories gather without turning your private archive into visible labels or cards.',
    meaning: 'Memory Vault entries leave subtle lantern traces around the pavilion without exposing their contents.',
    position: [6.6, 0.22, 3.4],
    camera: { target: [6.1, 1.15, 3.1], yaw: 0.76, pitch: 0.13, distance: 7.3 }
  },
  {
    id: 'lookout',
    label: 'The Lookout',
    shortLabel: 'Lookout',
    description: 'A higher route where long-term plans and proof of work gradually become structure on the horizon.',
    meaning: 'Roadmap checkpoints develop the route; Career and Proof build a small beacon at the ridge.',
    position: [6.7, 1.2, -6.3],
    camera: { target: [5.8, 1.8, -5.2], yaw: 0.56, pitch: 0.2, distance: 9.2 }
  }
];

export const sanctuaryRegionById = Object.fromEntries(
  sanctuaryRegions.map(region => [region.id, region])
) as Record<SanctuaryRegionId, SanctuaryRegion>;

export const sanctuaryHomeCamera: SanctuaryCameraPreset = {
  // A slightly offset establishing shot keeps pond, grove, street and mountain in one frame.
  target: [-0.45, 1.08, -0.8],
  yaw: 0.22,
  pitch: 0.135,
  distance: 14.4
};


export type SanctuaryStillViewId = 'pond-edge' | 'pavilion-veranda' | 'mountain-view' | 'guardian-grove' | 'lantern-street' | 'tea-house';

export interface SanctuaryStillView {
  id: SanctuaryStillViewId;
  label: string;
  note: string;
  camera: SanctuaryCameraPreset;
}

export const sanctuaryStillViews: SanctuaryStillView[] = [
  {
    id: 'pond-edge',
    label: 'Pond edge',
    note: 'Sit low beside the water and let the grove fill the edges of the frame.',
    camera: { target: [-6.5, .72, 2.25], yaw: -.43, pitch: .075, distance: 5.9 }
  },
  {
    id: 'pavilion-veranda',
    label: 'Pavilion veranda',
    note: 'A sheltered view back toward the pond and the living center of the Sanctuary.',
    camera: { target: [4.7, 1.05, 2.35], yaw: .72, pitch: .07, distance: 5.8 }
  },
  {
    id: 'mountain-view',
    label: 'Mountain view',
    note: 'Look past the grove toward the distant mountain and the slow horizon.',
    camera: { target: [0, 2.7, -9.4], yaw: .015, pitch: .095, distance: 14.1 }
  },
  {
    id: 'guardian-grove',
    label: 'Guardian grove',
    note: 'Stay near the tree that carries the continuity of your completed work.',
    camera: { target: [.2, 1.38, -.5], yaw: -.28, pitch: .09, distance: 6.2 }
  },
  {
    id: 'lantern-street',
    label: 'Lantern street',
    note: 'A quiet street at the edge of the world. Warm windows and no task waiting behind the door.',
    camera: { target: [9.55, 1.25, 1.75], yaw: .78, pitch: .065, distance: 7.15 }
  },
  {
    id: 'tea-house',
    label: 'Tea house window',
    note: 'Stay by the warm window. This view has no score, timer, checklist or hidden system behind it.',
    camera: { target: [10.36, 1.05, 4.92], yaw: .72, pitch: .055, distance: 4.95 }
  }
];

export const sanctuaryStillViewById = Object.fromEntries(
  sanctuaryStillViews.map(view => [view.id, view])
) as Record<SanctuaryStillViewId, SanctuaryStillView>;
