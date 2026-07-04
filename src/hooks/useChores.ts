import { useCallback, useEffect, useState } from 'react';
import { computeNextDueAt } from '../lib/choreSchedule';
import { requireSupabase } from '../lib/supabase';
import type { Chore, NewChoreInput } from '../types';

interface UseChoresResult {
  chores: Chore[];
  loading: boolean;
  error: string | null;
  addChore: (input: NewChoreInput) => Promise<Chore | null>;
  completeChore: (
    id: string,
    actualTimeMinutes?: number,
  ) => Promise<{ chore: Chore; nextDueAt: string } | null>;
  updateChore: (id: string, changes: Partial<Chore>) => Promise<void>;
  deleteChore: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useChores(userId: string | undefined): UseChoresResult {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChores = useCallback(async () => {
    if (!userId) {
      setChores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const client = requireSupabase();
    const { data, error: fetchError } = await client
      .from('chores')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setChores([]);
    } else {
      setChores((data as Chore[]) ?? []);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchChores();
  }, [fetchChores]);

  const addChore = useCallback(
    async (input: NewChoreInput): Promise<Chore | null> => {
      if (!userId) return null;

      const client = requireSupabase();
      const createdAt = new Date().toISOString();
      const nextDueAt = computeNextDueAt(
        input.recurrence_type,
        input.day_of_week,
        null,
        createdAt,
      );

      const { data, error: insertError } = await client
        .from('chores')
        .insert({
          user_id: userId,
          title: input.title,
          room: input.room?.trim() || null,
          time_estimate_minutes: input.time_estimate_minutes,
          recurrence_type: input.recurrence_type,
          day_of_week: input.day_of_week ?? null,
          next_due_at: nextDueAt,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const chore = data as Chore;
      setChores((prev) => [...prev, chore].sort(
        (a, b) => new Date(a.next_due_at).getTime() - new Date(b.next_due_at).getTime(),
      ));
      return chore;
    },
    [userId],
  );

  const completeChore = useCallback(
    async (
      id: string,
      actualTimeMinutes?: number,
    ): Promise<{ chore: Chore; nextDueAt: string } | null> => {
      const existing = chores.find((c) => c.id === id);
      if (!existing) return null;

      const lastCompletedAt = new Date().toISOString();
      const nextDueAt = computeNextDueAt(
        existing.recurrence_type,
        existing.day_of_week,
        lastCompletedAt,
        existing.created_at,
      );

      const changes: Partial<Chore> = {
        last_completed_at: lastCompletedAt,
        next_due_at: nextDueAt,
      };
      if (actualTimeMinutes != null) {
        changes.actual_time_minutes = actualTimeMinutes;
      }

      const client = requireSupabase();
      const { data, error: updateError } = await client
        .from('chores')
        .update(changes)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      const updated = data as Chore;
      setChores((prev) =>
        prev.map((c) => (c.id === id ? updated : c)),
      );
      return { chore: updated, nextDueAt };
    },
    [chores],
  );

  const updateChore = useCallback(async (id: string, changes: Partial<Chore>) => {
    const client = requireSupabase();
    const { error: updateError } = await client.from('chores').update(changes).eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setChores((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }, []);

  const deleteChore = useCallback(async (id: string) => {
    const client = requireSupabase();
    const { error: deleteError } = await client.from('chores').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setChores((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    chores,
    loading,
    error,
    addChore,
    completeChore,
    updateChore,
    deleteChore,
    refresh: fetchChores,
  };
}
