import { ApiError, request, tokenStore } from './client';
import type { LoginResponse, User } from './types';

/** identifier = email ya Student ID. */
export async function login(identifier: string, password: string): Promise<User> {
  const r = await request<LoginResponse>('POST', '/api/auth/login', { auth: false, body: { identifier: identifier.trim(), password } });
  await tokenStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
  return r.user;
}

export const getMe = () => request<User>('GET', '/api/users/me');

/** App start par: saved token se user wapas lao. Token nahi / invalid ho to null. */
export async function restoreSession(): Promise<User | null> {
  if (!(await tokenStore.get())) return null;
  try {
    return await getMe();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) await tokenStore.clear();
    return null;
  }
}

export async function logout(): Promise<void> {
  const tokens = await tokenStore.get();
  try {
    if (tokens) await request<void>('POST', '/api/auth/logout', { body: { refreshToken: tokens.refreshToken } });
  } catch { /* server side revoke best-effort */ }
  await tokenStore.clear();
}
