'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { PresenceStatus } from '@/components/presence/StatusPicker';

interface AuthProfile {
  username: string;
  userTag: number | null;
  avatarUrl: string | null;
  status: PresenceStatus;
  role: string | null;
  bio: string | null;
  usernameChangedAt: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  profile: AuthProfile;
  resolved: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_PROFILE: AuthProfile = {
  username: '',
  userTag: null,
  avatarUrl: null,
  status: 'online',
  role: null,
  bio: null,
  usernameChangedAt: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getFallbackProfile(session: Session | null): AuthProfile {
  return {
    username: session?.user.user_metadata?.username ?? '',
    userTag: null,
    avatarUrl: null,
    status: 'online',
    role: null,
    bio: null,
    usernameChangedAt: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile>(DEFAULT_PROFILE);
  const [resolved, setResolved] = useState(false);

  const applySession = useCallback((session: Session | null) => {
    setUser(session?.user ?? null);
    setToken(session?.access_token ?? null);
    setProfile(session?.user ? getFallbackProfile(session) : DEFAULT_PROFILE);
    setResolved(true);
  }, []);

  const hydrateProfile = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('username, user_tag, avatar_url, status, role, bio, username_changed_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Failed to load profile', error);
      return;
    }

    setProfile({
      username: data?.username || session.user.user_metadata?.username || '',
      userTag: data?.user_tag ?? null,
      avatarUrl: data?.avatar_url || null,
      status: (data?.status as PresenceStatus | null) ?? 'online',
      role: data?.role ?? null,
      bio: data?.bio ?? null,
      usernameChangedAt: data?.username_changed_at ?? null,
    });
  }, []);

  const syncSession = useCallback(async (sessionOverride?: Session | null) => {
    try {
      const session = sessionOverride === undefined
        ? (await createClient().auth.getSession()).data.session
        : sessionOverride;

      applySession(session);
      void hydrateProfile(session);
    } catch (error) {
      console.error('[Auth] Failed to sync session', error);
      applySession(null);
    }
  }, [applySession, hydrateProfile]);

  const refresh = useCallback(async () => {
    await syncSession();
  }, [syncSession]);

  useEffect(() => {
    const supabase = createClient();

    void syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        void syncSession(session);
      }
    );

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncSession();
      }
    };

    const handlePageShow = () => {
      void syncSession();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handlePageShow);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [syncSession]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    profile,
    resolved,
    refresh,
  }), [user, token, profile, resolved, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
