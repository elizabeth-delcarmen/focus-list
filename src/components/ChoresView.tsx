import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AddChoreBottomSheet } from './AddChoreBottomSheet';
import { AddTaskFab } from './AddTaskFab';
import { ChoreCard } from './ChoreCard';
import { ChoreDetailScreen } from './ChoreDetailScreen';
import { ChoreRepeatPromptSheet } from './ChoreRepeatPromptSheet';
import { FocusTimerScreen } from './FocusTimerScreen';
import { RoomsOverview } from './RoomsOverview';
import { TaskQueueSkeleton } from './Skeleton';
import { useChoreRooms } from '../hooks/useChoreRooms';
import { useTimer } from '../hooks/useTimer';
import {
  dateStringToISO,
  countChoresInScheduleFilter,
  countOverdueChores,
  deriveDayOfWeekForChore,
  formatNextDueInterval,
  getChoreDueStatus,
  getChoreIntervalLabel,
  getScheduleFilterForChore,
  groupChoresByRoom,
  groupChoresForScheduleView,
  isChoreOverdue,
  isChoreSomeday,
  isChoreVisibleInScheduleFilter,
  needsChoreRepeatPrompt,
  normalizeChoreTitle,
} from '../lib/choreSchedule';
import {
  CHORE_SCHEDULE_FILTERS,
  type Chore,
  type ChoreRecurrenceChoice,
  type ChoreScheduleFilter,
  type EditChoreInput,
  type NewChoreInput,
  type NewTaskInput,
  type Task,
} from '../types';

const COMPLETE_ANIM_MS = 300;

const FILTER_PILL_ACTIVE =
  'border-accent bg-accent text-white';
const FILTER_PILL_INACTIVE =
  'border-border bg-transparent text-text-primary hover:border-accent/40';

export type ChoresScreenMode = 'rooms' | 'schedule';

