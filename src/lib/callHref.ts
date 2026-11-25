import type { CallType } from '../api';

/** Route to the call screen. Pass `callId` to resume an active call, otherwise it starts a new one. */
export function callHref(p: { type?: CallType; loadId?: string | null; driverId?: string | null; truckId?: string | null; callId?: string }): string {
  const q = Object.entries(p)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `/call/new?${q}`;
}
