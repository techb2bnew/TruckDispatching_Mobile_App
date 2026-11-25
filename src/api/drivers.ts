import { request } from './client';
import type { Driver, DriversPage } from './types';

export const getDrivers = (query: { page?: number; limit?: number; search?: string; availability?: Driver['availability'] } = {}) =>
  request<DriversPage>('GET', '/api/fleet/drivers', { query: { ...query } });

// The roster is small and rarely changes: load it once per session and look drivers up by id.
let all: Promise<Map<string, Driver>> | null = null;

export function getDriverMap(): Promise<Map<string, Driver>> {
  all ??= getDrivers({ limit: 50 })
    .then((p) => new Map(p.items.map((d) => [d.id, d])))
    .catch((e) => { all = null; throw e; }); // retry next time
  return all;
}

/** Clear on sign-out so the next account does not see a stale cache. */
export const resetDriverCache = () => { all = null; };
