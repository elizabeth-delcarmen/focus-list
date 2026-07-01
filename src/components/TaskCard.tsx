import { useCallback, useEffect, useRef, useState } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { PRIORITY_COLORS } from '../types';
import type { Task } from '../types';

const LONG_PRESS_MS = 500;
const MENU_MOVE_TOLERANCE = 8;

export interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  isTimerActive: boolean;
  isCompleting?: boolean;
  showCategory?: boolean;
  onSelect: (taskId: string) => void;
  onStart: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
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
  onSelect,
  onStart,
  onEdit,
  onDelete,
  isDragOverlay = false,
  isDragPlaceholder = false,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTouchLike, setIsTouchLike] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragGestureRef = useRef(false);

  const colors = PRIORITY_COLORS[task.priority];

  const stateClass = isTimerActive
    ? 'ring-2 ring-text-primary shadow-sm'
    : isSelected
      ? 'ring-2 ring-medium'
      : '';

  const menuButtonVisibility =
    menuOpen || isDragOverlay
      ? 'opacity-100 pointer-events-auto'
      : 'opacity-100 pointer-events-auto lg:opacity-0 lg:pointer-events-none lg:group-hover/card:opacity-100 lg:group-hover/card:pointer-events-auto lg:focus-within/card:opacity-100 lg:focus-within/card:pointer-events-auto';

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const { active: activeDrag } = useDndContext();

  useEffect(() => {
    if (activeDrag) closeMenu();
  }, [activeDrag, closeMenu]);

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setIsTouchLike(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!menuOpen || isDragOverlay) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen, closeMenu, isDragOverlay]);

  const handleMenuToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuOpen((open) => !open);
  };

  const handleEdit = () => {
    closeMenu();
    onEdit(task.id);
  };

  const handleDelete = () => {
    closeMenu();
    onDelete(task.id);
  };

  const handleCardTouchStart = (event: React.TouchEvent) => {
    if (!isTouchLike || isDragOverlay) return;

    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    dragGestureRef.current = false;
    touchStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      if (!dragGestureRef.current) {
        longPressTriggeredRef.current = true;
        openMenu();
      }
    }, LONG_PRESS_MS);
  };

  const handleCardTouchEnd = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
    dragGestureRef.current = false;
  };

  const handleCardTouchMove = (event: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const dx = event.touches[0].clientX - touchStartRef.current.x;
    const dy = event.touches[0].clientY - touchStartRef.current.y;

    if (Math.hypot(dx, dy) > MENU_MOVE_TOLERANCE) {
      dragGestureRef.current = true;
      clearLongPressTimer();
      if (menuOpen) closeMenu();
    }
  };

  const handleSelect = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onSelect(task.id);
  };

  const cardClassName = [
    'group/card flex min-w-0 flex-1 items-center gap-[14px] rounded-[12px] border px-4 py-[14px] transition-all duration-300 ease-out',
    colors.bg,
    colors.border,
    stateClass,
    menuOpen ? 'relative z-50' : '',
    isDragOverlay
      ? 'scale-[1.02] shadow-[0_8px_24px_rgba(33,30,25,0.18)]'
      : '',
    isDragPlaceholder ? 'opacity-0' : '',
    isCompleting && !isDragOverlay ? 'pointer-events-none scale-95 opacity-0' : '',
    !isDragOverlay && !isCompleting && !isDragPlaceholder ? 'scale-100 opacity-100' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      onTouchStart={isDragOverlay ? undefined : handleCardTouchStart}
      onTouchEnd={isDragOverlay ? undefined : handleCardTouchEnd}
      onTouchMove={isDragOverlay ? undefined : handleCardTouchMove}
      onTouchCancel={isDragOverlay ? undefined : handleCardTouchEnd}
      className={cardClassName}
    >
      <div className={`flex w-10 shrink-0 flex-col items-center ${colors.text}`}>
        <span className="text-[22px] font-bold tabular-nums leading-none md:text-[20px]">
          {task.estimate_minutes}
        </span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.06em] opacity-70">
          min
        </span>
      </div>

      <div className={`h-9 w-px shrink-0 ${colors.line}`} aria-hidden />

      <button
        type="button"
        onClick={handleSelect}
        disabled={isDragOverlay}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="w-full truncate text-base font-semibold leading-[1.35] text-[#211E19] md:text-[13px]">
          {task.title}
        </span>
        {showCategory && task.category ? (
          <span className="mt-1 rounded-full bg-white/70 px-2 py-0.5 text-[13px] font-medium text-[#6E6A5E] md:text-[10px]">
            {task.category}
          </span>
        ) : null}
      </button>

      {!isDragOverlay && (
        <div className="relative shrink-0">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={handleMenuToggle}
            aria-label={`Actions for ${task.title}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[#6E6A5E] transition-opacity hover:bg-white/60 ${menuButtonVisibility}`}
          >
            <MoreVertical size={16} strokeWidth={2} />
          </button>

          {menuOpen ? (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-[10px] border border-[#E1DCCF] bg-[#FFFFFF] p-1 shadow-[0_4px_12px_rgba(33,30,25,0.1)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleEdit}
                className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2 text-left text-[15px] font-medium text-[#211E19] transition-colors hover:bg-[#F3F4F7] md:text-[12px]"
              >
                <Pencil size={14} strokeWidth={2} />
                Edit task
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2 text-left text-[15px] font-medium text-[#C0463F] transition-colors hover:bg-[#C0463F10] md:text-[12px]"
              >
                <Trash2 size={14} strokeWidth={2} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => onStart(task.id)}
        disabled={isDragOverlay}
        aria-label={`Start focus on ${task.title}`}
        className={`shrink-0 rounded-full border px-[10px] py-1 text-[14px] font-semibold md:text-[11px] ${colors.text} ${colors.bg} ${colors.border}`}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        Start
      </button>
    </div>
  );
}

function DropIndicator() {
  return <div className="my-1 h-[2px] rounded-full bg-accent" aria-hidden />;
}

export interface SortableTaskCardProps extends Omit<TaskCardProps, 'isDragOverlay' | 'isDragPlaceholder'> {
  showDropLineBefore?: boolean;
  showDropLineAfter?: boolean;
}

export function SortableTaskCard({
  showDropLineBefore = false,
  showDropLineAfter = false,
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
    <div ref={setNodeRef} style={style} {...attributes} className="group/row">
      {showDropLineBefore && <DropIndicator />}
      <div className="flex items-stretch">
        {!isTouchLike && (
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
          {...(isTouchLike ? listeners : {})}
          className={`flex min-w-0 flex-1 ${isTouchLike ? 'touch-none' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
        >
          <TaskCard {...props} isDragPlaceholder={isDragging} />
        </div>
      </div>
      {showDropLineAfter && <DropIndicator />}
    </div>
  );
}
