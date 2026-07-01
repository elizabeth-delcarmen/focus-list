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
import { Plus } from 'lucide-react';
import { AddTaskForm } from './AddTaskForm';
import { CompletedTodaySection } from './CompletedTodaySection';
import { GapFinder } from './GapFinder';
import { SortableTaskCard, TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import {
  groupTasks,
  formatMinutes,
  getUniqueCategories,
  matchesDurationFilter,
  sumEstimateMinutes,
  tasksFittingMinutes,
  type DurationFilter,
  type GroupMode,
  type NewTaskInput,
  type Task,
  type TaskFormValues,
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
  const queue = [...reordered];
  return allTasks.map((task) => (visibleIds.has(task.id) ? queue.shift()! : task));
}

interface TaskQueueProps {
  tasks: Task[];
  completedTasks: Task[];
  selectedTaskId: string | null;
  timerTaskId: string | null;
  completingTaskId: string | null;
  availableMinutes: number | null;
  onSelectTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onReorder: (newOrder: Task[]) => void;
  onAddTask: (input: NewTaskInput) => Promise<Task | null>;
  onUpdateTask: (id: string, changes: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export function TaskQueue({
  tasks,
  completedTasks,
  selectedTaskId,
  timerTaskId,
  completingTaskId,
  availableMinutes,
  onSelectTask,
  onStartTask,
  onReorder,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: TaskQueueProps) {
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>('list');
  const [gapMinutes, setGapMinutes] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
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
    let result = tasks.filter((t) => matchesDurationFilter(t.estimate_minutes, durationFilter));

    if (gapMinutes !== null) {
      result = result.filter((t) => t.estimate_minutes <= gapMinutes);
    }

    return result;
  }, [tasks, durationFilter, gapMinutes]);

  const groupedTasks = useMemo(
    () => groupTasks(filteredTasks, groupMode),
    [filteredTasks, groupMode],
  );

  const fittingTasks = useMemo(() => {
    if (availableMinutes === null || gapMinutes !== null) return null;
    return tasksFittingMinutes(filteredTasks, availableMinutes);
  }, [filteredTasks, availableMinutes, gapMinutes]);

  const handleDragStart = (event: DragStartEvent) => {
    if (groupMode !== 'list') return;
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (groupMode !== 'list') return;

    const { active, over } = event;
    if (!over || active.id === over.id) {
      setDropTarget(null);
      return;
    }

    const activeIndex = filteredTasks.findIndex((t) => t.id === active.id);
    const overIndex = filteredTasks.findIndex((t) => t.id === over.id);
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

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setDropTarget(null);

    if (groupMode !== 'list') return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredTasks.findIndex((t) => t.id === active.id);
    const newIndex = filteredTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedVisible = arrayMove(filteredTasks, oldIndex, newIndex);
    onReorder(mergeReorderedVisible(tasks, filteredTasks, reorderedVisible));
  };

  const activeDragTask = activeDragId
    ? filteredTasks.find((t) => t.id === activeDragId) ?? null
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

      {fittingTasks && fittingTasks.length > 0 && (
        <div className="mt-4 rounded-[12px] border border-border bg-surface-raised px-4 py-3">
          <p className="text-base font-medium text-text-primary md:text-xs">
            You have {formatMinutes(availableMinutes ?? 0)} left today
          </p>
          <p className="mt-0.5 text-base text-text-muted md:text-[11px]">
            These {fittingTasks.length} task{fittingTasks.length === 1 ? '' : 's'} fit in that window (
            {formatMinutes(sumEstimateMinutes(fittingTasks))} total):
          </p>
          <ul className="mt-2 space-y-1">
            {fittingTasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className="flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 flex-1 text-base text-text-primary line-clamp-2 md:text-[13px]">
                    {task.title}
                  </span>
                  <span className="shrink-0 text-base font-medium text-text-muted md:text-[11px]">
                    {formatMinutes(task.estimate_minutes)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          {filteredTasks.length === 0 ? (
            <p className="py-4 text-center text-base text-text-faint md:text-sm">No tasks match this filter</p>
          ) : groupMode === 'list' ? (
            <SortableContext
              items={filteredTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {renderTaskList(filteredTasks, true, true)}
            </SortableContext>
          ) : (
            groupedTasks.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-muted md:text-[11px]">
                  {group.label}
                  <span className="ml-2 font-normal text-text-faint">
                    · {formatMinutes(sumEstimateMinutes(group.tasks))}
                  </span>
                </p>
                {renderTaskList(group.tasks, groupMode !== 'category', false)}
              </div>
            ))
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div className="pointer-events-none pl-4">
              <TaskCard
                task={activeDragTask}
                isSelected={activeDragTask.id === selectedTaskId}
                isTimerActive={activeDragTask.id === timerTaskId}
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

      <div className="mt-4">
        {showAddForm ? (
          <AddTaskForm
            existingCategories={existingCategories}
            onAdd={async (input) => {
              await onAddTask(input);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border py-3 text-[15px] font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-accent md:text-sm"
          >
            <Plus size={16} />
            Add task
          </button>
        )}
      </div>

      <GapFinder
        onApply={setGapMinutes}
        activeMinutes={gapMinutes}
        suggestedMinutes={availableMinutes}
      />

      <CompletedTodaySection tasks={completedTasks} />
    </div>
  );
}
