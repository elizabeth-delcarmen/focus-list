import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatMinutes } from '../types';
import type { Task } from '../types';

interface CompletedTodaySectionProps {
  tasks: Task[];
  title?: string;
}

export function CompletedTodaySection({ tasks, title = 'Completed today' }: CompletedTodaySectionProps) {
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-full px-1 py-1 text-left transition-colors hover:text-text-primary"
      >
        <span className="text-[13px] font-medium uppercase tracking-wide text-text-faint md:text-[11px]">
          {title}
          <span className="ml-2 text-base normal-case text-text-muted md:text-sm">({tasks.length})</span>
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
              <span className="truncate text-base text-text-muted line-through decoration-text-faint/60 md:text-[13px]">
                {task.title}
              </span>
              <span className="ml-2 shrink-0 text-base text-text-faint md:text-[11px]">
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
