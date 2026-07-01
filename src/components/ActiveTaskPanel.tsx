import { Hourglass, Play } from 'lucide-react';
import { formatMinutes, formatTimerDisplay } from '../types';
import type { Task } from '../types';
import { PRIORITY_COLORS } from '../types';

interface ActiveTaskPanelProps {
  task: Task | null;
  remainingSeconds: number;
  elapsedSeconds: number;
  progress: number;
  isRunOver: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isPreview: boolean;
  onStartFocus: () => void;
  onPause: () => void;
  onCancel: () => void;
  onDone: () => void;
}

export function ActiveTaskPanel({
  task,
  remainingSeconds,
  elapsedSeconds,
  progress,
  isRunOver,
  isRunning,
  isPaused,
  isPreview,
  onStartFocus,
  onPause,
  onCancel,
  onDone,
}: ActiveTaskPanelProps) {
  if (!task) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[14px] border border-border bg-surface p-8">
        <div className="text-center">
          <Hourglass size={32} className="mx-auto mb-4 text-text-faint" strokeWidth={1.5} />
          <p className="text-sm font-medium text-text-muted">Select a task from your queue</p>
          <p className="mt-1 text-xs text-text-faint">Then press Start focus when you&apos;re ready</p>
        </div>
      </div>
    );
  }

  const displaySeconds = isPreview
    ? task.estimate_minutes * 60
    : isRunOver
      ? -(elapsedSeconds - task.estimate_minutes * 60)
      : remainingSeconds;

  const timerColor = isPreview
    ? 'text-text-faint'
    : isRunOver
      ? 'text-high'
      : 'text-text-primary';
  const barColor = isRunOver ? 'bg-high' : 'bg-accent';
  const barProgress = isPreview ? 0 : Math.min(100, progress * 100);

  return (
    <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-[14px] border border-border bg-surface p-5 sm:min-h-[360px] sm:p-8">
      <div className="flex w-full max-w-[360px] items-start justify-between">
        {task.category ? (
          <span className="rounded-full bg-surface-raised px-3 py-1 text-xs font-medium text-text-muted">
            {task.category}
          </span>
        ) : (
          <span />
        )}
        <span
          className={`h-2.5 w-2.5 rounded-full ${PRIORITY_COLORS[task.priority].dot}`}
        />
      </div>

      <h2 className="mt-4 max-w-[360px] text-center text-lg font-semibold leading-snug text-text-primary sm:mt-6 sm:text-[22px]">
        {task.title}
      </h2>

      <p
        className={`mt-6 font-bold tabular-nums sm:mt-8 ${timerColor}`}
        style={{ fontSize: 'clamp(3rem, 14vw, 6rem)', lineHeight: 1 }}
      >
        {formatTimerDisplay(displaySeconds)}
      </p>

      <p className="mt-2 text-xs text-text-muted">
        {isPreview
          ? `estimated · ${formatMinutes(task.estimate_minutes)}`
          : isRunOver
            ? 'over estimate'
            : 'remaining'}{' '}
        {!isPreview && `· est. ${task.estimate_minutes} min`}
      </p>

      <div className="mt-6 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barProgress}%` }}
        />
      </div>

      {isPreview ? (
        <button
          type="button"
          onClick={onStartFocus}
          className="mt-8 flex items-center gap-2 rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-bright"
        >
          <Play size={16} fill="currentColor" />
          Start focus
        </button>
      ) : (
        <div className="mt-6 flex w-full max-w-[320px] flex-wrap justify-center gap-2 sm:mt-8 sm:max-w-none sm:gap-3">
          <button
            type="button"
            onClick={onPause}
            disabled={!isRunning && !isPaused}
            className="min-w-[88px] flex-1 rounded-[12px] border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-raised disabled:opacity-40 sm:flex-none sm:px-5"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[88px] flex-1 rounded-[12px] border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-raised sm:flex-none sm:px-5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDone}
            className="min-w-[88px] flex-1 rounded-[12px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-bright sm:flex-none sm:px-5"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
