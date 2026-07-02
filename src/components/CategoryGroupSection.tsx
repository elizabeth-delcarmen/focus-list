import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { formatMinutes, sumEstimateMinutes, toCategoryGroupId } from '../types';
import type { Task } from '../types';

interface CategoryGroupSectionProps {
  label: string;
  tasks: Task[];
  children: ReactNode;
}

export function CategoryGroupSection({ label, tasks, children }: CategoryGroupSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: toCategoryGroupId(label) });

  return (
    <div
      ref={setNodeRef}
      className={`mb-4 rounded-[12px] transition-colors ${
        isOver ? 'bg-accent-soft/40 ring-1 ring-accent-border' : ''
      }`}
    >
      <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-text-muted md:text-[11px]">
        {label}
        <span className="ml-2 font-normal text-text-faint">
          · {formatMinutes(sumEstimateMinutes(tasks))}
        </span>
      </p>

      {tasks.length === 0 ? (
        <div
          className={`flex min-h-[52px] items-center justify-center rounded-[12px] border border-dashed px-4 ${
            isOver ? 'border-accent bg-surface' : 'border-border bg-surface/50'
          }`}
        >
          <span className="text-[13px] text-text-faint md:text-[11px]">Drop tasks here</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
