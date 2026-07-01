import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import { getTodayDateString } from '../types';
import type { NewTaskInput, Task } from '../types';

interface UseTasksResult {
  tasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (task: NewTaskInput) => Promise<Task | null>;
  updateTask: (id: string, changes: Partial<Task>) => Promise<void>;
  completeTask: (id: string, changes: Partial<Task>) => Promise<Task | null>;
  undoComplete: (snapshot: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (newOrder: Task[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTasks(userId: string | undefined): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setCompletedTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const today = getTodayDateString();
    const client = requireSupabase();

    const [activeResult, completedResult] = await Promise.all([
      client
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_date', today)
        .neq('status', 'done')
        .order('order', { ascending: true }),
      client
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_date', today)
        .eq('status', 'done')
        .order('completed_at', { ascending: false }),
    ]);

    if (activeResult.error || completedResult.error) {
      setError(activeResult.error?.message ?? completedResult.error?.message ?? 'Failed to load tasks');
      setTasks([]);
      setCompletedTasks([]);
    } else {
      setTasks((activeResult.data as Task[]) ?? []);
      setCompletedTasks((completedResult.data as Task[]) ?? []);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (input: NewTaskInput): Promise<Task | null> => {
      if (!userId) return null;

      const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1);
      const today = getTodayDateString();

      const { data, error: insertError } = await requireSupabase()
        .from('tasks')
        .insert({
          user_id: userId,
          title: input.title.trim(),
          estimate_minutes: input.estimate_minutes,
          priority: input.priority,
          category: input.category?.trim() || null,
          status: 'todo',
          order: maxOrder + 1,
          scheduled_date: today,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const newTask = data as Task;
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    },
    [userId, tasks],
  );

  const updateTask = useCallback(async (id: string, changes: Partial<Task>) => {
    const { error: updateError } = await requireSupabase()
      .from('tasks')
      .update(changes)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    );
  }, []);

  const completeTask = useCallback(
    async (id: string, changes: Partial<Task>): Promise<Task | null> => {
      const snapshot = tasks.find((t) => t.id === id);
      if (!snapshot) return null;

      const completed: Task = {
        ...snapshot,
        ...changes,
        status: 'done',
        completed_at: changes.completed_at ?? new Date().toISOString(),
      };

      const { error: updateError } = await requireSupabase()
        .from('tasks')
        .update({
          status: 'done',
          completed_at: completed.completed_at,
          actual_minutes: completed.actual_minutes,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      setCompletedTasks((prev) => [completed, ...prev]);
      return snapshot;
    },
    [tasks],
  );

  const undoComplete = useCallback(async (snapshot: Task) => {
    const { error: updateError } = await requireSupabase()
      .from('tasks')
      .update({
        status: 'todo',
        completed_at: null,
        actual_minutes: snapshot.actual_minutes,
      })
      .eq('id', snapshot.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const restored: Task = {
      ...snapshot,
      status: 'todo',
      completed_at: null,
    };

    setCompletedTasks((prev) => prev.filter((t) => t.id !== snapshot.id));
    setTasks((prev) => [...prev, restored].sort((a, b) => a.order - b.order));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error: deleteError } = await requireSupabase()
      .from('tasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== id));
    setCompletedTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const reorderTasks = useCallback(async (newOrder: Task[]) => {
    const withOrder = newOrder.map((task, index) => ({ ...task, order: index }));
    setTasks(withOrder);

    const client = requireSupabase();
    const updates = withOrder.map((task) =>
      client.from('tasks').update({ order: task.order }).eq('id', task.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message);
    }
  }, []);

  return {
    tasks,
    completedTasks,
    loading,
    error,
    addTask,
    updateTask,
    completeTask,
    undoComplete,
    deleteTask,
    reorderTasks,
    refresh: fetchTasks,
  };
}
