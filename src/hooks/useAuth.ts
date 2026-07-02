import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';

const REDIRECT_URL =
  import.meta.env.VITE_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const client = requireSupabase();

    const handleMagicLinkCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (!code) return;

      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) console.error('Auth callback error:', error.message);
      window.history.replaceState({}, '', window.location.pathname);
    };

    void handleMagicLinkCallback();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const redirectTo = REDIRECT_URL || window.location.origin;
    const { error } = await requireSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  }, []);

  return { user, session, loading, signInWithMagicLink, signOut };
}