interface ChoresViewProps {
  mode?: ChoresScreenMode;
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
  hideFab?: boolean;
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
  mode = 'rooms',
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
  hideFab = false,
}: ChoresViewProps) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [detailChoreId, setDetailChoreId] = useState<string | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<ChoreScheduleFilter>('today');
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

  useEffect(() => {
    if (mode === 'rooms') {
      setSelectedRoom(null);
      setDetailChoreId(null);
    }
  }, [mode]);

  const handleScheduleFilterChange = (filter: ChoreScheduleFilter) => {
    setScheduleFilter(filter);
  };

  const handleChoreAdded = useCallback((chore: Chore) => {
    setScheduleFilter(getScheduleFilterForChore(chore));
  }, []);

  useEffect(() => {
    if (!pendingScheduleFilter) return;
    setScheduleFilter(pendingScheduleFilter);
    onPendingScheduleFilterApplied?.();
  }, [pendingScheduleFilter, onPendingScheduleFilterApplied]);

  const { existingRooms, rememberRoom } = useChoreRooms(chores);

  const totalOverdueCount = useMemo(() => countOverdueChores(chores), [chores]);

  const roomSummaries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const room of existingRooms) {
      counts.set(room, 0);
    }
    for (const chore of chores) {
      const room = chore.room?.trim();
      if (!room) continue;
      counts.set(room, (counts.get(room) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, taskCount]) => ({ name, taskCount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [chores, existingRooms]);

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        CHORE_SCHEDULE_FILTERS.map(({ id }) => [id, countChoresInScheduleFilter(chores, id)]),
      ) as Record<ChoreScheduleFilter, number>,
    [chores],
  );

  const filteredChores = useMemo(() => {
    if (mode === 'rooms' && selectedRoom) {
      return chores.filter((c) => (c.room?.trim() || 'Unassigned') === selectedRoom);
    }
    return chores.filter((c) => isChoreVisibleInScheduleFilter(c, scheduleFilter));
  }, [chores, scheduleFilter, mode, selectedRoom]);

  const groupedChores = useMemo(() => {
    if (mode === 'rooms' && selectedRoom) {
      return [{ label: '', chores: filteredChores }];
    }
    if (mode === 'rooms') {
      return groupChoresByRoom(filteredChores);
    }
    return groupChoresForScheduleView(filteredChores, scheduleFilter);
  }, [filteredChores, mode, selectedRoom, scheduleFilter]);

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

  const openNewTask = () => {
    setSheetKey((key) => key + 1);
    setChoreSheetOpen(true);
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
      updatePayload.day_of_week =
        values.day_of_week != null
          ? values.day_of_week
          : hasRecurrence
            ? deriveDayOfWeekForChore(intervalValue, intervalUnit, nextDueOn)
            : null;
    }

    const ok = await onUpdateChore(editingChoreId, updatePayload);
    if (!ok) return;

    if (isSomeday) {
      setScheduleFilter('someday');
    } else if (nextDueOn) {
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
    if (detailChoreId === choreId) {
      setDetailChoreId(null);
    }
  };

  const renderChore = (chore: Chore) => (
    <ChoreCard
      key={chore.id}
      chore={chore}
      isCompleting={chore.id === completingChoreId}
      onComplete={(id) => void handleCompleteChore(id)}
      onStart={(id) => void handleStartChore(id)}
      onEdit={setEditingChoreId}
      onDelete={(id) => void handleDeleteChore(id)}
      onOpenDetail={setDetailChoreId}
    />
  );

  const detailChore = detailChoreId
    ? chores.find((c) => c.id === detailChoreId) ?? null
    : null;
  const editingChore = editingChoreId
    ? chores.find((c) => c.id === editingChoreId) ?? null
    : null;

  const timerContextMeta = activeChore
    ? [
        getChoreIntervalLabel(activeChore),
        getChoreDueStatus(activeChore).label,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

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

  const anySheetOpen = choreSheetOpen || editingChoreId != null || repeatPrompt != null;

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
          contextRoom={activeChore?.room?.trim() || null}
          contextMeta={timerContextMeta}
          onMinimize={() => setFocusTimerExpanded(false)}
          onPauseResume={handlePauseOrResume}
          onComplete={handleCompleteFromTimer}
          onStartNext={handleStartChore}
          onSwitchTask={handleStartChore}
          onAddTask={addTodayTask}
          onAddBacklogTask={addBacklogTask}
        />
      ) : null}

      {detailChore ? (
        <ChoreDetailScreen
          chore={detailChore}
          onBack={() => setDetailChoreId(null)}
          onStart={(id) => {
            setDetailChoreId(null);
            void handleStartChore(id);
          }}
          onEdit={(id) => {
            setDetailChoreId(null);
            setEditingChoreId(id);
          }}
        />
      ) : mode === 'rooms' && !selectedRoom ? (
        <RoomsOverview
          rooms={roomSummaries}
          loading={loading}
          onSelectRoom={setSelectedRoom}
        />
      ) : (
        <div className="relative flex flex-col px-6 pb-28 pt-6 md:pb-6">
          {mode === 'rooms' && selectedRoom ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                aria-label="Back to rooms"
                className="flex size-6 items-center justify-center text-text-primary"
              >
                <ArrowLeft size={24} strokeWidth={2} />
              </button>
              <h1 className="font-display text-[24px] leading-tight text-text-primary">
                {selectedRoom}
              </h1>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="font-display text-[28px] leading-tight text-text-primary">
                  Schedule
                </h1>
                {totalOverdueCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleScheduleFilterChange('overdue')}
                    className="shrink-0 rounded-full bg-urgent-bg px-2.5 py-0.5 text-[13px] font-medium text-urgent transition-colors hover:bg-urgent/10"
                  >
                    {totalOverdueCount} overdue
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {mode === 'schedule' ? (
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
          ) : null}

          <div className="mt-6">
            {loading ? (
              <TaskQueueSkeleton />
            ) : filteredChores.length === 0 ? (
              <p className="py-4 text-center text-base text-text-faint md:text-sm">
                {mode === 'rooms'
                  ? 'No chores in this room'
                  : filteredEmptyMessage}
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
                    <div className="space-y-4">
                      {group.chores.map((chore) => renderChore(chore))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddChoreBottomSheet
        open={editingChore != null}
        existingRooms={existingRooms}
        chore={editingChore}
        onClose={() => setEditingChoreId(null)}
        onUpdateChore={async (_id, values) => {
          await handleEditSave(values);
        }}
        onDeleteChore={handleDeleteChore}
        onRememberRoom={rememberRoom}
      />

      {!hideFab ? (
        <>
          <AddChoreBottomSheet
            key={`chore-${sheetKey}`}
            open={choreSheetOpen}
            existingRooms={existingRooms}
            defaultRoom={selectedRoom}
            onClose={() => setChoreSheetOpen(false)}
            onAddChore={onAddChore}
            saveError={choresError}
            onRememberRoom={rememberRoom}
            onChoreAdded={handleChoreAdded}
          />

          <AddTaskFab
            onClick={openNewTask}
            showOnDesktop
            hidden={anySheetOpen || (timerActive && focusTimerExpanded)}
          />
        </>
      ) : null}

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
    </>
  );
}
