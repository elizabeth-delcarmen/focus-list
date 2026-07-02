import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { NAV_DROP_TARGET_TODAY } from '../types';
import type { Task } from '../types';

type DropTarget = { id: string; position: 'before' | 'after' };

interface BacklogDndContextValue {
  activeDragId: string | null;
  dropTarget: DropTarget | null;
  taskIds: string[];
}

const BacklogDndContext = createContext<BacklogDndContextValue | null>(null);

export function useBacklogDnd() {
  const value = useContext(BacklogDndContext);
  if (!value) {
    throw new Error('useBacklogDnd must be used within BacklogDndProvider');
  }
  return value;
}

interface BacklogDndProviderProps {
  tasks: Task[];
  onReorder: (newOrder: Task[]) => void;
  onSchedule: (ids: string[]) => Promise<void>;
  onNavigateToToday?: () => void;
  children: ReactNode;
}

export function BacklogDndProvider({
  tasks,
  onReorder,
  onSchedule,
  onNavigateToToday,
  children,
}: BacklogDndProviderProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || over.id === NAV_DROP_TARGET_TODAY) {
      setDropTarget(null);
      return;
    }

    if (active.id === over.id) {
      setDropTarget(null);
      return;
    }

    const activeIndex = tasks.findIndex((t) => t.id === active.id);
    const overIndex = tasks.findIndex((t) => t.id === over.id);
    if (activeIndex === -1 || overIndex === -1) {
      setDropTarget(null);
      return;
    }

    setDropTarget({
      id: over.id as string,
      position: activeIndex < overIndex ? 'after' : 'before',
    });
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setDropTarget(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    setDropTarget(null);

    const { active, over } = event;
    if (!over) return;

    if (
      over.id === NAV_DROP_TARGET_TODAY &&
      window.matchMedia('(min-width: 768px)').matches
    ) {
      await onSchedule([active.id as string]);
      onNavigateToToday?.();
      return;
    }

    if (active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(tasks, oldIndex, newIndex));
  };

  const activeDragTask = activeDragId
    ? tasks.find((t) => t.id === activeDragId) ?? null
    : null;

  const contextValue = useMemo(
    () => ({ activeDragId, dropTarget, taskIds }),
    [activeDragId, dropTarget, taskIds],
  );

  return (
    <BacklogDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div className="pointer-events-none pl-4">
              <TaskCard
                task={activeDragTask}
                isSelected={false}
                isTimerActive={false}
                actionLabel="Plan"
                showCategory
                isDragOverlay
                onSelect={() => {}}
                onStart={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </BacklogDndContext.Provider>
  );
}

export function BacklogSortableList({ children }: { children: ReactNode }) {
  const { taskIds } = useBacklogDnd();
  return (
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}
