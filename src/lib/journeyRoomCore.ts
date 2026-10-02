export type JourneyRoomFocus = 'overview' | 'calendar' | 'laptop' | 'notebook' | 'plant' | 'memories';

/**
 * Convert UV coordinates from the 3D calendar page into the 0..41 day-cell index.
 * Returns null when the pointer is outside the actual calendar grid.
 * Three.js UV origin is bottom-left, while our texture layout is authored top-down.
 */
export function calendarDayIndexFromUv(uvX: number, uvY: number) {
  if (!Number.isFinite(uvX) || !Number.isFinite(uvY)) return null;
  const x = Math.min(1, Math.max(0, uvX));
  const yTop = 1 - Math.min(1, Math.max(0, uvY));

  const left = 0.055;
  const right = 0.945;
  const top = 0.315;
  const bottom = 0.885;

  if (x < left || x > right || yTop < top || yTop > bottom) return null;

  const column = Math.min(6, Math.floor(((x - left) / (right - left)) * 7));
  const row = Math.min(5, Math.floor(((yTop - top) / (bottom - top)) * 6));
  const index = row * 7 + column;
  return index >= 0 && index < 42 ? index : null;
}

export function journeyRoomFocusLabel(focus: JourneyRoomFocus) {
  switch (focus) {
    case 'calendar': return 'Calendar — click a date to write on it';
    case 'laptop': return 'Laptop — your year at a glance';
    case 'notebook': return 'Notebook — open Today';
    case 'plant': return 'Plant — visit Sanctuary';
    case 'memories': return 'Photo frame — open Memory Vault';
    default: return 'Study room — drag to look around and click objects';
  }
}
