import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, resetDriverCache, restoreSession, setSessionExpiredHandler, type User } from '../api';
import { resetChat } from '../chat/chatStore';

/** Per-account data (driver chats, cached roster) must not leak into the next login. */
const clearSessionData = () => { resetChat(); resetDriverCache(); };

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  user: User | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** After editing the profile: keep the app's copy of the user in sync. */
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    restoreSession().then((u) => {
      if (!alive) return;
      setUser(u);
      setStatus(u ? 'signedIn' : 'signedOut');
    });
    // refresh token reject ho jaye to seedha login par
    setSessionExpiredHandler(() => { clearSessionData(); setUser(null); setStatus('signedOut'); });
    return () => { alive = false; setSessionExpiredHandler(null); };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const u = await apiLogin(identifier, password); // throws ApiError, Login screen shows it
    setUser(u);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    clearSessionData();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut, setUser }), [status, user, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
