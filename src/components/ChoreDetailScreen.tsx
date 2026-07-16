import { useEffect, useState } from 'react';
import { ArrowLeft, Check, MoreVertical, Play } from 'lucide-react';
import {
  addIntervalToDateString,
  getChoreInterval,
  getChoreIntervalLabel,
  isChoreDueToday,
  isChoreSomeday,
  nextDueAtToDateString,
  normalizeChoreTitle,
} from '../lib/choreSchedule';
import { getTodayDateString } from '../types';
import type { Chore } from '../types';

interface UpcomingRow {
  id: string;
  dateLabel: string;
  statusLabel: string;
  statusTone: 'completed' | 'due-today' | 'later';
  completed: boolean;
  /** Only the current occurrence can be marked done from this screen. */
  canComplete: boolean;
  /** Latest completed row can be undone when a snapshot is available. */
  canUncomplete: boolean;
  showStart: boolean;
}

function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function relativeFutureLabel(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today) return 'Due today';
  const [ty, tm, td] = today.split('-').map(Number);
  const [yy, mm, dd] = dateStr.split('-').map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const dueMs = Date.UTC(yy, mm - 1, dd);
  const days = Math.round((dueMs - todayMs) / 86400000);
  if (days < 0) {
    const overdue = Math.abs(days);
    return `${overdue} day${overdue === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) return 'Due today';
  if (days < 7) return `In ${days} day${days === 1 ? '' : 's'}`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `In ${weeks} week${weeks === 1 ? '' : 's'}`;
  const months = Math.round(days / 30);
  return `In ${months} month${months === 1 ? '' : 's'}`;
}

function buildUpcomingRows(chore: Chore): UpcomingRow[] {
  const rows: UpcomingRow[] = [];
  const interval = getChoreInterval(chore);

  if (chore.last_completed_at) {
    const completedStr =
      nextDueAtToDateString(chore.last_completed_at) ??
      chore.last_completed_at.slice(0, 10);
    rows.push({
      id: `completed-${completedStr}`,
      dateLabel: formatLongDate(completedStr),
      statusLabel: 'Completed',
      statusTone: 'completed',
      completed: true,
      canComplete: false,
      canUncomplete: true,
      showStart: false,
    });
  }

  if (isChoreSomeday(chore) || !chore.next_due_at) {
    if (!chore.last_completed_at) {
      rows.push({
        id: 'someday',
        dateLabel: 'No due date',
        statusLabel: 'Someday',
        statusTone: 'later',
        completed: false,
        canComplete: true,
        canUncomplete: false,
        showStart: true,
      });
    }
    return rows;
  }

  let cursor =
    nextDueAtToDateString(chore.next_due_at) ?? chore.next_due_at.slice(0, 10);
  const futureCount = interval ? 4 : 1;

  for (let i = 0; i < futureCount; i++) {
    const dueToday = cursor === getTodayDateString() || (i === 0 && isChoreDueToday(chore));
    rows.push({
      id: `due-${cursor}-${i}`,
      dateLabel: formatLongDate(cursor),
      statusLabel: dueToday ? 'Due today' : relativeFutureLabel(cursor),
      statusTone: dueToday ? 'due-today' : 'later',
      completed: false,
      canComplete: i === 0,
      canUncomplete: false,
      showStart: true,
    });

    if (!interval) break;
    cursor = addIntervalToDateString(cursor, interval.value, interval.unit);
  }

  return rows;
}

interface ChoreDetailScreenProps {
  chore: Chore;
  canUncomplete?: boolean;
  onBack: () => void;
  onStart: (choreId: string) => void;
  onEdit: (choreId: string) => void;
  onComplete: (choreId: string) => void | Promise<void | 'done' | 'prompted' | 'noop'>;
  onUncomplete: (choreId: string) => void | Promise<boolean>;
}

export function ChoreDetailScreen({
  chore,
  canUncomplete = false,
  onBack,
  onStart,
  onEdit,
  onComplete,
  onUncomplete,
}: ChoreDetailScreenProps) {
  const displayTitle = normalizeChoreTitle(chore.title);
  const recurrence = getChoreIntervalLabel(chore);
  const nextDueStr = chore.next_due_at
    ? nextDueAtToDateString(chore.next_due_at)
    : null;
  const nextDueLabel = nextDueStr
    ? formatLongDate(nextDueStr)
    : isChoreSomeday(chore)
      ? 'No due date'
      : '—';
  const rows = buildUpcomingRows(chore);
  const [markingDone, setMarkingDone] = useState(false);
  const [optimisticDoneId, setOptimisticDoneId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticDoneId(null);
    setMarkingDone(false);
  }, [chore.id, chore.last_completed_at, chore.next_due_at]);

  const handleToggleComplete = async (row: UpcomingRow) => {
    if (markingDone) return;

    const isCompleted = row.completed || optimisticDoneId === row.id;
    if (isCompleted) {
      if (!row.canUncomplete || !canUncomplete) return;
      setMarkingDone(true);
      setOptimisticDoneId(null);
      try {
        const ok = await onUncomplete(chore.id);
        if (!ok) {
          // Keep showing completed if undo failed; parent state unchanged.
        }
      } finally {
        setMarkingDone(false);
      }
      return;
    }

    if (!row.canComplete) return;
    setMarkingDone(true);
    setOptimisticDoneId(row.id);
    try {
      const result = await onComplete(chore.id);
      if (result === 'prompted' || result === 'noop') {
        setOptimisticDoneId(null);
      }
    } catch {
      setOptimisticDoneId(null);
    } finally {
      setMarkingDone(false);
    }
  };

  return (
    <div className="flex flex-col px-6 pb-28 pt-6 md:pb-6">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center text-text-primary"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className="min-w-0 flex-1 font-display text-[24px] leading-snug text-text-primary">
          {displayTitle}
        </h1>
        <button
          type="button"
          aria-label={`Edit ${displayTitle}`}
          onClick={() => onEdit(chore.id)}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center text-text-muted"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="mt-6 w-full rounded-[16px] border border-[#e5e5f2] bg-surface p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-medium text-[#666673]">Room</p>
            <p className="text-[17px] font-bold text-text-primary">
              {chore.room?.trim() || 'Unassigned'}
            </p>
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#666673]">Recurrence</p>
            <p className="text-[17px] font-bold text-text-primary">{recurrence}</p>
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#666673]">Next due</p>
            <p className="text-[17px] font-bold text-text-primary">{nextDueLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-[18px] font-bold text-text-primary">Upcoming</h2>
        <div className="mt-3">
          {rows.length === 0 ? (
            <p className="py-4 text-base text-text-muted">No upcoming dates</p>
          ) : (
            rows.map((row, index) => {
              const completed = row.completed || optimisticDoneId === row.id;
              const canToggle =
                (!completed && row.canComplete) ||
                (completed && row.canUncomplete && canUncomplete);

              return (
                <div key={row.id}>
                  {index > 0 ? <div className="h-px bg-[#ebebed]" /> : null}
                  <div className="flex items-center gap-2 py-3.5">
                    {canToggle ? (
                      <button
                        type="button"
                        aria-label={
                          completed
                            ? `Undo completion of ${row.dateLabel}`
                            : `Mark ${row.dateLabel} as done`
                        }
                        disabled={markingDone}
                        onClick={() => void handleToggleComplete(row)}
                        className="flex size-11 shrink-0 items-center justify-center disabled:opacity-60"
                      >
                        {completed ? (
                          <span className="flex size-6 items-center justify-center rounded-[4px] bg-accent text-white">
                            <Check size={16} strokeWidth={3} aria-hidden />
                          </span>
                        ) : (
                          <span className="size-6 rounded-[4px] border-[1.5px] border-[#bfbfc7]" />
                        )}
                      </button>
                    ) : completed ? (
                      <span
                        className="flex size-11 shrink-0 items-center justify-center"
                        aria-label="Completed"
                      >
                        <span className="flex size-6 items-center justify-center rounded-[4px] bg-accent text-white">
                          <Check size={16} strokeWidth={3} aria-hidden />
                        </span>
                      </span>
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden>
                        <span className="size-6 rounded-[4px] border-[1.5px] border-[#bfbfc7]" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[16px] font-medium transition-colors ${
                          completed
                            ? 'text-[#9999a1] line-through'
                            : 'text-text-primary'
                        }`}
                      >
                        {row.dateLabel}
                      </p>
                      <p
                        className={`text-[14px] font-medium ${
                          completed
                            ? 'text-[#9999a1]'
                            : row.statusTone === 'due-today'
                              ? 'text-[#eb8c0d]'
                              : 'text-[#737380]'
                        }`}
                      >
                        {completed ? 'Completed' : row.statusLabel}
                      </p>
                    </div>
                    {!completed && row.showStart ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[15px] font-medium text-[#737380]">
                          ~{chore.time_estimate_minutes} min
                        </span>
                        <button
                          type="button"
                          onClick={() => onStart(chore.id)}
                          className="flex min-h-11 items-center gap-1 rounded-[8px] bg-[#f0f0ff] px-3 text-[15px] font-medium text-accent"
                        >
                          <Play size={14} fill="currentColor" strokeWidth={0} aria-hidden />
                          Start
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
