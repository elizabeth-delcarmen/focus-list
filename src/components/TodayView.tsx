import { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveTaskPanel } from './ActiveTaskPanel';
import { RunOverNudge } from './RunOverNudge';
import { TaskQueue } from './TaskQueue';
import { UndoToast } from './UndoToast';
import { useTimer } from '../hooks/useTimer';
import type { Task } from '../types';

const COMPLETE_ANIM_MS = 300;

interface TodayViewProps {
  tasks: Task[];
  completedTasks: Task[];
  tasksLoading?: boolean;
  updateTask: (id: string, changes: Partial<Task>) => Promise<void>;
  completeTask: (id: string, changes: Partial<Task>) => Promise<Task | null>;
  undoComplete: (snapshot: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (newOrder: Task[]) => Promise<void>;
  onNavigateToBacklog?: () => void;
}

export function TodayView({
  tasks,
  completedTasks,
  tasksLoading = false,
  updateTask,
  completeTask,
  undoComplete,
  deleteTask,
  reorderTasks,
  onNavigateToBacklog,
}: TodayViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Task | null>(null);
  const completingRef = useRef(false);

  const handleSyncActualMinutes = useCallback(
    async (taskId: string, actualMinutes: number) => {
      await updateTask(taskId, { actual_minutes: actualMinutes });
    },
    [updateTask],
  );

  const handleSetInProgress = useCallback(
    async (taskId: string) => {
      const inProgress = tasks.find((t) => t.status === 'in_progress' && t.id !== taskId);
      if (inProgress) {
        await updateTask(inProgress.id, { status: 'todo' });
      }
      await updateTask(taskId, { status: 'in_progress' });
    },
    [tasks, updateTask],
  );

  const handleClearInProgress = useCallback(async () => {
    const inProgress = tasks.find((t) => t.status === 'in_progress');
    if (inProgress) {
      await updateTask(inProgress.id, { status: 'todo' });
    }
  }, [tasks, updateTask]);

  const timer = useTimer({
    tasks,
    onSyncActualMinutes: handleSyncActualMinutes,
    onSetInProgress: handleSetInProgress,
    onClearInProgress: handleClearInProgress,
  });

  const timerActive = timer.isRunning || timer.isPaused;

  const displayTask = timer.activeTaskId
    ? tasks.find((t) => t.id === timer.activeTaskId) ?? null
    : selectedTaskId
      ? tasks.find((t) => t.id === selectedTaskId) ?? null
      : null;

  const isPreview = Boolean(displayTask && !timerActive);

  const dismissUndo = useCallback(() => setUndoSnapshot(null), []);

  const markComplete = useCallback(
    async (taskId: string, actualMinutes: number) => {
      if (completingRef.current) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      completingRef.current = true;
      setCompletingTaskId(taskId);
      setUndoSnapshot(null);

      await new Promise((resolve) => setTimeout(resolve, COMPLETE_ANIM_MS));

      const wasTiming = timer.activeTaskId === taskId;
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }

      const snapshot = await completeTask(taskId, {
        completed_at: new Date().toISOString(),
        actual_minutes: actualMinutes,
      });

      if (wasTiming) {
        await timer.complete();
      }

      setCompletingTaskId(null);
      completingRef.current = false;

      if (snapshot) {
        setUndoSnapshot(snapshot);
      }
    },
    [tasks, timer, selectedTaskId, completeTask],
  );

  const handleUndo = useCallback(async () => {
    if (!undoSnapshot) return;
    const snapshot = undoSnapshot;
    setUndoSnapshot(null);
    await undoComplete(snapshot);
  }, [undoSnapshot, undoComplete]);

  const handleSelectTask = (taskId: string) => {
    if (timerActive) return;
    setSelectedTaskId(taskId);
  };

  useEffect(() => {
    if (!selectedTaskId || timerActive) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (target.closest('[data-task-interactive]')) return;
      setSelectedTaskId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [selectedTaskId, timerActive]);

  const handleStartTask = async (taskId: string) => {
    setSelectedTaskId(taskId);
    await timer.startTask(taskId);
  };

  const handleStartFocus = async () => {
    if (!selectedTaskId) return;
    await timer.startTask(selectedTaskId);
  };

  const handlePauseOrResume = async () => {
    if (timer.isPaused) {
      timer.resume();
    } else {
      await timer.pause();
    }
  };

  const handleDone = async () => {
    if (!timer.activeTaskId) return;
    await markComplete(timer.activeTaskId, Math.ceil(timer.elapsedSeconds / 60));
  };

  const handleCancel = async () => {
    await timer.cancel();
  };

  const handleExtend = async (minutes: number) => {
    if (!displayTask || !timer.activeTaskId) return;
    await updateTask(timer.activeTaskId, {
      estimate_minutes: displayTask.estimate_minutes + minutes,
    });
    await timer.extendEstimate(minutes);
  };

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const actualMinutes =
        timer.activeTaskId === taskId
          ? Math.ceil(timer.elapsedSeconds / 60)
          : task.estimate_minutes;

      await markComplete(taskId, actualMinutes);
    },
    [tasks, timer.activeTaskId, timer.elapsedSeconds, markComplete],
  );

  const handleDeleteTask = async (id: string) => {
    if (selectedTaskId === id) setSelectedTaskId(null);
    if (timer.activeTaskId === id) await timer.cancel();
    await deleteTask(id);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row">
        <div className="flex w-full flex-col lg:w-[55%]">
          <ActiveTaskPanel
            task={displayTask}
            loading={tasksLoading}
            remainingSeconds={timer.remainingSeconds}
            elapsedSeconds={timer.elapsedSeconds}
            progress={timer.progress}
            isRunOver={timer.isRunOver}
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            isPreview={isPreview}
            onStartFocus={handleStartFocus}
            onPause={handlePauseOrResume}
            onCancel={handleCancel}
            onDone={handleDone}
          />
          {timer.isRunOver && displayTask && !isPreview && (
            <RunOverNudge
              task={displayTask}
              elapsedSeconds={timer.elapsedSeconds}
              onExtend10={() => handleExtend(10)}
              onExtend25={() => handleExtend(25)}
              onMarkDone={handleDone}
            />
          )}
        </div>

        <div className="w-full lg:w-[45%]">
          <TaskQueue
            tasks={tasks}
            completedTasks={completedTasks}
            selectedTaskId={selectedTaskId}
            timerTaskId={timerActive ? timer.activeTaskId : null}
            completingTaskId={completingTaskId}
            loading={tasksLoading}
            onSelectTask={handleSelectTask}
            onStartTask={handleStartTask}
            onReorder={reorderTasks}
            onUpdateTask={updateTask}
            onDeleteTask={handleDeleteTask}
            onCompleteTask={handleCompleteTask}
            onNavigateToBacklog={onNavigateToBacklog}
          />
        </div>
      </div>

      {undoSnapshot && (
        <UndoToast
          taskTitle={undoSnapshot.title}
          onUndo={handleUndo}
          onDismiss={dismissUndo}
        />
      )}
    </>
  );
}
