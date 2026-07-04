import { useCallback, useEffect, useState } from 'react';
import {
  computeNextDueAt,
  dateStringToISO,
  getChoreInterval,
  isChoreSomeday,
} from '../lib/choreSchedule';
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
  ) => Promise<{ chore: Chore; nextDueAt: string | null } | null>;
  updateChore: (id: string, changes: Partial<Chore>) => Promise<boolean>;
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

      const isSomeday = !input.repeats;
      if (!isSomeday && !input.next_due_on) {
        setError('Set when this chore is next due.');
        return null;
      }

      try {
        const client = requireSupabase();
        const intervalValue = input.interval_value ?? 1;
        const intervalUnit = input.interval_unit ?? 'weeks';
        const showDayOfWeek =
          !isSomeday && intervalUnit === 'weeks' && intervalValue === 1;

        const insertRow = {
          user_id: userId,
          title: input.title,
          room: input.room?.trim() || null,
          time_estimate_minutes: input.time_estimate_minutes,
          recurrence_type: isSomeday ? ('someday' as const) : null,
          interval_value: isSomeday ? null : intervalValue,
          interval_unit: isSomeday ? null : intervalUnit,
          day_of_week: showDayOfWeek ? input.day_of_week ?? null : null,
          last_completed_at: null,
          next_due_at: isSomeday ? null : dateStringToISO(input.next_due_on!),
        };

        const { data, error: insertError } = await client
          .from('chores')
          .insert(insertRow)
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return null;
        }

        const chore = data as Chore;
        setError(null);
        setChores((prev) =>
          [...prev, chore].sort((a, b) => {
            const aDue = a.next_due_at ? new Date(a.next_due_at).getTime() : Number.POSITIVE_INFINITY;
            const bDue = b.next_due_at ? new Date(b.next_due_at).getTime() : Number.POSITIVE_INFINITY;
            return aDue - bDue;
          }),
        );
        return chore;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not add chore';
        setError(message);
        return null;
      }
    },
    [userId],
  );

  const completeChore = useCallback(
    async (
      id: string,
      actualTimeMinutes?: number,
    ): Promise<{ chore: Chore; nextDueAt: string | null } | null> => {
      const existing = chores.find((c) => c.id === id);
      if (!existing) return null;

      const lastCompletedAt = new Date().toISOString();
      const isSomeday = isChoreSomeday(existing);
      const interval = getChoreInterval(existing);

      const changes: Partial<Chore> = {
        last_completed_at: lastCompletedAt,
      };
      if (!isSomeday && interval) {
        changes.next_due_at = computeNextDueAt(
          interval.value,
          interval.unit,
          lastCompletedAt,
        );
      }
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
      return { chore: updated, nextDueAt: updated.next_due_at };
    },
    [chores],
  );

  const updateChore = useCallback(async (id: string, changes: Partial<Chore>): Promise<boolean> => {
    const client = requireSupabase();
    const { data, error: updateError } = await client
      .from('chores')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setError(null);
    setChores((prev) => prev.map((c) => (c.id === id ? (data as Chore) : c)));
    return true;
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
