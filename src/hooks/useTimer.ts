import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '../types';

const STORAGE_KEY_ACTIVE = 'focus-list-active-task-id';
const STORAGE_KEY_STARTED = 'focus-list-timer-started-at';
const STORAGE_KEY_PAUSED_ELAPSED = 'focus-list-paused-elapsed-seconds';
const SYNC_INTERVAL_MS = 30_000;

interface UseTimerOptions {
  tasks: Task[];
  onSyncActualMinutes: (taskId: string, actualMinutes: number) => Promise<void>;
  onSetInProgress: (taskId: string) => Promise<void>;
  onClearInProgress: () => Promise<void>;
}

interface UseTimerResult {
  activeTaskId: string | null;
  isRunning: boolean;
  isPaused: boolean;
  isRunOver: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  progress: number;
  startTask: (taskId: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => void;
  cancel: () => Promise<void>;
  complete: () => Promise<void>;
  extendEstimate: (minutes: number) => Promise<void>;
}

function readStoredActiveTaskId(): string | null {
  return localStorage.getItem(STORAGE_KEY_ACTIVE);
}

function readStoredStartedAt(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY_STARTED);
  return raw ? Number(raw) : null;
}

function readPausedElapsed(): number {
  const raw = localStorage.getItem(STORAGE_KEY_PAUSED_ELAPSED);
  return raw ? Number(raw) : 0;
}

