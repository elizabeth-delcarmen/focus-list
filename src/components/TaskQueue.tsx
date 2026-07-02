import { useMemo, useState } from 'react';
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
import { ClipboardList } from 'lucide-react';
import { CompletedTodaySection } from './CompletedTodaySection';
import { SortableTaskCard, TaskCard } from './TaskCard';
import { TaskQueueSkeleton } from './Skeleton';
import { TaskForm } from './TaskForm';
import { CategoryGroupSection } from './CategoryGroupSection';
import { Button } from './Button';
import {
  groupTasks,
  formatMinutes,
  getUniqueCategories,
  matchesDurationFilter,
  sumEstimateMinutes,
  categoryGroupLabelToValue,
  getTaskCategoryGroupLabel,
  parseCategoryGroupId,
  type DurationFilter,
  type GroupMode,
  type Task,
  type TaskFormValues,
  type TaskGroup,
} from '../types';

const DURATION_FILTERS: { id: DurationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'quick', label: 'Quick (<15m)' },
  { id: 'medium', label: 'Medium (15–45m)' },
  { id: 'deep', label: 'Deep (45m+)' },
];

const GROUP_MODES: { id: GroupMode; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'category', label: 'Category' },
  { id: 'duration', label: 'Duration' },
];

type DropTarget = { id: string; position: 'before' | 'after' };

function mergeReorderedVisible(allTasks: Task[], visible: Task[], reordered: Task[]): Task[] {
  const visibleIds = new Set(visible.map((t) => t.id));
  const reorderedIds = new Set(reordered.map((t) => t.id));

  if (
    reorderedIds.size !== visibleIds.size ||
    ![...visibleIds].every((id) => reorderedIds.has(id))
  ) {
    return allTasks;
  }

  const queue = [...reordered];
  return allTasks.map((task) => {
    if (!visibleIds.has(task.id)) return task;
    return queue.shift() ?? task;
  });
}

function insertIntoCategoryGroup(
  withoutActive: Task[],
  groupedTasks: TaskGroup[],
  groupLabel: string,
  task: Task,
): Task[] {
  const targetGroupTasks = withoutActive.filter(
    (t) => getTaskCategoryGroupLabel(t) === groupLabel,
  );

  let insertIndex: number;
  if (targetGroupTasks.length > 0) {
    const lastId = targetGroupTasks[targetGroupTasks.length - 1].id;
    insertIndex = withoutActive.findIndex((t) => t.id === lastId) + 1;
  } else {
    insertIndex = 0;
    for (const group of groupedTasks) {
      if (group.label === groupLabel) break;
      insertIndex += withoutActive.filter(
        (t) => getTaskCategoryGroupLabel(t) === group.label,
      ).length;
    }
  }

  return [
    ...withoutActive.slice(0, insertIndex),
    task,
    ...withoutActive.slice(insertIndex),
  ];
}

interface TaskQueueProps {
  tasks: Task[];
  completedTasks: Task[];
  selectedTaskId: string | null;
  timerTaskId: string | null;
  completingTaskId: string | null;
  loading?: boolean;
  onSelectTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onReorder: (newOrder: Task[]) => void;
  onUpdateTask: (id: string, changes: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
  onNavigateToBacklog?: () => void;
}

export function TaskQueue({
  tasks,
  completedTasks,
  selectedTaskId,
  timerTaskId,
  completingTaskId,
  loading = false,
  onSelectTask,
  onStartTask,
  onReorder,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onNavigateToBacklog,
}: TaskQueueProps) {
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>('list');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const existingCategories = useMemo(() => getUniqueCategories(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => matchesDurationFilter(t.estimate_minutes, durationFilter));
  }, [tasks, durationFilter]);

  const groupedTasks = useMemo(
    () => groupTasks(filteredTasks, groupMode),
    [filteredTasks, groupMode],
  );

  const categoryOrderedTasks = useMemo(
    () => (groupMode === 'category' ? groupedTasks.flatMap((g) => g.tasks) : filteredTasks),
    [groupMode, groupedTasks, filteredTasks],
  );

