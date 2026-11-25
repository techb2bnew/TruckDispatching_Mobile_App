import { request } from './client';
import type { BrokerSession, MailMessage } from './types';

export const listBrokerSessions = () =>
  request<{ items: BrokerSession[]; total: number }>('GET', '/api/broker/sessions');

export const getBrokerSession = (id: string) => request<BrokerSession>('GET', `/api/broker/sessions/${encodeURIComponent(id)}`);

/** Reply inside an existing thread. Returns the updated session (broker reply may be queued: see pendingReply). */
export const sendBrokerMessage = (sessionId: string, body: string, subject?: string) =>
  request<BrokerSession>('POST', `/api/broker/sessions/${encodeURIComponent(sessionId)}/messages`, { body: { body, subject } });

/** New email for a load. Creates the thread if there is none yet. */
export const sendBrokerEmailForLoad = (loadId: string, body: string, subject?: string) =>
  request<BrokerSession>('POST', `/api/broker/sessions/by-load/${encodeURIComponent(loadId)}/messages`, { body: { body, subject } });

/** Only allowed once a rate is agreed (409 otherwise). */
export const confirmBrokerDeal = (sessionId: string) =>
  request<BrokerSession>('POST', `/api/broker/sessions/${encodeURIComponent(sessionId)}/confirm`);

// ---- message normalising ----
// The server spec does not describe a message object, so read the common field names defensively.
// If the real names differ, this is the only place to adjust.
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

function toTs(v: unknown): number | undefined {
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  if (typeof v === 'string') { const n = Date.parse(v); return Number.isNaN(n) ? undefined : n; }
  return undefined;
}

function fromStudent(m: Record<string, unknown>): boolean {
  const tag = [m.from, m.sender, m.senderRole, m.role, m.direction, m.author, m.authorType, m.type]
    .map(str).filter(Boolean).join(' ').toLowerCase();
  if (/(student|user|me|outbound|sent|out)\b/.test(tag)) return true;
  if (/(broker|ai|agent|assistant|inbound|received|in)\b/.test(tag)) return false;
  return m.isStudent === true || m.fromStudent === true || m.isMine === true;
}

export function mailMessages(s: BrokerSession): MailMessage[] {
  const base = toTs(s.createdAt) ?? 0;
  return (s.messages ?? [])
    .map((m, i): MailMessage => ({
      id: str(m.id) ?? `m${i}`,
      from: fromStudent(m) ? 'student' : 'broker',
      body: str(m.body) ?? str(m.text) ?? str(m.content) ?? str(m.message) ?? '',
      subject: str(m.subject),
      ts: toTs(m.createdAt) ?? toTs(m.sentAt) ?? toTs(m.timestamp) ?? toTs(m.ts) ?? toTs(m.date) ?? base + i,
    }))
    .filter((m) => m.body.length > 0)
    .sort((a, b) => a.ts - b.ts);
}

/** Time of the newest message, else when the session last changed (for sorting the inbox). */
export function lastActivity(s: BrokerSession): number {
  const msgs = mailMessages(s);
  return msgs.at(-1)?.ts ?? toTs(s.updatedAt) ?? toTs(s.createdAt) ?? 0;
}
