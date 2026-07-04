import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddChoreBottomSheet } from './AddChoreBottomSheet';
import { AddTaskBottomSheet, type TaskDestination } from './AddTaskBottomSheet';
import { AddTaskFab } from './AddTaskFab';
import { AddTypeChooserSheet } from './AddTypeChooserSheet';
import { ChoreCard } from './ChoreCard';
import { ChoreForm } from './ChoreForm';
import { FocusTimerScreen } from './FocusTimerScreen';
import { TaskQueueSkeleton } from './Skeleton';
import { useTimer } from '../hooks/useTimer';
import {
  dateStringToISO,
  countOverdueChores,
  formatNextDueInterval,
  getScheduleFilterForChore,
  getUniqueRooms,
  groupChoresByRoom,
  groupChoresForScheduleView,
  isChoreOverdue,
  isChoreSomeday,
  isChoreVisibleInScheduleFilter,
  nextDueAtToDateString,
  pickScheduleFilterForChores,
} from '../lib/choreSchedule';
import {
  CHORE_SCHEDULE_FILTERS,
  CHORE_VIEW_MODES,
  type Chore,
  type ChoreScheduleFilter,
  type ChoreViewMode,
  type EditChoreInput,
  type NewChoreInput,
  type NewTaskInput,
  type Task,
} from '../types';

const COMPLETE_ANIM_MS = 300;

