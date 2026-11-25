import { request } from './client';
import type { Call, CallDetail, CallTurnResult, CallType, DriverBriefingBody, DriverBriefingReply, StartCallBody } from './types';

export const listCalls = (query: { type?: CallType; status?: 'ACTIVE' | 'ENDED'; loadId?: string; limit?: number } = {}) =>
  request<{ items: Call[]; total: number }>('GET', '/api/calls', { query: { ...query } });

export const getCall = (id: string) => request<CallDetail>('GET', `/api/calls/${encodeURIComponent(id)}`);

/** 409 reasons: call-active, session-closed, no-live-context. */
export const startCall = (body: StartCallBody) => request<CallDetail>('POST', '/api/calls', { body });

/** One spoken turn. `text` is what the student said (typed for now, speech-to-text later). */
export const sendCallTurn = (id: string, text: string) =>
  request<CallTurnResult>('POST', `/api/calls/${encodeURIComponent(id)}/turn`, { body: { text } });

export const endCall = (id: string, reason: 'HANGUP' | 'TIMEOUT' | 'DEAL_CLOSED' | 'FINISHED' | 'ERROR' = 'HANGUP') =>
  request<Call>('POST', `/api/calls/${encodeURIComponent(id)}/end`, { body: { reason } });

export const bindCallLoad = (id: string, loadId: string) =>
  request<Call>('POST', `/api/calls/${encodeURIComponent(id)}/bind-load`, { body: { loadId } });

/** Driver chat: one text message, the AI driver answers. No history endpoint, the app keeps the thread. */
export const sendDriverMessage = (body: DriverBriefingBody) =>
  request<DriverBriefingReply>('POST', '/api/driver-briefing/messages', { body });

/** Turn roles are free text on the server, treat anything the student side says as "me". */
export const isMyTurn = (role: string) => /student|user|dispatcher|me\b/i.test(role);
