import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Home } from 'lucide-react';
import { AddChoreBottomSheet } from './AddChoreBottomSheet';
import { AddTaskBottomSheet, type TaskDestination } from './AddTaskBottomSheet';
import { AddTaskFab } from './AddTaskFab';
import { AddTypeChooserSheet } from './AddTypeChooserSheet';
import { ChoreCard } from './ChoreCard';
import { ChoreForm } from './ChoreForm';
import { ChoreRepeatPromptSheet } from './ChoreRepeatPromptSheet';
import { FocusTimerScreen } from './FocusTimerScreen';
import { TaskQueueSkeleton } from './Skeleton';
import { useChoreRooms } from '../hooks/useChoreRooms';
import { useTimer } from '../hooks/useTimer';
import {
  dateStringToISO,
  countChoresInScheduleFilter,
  countOverdueChores,
  deriveDayOfWeekForChore,
  formatNextDueInterval,
  getChoreInterval,
  getScheduleFilterForChore,
  groupChoresByRoom,
  groupChoresForScheduleView,
  isChoreOverdue,
  isChoreSomeday,
  isChoreVisibleInScheduleFilter,
  needsChoreRepeatPrompt,
  nextDueAtToDateString,
  normalizeChoreTitle,
} from '../lib/choreSchedule';
import {
  CHORE_SCHEDULE_FILTERS,
  type Chore,
  type ChoreRecurrenceChoice,
  type ChoreScheduleFilter,
  type ChoreViewMode,
  type EditChoreInput,
  type NewChoreInput,
  type NewTaskInput,
  type Task,
} from '../types';

const COMPLETE_ANIM_MS = 300;

const FILTER_PILL_ACTIVE =
  'border-[#3D3530] bg-[#3D3530] text-[#FAF8F3]';
