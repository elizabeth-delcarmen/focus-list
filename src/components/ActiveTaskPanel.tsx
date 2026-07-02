import { Hourglass, Play } from 'lucide-react';
import { ActiveTaskPanelSkeleton } from './Skeleton';
import { Button } from './Button';
import { formatMinutes, formatTimerDisplay } from '../types';
import type { Task } from '../types';
import { PRIORITY_COLORS } from '../types';

interface ActiveTaskPanelProps {
  task: Task | null;
  loading?: boolean;
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
  loading = false,
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
  if (loading) {
    return <ActiveTaskPanelSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[14px] border border-border bg-surface p-8">
        <div className="text-center">
          <Hourglass size={32} className="mx-auto mb-4 text-text-faint" strokeWidth={1.5} />
          <p className="text-base font-medium text-text-muted md:text-sm">Select a task from your queue</p>
          <p className="mt-1 text-base text-text-faint md:text-xs">Then press Start focus when you&apos;re ready</p>
        </div>
      </div>
    );
  }

  const displaySeconds = isPreview
    ? task.estimate_minutes * 60
    : isRunOver
      ? -(elapsedSeconds - task.estimate_minutes * 60)
      : remainingSeconds;

  const priorityColors = PRIORITY_COLORS[task.priority];

  const timerColor = isPreview
    ? 'text-text-faint'
    : isRunOver
      ? 'text-high'
      : 'text-text-primary';
  const barColor = isRunOver ? 'bg-high' : 'bg-accent';
  const barProgress = isPreview ? 0 : Math.min(100, progress * 100);

  return (
    <div
      data-task-interactive=""
      className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-[14px] border border-border bg-surface p-5 sm:min-h-[360px] sm:p-8"
    >
      {task.category ? (
        <span className="rounded-full bg-surface-raised px-3 py-1 text-base font-medium text-text-muted md:text-xs">
          {task.category}
        </span>
      ) : null}

      <h2 className="mt-4 max-w-[360px] text-center text-xl font-semibold leading-snug text-text-primary md:mt-6 md:text-[22px]">
        {task.title}
      </h2>

      <p className={`mt-6 text-[72px] font-bold leading-none tabular-nums md:mt-8 md:text-[96px] ${timerColor}`}>
        {formatTimerDisplay(displaySeconds)}
      </p>

      <p className="mt-2 text-base text-text-muted md:text-xs">
        {isPreview ? (
          <>
            estimated ·{' '}
            <span className={`font-semibold ${priorityColors.text}`}>
              {formatMinutes(task.estimate_minutes)}
            </span>
          </>
        ) : isRunOver ? (
          'over estimate'
        ) : (
          'remaining'
        )}{' '}
        {!isPreview && (
          <>
            · est.{' '}
            <span className={`font-semibold ${priorityColors.text}`}>
              {task.estimate_minutes} min
            </span>
          </>
        )}
      </p>

      <div className="mt-6 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barProgress}%` }}
        />
      </div>

      {isPreview ? (
        <Button size="lg" onClick={onStartFocus} className="mt-8">
          <Play size={16} fill="currentColor" />
          Start focus
        </Button>
      ) : (
        <div className="mt-6 flex w-full max-w-[320px] flex-wrap justify-center gap-2 sm:mt-8 sm:max-w-none sm:gap-3">
          <Button
            variant="secondary"
            onClick={onPause}
            disabled={!isRunning && !isPaused}
            className="min-w-[88px] flex-1 rounded-[12px] sm:flex-none sm:px-5"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="min-w-[88px] flex-1 rounded-[12px] sm:flex-none sm:px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={onDone}
            className="min-w-[88px] flex-1 rounded-[12px] sm:flex-none sm:px-5"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