  const dragOrderedTasks = groupMode === 'category' ? categoryOrderedTasks : filteredTasks;

  const isFilteredEmpty = tasks.length > 0 && filteredTasks.length === 0;

  const handleDragStart = (event: DragStartEvent) => {
    if (groupMode !== 'list' && groupMode !== 'category') return;
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (groupMode !== 'list' && groupMode !== 'category') return;

    const { active, over } = event;
    if (!over) {
      setDropTarget(null);
      return;
    }

    const groupLabel = parseCategoryGroupId(over.id);
    if (groupLabel !== null && groupMode === 'category') {
      const group = groupedTasks.find((g) => g.label === groupLabel);
      if (group && group.tasks.length > 0) {
        const lastTask = group.tasks[group.tasks.length - 1];
        setDropTarget({ id: lastTask.id, position: 'after' });
      } else {
        setDropTarget(null);
      }
      return;
    }

    if (active.id === over.id) {
      setDropTarget(null);
      return;
    }

    const activeIndex = dragOrderedTasks.findIndex((t) => t.id === active.id);
    const overIndex = dragOrderedTasks.findIndex((t) => t.id === over.id);
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

    if (groupMode !== 'list' && groupMode !== 'category') return;

    const { active, over } = event;
    if (!over) return;

    if (groupMode === 'list') {
      if (active.id === over.id) return;

      const oldIndex = filteredTasks.findIndex((t) => t.id === active.id);
      const newIndex = filteredTasks.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedVisible = arrayMove(filteredTasks, oldIndex, newIndex);
      onReorder(mergeReorderedVisible(tasks, filteredTasks, reorderedVisible));
      return;
    }

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const applyCategoryMove = async (targetCategory: string | null, reorderedVisible: Task[]) => {
      onReorder(mergeReorderedVisible(tasks, categoryOrderedTasks, reorderedVisible));

      const currentCategory = task.category?.trim() || null;
      const nextCategory = targetCategory?.trim() || null;
      if (currentCategory !== nextCategory) {
        await onUpdateTask(taskId, { category: nextCategory });
      }
    };

    const groupLabel = parseCategoryGroupId(over.id);
    if (groupLabel !== null) {
      const targetCategory = categoryGroupLabelToValue(groupLabel);
      const withoutActive = categoryOrderedTasks.filter((t) => t.id !== taskId);
      const updatedTask = { ...task, category: targetCategory };
      const reorderedVisible = insertIntoCategoryGroup(
        withoutActive,
        groupedTasks,
        groupLabel,
        updatedTask,
      );
      await applyCategoryMove(targetCategory, reorderedVisible);
      return;
    }

    if (active.id === over.id) return;

    const overTask = tasks.find((t) => t.id === over.id);
    if (!overTask) return;

    const targetCategory = overTask.category ?? null;
    const oldIndex = categoryOrderedTasks.findIndex((t) => t.id === taskId);
    const newIndex = categoryOrderedTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedVisible = arrayMove(categoryOrderedTasks, oldIndex, newIndex).map((t) =>
      t.id === taskId ? { ...t, category: targetCategory } : t,
    );
    await applyCategoryMove(targetCategory, reorderedVisible);
  };

  const activeDragTask = activeDragId
    ? dragOrderedTasks.find((t) => t.id === activeDragId) ?? null
    : null;

  const handleEditSave = async (values: TaskFormValues) => {
    if (!editingTaskId) return;
    await onUpdateTask(editingTaskId, {
      title: values.title,
      estimate_minutes: values.estimate_minutes,
      priority: values.priority,
      category: values.category ?? null,
    });
    setEditingTaskId(null);
  };

