import { request } from './client';
import type { ApiLoad, LoadBroker, LoadsPage, LoadsQuery } from './types';

/** Load board. page/limit se pagination, text se search. */
export const getLoads = (query: LoadsQuery = {}) =>
  request<LoadsPage>('GET', '/api/loads', { query: { ...query } });

export const getLoad = (id: string) => request<ApiLoad>('GET', `/api/loads/${encodeURIComponent(id)}`);

export const getLoadBroker = (id: string) => request<LoadBroker>('GET', `/api/loads/${encodeURIComponent(id)}/broker`);

// Load rows in lists (calls, chats) only need the card data: one request per load per session.
const loadCache = new Map<string, Promise<ApiLoad>>();
export function getLoadCached(id: string): Promise<ApiLoad> {
  let p = loadCache.get(id);
  if (!p) {
    p = getLoad(id);
    p.catch(() => loadCache.delete(id));
    loadCache.set(id, p);
  }
  return p;
}
