import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadUser, saveUser } from '../utils/storage';
import { supabase, hasSupabase } from '../lib/supabase';

const AuthContext = createContext(null);

function mapSupabaseUser(sbUser) {
  if (!sbUser) return null;
  return {
    id: sbUser.id,
    name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email || 'Traveler',
    email: sbUser.email || '',
    photoURL: sbUser.user_metadata?.avatar_url || null,
  };
}

async function upsertProfile(sbUser) {
  if (!supabase || !sbUser) return;
  const profile = {
    id: sbUser.id,
    name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email || null,
    email: sbUser.email || null,
    updated_at: new Date().toISOString(),
  };
  await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' });
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [authReady, setAuthReady] = useState(!hasSupabase());

  useEffect(() => {
    if (!hasSupabase()) {
      setUserState(loadUser());
      setAuthReady(true);
      return;
    }

    let mounted = true;

    const isOAuthReturn = typeof window !== 'undefined' && window.location.hash?.includes('access_token');

    function applySession(session, markReady = true) {
      if (!mounted) return;
      if (session?.user) {
        const u = mapSupabaseUser(session.user);
        setUserState(u);
        upsertProfile(session.user).catch(() => {});
      } else {
        setUserState(loadUser());
      }
      if (markReady) setAuthReady(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isOAuthReturn && !session?.user) {
        // Session may not be parsed from hash yet; wait and re-check before showing welcome.
        applySession(session, false);
      } else {
        applySession(session);
      }
    });

    let timeoutId;
    if (isOAuthReturn) {
      timeoutId = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted) {
            if (session?.user) applySession(session);
            else setAuthReady(true);
          }
        });
      }, 200);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        const u = mapSupabaseUser(session.user);
        setUserState(u);
        upsertProfile(session.user).catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        setUserState(null);
        saveUser(null);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const setUser = useCallback((profile) => {
    if (!profile) {
      setUserState(null);
      saveUser(null);
      return;
    }
    const next = {
      id: profile.id || `user-${Date.now()}`,
      name: profile.name || '',
      email: profile.email || '',
      photoURL: profile.photoURL || null,
    };
    setUserState(next);
    saveUser(next);
  }, []);

  const signOut = useCallback(async () => {
    if (hasSupabase() && user?.id && !user.id.startsWith('user-')) {
      await supabase.auth.signOut();
    }
    setUserState(null);
    saveUser(null);
  }, [user?.id]);

  const signInWithGoogle = useCallback(async () => {
    if (!hasSupabase()) return;
    const redirectTo = typeof window !== 'undefined' ? window.location.origin + (window.location.pathname || '') : undefined;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : undefined,
    });
  }, []);

  const value = {
    user,
    setUser,
    signOut,
    signInWithGoogle,
    hasSupabase,
    authReady,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