interface ChoresViewProps {
  chores: Chore[];
  choresError?: string | null;
  pendingScheduleFilter?: ChoreScheduleFilter | null;
  onPendingScheduleFilterApplied?: () => void;
  loading?: boolean;
  onAddChore: (input: NewChoreInput) => Promise<Chore | null>;
  onCompleteChore: (
    id: string,
    actualTimeMinutes?: number,
  ) => Promise<{ chore: Chore; nextDueAt: string | null } | null>;
  onUpdateChore: (id: string, changes: Partial<Chore>) => Promise<boolean>;
  onDeleteChore: (id: string) => Promise<void>;
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
  choresError = null,
  pendingScheduleFilter = null,
  onPendingScheduleFilterApplied,
  loading = false,
  onAddChore,
  onCompleteChore,
  onUpdateChore,
  onDeleteChore,
  addTodayTask,
  addBacklogTask,
  existingCategories,
}: ChoresViewProps) {
  const [viewMode, setViewMode] = useState<ChoreViewMode>('schedule');
  const [scheduleFilter, setScheduleFilter] = useState<ChoreScheduleFilter>('weekly');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [choreSheetOpen, setChoreSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(null);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [focusTimerExpanded, setFocusTimerExpanded] = useState(false);
  const [completionSubline, setCompletionSubline] = useState<string | undefined>();
  const [forceCompleted, setForceCompleted] = useState(false);
  const completingRef = useRef(false);

  const handleViewModeChange = (mode: ChoreViewMode) => {
    setViewMode(mode);
    if (mode === 'schedule' && chores.length > 0) {
      setScheduleFilter((current) => pickScheduleFilterForChores(chores, current));
    }
  };

  const handleScheduleFilterChange = (filter: ChoreScheduleFilter) => {
    setScheduleFilter(filter);
  };

  const handleChoreAdded = useCallback((chore: Chore) => {
    setViewMode('schedule');
    setScheduleFilter(getScheduleFilterForChore(chore));
  }, []);

  useEffect(() => {
    if (!pendingScheduleFilter) return;
    setViewMode('schedule');
    setScheduleFilter(pendingScheduleFilter);
    onPendingScheduleFilterApplied?.();
  }, [pendingScheduleFilter, onPendingScheduleFilterApplied]);

  const existingRooms = useMemo(() => getUniqueRooms(chores), [chores]);

  const visibleChores = useMemo(() => {
    if (viewMode === 'room') return chores;
    return chores.filter((c) => isChoreVisibleInScheduleFilter(c, scheduleFilter));
  }, [chores, viewMode, scheduleFilter]);

  const overdueCount = useMemo(
    () => countOverdueChores(visibleChores),
    [visibleChores],
  );

  const groupedChores = useMemo(() => {
    if (viewMode === 'room') {
      return groupChoresByRoom(chores);
    }
    return groupChoresForScheduleView(visibleChores, scheduleFilter);
  }, [chores, visibleChores, viewMode, scheduleFilter]);

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
        isChoreSomeday(activeChore)
          ? 'Logged — no due date'
          : `Next due in ${formatNextDueInterval(activeChore)}`,
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
        isChoreSomeday(activeChore)
          ? 'Logged — no due date'
          : `Next due in ${formatNextDueInterval(activeChore)}`,
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

  const handleEditSave = async (values: NewChoreInput | EditChoreInput) => {
    if (!editingChoreId) return;

    const editingChore = chores.find((c) => c.id === editingChoreId);
    const isSomeday = !values.repeats;
    const wasSomeday = editingChore ? isChoreSomeday(editingChore) : false;
    const intervalValue = values.interval_value ?? 1;
    const intervalUnit = values.interval_unit ?? 'weeks';
    const showDayOfWeek = !isSomeday && intervalUnit === 'weeks' && intervalValue === 1;

    const updatePayload: Partial<Chore> = {
      title: values.title,
      room: values.room?.trim() || null,
      time_estimate_minutes: values.time_estimate_minutes,
      recurrence_type: isSomeday ? 'someday' : null,
      interval_value: isSomeday ? null : intervalValue,
      interval_unit: isSomeday ? null : intervalUnit,
      day_of_week: showDayOfWeek ? values.day_of_week ?? null : null,
    };

    if (isSomeday) {
      updatePayload.next_due_at = null;
      updatePayload.day_of_week = null;
    } else if (
      wasSomeday &&
      'next_due_on_changed' in values &&
      values.next_due_on_changed &&
      values.next_due_on
    ) {
      updatePayload.next_due_at = dateStringToISO(values.next_due_on);
    } else if (
      'next_due_on_changed' in values &&
      values.next_due_on_changed &&
      values.next_due_on
    ) {
      updatePayload.next_due_at = dateStringToISO(values.next_due_on);
    }

    const ok = await onUpdateChore(editingChoreId, updatePayload);
    if (!ok) return;

    if (isSomeday) {
      setViewMode('schedule');
      setScheduleFilter('someday');
    }
    setEditingChoreId(null);
  };

  const handleDeleteChore = async (choreId: string) => {
    if (timer.activeTaskId === choreId) {
      await timer.cancel();
      setFocusTimerExpanded(false);
    }
    await onDeleteChore(choreId);
    if (editingChoreId === choreId) {
      setEditingChoreId(null);
    }
  };

  const renderChore = (chore: Chore) => {
    if (editingChoreId === chore.id) {
      return (
        <ChoreForm
          key={chore.id}
          variant="inline"
          mode="edit"
          existingRooms={existingRooms}
          initial={{
            title: chore.title,
            room: chore.room ?? undefined,
            time_estimate_minutes: chore.time_estimate_minutes,
            repeats: !isChoreSomeday(chore),
            interval_value: chore.interval_value ?? 1,
            interval_unit: chore.interval_unit ?? 'weeks',
            day_of_week: chore.day_of_week ?? undefined,
            next_due_on: nextDueAtToDateString(chore.next_due_at) ?? undefined,
          }}
          submitLabel="Save changes"
          onSubmit={handleEditSave}
          onCancel={() => setEditingChoreId(null)}
          onDelete={async () => {
            await handleDeleteChore(chore.id);
          }}
        />
      );
    }

    return (
      <ChoreCard
        key={chore.id}
        chore={chore}
        isCompleting={chore.id === completingChoreId}
        onComplete={(id) => void handleCompleteChore(id)}
        onStart={(id) => void handleStartChore(id)}
        onEdit={setEditingChoreId}
        onDelete={(id) => void handleDeleteChore(id)}
      />
    );
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

      <div className="relative flex flex-col p-4 pb-24 sm:p-6 md:pb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-semibold text-[#3D3530] md:text-xl">Chores</h1>
          {overdueCount > 0 ? (
            <span className="rounded-full bg-[#C0463F16] px-2.5 py-0.5 text-[13px] font-medium text-[#C0463F]">
              {overdueCount} overdue
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CHORE_VIEW_MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleViewModeChange(id)}
              className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
                viewMode === id
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {viewMode === 'schedule' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {CHORE_SCHEDULE_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleScheduleFilterChange(id)}
                className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
                  scheduleFilter === id
                    ? 'bg-accent text-white'
                    : 'bg-surface-raised text-text-muted hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <TaskQueueSkeleton />
          ) : visibleChores.length === 0 ? (
            <p className="py-4 text-center text-base text-text-faint md:text-sm">
              {viewMode === 'room'
                ? 'No chores yet'
                : scheduleFilter === 'today'
                  ? 'Nothing due today'
                  : scheduleFilter === 'weekly'
                    ? 'Nothing due this week'
                    : scheduleFilter === 'someday'
                      ? 'No someday chores yet'
                      : scheduleFilter === 'all'
                        ? 'No chores yet'
                        : 'No chores in this category'}
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
                    {group.chores.map((chore) => renderChore(chore))}
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
        saveError={choresError}
        onChoreAdded={handleChoreAdded}
      />

      <AddTaskFab
        onClick={openChooser}
        showOnDesktop
        hidden={anySheetOpen || (timerActive && focusTimerExpanded)}
      />
    </>
  );
}
