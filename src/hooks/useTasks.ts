import { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import { getTodayDateString } from '../types';
import type { NewTaskInput, Task } from '../types';

interface UseTasksResult {
  tasks: Task[];
  backlogTasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (task: NewTaskInput) => Promise<Task | null>;
  updateTask: (id: string, changes: Partial<Task>) => Promise<void>;
  completeTask: (id: string, changes: Partial<Task>) => Promise<Task | null>;
  undoComplete: (snapshot: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (newOrder: Task[]) => Promise<void>;
  reorderBacklogTasks: (newOrder: Task[]) => Promise<void>;
  moveBacklogTaskToTop: (id: string) => Promise<void>;
  scheduleForToday: (ids: string[]) => Promise<void>;
  moveToBacklog: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function applyReorder(prev: Task[], newOrder: Task[]): Task[] {
  const valid = newOrder.filter((task): task is Task => Boolean(task?.id));

  if (prev.length === 0) {
    return valid.map((task, index) => ({ ...task, order: index }));
  }

  if (valid.length === 0) {
    return prev;
  }

  const prevIds = new Set(prev.map((task) => task.id));
  const hasAllTasks =
    valid.length === prev.length && valid.every((task) => prevIds.has(task.id));

  if (hasAllTasks) {
    return valid.map((task, index) => ({ ...task, order: index }));
  }

  const orderIndex = new Map(valid.map((task, index) => [task.id, index]));
  return [...prev]
    .sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    )
    .map((task, index) => {
      const moved = valid.find((candidate) => candidate.id === task.id);
      return { ...(moved ?? task), order: index };
    });
}

async function persistOrders(tasks: Task[]): Promise<string | null> {
  const client = requireSupabase();
  const results = await Promise.all(
    tasks.map((task) =>
      client.from('tasks').update({ order: task.order }).eq('id', task.id),
    ),
  );
  const failed = results.find((r) => r.error);
  return failed?.error?.message ?? null;
}

export function useTasks(userId: string | undefined): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setBacklogTasks([]);
      setCompletedTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const today = getTodayDateString();
    const client = requireSupabase();

    const [activeResult, completedResult, backlogResult] = await Promise.all([
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
      client
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .is('scheduled_date', null)
        .neq('status', 'done')
        .order('order', { ascending: true }),
    ]);

    if (activeResult.error || completedResult.error || backlogResult.error) {
      setError(
        activeResult.error?.message ??
          completedResult.error?.message ??
          backlogResult.error?.message ??
          'Failed to load tasks',
      );
      setTasks([]);
      setBacklogTasks([]);
      setCompletedTasks([]);
    } else {
      setTasks((activeResult.data as Task[]) ?? []);
      setCompletedTasks((completedResult.data as Task[]) ?? []);
      setBacklogTasks((backlogResult.data as Task[]) ?? []);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (input: NewTaskInput): Promise<Task | null> => {
      if (!userId) return null;

      const maxOrder = backlogTasks.reduce((max, t) => Math.max(max, t.order), -1);

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
          scheduled_date: null,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const newTask = data as Task;
      setBacklogTasks((prev) => [...prev, newTask]);
      return newTask;
    },
    [userId, backlogTasks],
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

    const touchesSchedule = Object.prototype.hasOwnProperty.call(changes, 'scheduled_date');

    if (touchesSchedule) {
      void fetchTasks();
      return;
    }

    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    );
    setBacklogTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    );
    setCompletedTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    );
  }, [fetchTasks]);

  const completeTask = useCallback(
    async (id: string, changes: Partial<Task>): Promise<Task | null> => {
      const snapshot =
        tasks.find((t) => t.id === id) ?? backlogTasks.find((t) => t.id === id);
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
          actual_minutes: completed.actual_minutes ?? snapshot.actual_minutes,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      setBacklogTasks((prev) => prev.filter((t) => t.id !== id));

      const today = getTodayDateString();
      if (snapshot.scheduled_date === today) {
        setCompletedTasks((prev) => [completed, ...prev]);
      }

      return snapshot;
    },
    [tasks, backlogTasks],
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
    setBacklogTasks((prev) => prev.filter((task) => task.id !== id));
    setCompletedTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const reorderTasks = useCallback(async (newOrder: Task[]) => {
    let withOrder: Task[] = [];

    setTasks((prev) => {
      withOrder = applyReorder(prev, newOrder);
      return withOrder;
    });

    if (withOrder.length === 0) return;

    const message = await persistOrders(withOrder);
    if (message) setError(message);
  }, []);

  const reorderBacklogTasks = useCallback(async (newOrder: Task[]) => {
    let withOrder: Task[] = [];

    setBacklogTasks((prev) => {
      withOrder = applyReorder(prev, newOrder);
      return withOrder;
    });

    if (withOrder.length === 0) return;

    const message = await persistOrders(withOrder);
    if (message) setError(message);
  }, []);

  const scheduleForToday = useCallback(
    async (ids: string[]) => {
      if (!userId || ids.length === 0) return;

      const today = getTodayDateString();
      const idSet = new Set(ids);
      const toSchedule = backlogTasks.filter((t) => idSet.has(t.id));
      if (toSchedule.length === 0) return;

      let nextTodayOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1) + 1;
      const scheduled = toSchedule.map((task, index) => ({
        ...task,
        scheduled_date: today,
        order: nextTodayOrder + index,
      }));

      setBacklogTasks((prev) => prev.filter((t) => !idSet.has(t.id)));
      setTasks((prev) => [...prev, ...scheduled].sort((a, b) => a.order - b.order));

      const client = requireSupabase();
      const results = await Promise.all(
        scheduled.map((task) =>
          client
            .from('tasks')
            .update({ scheduled_date: today, order: task.order })
            .eq('id', task.id),
        ),
      );

      const failed = results.find((r) => r.error);
      if (failed?.error) {
        setError(failed.error.message);
        void fetchTasks();
      }
    },
    [userId, backlogTasks, tasks, fetchTasks],
  );

  const moveBacklogTaskToTop = useCallback(
    async (id: string) => {
      const index = backlogTasks.findIndex((t) => t.id === id);
      if (index <= 0) return;

      const reordered = [
        backlogTasks[index],
        ...backlogTasks.slice(0, index),
        ...backlogTasks.slice(index + 1),
      ].map((task, order) => ({ ...task, order }));

      await reorderBacklogTasks(reordered);
    },
    [backlogTasks, reorderBacklogTasks],
  );

  const moveToBacklog = useCallback(
    async (id: string) => {
      if (!userId) return;

      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const maxOrder = backlogTasks.reduce((max, t) => Math.max(max, t.order), -1);
      const moved: Task = { ...task, scheduled_date: null, order: maxOrder + 1 };

      const { error: updateError } = await requireSupabase()
        .from('tasks')
        .update({ scheduled_date: null, order: moved.order })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      setBacklogTasks((prev) => [...prev, moved]);
    },
    [userId, tasks, backlogTasks],
  );

  return {
    tasks,
    backlogTasks,
    completedTasks,
    loading,
    error,
    addTask,
    updateTask,
    completeTask,
    undoComplete,
    deleteTask,
    reorderTasks,
    reorderBacklogTasks,
    moveBacklogTaskToTop,
    scheduleForToday,
    moveToBacklog,
    refresh: fetchTasks,
  };
}