const FILTER_PILL_INACTIVE =
  'border-[#D8D3C8] bg-transparent text-[#3D3530] hover:border-[#3D3530]/40';

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
    recurrenceChoice?: ChoreRecurrenceChoice,
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
    title: normalizeChoreTitle(chore.title),
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
  const [scheduleFilter, setScheduleFilter] = useState<ChoreScheduleFilter>('today');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [choreSheetOpen, setChoreSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(null);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [focusTimerExpanded, setFocusTimerExpanded] = useState(false);
  const [completionSubline, setCompletionSubline] = useState<string | undefined>();
  const [forceCompleted, setForceCompleted] = useState(false);
  const [repeatPrompt, setRepeatPrompt] = useState<{
    choreId: string;
    actualMinutes?: number;
  } | null>(null);
  const completingRef = useRef(false);

  const handleViewModeChange = (mode: ChoreViewMode) => {
    setViewMode(mode);
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
    setScheduleFilter(pendingScheduleFilter);
    onPendingScheduleFilterApplied?.();
  }, [pendingScheduleFilter, onPendingScheduleFilterApplied]);

  const { existingRooms, rememberRoom } = useChoreRooms(chores);

  const totalOverdueCount = useMemo(() => countOverdueChores(chores), [chores]);

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        CHORE_SCHEDULE_FILTERS.map(({ id }) => [id, countChoresInScheduleFilter(chores, id)]),
      ) as Record<ChoreScheduleFilter, number>,
    [chores],
  );

  const filteredChores = useMemo(() => {
    return chores.filter((c) => isChoreVisibleInScheduleFilter(c, scheduleFilter));
  }, [chores, scheduleFilter]);

  const groupedChores = useMemo(() => {
    if (viewMode === 'room') {
      return groupChoresByRoom(filteredChores);
    }
    return groupChoresForScheduleView(filteredChores, scheduleFilter);
  }, [filteredChores, viewMode, scheduleFilter]);

  const timerTasks = useMemo(
    () => filteredChores.map(choreToTimerTask),
    [filteredChores],
  );

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
    ? chores.find((c) => c.id === timer.activeTaskId) ?? null
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

  const finishCompleteChore = useCallback(
    async (
      choreId: string,
      actualMinutes?: number,
      recurrenceChoice?: ChoreRecurrenceChoice,
    ) => {
      if (completingRef.current) return;

      completingRef.current = true;
      setCompletingChoreId(choreId);

      await new Promise((resolve) => setTimeout(resolve, COMPLETE_ANIM_MS));

      const wasTiming = timer.activeTaskId === choreId;
      const chore = chores.find((c) => c.id === choreId);

      await onCompleteChore(
        choreId,
        actualMinutes ?? chore?.time_estimate_minutes,
        recurrenceChoice,
      );

      if (wasTiming) {
        await timer.complete();
        setFocusTimerExpanded(false);
        setCompletionSubline(undefined);
      }

      setCompletingChoreId(null);
      completingRef.current = false;
    },
    [timer, chores, onCompleteChore],
  );

  const handleCompleteChore = useCallback(
    async (
      choreId: string,
      actualMinutes?: number,
      recurrenceChoice?: ChoreRecurrenceChoice,
    ) => {
      const chore = chores.find((c) => c.id === choreId);
      if (!chore) return;

      if (needsChoreRepeatPrompt(chore) && !recurrenceChoice) {
        setRepeatPrompt({ choreId, actualMinutes });
        return;
      }

      await finishCompleteChore(choreId, actualMinutes, recurrenceChoice);
    },
    [chores, finishCompleteChore],
  );

  const handleRepeatPromptSelect = useCallback(
    (choice: ChoreRecurrenceChoice) => {
      if (!repeatPrompt) return;
      const { choreId, actualMinutes } = repeatPrompt;
      setRepeatPrompt(null);
      void finishCompleteChore(choreId, actualMinutes, choice);
    },
    [repeatPrompt, finishCompleteChore],
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
    const isSomeday = values.is_someday === true;
    const hasRecurrence =
      values.repeats && values.interval_value != null && values.interval_unit != null;
    const intervalValue = values.interval_value ?? 1;
    const intervalUnit = values.interval_unit ?? 'weeks';
    const nextDueOn = values.next_due_on;

    const updatePayload: Partial<Chore> = {
      title: normalizeChoreTitle(values.title),
      room: values.room?.trim() || null,
      time_estimate_minutes: values.time_estimate_minutes,
      recurrence_type: isSomeday ? 'someday' : null,
      interval_value: hasRecurrence ? intervalValue : null,
      interval_unit: hasRecurrence ? intervalUnit : null,
    };

    if (isSomeday) {
      updatePayload.next_due_at = null;
      updatePayload.day_of_week = null;
    } else if (nextDueOn) {
      updatePayload.next_due_at = dateStringToISO(nextDueOn);
      updatePayload.day_of_week = hasRecurrence
        ? deriveDayOfWeekForChore(intervalValue, intervalUnit, nextDueOn)
        : null;
    }

    const ok = await onUpdateChore(editingChoreId, updatePayload);
    if (!ok) return;

    if (isSomeday) {
      setViewMode('schedule');
      setScheduleFilter('someday');
    } else if (nextDueOn) {
      setViewMode('schedule');
      setScheduleFilter(
        getScheduleFilterForChore({
          ...(editingChore as Chore),
          recurrence_type: null,
          interval_value: hasRecurrence ? intervalValue : null,
          interval_unit: hasRecurrence ? intervalUnit : null,
          next_due_at: dateStringToISO(nextDueOn),
        }),
      );
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
            title: normalizeChoreTitle(chore.title),
            room: chore.room ?? undefined,
            time_estimate_minutes: chore.time_estimate_minutes,
            is_someday: isChoreSomeday(chore),
            repeats: Boolean(getChoreInterval(chore)),
            interval_value: chore.interval_value ?? undefined,
            interval_unit: chore.interval_unit ?? undefined,
            next_due_on: nextDueAtToDateString(chore.next_due_at) ?? undefined,
          }}
          submitLabel="Save changes"
          onSubmit={handleEditSave}
          onCancel={() => setEditingChoreId(null)}
          onRememberRoom={rememberRoom}
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

  const filteredEmptyMessage =
    scheduleFilter === 'overdue'
      ? 'No overdue chores'
      : scheduleFilter === 'today'
      ? 'Nothing due today'
      : scheduleFilter === 'weekly'
        ? 'Nothing due later this week'
        : scheduleFilter === 'someday'
          ? 'No someday chores yet'
          : scheduleFilter === 'all'
            ? 'No scheduled chores'
            : 'No chores in this category';

  const anySheetOpen = chooserOpen || taskSheetOpen || choreSheetOpen || repeatPrompt != null;

  const repeatPromptChore = repeatPrompt
    ? chores.find((c) => c.id === repeatPrompt.choreId)
    : null;

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
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-[22px] font-semibold text-[#3D3530] md:text-xl">Chores</h1>
            {totalOverdueCount > 0 ? (
              <button
                type="button"
                onClick={() => handleScheduleFilterChange('overdue')}
                className="shrink-0 rounded-full bg-[#C0463F16] px-2.5 py-0.5 text-[13px] font-medium text-[#C0463F] transition-colors hover:bg-[#C0463F24]"
              >
                {totalOverdueCount} overdue
              </button>
            ) : null}
          </div>

          <div
            className="flex shrink-0 rounded-full bg-[#EFEBE3] p-0.5"
            role="group"
            aria-label="Group chores by"
          >
            <button
              type="button"
              onClick={() => handleViewModeChange('schedule')}
              aria-pressed={viewMode === 'schedule'}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                viewMode === 'schedule'
                  ? 'bg-[#3D3530] text-[#FAF8F3]'
                  : 'bg-transparent text-[#938C7C]'
              }`}
            >
              <CalendarDays size={12} strokeWidth={2} aria-hidden />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('room')}
              aria-pressed={viewMode === 'room'}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                viewMode === 'room'
                  ? 'bg-[#3D3530] text-[#FAF8F3]'
                  : 'bg-transparent text-[#938C7C]'
              }`}
            >
              <Home size={12} strokeWidth={2} aria-hidden />
              Room
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CHORE_SCHEDULE_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleScheduleFilterChange(id)}
              className={`rounded-full border px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
                scheduleFilter === id ? FILTER_PILL_ACTIVE : FILTER_PILL_INACTIVE
              }`}
            >
              {label} · {filterCounts[id]}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <TaskQueueSkeleton />
          ) : filteredChores.length === 0 ? (
            <p className="py-4 text-center text-base text-text-faint md:text-sm">
              {filteredEmptyMessage}
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
        onRememberRoom={rememberRoom}
        onChoreAdded={handleChoreAdded}
      />

      {repeatPromptChore ? (
        <ChoreRepeatPromptSheet
          open={repeatPrompt != null}
          choreTitle={normalizeChoreTitle(repeatPromptChore.title)}
          onSelect={handleRepeatPromptSelect}
          onClose={() => {
            setRepeatPrompt(null);
            if (repeatPrompt && timer.activeTaskId === repeatPrompt.choreId) {
              setForceCompleted(false);
              setCompletionSubline(undefined);
            }
          }}
        />
      ) : null}

      <AddTaskFab
        onClick={openChooser}
        showOnDesktop
        hidden={anySheetOpen || (timerActive && focusTimerExpanded)}
      />
    </>
  );
}
