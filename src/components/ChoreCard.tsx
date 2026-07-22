import { Calendar, Check, Clock, MoreVertical, Play } from 'lucide-react';
import {
  getChoreDueStatus,
  getChoreIntervalLabel,
  normalizeChoreTitle,
} from '../lib/choreSchedule';
import type { Chore } from '../types';

export interface ChoreCardProps {
  chore: Chore;
  isCompleting?: boolean;
  highlighted?: boolean;
  onComplete?: (choreId: string) => void;
  onStart: (choreId: string) => void;
  onEdit: (choreId: string) => void;
  onDelete: (choreId: string) => void;
  onOpenDetail?: (choreId: string) => void;
}

export function ChoreCard({
  chore,
  isCompleting = false,
  highlighted = false,
  onComplete,
  onStart,
  onEdit,
  onDelete,
  onOpenDetail,
}: ChoreCardProps) {
  const displayTitle = normalizeChoreTitle(chore.title);
  const status = getChoreDueStatus(chore);
  const intervalLabel = getChoreIntervalLabel(chore);
  const pillLabel =
    intervalLabel === 'One-off' ? 'ONE-TIME' : intervalLabel.toUpperCase();
  const dueToday = status.kind === 'today';
  const showDueMeta = status.kind !== 'someday' && Boolean(chore.next_due_at);
  const estimateLabel = `~${chore.time_estimate_minutes} min`;

  const cardClassName = [
    'group/card flex w-full flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-[0_4px_6px_rgba(0,0,0,0.02)] transition-[border-color,opacity] duration-300 ease-out',
    highlighted
      ? 'border-[1.5px] border-accent'
      : 'border border-[#e5e7eb] focus-within:border-[1.5px] focus-within:border-accent',
    isCompleting ? 'pointer-events-none opacity-0' : 'opacity-100',
  ].join(' ');

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Delete "${displayTitle}"?`)) {
      onDelete(chore.id);
    }
  };

  return (
    <div data-task-interactive="" className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => (onOpenDetail ? onOpenDetail(chore.id) : onStart(chore.id))}
          className="min-w-0 flex-1 text-left"
        >
          <p className="line-clamp-3 text-[18px] font-bold leading-snug text-text-primary">
            {displayTitle}
          </p>
        </button>
        <button
          type="button"
          aria-label={`More actions for ${displayTitle}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(chore.id);
          }}
          className="flex size-11 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text-primary"
        >
          <MoreVertical size={20} strokeWidth={2} />
        </button>
      </div>

      {showDueMeta ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
          <Calendar
            size={16}
            strokeWidth={1.75}
            className={dueToday ? 'text-accent' : 'text-text-muted'}
            aria-hidden
          />
          <span className={dueToday ? 'text-accent' : 'text-text-muted'}>
            {status.label}
          </span>
          <span className="text-[#4a5463]" aria-hidden>
            ·
          </span>
          <Clock size={14} strokeWidth={1.75} className="text-[#4a5463]" aria-hidden />
          <span className="text-[#4a5463]">{estimateLabel}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="rounded-[8px] bg-[#f3f4fb] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
          {pillLabel}
        </span>
        <div className="-mr-2 flex shrink-0 items-center">
          {onComplete ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onComplete(chore.id);
              }}
              className="flex min-h-11 items-center gap-1 px-2 text-[15px] font-medium text-accent transition-opacity hover:opacity-80"
            >
              <Check size={14} strokeWidth={2.5} aria-hidden />
              Done
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStart(chore.id);
            }}
            className="flex min-h-11 items-center gap-1 px-2 text-[15px] font-medium text-accent transition-opacity hover:opacity-80"
          >
            <Play size={14} fill="currentColor" strokeWidth={0} aria-hidden />
            Start
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(chore.id);
            }}
            className="flex min-h-11 items-center px-2 text-[15px] font-medium text-accent transition-opacity hover:opacity-80"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex min-h-11 items-center px-2 text-[15px] font-medium text-text-muted transition-opacity hover:opacity-80"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
