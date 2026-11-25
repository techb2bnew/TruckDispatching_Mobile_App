import { request } from './client';
import type { LoadBroker } from './types';

// Broker details almost never change, so keep one promise per company for the whole session.
const cache = new Map<string, Promise<LoadBroker>>();

export function getCompanyBroker(companyId: string): Promise<LoadBroker> {
  let p = cache.get(companyId);
  if (!p) {
    p = request<LoadBroker>('GET', `/api/companies/${encodeURIComponent(companyId)}/broker`);
    p.catch(() => cache.delete(companyId)); // do not cache failures
    cache.set(companyId, p);
  }
  return p;
}
