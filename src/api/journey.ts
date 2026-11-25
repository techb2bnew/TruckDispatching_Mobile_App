import { request } from './client';
import type { JourneyDayView, JourneyView } from './types';

/** Raw journey map. Day / objective details sit in loosely typed objects, so read them with parseJourney. */
export const getJourney = () =>
  request<Record<string, unknown>>('GET', '/api/journey');

/** Start, resume or replay a day. Returns the updated journey map. 409 when the day is not playable yet. */
export const startJourneyDay = (day: number) =>
  request<Record<string, unknown>>('POST', `/api/journey/days/${day}/start`);

// ---- reading the journey defensively ----
const obj = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (...v: unknown[]) => v.find((x): x is number => typeof x === 'number');
const str = (...v: unknown[]) => v.find((x): x is string => typeof x === 'string' && x.length > 0);

function objectives(list: unknown): { label: string; done: boolean }[] {
  return arr(list)
    .map((o) => {
      if (typeof o === 'string') return { label: o, done: false };
      const x = obj(o);
      return {
        label: str(x?.label, x?.title, x?.text, x?.description, x?.name, x?.id) ?? '',
        done: x?.done === true || x?.completed === true || x?.complete === true,
      };
    })
    .filter((o) => o.label);
}

function parseDay(raw: unknown): JourneyDayView | null {
  const d = obj(raw);
  const day = num(d?.day);
  if (!d || day === undefined) return null;
  const cfg = obj(d.config);
  const reward = obj(cfg?.reward);
  return {
    day,
    status: (str(d.status) ?? 'LOCKED_DATE') as JourneyDayView['status'],
    title: str(d.title) ?? `Day ${day}`,
    zone: str(d.zone),
    stars: num(d.stars) ?? 0,
    lockedReason: str(d.lockedReason),
    availableOn: str(d.availableOn),
    description: str(cfg?.description),
    minutes: num(cfg?.estimatedMinutes),
    rewardXp: num(reward?.xp),
    rewardStars: num(reward?.stars),
    milestone: cfg?.milestone === true || typeof cfg?.milestone === 'string',
    objectives: objectives(cfg?.objectives),
    primaryRoute: str(cfg?.primaryRoute),
  };
}

export function parseJourney(raw: Record<string, unknown>): JourneyView {
  const days = arr(raw.days).map(parseDay).filter((d): d is JourneyDayView => !!d);
  const cal = obj(raw.calendar);
  const active = obj(raw.activeDay);
  const activeNo = num(active?.day, raw.currentDay);
  const progress = obj(raw.progress);
  return {
    days,
    currentDay: num(raw.currentDay) ?? null,
    completedCount: num(raw.completedCount) ?? days.filter((d) => d.status === 'COMPLETED').length,
    totalDays: num(raw.totalDays) ?? days.length,
    allComplete: raw.allComplete === true,
    demoMode: raw.demoMode === true,
    simulatorOpen: cal?.simulatorOpen !== false,
    simulatorOpensOn: str(cal?.simulatorOpensOn),
    active: active
      ? {
          day: activeNo,
          objectives: objectives(active.objectives ?? obj(active.config)?.objectives),
        }
      : null,
    xp: num(progress?.xp),
    level: num(progress?.level),
    stars: num(progress?.stars),
  };
}
