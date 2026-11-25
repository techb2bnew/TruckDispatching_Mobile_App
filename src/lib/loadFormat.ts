import type { ApiLoad, LoadPlace } from '../api';

export const placeLabel = (p?: LoadPlace) => [p?.city, p?.state].filter(Boolean).join(', ') || '—';

/** "Today 14:00", "Tomorrow 07:30", "+3d 10:00" from the server's dayOffset + time. */
export function pickupLabel(p?: LoadPlace): string {
  if (!p) return '—';
  const day = p.dayOffset === undefined ? '' : p.dayOffset === 0 ? 'Today' : p.dayOffset === 1 ? 'Tomorrow' : `+${p.dayOffset}d`;
  return [day, p.time].filter(Boolean).join(' ') || '—';
}

export const rateLabel = (l: ApiLoad) => (l.rate.total == null ? 'Call for rate' : `$${l.rate.total.toLocaleString('en-US')}`);
export const equipmentLabel = (l: ApiLoad) => l.equipment.label ?? l.equipment.truckType ?? '—';
