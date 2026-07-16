import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddChoreBottomSheet } from './AddChoreBottomSheet';
import { AddTaskBottomSheet } from './AddTaskBottomSheet';
import { AddTaskFab } from './AddTaskFab';
import { AddTypeChooserSheet } from './AddTypeChooserSheet';
import { FocusTimerScreen } from './FocusTimerScreen';
import { RunOverNudge } from './RunOverNudge';
import { TaskQueue } from './TaskQueue';
import { UndoToast } from './UndoToast';
import { useTimer } from '../hooks/useTimer';
import { getTodayCompletedTasks, getUniqueCategories, type Chore, type NewChoreInput, type NewTaskInput, type Task } from '../types';

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
  addTodayTask: (task: NewTaskInput) => Promise<Task | null>;
  addBacklogTask: (task: NewTaskInput) => Promise<Task | null>;
  addChore?: (chore: NewChoreInput) => Promise<Chore | null>;
  onChoreAdded?: (chore: Chore) => void;
  existingRooms?: string[];
  onRememberRoom?: (room: string) => void;
  onNavigateToBacklog?: () => void;
  hideFab?: boolean;
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
  addTodayTask,
  addBacklogTask,
  addChore,
  onChoreAdded,
  existingRooms = [],
  onRememberRoom,
  onNavigateToBacklog,
  hideFab = false,
}: TodayViewProps) {
  const [focusTimerExpanded, setFocusTimerExpanded] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [choreSheetOpen, setChoreSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Task | null>(null);
  const completingRef = useRef(false);
  const autoPausedAtZero = useRef(false);

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

  const todayCompletedTasks = useMemo(
    () => getTodayCompletedTasks(completedTasks),
    [completedTasks],
  );

  const existingCategories = useMemo(() => getUniqueCategories(tasks), [tasks]);

  const openChooser = () => {
    setSheetKey((key) => key + 1);
    setChooserOpen(true);
  };

  const anySheetOpen = chooserOpen || taskSheetOpen || choreSheetOpen;

  const activeTask = timer.activeTaskId
    ? tasks.find((t) => t.id === timer.activeTaskId) ?? null
    : null;

  const totalSeconds = (activeTask?.estimate_minutes ?? 0) * 60;
  const isTimerCompleted =
    timerActive && totalSeconds > 0 && timer.remainingSeconds <= 0;

  useEffect(() => {
    if (isTimerCompleted && timer.isRunning && !autoPausedAtZero.current) {
      autoPausedAtZero.current = true;
      void timer.pause();
    }
    if (!isTimerCompleted) {
      autoPausedAtZero.current = false;
    }
  }, [isTimerCompleted, timer.isRunning, timer.pause]);

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

      const snapshot = await completeTask(taskId, {
        completed_at: new Date().toISOString(),
        actual_minutes: actualMinutes,
      });

      if (wasTiming) {
        await timer.complete();
        setFocusTimerExpanded(false);
      }

      setCompletingTaskId(null);
      completingRef.current = false;

      if (snapshot) {
        setUndoSnapshot(snapshot);
      }
    },
    [tasks, timer, completeTask],
  );

  const handleUndo = useCallback(async () => {
    if (!undoSnapshot) return;
    const snapshot = undoSnapshot;
    setUndoSnapshot(null);
    await undoComplete(snapshot);
  }, [undoSnapshot, undoComplete]);

  const handleStartTask = async (taskId: string) => {
    setFocusTimerExpanded(true);
    await timer.startTask(taskId);
  };

  const handlePauseOrResume = async () => {
    if (timer.isPaused) {
      timer.resume();
    } else {
      await timer.pause();
    }
  };

  const handleCompleteFromTimer = async () => {
    if (!timer.activeTaskId || !activeTask) return;
    const actualMinutes = isTimerCompleted
      ? activeTask.estimate_minutes
      : Math.max(1, Math.ceil(timer.elapsedSeconds / 60));
    await markComplete(timer.activeTaskId, actualMinutes);
  };

  const handleSwitchTask = async (taskId: string) => {
    await timer.startTask(taskId);
  };

  const handleStartNext = async (taskId: string) => {
    await timer.startTask(taskId);
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
    if (timer.activeTaskId === id) {
      await timer.cancel();
      setFocusTimerExpanded(false);
    }
    await deleteTask(id);
  };

  const handleExtend = async (minutes: number) => {
    if (!activeTask || !timer.activeTaskId) return;
    await updateTask(timer.activeTaskId, {
      estimate_minutes: activeTask.estimate_minutes + minutes,
    });
    await timer.extendEstimate(minutes);
  };

  return (
    <>
      {timerActive && focusTimerExpanded && activeTask ? (
        <FocusTimerScreen
          task={activeTask}
          tasks={tasks}
          remainingSeconds={timer.remainingSeconds}
          isPaused={timer.isPaused}
          isCompleted={isTimerCompleted}
          onMinimize={() => setFocusTimerExpanded(false)}
          onPauseResume={handlePauseOrResume}
          onComplete={handleCompleteFromTimer}
          onStartNext={handleStartNext}
          onSwitchTask={handleSwitchTask}
          onAddTask={addTodayTask}
          onAddBacklogTask={addBacklogTask}
        />
      ) : null}

      <div className="relative flex flex-1 flex-col px-6 pb-28 pt-6 md:pb-6">
        <h1 className="mb-6 font-display text-[28px] leading-tight text-text-primary">Tasks</h1>
        <TaskQueue
          tasks={tasks}
          completedTasks={todayCompletedTasks}
          timerTaskId={timerActive ? timer.activeTaskId : null}
          completingTaskId={completingTaskId}
          loading={tasksLoading}
          onSelectTask={() => {}}
          onStartTask={handleStartTask}
          onReorder={reorderTasks}
          onUpdateTask={updateTask}
          onDeleteTask={handleDeleteTask}
          onCompleteTask={handleCompleteTask}
          onNavigateToBacklog={onNavigateToBacklog}
        />

        {timer.isRunOver && activeTask && !focusTimerExpanded ? (
          <RunOverNudge
            task={activeTask}
            elapsedSeconds={timer.elapsedSeconds}
            onExtend10={() => handleExtend(10)}
            onExtend25={() => handleExtend(25)}
            onMarkDone={handleCompleteFromTimer}
          />
        ) : null}
      </div>

      {!hideFab ? (
        <>
          <AddTypeChooserSheet
            open={chooserOpen}
            onClose={() => setChooserOpen(false)}
            onSelectTask={() => {
              setChooserOpen(false);
              setTaskSheetOpen(true);
            }}
            onSelectChore={() => {
              setChooserOpen(false);
              setChoreSheetOpen(true);
            }}
          />

          <AddTaskBottomSheet
            key={`task-${sheetKey}`}
            open={taskSheetOpen}
            defaultDestination="today"
            existingCategories={existingCategories}
            onClose={() => setTaskSheetOpen(false)}
            onAddToToday={addTodayTask}
            onAddToBacklog={addBacklogTask}
          />

          {addChore ? (
            <AddChoreBottomSheet
              key={`chore-${sheetKey}`}
              open={choreSheetOpen}
              existingRooms={existingRooms}
              onRememberRoom={onRememberRoom}
              onClose={() => setChoreSheetOpen(false)}
              onAddChore={addChore}
              onChoreAdded={onChoreAdded}
            />
          ) : null}

          <AddTaskFab
            onClick={openChooser}
            hidden={anySheetOpen || (timerActive && focusTimerExpanded)}
          />
        </>
      ) : null}

      {undoSnapshot ? (
        <UndoToast
          taskTitle={undoSnapshot.title}
          onUndo={handleUndo}
          onDismiss={dismissUndo}
        />
      ) : null}
    </>
  );
}
