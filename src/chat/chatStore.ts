import { useMemo, useSyncExternalStore } from 'react';
import { isMyTurn, sendDriverMessage, type CallTurn } from '../api';

/**
 * Driver chat threads. The server has no "list messages" endpoint for driver chat, so the app keeps
 * the thread here (memory only: it is rebuilt from the call's turns when the server has them).
 */
export interface ChatMsg { id: string; from: 'me' | 'driver' | 'system'; body: string; ts: number }

export interface ChatThread {
  key: string;
  loadId: string;
  driverId: string;
  truckId?: string;
  messages: ChatMsg[];
  typing: boolean;
  outcome: string | null;
  over: boolean;
  scorecard: Record<string, unknown> | null;
  updatedAt: number;
}

export const threadKey = (loadId: string, driverId: string, truckId?: string | null) => `${loadId}|${driverId}|${truckId ?? ''}`;

let threads: Record<string, ChatThread> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => { listeners.delete(l); });

const patch = (key: string, fn: (t: ChatThread) => Partial<ChatThread>) => {
  const cur = threads[key];
  if (!cur) return;
  threads = { ...threads, [key]: { ...cur, ...fn(cur) } };
  emit();
};

// Stable snapshot for useSyncExternalStore: the `threads` object only changes on write.
export function useThreadMap(): Record<string, ChatThread> {
  return useSyncExternalStore(subscribe, () => threads, () => threads);
}

export function useChatThreads(): ChatThread[] {
  const map = useThreadMap();
  return useMemo(() => Object.values(map), [map]);
}

export const useChatThread = (key: string): ChatThread | undefined => useThreadMap()[key];

export function ensureThread(loadId: string, driverId: string, truckId?: string | null): ChatThread {
  const key = threadKey(loadId, driverId, truckId);
  if (!threads[key]) {
    threads = {
      ...threads,
      [key]: { key, loadId, driverId, truckId: truckId ?? undefined, messages: [], typing: false, outcome: null, over: false, scorecard: null, updatedAt: Date.now() },
    };
    emit();
  }
  return threads[key];
}

/** Fill an empty thread from the server's call turns (after an app restart). */
export function seedThread(key: string, turns: CallTurn[]) {
  const t = threads[key];
  if (!t || t.messages.length || !turns.length) return;
  patch(key, () => ({
    messages: turns
      .filter((x) => x.text)
      .map((x, i) => ({ id: x.id ?? `s${i}`, from: isMyTurn(x.role) ? 'me' : 'driver', body: x.text, ts: Date.parse(x.at) || Date.now() - (turns.length - i) * 1000 })),
  }));
}

let seq = 0;

/** Send a student message and add the driver's AI reply. Throws (after cleaning up) when the call fails. */
export async function sendChat(key: string, text: string) {
  const t = threads[key];
  const body = text.trim();
  if (!t || !body) return;
  const mine: ChatMsg = { id: `me${++seq}${Date.now()}`, from: 'me', body, ts: Date.now() };
  patch(key, (c) => ({ messages: [...c.messages, mine], typing: true, updatedAt: mine.ts }));
  try {
    const r = await sendDriverMessage({ loadId: t.loadId, driverId: t.driverId, truckId: t.truckId, message: body });
    patch(key, (c) => ({
      messages: [...c.messages, { id: `dr${++seq}${Date.now()}`, from: 'driver', body: r.reply, ts: Date.now() }],
      typing: false,
      outcome: r.outcome ?? c.outcome,
      over: r.sessionOver,
      scorecard: r.scorecard ?? c.scorecard,
      updatedAt: Date.now(),
    }));
  } catch (e) {
    patch(key, (c) => ({ messages: c.messages.filter((m) => m.id !== mine.id), typing: false }));
    throw e;
  }
}

export function resetChat() {
  threads = {};
  emit();
}
