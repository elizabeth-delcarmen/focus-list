import { useEffect, useRef, useState } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CircleCheck, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { PRIORITY_COLORS } from '../types';
import type { Task } from '../types';

export interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  isTimerActive: boolean;
  isCompleting?: boolean;
  showCategory?: boolean;
  actionLabel?: 'Start' | 'Plan';
  planningMode?: boolean;
  planSelected?: boolean;
  onPlanToggle?: (taskId: string) => void;
  onSelect: (taskId: string) => void;
  onStart: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  /** Drag overlay clone — no interaction, elevated shadow */
  isDragOverlay?: boolean;
  /** Original slot while dragging — hidden but keeps layout */
  isDragPlaceholder?: boolean;
}

export function TaskCard({
  task,
  isSelected,
  isTimerActive,
  isCompleting = false,
  showCategory = true,
  actionLabel = 'Start',
  planningMode = false,
  planSelected = false,
  onPlanToggle,
  onSelect,
  onStart,
  onEdit,
  onDelete,
  onComplete,
  isDragOverlay = false,
  isDragPlaceholder = false,
}: TaskCardProps) {
  const [isTouchLike, setIsTouchLike] = useState(false);
  const [checkHovered, setCheckHovered] = useState(false);

  const colors = PRIORITY_COLORS[task.priority];
  const canComplete = Boolean(onComplete) && !isDragOverlay && !planningMode;

  const stateClass = isTimerActive
    ? 'ring-2 ring-text-primary shadow-sm'
    : isSelected
      ? 'ring-2 ring-medium'
      : '';

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
    onComplete?.(task.id);
  };

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit(task.id);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Delete "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  const handleSelect = () => {
    if (planningMode) {
      onPlanToggle?.(task.id);
      return;
    }
    onSelect(task.id);
  };

  const handlePlanCheckbox = (event: React.MouseEvent) => {
    event.stopPropagation();
    onPlanToggle?.(task.id);
  };

  const stopTouchPropagation = (event: React.TouchEvent) => {
    event.stopPropagation();
  };

  const actionIconBase =
    'flex h-7 w-7 items-center justify-center rounded-full transition-opacity duration-150 ease hover:bg-white/60 focus-visible:opacity-100';

  const actionIconVisibility = isTouchLike
    ? 'opacity-70 pointer-events-auto'
    : 'pointer-events-none opacity-0 group-hover/card:pointer-events-auto group-hover/card:opacity-70';

  const cardClassName = [
    'group/card flex min-w-0 flex-1 flex-col gap-2.5 rounded-[12px] border px-[18px] pt-[18px] pb-[14px] transition-opacity duration-300 ease-out',
    colors.bg,
    colors.border,
    stateClass,
    isDragOverlay ? 'scale-[1.02] shadow-[0_8px_24px_rgba(33,30,25,0.18)]' : '',
    isDragPlaceholder ? 'opacity-0' : '',
    isCompleting && !isDragOverlay ? 'pointer-events-none opacity-0' : '',
    !isDragOverlay && !isCompleting && !isDragPlaceholder ? 'opacity-100' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div data-task-interactive="" className={cardClassName}>
      <div className="flex items-stretch gap-3">
        {planningMode ? (
          <button
            type="button"
            onClick={handlePlanCheckbox}
            aria-label={planSelected ? `Deselect ${task.title}` : `Select ${task.title}`}
            aria-pressed={planSelected}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-full border-2 transition-colors ${
              planSelected ? 'border-accent bg-accent' : 'border-border'
            }`}
          >
            {planSelected ? (
              <span className="h-2 w-2 rounded-full bg-white" aria-hidden />
            ) : null}
          </button>
        ) : null}

        <div className="flex w-11 shrink-0 items-center justify-center self-start">
          <button
            type="button"
            onClick={handleComplete}
            disabled={!canComplete}
            aria-label={`Mark ${task.title} as done`}
            onMouseEnter={() => setCheckHovered(true)}
            onMouseLeave={() => setCheckHovered(false)}
            onTouchStart={stopTouchPropagation}
            onTouchEnd={stopTouchPropagation}
            onTouchMove={stopTouchPropagation}
            className={[
              'group/time relative flex flex-col items-center justify-center',
              colors.text,
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
                {task.estimate_minutes}
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
                className={`absolute transition-opacity duration-100 ease ${colors.text} ${
                  checkHovered ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-60'
                }`}
              />
            ) : null}
          </button>
        </div>

        <div className={`w-px shrink-0 self-stretch ${colors.line}`} aria-hidden />

        <button
          type="button"
          onClick={handleSelect}
          disabled={isDragOverlay}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block w-full whitespace-normal text-base font-normal leading-[1.35] text-[#211E19] md:text-[13px]">
            {task.title}
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {showCategory && task.category ? (
            <span className="inline-block rounded-full border border-border bg-white px-2 py-0.5 text-[13px] font-normal text-[#6E6A5E] md:text-[10px]">
              {task.category}
            </span>
          ) : null}
        </div>

        {!isDragOverlay && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={handleEdit}
              aria-label={`Edit ${task.title}`}
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
              aria-label={`Delete ${task.title}`}
              onTouchStart={stopTouchPropagation}
              onTouchEnd={stopTouchPropagation}
              onTouchMove={stopTouchPropagation}
              className={`${actionIconBase} ${actionIconVisibility} text-[#C0463F] hover:opacity-100`}
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>

            {!planningMode ? (
              <button
                type="button"
                onClick={() => onStart(task.id)}
                disabled={isDragOverlay}
                aria-label={`${actionLabel === 'Plan' ? 'Plan' : 'Start focus on'} ${task.title}`}
                className={`ml-0.5 shrink-0 rounded-full border px-[10px] py-1 text-[14px] font-normal md:text-[11px] ${colors.text} ${colors.bg} ${colors.border}`}
                onTouchStart={stopTouchPropagation}
                onTouchEnd={stopTouchPropagation}
                onTouchMove={stopTouchPropagation}
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function DropIndicator() {
  return <div className="my-1 h-[2px] rounded-full bg-accent" aria-hidden />;
}

export interface SortableTaskCardProps extends Omit<TaskCardProps, 'isDragOverlay' | 'isDragPlaceholder'> {
  showDropLineBefore?: boolean;
  showDropLineAfter?: boolean;
  sortableDisabled?: boolean;
}

export function SortableTaskCard({
  showDropLineBefore = false,
  showDropLineAfter = false,
  sortableDisabled = false,
  ...props
}: SortableTaskCardProps) {
  const { active } = useDndContext();
  const isGlobalDrag = active != null;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.task.id,
    disabled: sortableDisabled,
    animateLayoutChanges: () => false,
  });

  const [isTouchLike, setIsTouchLike] = useState(false);
  const gripRef = useRef<HTMLButtonElement>(null);
  const cardActivatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setIsTouchLike(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (isTouchLike) {
      setActivatorNodeRef(cardActivatorRef.current);
    } else {
      setActivatorNodeRef(gripRef.current);
    }
  }, [isTouchLike, setActivatorNodeRef]);

  const style = {
    transform: isGlobalDrag ? undefined : CSS.Transform.toString(transform),
    transition: isGlobalDrag ? undefined : transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-task-interactive="" className="group/row">
      {showDropLineBefore && <DropIndicator />}
      <div className="flex items-stretch">
        {!isTouchLike && !sortableDisabled && (
          <div className="flex w-4 shrink-0 items-center justify-center">
            <button
              ref={gripRef}
              type="button"
              {...listeners}
              aria-label={`Reorder ${props.task.title}`}
              className={`flex h-full w-4 items-center justify-center text-[#9A9587] opacity-[0.15] transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 ${
                isDragging ? 'cursor-grabbing opacity-100' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <GripVertical size={14} strokeWidth={2} />
            </button>
          </div>
        )}

        <div
          ref={cardActivatorRef}
          {...(isTouchLike && !sortableDisabled ? listeners : {})}
          className={`flex min-w-0 flex-1 ${isTouchLike ? 'touch-none' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
        >
          <TaskCard {...props} isDragPlaceholder={isDragging} />
        </div>
      </div>
      {showDropLineAfter && <DropIndicator />}
    </div>
  );
}
