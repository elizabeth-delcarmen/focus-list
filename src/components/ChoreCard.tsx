import { useEffect, useState } from 'react';
import { CircleCheck, Pencil, Trash2 } from 'lucide-react';
import {
  getChoreDateSubtitle,
  getChoreDueStatus,
  getChoreIntervalLabel,
  normalizeChoreTitle,
} from '../lib/choreSchedule';
import type { Chore } from '../types';

export interface ChoreCardProps {
  chore: Chore;
  isCompleting?: boolean;
  onComplete?: (choreId: string) => void;
  onStart: (choreId: string) => void;
  onEdit: (choreId: string) => void;
  onDelete: (choreId: string) => void;
}

export function ChoreCard({
  chore,
  isCompleting = false,
  onComplete,
  onStart,
  onEdit,
  onDelete,
}: ChoreCardProps) {
  const [isTouchLike, setIsTouchLike] = useState(false);
  const [checkHovered, setCheckHovered] = useState(false);

  const displayTitle = normalizeChoreTitle(chore.title);
  const status = getChoreDueStatus(chore);
  const dateSubtitle = getChoreDateSubtitle(chore);
  const canComplete = Boolean(onComplete);

  const cardClassName = [
    'group/card flex min-w-0 flex-1 flex-col gap-2.5 rounded-[12px] border border-[#E4DFD3] bg-white px-[18px] pt-[18px] pb-[14px] transition-opacity duration-300 ease-out',
    isCompleting ? 'pointer-events-none opacity-0' : 'opacity-100',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setIsTouchLike(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const handleComplete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canComplete) return;
    onComplete?.(chore.id);
  };

  const stopTouchPropagation = (event: React.TouchEvent) => {
    event.stopPropagation();
  };

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit(chore.id);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Delete "${chore.title}"?`)) {
      onDelete(chore.id);
    }
  };

  const actionIconBase =
    'flex h-7 w-7 items-center justify-center rounded-full transition-opacity duration-150 ease hover:bg-white/60 focus-visible:opacity-100';

  const actionIconVisibility = isTouchLike
    ? 'opacity-70 pointer-events-auto'
    : 'pointer-events-none opacity-0 group-hover/card:pointer-events-auto group-hover/card:opacity-70';

  const statusPillClass =
    status.kind === 'overdue'
      ? 'bg-[#FBE4E2] text-[#A32D2D]'
      : status.kind === 'today'
        ? 'bg-[#4A7C5916] text-[#4A7C59]'
        : 'bg-[#938C7C16] text-[#938C7C]';

  return (
    <div data-task-interactive="" className={cardClassName}>
      <div className="flex items-stretch gap-3">
        <div className="flex w-11 shrink-0 items-center justify-center self-start">
          <button
            type="button"
            onClick={handleComplete}
            disabled={!canComplete}
            aria-label={`Mark ${displayTitle} as done`}
            onMouseEnter={() => setCheckHovered(true)}
            onMouseLeave={() => setCheckHovered(false)}
            onTouchStart={stopTouchPropagation}
            onTouchEnd={stopTouchPropagation}
            onTouchMove={stopTouchPropagation}
            className={[
              'group/time relative flex flex-col items-center justify-center text-[#938C7C]',
              canComplete ? 'cursor-pointer' : '',
              isTouchLike && canComplete ? 'rounded-full border border-current/25 px-0.5 py-1' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className={`flex flex-col items-center transition-opacity duration-100 ease ${
                !isTouchLike && canComplete ? 'group-hover/card:opacity-0' : ''
              }`}
            >
              <span className="text-[22px] font-medium tabular-nums leading-none md:text-[20px]">
                {chore.time_estimate_minutes}
              </span>
              <span className="mt-0.5 text-[11px] font-normal uppercase tracking-[0.06em] opacity-70">
                min
              </span>
            </div>

            {!isTouchLike && canComplete ? (
              <CircleCheck
                size={22}
                strokeWidth={2}
                aria-hidden
                className={`absolute text-[#938C7C] transition-opacity duration-100 ease ${
                  checkHovered ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-60'
                }`}
              />
            ) : null}
          </button>
        </div>

        <div className="w-px shrink-0 self-stretch bg-[#E4DFD3]" aria-hidden />

        <button
          type="button"
          onClick={() => onStart(chore.id)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block w-full whitespace-normal text-base font-normal leading-[1.35] text-[#211E19] md:text-[13px]">
            {displayTitle}
          </span>
          {dateSubtitle ? (
            <span className="mt-0.5 block text-[13px] font-normal leading-snug text-[#938C7C] md:text-[11px]">
              {dateSubtitle}
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-border bg-white px-2 py-0.5 text-[13px] font-normal text-[#6E6A5E] md:text-[10px]">
            {getChoreIntervalLabel(chore)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={handleEdit}
            aria-label={`Edit ${displayTitle}`}
            onTouchStart={stopTouchPropagation}
            onTouchEnd={stopTouchPropagation}
            onTouchMove={stopTouchPropagation}
            className={`${actionIconBase} ${actionIconVisibility} text-[#6E6A5E] hover:opacity-100`}
          >
            <Pencil size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={`Delete ${displayTitle}`}
            onTouchStart={stopTouchPropagation}
            onTouchEnd={stopTouchPropagation}
            onTouchMove={stopTouchPropagation}
            className={`${actionIconBase} ${actionIconVisibility} text-[#C0463F] hover:opacity-100`}
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
          <span
            className={`ml-0.5 shrink-0 rounded-full px-[10px] py-1 text-[14px] font-normal md:text-[11px] ${statusPillClass}`}
          >
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}