  const renderTaskList = (
    listTasks: Task[],
    showCategoryOnCard: boolean,
    sortable: boolean,
  ) => (
    <div className="space-y-2">
      {listTasks.map((task) =>
        editingTaskId === task.id ? (
          <TaskForm
            key={task.id}
            existingCategories={existingCategories}
            initial={{
              title: task.title,
              estimate_minutes: task.estimate_minutes,
              priority: task.priority,
              category: task.category ?? undefined,
            }}
            submitLabel="Save changes"
            onSubmit={handleEditSave}
            onCancel={() => setEditingTaskId(null)}
            onDelete={async () => {
              await onDeleteTask(task.id);
              setEditingTaskId(null);
            }}
          />
        ) : sortable ? (
          <SortableTaskCard
            key={task.id}
            task={task}
            isSelected={task.id === selectedTaskId}
            isTimerActive={task.id === timerTaskId}
            isCompleting={task.id === completingTaskId}
            showCategory={showCategoryOnCard}
            showDropLineBefore={
              dropTarget?.id === task.id && dropTarget.position === 'before'
            }
            showDropLineAfter={
              dropTarget?.id === task.id && dropTarget.position === 'after'
            }
            onSelect={onSelectTask}
            onStart={onStartTask}
            onEdit={setEditingTaskId}
            onDelete={onDeleteTask}
            onComplete={onCompleteTask}
          />
        ) : (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={task.id === selectedTaskId}
            isTimerActive={task.id === timerTaskId}
            isCompleting={task.id === completingTaskId}
            showCategory={showCategoryOnCard}
            onSelect={onSelectTask}
            onStart={onStartTask}
            onEdit={setEditingTaskId}
            onDelete={onDeleteTask}
            onComplete={onCompleteTask}
          />
        ),
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-2">
        {DURATION_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setDurationFilter(id)}
            className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
              durationFilter === id
                ? 'bg-accent text-white'
                : 'bg-surface-raised text-text-muted hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {GROUP_MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setGroupMode(id)}
            className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
              groupMode === id
                ? 'bg-accent-soft text-accent'
                : 'bg-surface-raised text-text-muted hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-6 text-[13px] font-medium uppercase tracking-wide text-text-faint md:text-[11px]">
        Up next
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="mt-3">
          {loading ? (
            <TaskQueueSkeleton />
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList
                size={36}
                className="mb-4 text-text-faint"
                strokeWidth={1.5}
              />
              <p className="text-base font-medium text-text-primary md:text-sm">
                No tasks planned yet
              </p>
              <p className="mt-1 text-base text-text-faint md:text-xs">
                Head to Backlog to plan your day
              </p>
              {onNavigateToBacklog ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onNavigateToBacklog}
                  className="mt-4"
                >
                  Go to Backlog →
                </Button>
              ) : null}
            </div>
          ) : isFilteredEmpty ? (
            <div className="py-4 text-center">
              <p className="text-base text-text-faint md:text-sm">No tasks match the current filters</p>
              <p className="mt-1 text-[13px] text-text-faint md:text-[11px]">
                {tasks.length} task{tasks.length === 1 ? '' : 's'} hidden by duration filters.
              </p>
              <button
                type="button"
                onClick={() => setDurationFilter('all')}
                className="mt-3 text-[13px] font-medium text-accent hover:underline md:text-[11px]"
              >
                Clear filters and show all
              </button>
            </div>
          ) : (
            <SortableContext
              items={filteredTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {groupMode === 'list' ? (
                renderTaskList(filteredTasks, true, true)
              ) : groupMode === 'category' ? (
                groupedTasks.map((group) => (
                  <CategoryGroupSection key={group.label} label={group.label} tasks={group.tasks}>
                    {renderTaskList(group.tasks, false, true)}
                  </CategoryGroupSection>
                ))
              ) : (
                groupedTasks.map((group) => (
                  <div key={group.label} className="mb-4">
                    <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-muted md:text-[11px]">
                      {group.label}
                      <span className="ml-2 font-normal text-text-faint">
                        · {formatMinutes(sumEstimateMinutes(group.tasks))}
                      </span>
                    </p>
                    {renderTaskList(group.tasks, true, false)}
                  </div>
                ))
              )}
            </SortableContext>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div className="pointer-events-none pl-4">
              <TaskCard
                task={activeDragTask}
                isSelected={activeDragTask.id === selectedTaskId}
                isTimerActive={activeDragTask.id === timerTaskId}
                showCategory={groupMode !== 'category'}
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

      {!loading && <CompletedTodaySection tasks={completedTasks} />}
    </div>
  );
}
