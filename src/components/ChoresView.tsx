import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddChoreBottomSheet } from './AddChoreBottomSheet';
import { AddTaskBottomSheet, type TaskDestination } from './AddTaskBottomSheet';
import { AddTaskFab } from './AddTaskFab';
import { AddTypeChooserSheet } from './AddTypeChooserSheet';
import { Button } from './Button';
import { ChoreCard } from './ChoreCard';
import { FocusTimerScreen } from './FocusTimerScreen';
import { TaskQueueSkeleton } from './Skeleton';
import { useTimer } from '../hooks/useTimer';
import {
  countOverdueChores,
  formatNextDueInterval,
  getUniqueRooms,
  groupChoresByDay,
  groupChoresByRoom,
  isChoreOverdue,
  isChoreVisibleInPeriod,
} from '../lib/choreSchedule';
import {
  CHORE_FREQUENCY_FILTERS,
  CHORE_GROUP_MODES,
  type Chore,
  type ChoreFrequencyFilter,
  type ChoreGroupMode,
  type NewChoreInput,
  type NewTaskInput,
  type Task,
} from '../types';

const COMPLETE_ANIM_MS = 300;

interface ChoresViewProps {
  chores: Chore[];
  loading?: boolean;
  onAddChore: (input: NewChoreInput) => Promise<Chore | null>;
  onCompleteChore: (
    id: string,
    actualTimeMinutes?: number,
  ) => Promise<{ chore: Chore; nextDueAt: string } | null>;
  onUpdateChore: (id: string, changes: Partial<Chore>) => Promise<void>;
  addTodayTask: (task: NewTaskInput) => Promise<Task | null>;
  addBacklogTask: (task: NewTaskInput) => Promise<Task | null>;
  existingCategories: string[];
}

function choreToTimerTask(chore: Chore): Task {
  return {
    id: chore.id,
    user_id: chore.user_id,
    title: chore.title,
    estimate_minutes: chore.time_estimate_minutes,
    actual_minutes: chore.actual_time_minutes ?? 0,
    priority: isChoreOverdue(chore) ? 'urgent' : 'low',
    status: 'todo',
    order: 0,
    created_at: chore.created_at,
    scheduled_date: null,
  };
}

