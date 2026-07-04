import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { completeAuthFromCurrentUrl, completeAuthFromUrl } from '../lib/authCallback';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';

function getRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL ?? '';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const client = requireSupabase();

    void completeAuthFromCurrentUrl(client).then(({ error }) => {
      if (error) console.error('Auth callback error:', error.message);
    });

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
    const redirectTo = getRedirectUrl();
    const { error } = await requireSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithMagicLinkUrl = useCallback(async (url: string) => {
    const { error } = await completeAuthFromUrl(requireSupabase(), url);
    if (error) throw error;
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    session,
    loading,
    signInWithMagicLink,
    signInWithMagicLinkUrl,
    signOut,
  };
}
