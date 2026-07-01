import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatMinutes } from '../types';
import type { Task } from '../types';

interface CompletedTodaySectionProps {
  tasks: Task[];
}

export function CompletedTodaySection({ tasks }: CompletedTodaySectionProps) {
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-full px-1 py-1 text-left transition-colors hover:text-text-primary"
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-faint">
          Completed today
          <span className="ml-2 normal-case text-text-muted">({tasks.length})</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-text-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded-[12px] border border-border bg-surface-raised/60 px-4 py-2.5"
            >
              <span className="truncate text-[13px] text-text-muted line-through decoration-text-faint/60">
                {task.title}
              </span>
              <span className="ml-2 shrink-0 text-[11px] text-text-faint">
                {task.actual_minutes > 0
                  ? `${formatMinutes(task.actual_minutes)} tracked`
                  : formatMinutes(task.estimate_minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
