import * as Keychain from 'react-native-keychain';
import { API_BASE_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT_MS } from './config';
import type { Tokens } from './types';

/** Server error shape: { error: { code, message, details } }. status 0 = network/timeout. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

// ---- token storage (Keychain / Keystore) ----
const SERVICE = 'td-dispatcher-auth';
let cache: Tokens | null | undefined; // undefined = not read yet

export const tokenStore = {
  async get(): Promise<Tokens | null> {
    if (cache !== undefined) return cache;
    try {
      const r = await Keychain.getGenericPassword({ service: SERVICE });
      cache = r ? (JSON.parse(r.password) as Tokens) : null;
    } catch {
      cache = null;
    }
    return cache;
  },
  async set(tokens: Tokens) {
    cache = tokens;
    await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), { service: SERVICE });
  },
  async clear() {
    cache = null;
    try { await Keychain.resetGenericPassword({ service: SERVICE }); } catch { /* nothing stored */ }
  },
};

/** AuthProvider isko subscribe karta hai: refresh fail ho to app login par wapas aa jaye. */
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: (() => void) | null) => { onSessionExpired = fn; };

// ---- low level ----
type Query = Record<string, string | number | boolean | null | undefined>;
interface Options { query?: Query; body?: unknown; auth?: boolean }

const qs = (q?: Query) => {
  const parts = Object.entries(q ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

async function send(method: string, path: string, opts: Options, accessToken?: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}${qs(opts.query)}`, {
      method,
      headers: { ...DEFAULT_HEADERS, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: ctrl.signal,
    });
  } catch (e) {
    const aborted = (e as Error).name === 'AbortError';
    throw new ApiError(0, aborted ? 'TIMEOUT' : 'NETWORK', aborted ? 'Server did not respond in time' : 'Cannot reach the server. Check your internet.');
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const json = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: unknown } } | undefined)?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP_' + res.status, err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return json as T;
}

const safeJson = (t: string) => { try { return JSON.parse(t); } catch { return undefined; } };

// One refresh at a time, even if several requests hit 401 together.
let refreshing: Promise<Tokens | null> | null = null;
function refreshTokens(): Promise<Tokens | null> {
  refreshing ??= (async () => {
    const current = await tokenStore.get();
    if (!current) return null;
    try {
      const next = await parse<Tokens>(await send('POST', '/api/auth/refresh', { body: { refreshToken: current.refreshToken } }));
      await tokenStore.set(next);
      return next;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) throw e; // offline: keep the session
      await tokenStore.clear();
      onSessionExpired?.();
      return null;
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/** Every API function goes through here. Adds the Bearer token and retries once after a 401. */
export async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, opts: Options = {}): Promise<T> {
  const auth = opts.auth !== false;
  const tokens = auth ? await tokenStore.get() : null;
  let res = await send(method, path, opts, tokens?.accessToken);
  if (res.status === 401 && auth && tokens) {
    const next = await refreshTokens();
    if (next) res = await send(method, path, opts, next.accessToken);
  }
  return parse<T>(res);
}
