import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Play, Check } from 'lucide-react';
import { formatMinutes, PRIORITY_COLORS } from '../types';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  isTimerActive: boolean;
  isCompleting?: boolean;
  showCategory?: boolean;
  onSelect: (taskId: string) => void;
  onStart: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}

export function TaskCard({
  task,
  isSelected,
  isTimerActive,
  isCompleting = false,
  showCategory = true,
  onSelect,
  onStart,
  onEdit,
  onComplete,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = PRIORITY_COLORS[task.priority];

  const stateClass = isTimerActive
    ? `ring-2 ring-text-primary ring-offset-1 shadow-sm ${colors.bg}`
    : isSelected
      ? `ring-2 ring-medium ring-offset-1 ${colors.bg}`
      : `border ${colors.bg} ${colors.border}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center gap-1 rounded-[12px] transition-all duration-300 ease-out ${stateClass} ${
        isCompleting ? 'pointer-events-none scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}
    >
      <button
        type="button"
        onClick={() => onComplete(task.id)}
        title="Mark done"
        aria-label={`Mark ${task.title} as done`}
        className="group my-2 ml-3 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full bg-surface shadow-sm transition-all hover:bg-accent hover:shadow-md active:scale-95"
      >
        <Check
          size={20}
          strokeWidth={2.5}
          className="text-text-muted transition-colors group-hover:text-white"
        />
      </button>
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        className="flex min-w-0 flex-1 flex-col items-start py-3 pr-2 text-left"
      >
        {showCategory && task.category && (
          <span className="mb-1 rounded-full bg-surface/70 px-2 py-0.5 text-[10px] font-medium text-text-muted">
            {task.category}
          </span>
        )}
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-text-primary">{task.title}</span>
          <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${colors.text}`}>
            {formatMinutes(task.estimate_minutes)}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onEdit(task.id)}
        aria-label={`Edit ${task.title}`}
        className="shrink-0 px-1.5 py-3 text-text-faint transition-colors hover:text-text-muted"
      >
        <Pencil size={14} />
      </button>

      <button
        type="button"
        onClick={() => onStart(task.id)}
        aria-label={`Start focus on ${task.title}`}
        className="shrink-0 px-1.5 py-3 text-text-muted transition-colors hover:text-accent"
      >
        <Play size={16} fill="currentColor" />
      </button>

      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label={`Reorder ${task.title}`}
        className="shrink-0 cursor-grab touch-none px-2 py-3 text-text-faint active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
    </div>
  );
}