export function ChoresView({
  chores,
  loading = false,
  onAddChore,
  onCompleteChore,
  onUpdateChore,
  addTodayTask,
  addBacklogTask,
  existingCategories,
}: ChoresViewProps) {
  const [frequencyFilter, setFrequencyFilter] = useState<ChoreFrequencyFilter>('weekly');
  const [groupMode, setGroupMode] = useState<ChoreGroupMode>('day');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [choreSheetOpen, setChoreSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(null);
  const [focusTimerExpanded, setFocusTimerExpanded] = useState(false);
  const [completionSubline, setCompletionSubline] = useState<string | undefined>();
  const [forceCompleted, setForceCompleted] = useState(false);
  const completingRef = useRef(false);

  const existingRooms = useMemo(() => getUniqueRooms(chores), [chores]);

  const visibleChores = useMemo(
    () => chores.filter((c) => isChoreVisibleInPeriod(c, frequencyFilter)),
    [chores, frequencyFilter],
  );

  const overdueCount = useMemo(() => countOverdueChores(visibleChores), [visibleChores]);

  const groupedChores = useMemo(() => {
    if (groupMode === 'room') {
      return groupChoresByRoom(visibleChores);
    }
    if (frequencyFilter === 'weekly') {
      return groupChoresByDay(visibleChores);
    }
    return [{ label: '', chores: visibleChores }];
  }, [visibleChores, groupMode, frequencyFilter]);

  const timerTasks = useMemo(() => visibleChores.map(choreToTimerTask), [visibleChores]);

  const handleSyncActualMinutes = useCallback(
    async (choreId: string, actualMinutes: number) => {
      await onUpdateChore(choreId, { actual_time_minutes: actualMinutes });
    },
    [onUpdateChore],
  );

  const timer = useTimer({
    tasks: timerTasks,
    onSyncActualMinutes: handleSyncActualMinutes,
    onSetInProgress: async () => {},
    onClearInProgress: async () => {},
  });

  const timerActive = timer.isRunning || timer.isPaused;

  const activeChore = timer.activeTaskId
    ? visibleChores.find((c) => c.id === timer.activeTaskId) ?? null
    : null;

  const activeTimerTask = activeChore ? choreToTimerTask(activeChore) : null;

  const totalSeconds = (activeChore?.time_estimate_minutes ?? 0) * 60;
  const isTimerCompleted =
    timerActive && totalSeconds > 0 && timer.remainingSeconds <= 0;
  const showCompletedState = isTimerCompleted || forceCompleted;

  useEffect(() => {
    if (isTimerCompleted && activeChore) {
      setCompletionSubline(
        `Next due in ${formatNextDueInterval(
          activeChore.recurrence_type,
          activeChore.day_of_week,
        )}`,
      );
    }
  }, [isTimerCompleted, activeChore]);

  useEffect(() => {
    if (isTimerCompleted && timer.isRunning) {
      void timer.pause();
    }
  }, [isTimerCompleted, timer.isRunning, timer.pause]);

  const openChooser = () => {
    setSheetKey((key) => key + 1);
    setChooserOpen(true);
  };

  const handleCompleteChore = useCallback(
    async (choreId: string, actualMinutes?: number) => {
      if (completingRef.current) return;

      completingRef.current = true;
      setCompletingChoreId(choreId);

      await new Promise((resolve) => setTimeout(resolve, COMPLETE_ANIM_MS));

      const wasTiming = timer.activeTaskId === choreId;
      const chore = visibleChores.find((c) => c.id === choreId);

      await onCompleteChore(
        choreId,
        actualMinutes ?? chore?.time_estimate_minutes,
      );

      if (wasTiming) {
        await timer.complete();
        setFocusTimerExpanded(false);
        setCompletionSubline(undefined);
      }

      setCompletingChoreId(null);
      completingRef.current = false;
    },
    [timer, visibleChores, onCompleteChore],
  );

  const handleStartChore = async (choreId: string) => {
    setCompletionSubline(undefined);
    setForceCompleted(false);
    setFocusTimerExpanded(true);
    await timer.startTask(choreId);
  };

  const handleCompleteFromTimer = async () => {
    if (!timer.activeTaskId || !activeChore) return;

    if (!showCompletedState) {
      setCompletionSubline(
        `Next due in ${formatNextDueInterval(
          activeChore.recurrence_type,
          activeChore.day_of_week,
        )}`,
      );
      setForceCompleted(true);
      if (timer.isRunning) {
        await timer.pause();
      }
      return;
    }

    const actualMinutes = isTimerCompleted
      ? activeChore.time_estimate_minutes
      : Math.max(1, Math.ceil(timer.elapsedSeconds / 60));

    await handleCompleteChore(timer.activeTaskId, actualMinutes);
    setForceCompleted(false);
    setCompletionSubline(undefined);
  };

  const handlePauseOrResume = async () => {
    if (timer.isPaused) {
      timer.resume();
    } else {
      await timer.pause();
    }
  };

  const anySheetOpen = chooserOpen || taskSheetOpen || choreSheetOpen;

  return (
    <>
      {timerActive && focusTimerExpanded && activeTimerTask ? (
        <FocusTimerScreen
          task={activeTimerTask}
          tasks={timerTasks}
          remainingSeconds={timer.remainingSeconds}
          isPaused={timer.isPaused}
          isCompleted={showCompletedState}
          completionSubline={completionSubline}
          onMinimize={() => setFocusTimerExpanded(false)}
          onPauseResume={handlePauseOrResume}
          onComplete={handleCompleteFromTimer}
          onStartNext={handleStartChore}
          onSwitchTask={handleStartChore}
          onAddTask={addTodayTask}
          onAddBacklogTask={addBacklogTask}
        />
      ) : null}

      <div className="relative flex flex-1 flex-col p-4 pb-24 sm:p-6 md:pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold text-[#3D3530] md:text-xl">Chores</h1>
            {overdueCount > 0 ? (
              <span className="rounded-full bg-[#C0463F16] px-2.5 py-0.5 text-[13px] font-medium text-[#C0463F]">
                {overdueCount} overdue
              </span>
            ) : null}
          </div>
          <Button
            variant="secondary"
            onClick={openChooser}
            className="hidden font-semibold md:inline-flex"
          >
            + New
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CHORE_FREQUENCY_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFrequencyFilter(id)}
              className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
                frequencyFilter === id
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CHORE_GROUP_MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setGroupMode(id)}
              className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
                groupMode === id
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <TaskQueueSkeleton />
          ) : visibleChores.length === 0 ? (
            <p className="py-4 text-center text-base text-text-faint md:text-sm">
              No chores due in this period
            </p>
          ) : (
            <div className="space-y-6">
              {groupedChores.map((group) => (
                <div key={group.label || 'all'}>
                  {group.label ? (
                    <p className="mb-3 text-[13px] font-medium uppercase tracking-wide text-text-faint md:text-[11px]">
                      {group.label}
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    {group.chores.map((chore) => (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        isCompleting={chore.id === completingChoreId}
                        onComplete={(id) => void handleCompleteChore(id)}
                        onStart={(id) => void handleStartChore(id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
        defaultDestination={'backlog' satisfies TaskDestination}
        existingCategories={existingCategories}
        onClose={() => setTaskSheetOpen(false)}
        onAddToToday={addTodayTask}
        onAddToBacklog={addBacklogTask}
      />

      <AddChoreBottomSheet
        key={`chore-${sheetKey}`}
        open={choreSheetOpen}
        existingRooms={existingRooms}
        onClose={() => setChoreSheetOpen(false)}
        onAddChore={onAddChore}
      />

      <AddTaskFab
        onClick={openChooser}
        hidden={anySheetOpen || (timerActive && focusTimerExpanded)}
      />
    </>
  );
}
