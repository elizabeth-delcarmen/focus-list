import { useMemo, useState, useCallback } from 'react';
import { AddChoreBottomSheet } from './AddChoreBottomSheet';
import { AddTaskBottomSheet } from './AddTaskBottomSheet';
import { AddTaskFab } from './AddTaskFab';
import { AddTypeChooserSheet } from './AddTypeChooserSheet';
import { BacklogSortableList, useBacklogDnd } from './BacklogDndProvider';
import { Button } from './Button';
import { CompletedTodaySection } from './CompletedTodaySection';
import { SortableTaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { TaskQueueSkeleton } from './Skeleton';
import { UndoToast } from './UndoToast';
import { getUniqueCategories, type NewChoreInput, type NewTaskInput, type Task, type TaskFormValues } from '../types';

interface BacklogViewProps {
  tasks: Task[];
  completedTasks: Task[];
  loading?: boolean;
  onAddTask: (input: NewTaskInput) => Promise<Task | null>;
  onAddToToday: (input: NewTaskInput) => Promise<Task | null>;
  onAddChore?: (input: NewChoreInput) => Promise<unknown>;
  existingRooms?: string[];
  onUpdateTask: (id: string, changes: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onCompleteTask: (id: string) => Promise<Task | null>;
  onUndoComplete: (snapshot: Task) => Promise<void>;
  onScheduleForToday: (ids: string[]) => Promise<void>;
  onNavigateToToday: () => void;
}

export function BacklogView({
  tasks,
  completedTasks,
  loading = false,
  onAddTask,
  onAddToToday,
  onAddChore,
  existingRooms = [],
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onUndoComplete,
  onScheduleForToday,
  onNavigateToToday,
}: BacklogViewProps) {
  const { dropTarget } = useBacklogDnd();
  const [planningMode, setPlanningMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [chooserOpen, setChooserOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [choreSheetOpen, setChoreSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Task | null>(null);

  const dismissUndo = useCallback(() => setUndoSnapshot(null), []);

  const existingCategories = useMemo(() => getUniqueCategories(tasks), [tasks]);
  const selectedCount = selectedIds.size;

  const openChooser = () => {
    setSheetKey((key) => key + 1);
    setChooserOpen(true);
  };

  const anySheetOpen = chooserOpen || taskSheetOpen || choreSheetOpen;

  const exitPlanningMode = () => {
    setPlanningMode(false);
    setSelectedIds(new Set());
  };

  const handlePlanMyDay = () => {
    setPlanningMode(true);
    setSelectedIds(new Set());
  };

  const togglePlanSelection = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleMoveSelectedToToday = async () => {
    if (selectedCount === 0) return;
    await onScheduleForToday([...selectedIds]);
    exitPlanningMode();
    onNavigateToToday();
  };

  const handlePlanSingle = async (taskId: string) => {
    await onScheduleForToday([taskId]);
    onNavigateToToday();
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    setUndoSnapshot(null);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const snapshot = await onCompleteTask(taskId);
    setCompletingTaskId(null);
    if (snapshot) setUndoSnapshot(snapshot);
  };

  const handleUndo = async () => {
    if (!undoSnapshot) return;
    const snapshot = undoSnapshot;
    setUndoSnapshot(null);
    await onUndoComplete(snapshot);
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

  const renderTask = (task: Task) => {
    if (editingTaskId === task.id) {
      return (
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
      );
    }

    return (
      <SortableTaskCard
        key={task.id}
        task={task}
        isCompleting={task.id === completingTaskId}
        showCategory
        actionLabel="Plan"
        planningMode={planningMode}
        planSelected={selectedIds.has(task.id)}
        onPlanToggle={togglePlanSelection}
        sortableDisabled={planningMode}
        showDropLineBefore={
          !planningMode && dropTarget?.id === task.id && dropTarget.position === 'before'
        }
        showDropLineAfter={
          !planningMode && dropTarget?.id === task.id && dropTarget.position === 'after'
        }
        onSelect={() => {}}
        onStart={handlePlanSingle}
        onEdit={setEditingTaskId}
        onDelete={onDeleteTask}
        onComplete={handleCompleteTask}
      />
    );
  };

  return (
    <div
      className={`relative flex flex-1 flex-col p-4 sm:p-6 ${planningMode ? 'pb-28 md:pb-6' : 'pb-24 md:pb-6'}`}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Button
          variant="secondary"
          onClick={handlePlanMyDay}
          disabled={planningMode || loading || tasks.length === 0}
          className="w-full justify-center md:w-auto"
        >
          Plan my day →
        </Button>
        <Button
          variant="secondary"
          onClick={openChooser}
          disabled={planningMode}
          className="hidden font-semibold md:inline-flex"
        >
          + New task
        </Button>
      </div>

      <p className="mt-6 text-[13px] font-medium uppercase tracking-wide text-text-faint md:text-[11px]">
        Backlog
      </p>

      <div className="mt-3">
        {loading ? (
          <TaskQueueSkeleton />
        ) : tasks.length === 0 ? (
          <p className="py-4 text-center text-base text-text-faint md:text-sm">
            No tasks in your backlog yet
          </p>
        ) : (
          <BacklogSortableList>
            <div className="space-y-2">{tasks.map(renderTask)}</div>
          </BacklogSortableList>
        )}
      </div>

      {!loading && (
        <CompletedTodaySection tasks={completedTasks} title="Completed from backlog" />
      )}

      <AddTypeChooserSheet
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onSelectTask={() => {
          setChooserOpen(false);
          setTaskSheetOpen(true);
        }}
        onSelectChore={() => {
          setChooserOpen(false);
          setChoreSheetOpen(true);
        }}
      />

      <AddTaskBottomSheet
        key={`task-${sheetKey}`}
        open={taskSheetOpen}
        defaultDestination="backlog"
        existingCategories={existingCategories}
        onClose={() => setTaskSheetOpen(false)}
        onAddToBacklog={onAddTask}
        onAddToToday={onAddToToday}
      />

      {onAddChore ? (
        <AddChoreBottomSheet
          key={`chore-${sheetKey}`}
          open={choreSheetOpen}
          existingRooms={existingRooms}
          onClose={() => setChoreSheetOpen(false)}
          onAddChore={onAddChore}
        />
      ) : null}

      <AddTaskFab onClick={openChooser} hidden={planningMode || anySheetOpen} />

      {planningMode ? (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface px-4 py-3 md:static md:mt-6 md:rounded-[12px] md:border md:px-4 md:py-3">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <p className="text-base font-medium text-text-primary md:text-sm">
              {selectedCount} task{selectedCount === 1 ? '' : 's'} selected
            </p>
            <div className="flex items-center gap-2">
              <Button variant="tertiary" size="sm" onClick={exitPlanningMode}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleMoveSelectedToToday()}
                disabled={selectedCount === 0}
              >
                Move to Today
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {undoSnapshot ? (
        <UndoToast
          taskTitle={undoSnapshot.title}
          onUndo={() => void handleUndo()}
          onDismiss={dismissUndo}
        />
      ) : null}
    </div>
  );
}