export function useTimer({
  tasks,
  onSyncActualMinutes,
  onSetInProgress,
  onClearInProgress,
}: UseTimerOptions): UseTimerResult {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() =>
    readStoredActiveTaskId(),
  );
  const [isRunning, setIsRunning] = useState(() => {
    const id = readStoredActiveTaskId();
    const started = readStoredStartedAt();
    return Boolean(id && started);
  });
  const [isPaused, setIsPaused] = useState(() => {
    const id = readStoredActiveTaskId();
    const started = readStoredStartedAt();
    return Boolean(id && !started);
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const id = readStoredActiveTaskId();
    const started = readStoredStartedAt();
    if (id && started) {
      return readPausedElapsed() + Math.floor((Date.now() - started) / 1000);
    }
    return readPausedElapsed();
  });
  const [isRunOver, setIsRunOver] = useState(false);

  const elapsedRef = useRef(elapsedSeconds);
  const lastSyncRef = useRef<number>(Date.now());

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const activeTask =
    activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;

  const estimateSeconds = (activeTask?.estimate_minutes ?? 0) * 60;
  const remainingSeconds = estimateSeconds - elapsedSeconds;
  const progress =
    estimateSeconds > 0
      ? Math.min(1, Math.max(0, elapsedSeconds / estimateSeconds))
      : 0;

  const persistTimerState = useCallback(
    (taskId: string | null, startedAt: number | null, pausedElapsed: number) => {
      if (taskId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE, taskId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
      }

      if (startedAt) {
        localStorage.setItem(STORAGE_KEY_STARTED, String(startedAt));
      } else {
        localStorage.removeItem(STORAGE_KEY_STARTED);
      }

      localStorage.setItem(STORAGE_KEY_PAUSED_ELAPSED, String(pausedElapsed));
    },
    [],
  );

  const clearTimerState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    localStorage.removeItem(STORAGE_KEY_STARTED);
    localStorage.removeItem(STORAGE_KEY_PAUSED_ELAPSED);
    setActiveTaskId(null);
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setIsRunOver(false);
    elapsedRef.current = 0;
  }, []);

  const syncActualMinutes = useCallback(
    async (taskId: string, seconds: number) => {
      const minutes = Math.ceil(seconds / 60);
      await onSyncActualMinutes(taskId, minutes);
      lastSyncRef.current = Date.now();
    },
    [onSyncActualMinutes],
  );

  const startTask = useCallback(
    async (taskId: string) => {
      if (activeTaskId === taskId && (isRunning || isPaused)) return;

      if (activeTaskId && activeTaskId !== taskId) {
        await syncActualMinutes(activeTaskId, elapsedRef.current);
        await onClearInProgress();
        clearTimerState();
      }

      setActiveTaskId(taskId);
      setElapsedSeconds(0);
      setIsRunOver(false);
      setIsRunning(true);
      setIsPaused(false);
      elapsedRef.current = 0;

      const startedAt = Date.now();
      persistTimerState(taskId, startedAt, 0);
      void onSetInProgress(taskId);
    },
    [
      activeTaskId,
      isRunning,
      isPaused,
      clearTimerState,
      onClearInProgress,
      onSetInProgress,
      persistTimerState,
      syncActualMinutes,
    ],
  );

  const pause = useCallback(async () => {
    if (!activeTaskId) return;

    const currentElapsed = elapsedRef.current;
    persistTimerState(activeTaskId, null, currentElapsed);
    setIsRunning(false);
    setIsPaused(true);
    await syncActualMinutes(activeTaskId, currentElapsed);
  }, [activeTaskId, persistTimerState, syncActualMinutes]);

  const resume = useCallback(() => {
    if (!activeTaskId || !isPaused) return;

    const pausedElapsed = readPausedElapsed();
    const startedAt = Date.now();
    persistTimerState(activeTaskId, startedAt, pausedElapsed);
    setIsRunning(true);
    setIsPaused(false);
  }, [activeTaskId, isPaused, persistTimerState]);

  const cancel = useCallback(async () => {
    if (!activeTaskId) return;

    await syncActualMinutes(activeTaskId, elapsedRef.current);
    await onClearInProgress();
    clearTimerState();
  }, [activeTaskId, clearTimerState, onClearInProgress, syncActualMinutes]);

  const complete = useCallback(async () => {
    if (!activeTaskId) return;

    await syncActualMinutes(activeTaskId, elapsedRef.current);
    await onClearInProgress();
    clearTimerState();
  }, [activeTaskId, clearTimerState, onClearInProgress, syncActualMinutes]);

  const extendEstimate = useCallback(
    async (_minutes: number) => {
      if (!activeTaskId) return;

      await onSyncActualMinutes(activeTaskId, Math.ceil(elapsedRef.current / 60));
      setIsRunOver(false);
    },
    [activeTaskId, onSyncActualMinutes],
  );

  // Tick interval
  useEffect(() => {
    if (!isRunning || !activeTaskId) return;

    const interval = setInterval(() => {
      const startedAt = readStoredStartedAt();
      const pausedElapsed = readPausedElapsed();
      if (!startedAt) return;

      const total = pausedElapsed + Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(total);
      elapsedRef.current = total;

      const est = (activeTask?.estimate_minutes ?? 0) * 60;
      if (est > 0 && total >= est) {
        setIsRunOver(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeTaskId, activeTask?.estimate_minutes]);

  // Periodic sync every 30 seconds while running
  useEffect(() => {
    if (!isRunning || !activeTaskId) return;

    const interval = setInterval(() => {
      void syncActualMinutes(activeTaskId, elapsedRef.current);
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isRunning, activeTaskId, syncActualMinutes]);

  // Restore timer on mount if page was refreshed
  useEffect(() => {
    const storedId = readStoredActiveTaskId();
    const startedAt = readStoredStartedAt();
    const pausedElapsed = readPausedElapsed();

    if (storedId && startedAt) {
      const total = pausedElapsed + Math.floor((Date.now() - startedAt) / 1000);
      setActiveTaskId(storedId);
      setElapsedSeconds(total);
      elapsedRef.current = total;
      setIsRunning(true);
      setIsPaused(false);
    } else if (storedId && !startedAt) {
      setActiveTaskId(storedId);
      setElapsedSeconds(pausedElapsed);
      elapsedRef.current = pausedElapsed;
      setIsRunning(false);
      setIsPaused(true);
    }
  }, []);

  // Update run-over when estimate changes
  useEffect(() => {
    if (activeTask) {
      const est = activeTask.estimate_minutes * 60;
      setIsRunOver(elapsedSeconds >= est && est > 0);
    }
  }, [activeTask, elapsedSeconds]);

  return {
    activeTaskId,
    isRunning,
    isPaused,
    isRunOver,
    remainingSeconds,
    elapsedSeconds,
    progress,
    startTask,
    pause,
    resume,
    cancel,
    complete,
    extendEstimate,
  };
}
