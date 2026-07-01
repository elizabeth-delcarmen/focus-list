import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { AddTaskForm } from './AddTaskForm';
import { CompletedTodaySection } from './CompletedTodaySection';
import { GapFinder } from './GapFinder';
import { TaskCard } from './TaskCard';
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
  onCompleteTask: (id: string) => Promise<void>;
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
  onCompleteTask,
}: TaskQueueProps) {
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>('list');
  const [gapMinutes, setGapMinutes] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
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

  const handleDragEnd = (event: DragEndEvent) => {
    if (groupMode !== 'list') return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered);
  };

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

  const renderTaskList = (listTasks: Task[], showCategoryOnCard: boolean) => (
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
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              durationFilter === id
                ? 'bg-accent-soft text-accent'
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
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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
        <div className="mt-4 rounded-[12px] border border-accent/30 bg-accent-soft px-4 py-3">
          <p className="text-xs font-medium text-accent">
            Fits in your window ({formatMinutes(sumEstimateMinutes(fittingTasks))})
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            {fittingTasks.map((t) => t.title).join(' · ')}
          </p>
        </div>
      )}

      <p className="mt-6 text-[11px] font-medium uppercase tracking-wide text-text-faint">
        Up next
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="mt-3">
          {filteredTasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-faint">No tasks match this filter</p>
          ) : groupMode === 'list' ? (
            <SortableContext
              items={filteredTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {renderTaskList(filteredTasks, true)}
            </SortableContext>
          ) : (
            groupedTasks.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {group.label}
                  <span className="ml-2 font-normal text-text-faint">
                    · {formatMinutes(sumEstimateMinutes(group.tasks))}
                  </span>
                </p>
                {renderTaskList(group.tasks, groupMode !== 'category')}
              </div>
            ))
          )}
        </div>
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
            className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border py-3 text-sm font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
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
