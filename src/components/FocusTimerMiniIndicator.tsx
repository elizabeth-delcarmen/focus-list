import { ChevronUp } from 'lucide-react';
import { formatTimerDisplay, PRIORITY_HEX, type Task } from '../types';

interface FocusTimerMiniIndicatorProps {
  task: Task;
  remainingSeconds: number;
  isPaused: boolean;
  onExpand: () => void;
}

export function FocusTimerMiniIndicator({
  task,
  remainingSeconds,
  isPaused,
  onExpand,
}: FocusTimerMiniIndicatorProps) {
  const color = PRIORITY_HEX[task.priority].solid;

  return (
    <button
      type="button"
      onClick={onExpand}
      className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[45] mx-auto flex max-w-lg items-center gap-3 rounded-full border border-border bg-bg px-4 py-2.5 shadow-[0_4px_16px_rgba(61,53,48,0.12)] md:inset-x-auto md:left-[calc(200px+1rem)] md:right-4"
      aria-label={`Focus timer running on ${task.title}. Tap to expand.`}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-left text-[15px] font-medium text-text-primary">
        {task.title}
      </span>
      <span className="shrink-0 text-[15px] font-medium tabular-nums text-text-primary">
        {formatTimerDisplay(Math.max(0, remainingSeconds))}
        {isPaused ? ' · Paused' : ''}
      </span>
      <ChevronUp size={18} className="shrink-0 text-text-muted" aria-hidden />
    </button>
  );
}
