import { useCallback, useEffect, useState } from 'react';
import {
  applyRecurrenceChoiceToChoreChanges,
  computeNextDueAt,
  dateStringToISO,
  deriveDayOfWeekForChore,
  getChoreInterval,
  isChoreSomeday,
  nextDueAtToDateString,
  normalizeChoreTitle,
} from '../lib/choreSchedule';
import { requireSupabase } from '../lib/supabase';
import { normalizeRoomName } from '../lib/roomIcons';
import type { Chore, ChoreRecurrenceChoice, NewChoreInput } from '../types';

interface UseChoresResult {
  chores: Chore[];
  loading: boolean;
  error: string | null;
  addChore: (input: NewChoreInput) => Promise<Chore | null>;
  completeChore: (
    id: string,
    actualTimeMinutes?: number,
    recurrenceChoice?: ChoreRecurrenceChoice,
  ) => Promise<{ chore: Chore; nextDueAt: string | null } | null>;
  undoCompleteChore: (snapshot: Chore) => Promise<boolean>;
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
      const rows = (data as Chore[]) ?? [];
      const needsRename = rows.filter(
        (chore) => chore.room != null && normalizeRoomName(chore.room) !== chore.room.trim(),
      );

      if (needsRename.length > 0) {
        await Promise.all(
          needsRename.map((chore) =>
            client
              .from('chores')
              .update({ room: normalizeRoomName(chore.room!) })
              .eq('id', chore.id)
              .eq('user_id', userId),
          ),
        );
      }

      setChores(
        rows.map((chore) =>
          chore.room
            ? { ...chore, room: normalizeRoomName(chore.room) }
            : chore,
        ),
      );
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchChores();
  }, [fetchChores]);

  const addChore = useCallback(
    async (input: NewChoreInput): Promise<Chore | null> => {
      if (!userId) return null;

      const isSomeday = input.is_someday === true;
      const hasRecurrence =
        input.repeats && input.interval_value != null && input.interval_unit != null;
      const intervalValue = input.interval_value ?? 1;
      const intervalUnit = input.interval_unit ?? 'weeks';
      const nextDueOn = input.next_due_on;

      if (!isSomeday && !nextDueOn) {
        setError('Set when this chore is first due.');
        return null;
      }

      try {
        const client = requireSupabase();

        const dayOfWeek =
          input.day_of_week != null
            ? input.day_of_week
            : hasRecurrence && nextDueOn
              ? deriveDayOfWeekForChore(intervalValue, intervalUnit, nextDueOn)
              : null;

        const insertRow = {
          user_id: userId,
          title: normalizeChoreTitle(input.title),
          room: input.room ? normalizeRoomName(input.room) || null : null,
          time_estimate_minutes: input.time_estimate_minutes,
          recurrence_type: isSomeday ? ('someday' as const) : null,
          interval_value: hasRecurrence ? intervalValue : null,
          interval_unit: hasRecurrence ? intervalUnit : null,
          day_of_week: dayOfWeek,
          last_completed_at: null,
          next_due_at: isSomeday ? null : dateStringToISO(nextDueOn!),
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
      recurrenceChoice?: ChoreRecurrenceChoice,
    ): Promise<{ chore: Chore; nextDueAt: string | null } | null> => {
      const existing = chores.find((c) => c.id === id);
      if (!existing) return null;

      const lastCompletedAt = new Date().toISOString();
      const isSomeday = isChoreSomeday(existing);
      const interval = getChoreInterval(existing);

      let changes: Partial<Chore>;

      if (isSomeday) {
        if (recurrenceChoice) {
          changes = applyRecurrenceChoiceToChoreChanges(recurrenceChoice, lastCompletedAt);
        } else {
          // Mark done — leave no further occurrence.
          changes = {
            last_completed_at: lastCompletedAt,
            recurrence_type: null,
            interval_value: null,
            interval_unit: null,
            day_of_week: null,
            next_due_at: null,
          };
        }
      } else {
        changes = { last_completed_at: lastCompletedAt };
        if (interval) {
          // Always advance from the scheduled due calendar day — never from "today".
          const dueDateStr = nextDueAtToDateString(existing.next_due_at);
          changes.next_due_at = dueDateStr
            ? computeNextDueAt(interval.value, interval.unit, dueDateStr)
            : computeNextDueAt(interval.value, interval.unit, lastCompletedAt);
        } else {
          // Once task: clear due date so it leaves active lists.
          changes.next_due_at = null;
        }
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
      setError(null);
      setChores((prev) =>
        prev.map((c) => (c.id === id ? updated : c)),
      );
      return { chore: updated, nextDueAt: updated.next_due_at };
    },
    [chores],
  );

  const undoCompleteChore = useCallback(async (snapshot: Chore): Promise<boolean> => {
    const client = requireSupabase();
    const { data, error: updateError } = await client
      .from('chores')
      .update({
        next_due_at: snapshot.next_due_at,
        last_completed_at: snapshot.last_completed_at ?? null,
        actual_time_minutes: snapshot.actual_time_minutes ?? null,
        recurrence_type: snapshot.recurrence_type ?? null,
        interval_value: snapshot.interval_value ?? null,
        interval_unit: snapshot.interval_unit ?? null,
        day_of_week: snapshot.day_of_week ?? null,
      })
      .eq('id', snapshot.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setError(null);
    setChores((prev) => prev.map((c) => (c.id === snapshot.id ? (data as Chore) : c)));
    return true;
  }, []);

  const updateChore = useCallback(async (id: string, changes: Partial<Chore>): Promise<boolean> => {
    let payload: Partial<Chore> = changes;
    if (changes.title != null) {
      payload = { ...payload, title: normalizeChoreTitle(changes.title) };
    }
    if (changes.room != null) {
      payload = { ...payload, room: normalizeRoomName(changes.room) || null };
    }

    const client = requireSupabase();
    const { data, error: updateError } = await client
      .from('chores')
      .update(payload)
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
    undoCompleteChore,
    updateChore,
    deleteChore,
    refresh: fetchChores,
  };
}
