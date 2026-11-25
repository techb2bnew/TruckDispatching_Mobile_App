import { request, tokenStore } from './client';
import type { ProfileStats, User } from './types';

/** Raw student profile (rank, level, XP, stars, achievements). Its shape is not described in the spec: see parseProfile. */
export const getProfile = () =>
  request<Record<string, unknown>>('GET', '/api/profile');

export const updateMe = (body: { name?: string }) =>
  request<User>('PATCH', '/api/users/me', { body });

/** The server logs out every session afterwards, so the caller must sign in again. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await request<{ message: string }>('POST', '/api/auth/change-password', {
    body: { currentPassword, newPassword },
  });
  await tokenStore.clear();
}

// ---- reading the profile defensively ----
const obj = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
const num = (...v: unknown[]) =>
  v.find((x): x is number => typeof x === 'number');
const str = (...v: unknown[]) =>
  v.find((x): x is string => typeof x === 'string' && x.length > 0);

export function parseProfile(
  raw: Record<string, unknown> | null,
): ProfileStats {
  if (!raw) return { achievements: [] };
  const progress = obj(raw.progress) ?? raw;
  const rank = obj(progress.rank);
  const stats = obj(raw.stats);
  const course = obj(raw.course);
  const list = Array.isArray(raw.achievements) ? raw.achievements : [];
  return {
    xp: num(progress.xp),
    level: num(progress.level),
    stars: num(progress.stars),
    pct: num(progress.pct),
    xpIntoLevel: num(progress.xpIntoLevel),
    xpForNextLevel: num(progress.xpForNextLevel),
    rank: str(rank?.title),
    decisions: num(stats?.decisions),
    mistakes: num(stats?.mistakes),
    hintsUsed: num(stats?.hintsUsed),
    trainingDay: num(course?.trainingDay),
    totalDays: num(course?.totalDays),
    achievements: list
      .map(a => {
        const o = obj(a);
        return {
          title: str(o?.title) ?? '',
          detail: str(o?.description),
          earned: o?.awardedAt != null,
        };
      })
      .filter(a => a.title),
  };
}
