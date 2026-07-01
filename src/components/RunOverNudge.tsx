import { formatTimerDisplay } from '../types';
import type { Task } from '../types';

interface RunOverNudgeProps {
  task: Task;
  elapsedSeconds: number;
  onExtend10: () => void;
  onExtend25: () => void;
  onMarkDone: () => void;
}

export function RunOverNudge({
  task,
  elapsedSeconds,
  onExtend10,
  onExtend25,
  onMarkDone,
}: RunOverNudgeProps) {
  const overSeconds = elapsedSeconds - task.estimate_minutes * 60;

  return (
    <div className="mt-4 rounded-[12px] border border-runover-border bg-runover-bg px-5 py-4">
      <p className="text-sm text-text-primary">
        You estimated {task.estimate_minutes} min — you&apos;re at{' '}
        <span className="font-semibold">{formatTimerDisplay(-overSeconds)}</span>. Keep going?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExtend10}
          className="rounded-full border border-high-border bg-high-bg px-4 py-1.5 text-xs font-medium text-high transition-colors hover:bg-high/20"
        >
          +10 min
        </button>
        <button
          type="button"
          onClick={onExtend25}
          className="rounded-full border border-high-border bg-high-bg px-4 py-1.5 text-xs font-medium text-high transition-colors hover:bg-high/20"
        >
          +25 min
        </button>
        <button
          type="button"
          onClick={onMarkDone}
          className="rounded-full bg-high px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-high/90"
        >
          Mark done
        </button>
      </div>
    </div>
  );
}
