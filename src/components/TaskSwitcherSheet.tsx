import { useMemo, useState } from 'react';
import { List, Play, Plus } from 'lucide-react';
import { AddTodayTaskBottomSheet } from './AddTodayTaskBottomSheet';
import { BottomSheet } from './BottomSheet';
import { getUniqueCategories, PRIORITY_HEX, type NewTaskInput, type Task } from '../types';

interface TaskSwitcherSheetProps {
  open: boolean;
  tasks: Task[];
  activeTaskId: string;
  onClose: () => void;
  onSwitchTask: (taskId: string) => void;
  onAddTask: (task: NewTaskInput) => Promise<unknown>;
  onAddToBacklog: (task: NewTaskInput) => Promise<unknown>;
}

function TaskSwitcherRow({
  task,
  isActive,
  onPlay,
}: {
  task: Task;
  isActive: boolean;
  onPlay: () => void;
}) {
  const colors = PRIORITY_HEX[task.priority];

  return (
    <div
      className={`flex items-center gap-3 rounded-[12px] px-3 py-[14px] ${
        isActive ? 'bg-[#3D353014]' : ''
      }`}
    >
      <div
        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border-2"
        style={{ borderColor: colors.solid, color: colors.solid }}
      >
        <span className="text-[18px] font-bold leading-none">{task.estimate_minutes}</span>
      </div>

      <span className="min-w-0 flex-1 text-base font-semibold leading-[1.35] text-[#3D3530]">
        {task.title}
      </span>

      <button
        type="button"
        onClick={onPlay}
        disabled={isActive}
        aria-label={isActive ? `${task.title} is currently active` : `Switch to ${task.title}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          isActive
            ? 'bg-[#3D3530] text-[#FAF8F3]'
            : 'text-[#938C7C] hover:bg-[#3D35300D]'
        }`}
      >
        <Play size={18} fill={isActive ? 'currentColor' : 'none'} strokeWidth={2} />
      </button>
    </div>
  );
}

export function TaskSwitcherSheet({
  open,
  tasks,
  activeTaskId,
  onClose,
  onSwitchTask,
  onAddTask,
  onAddToBacklog,
}: TaskSwitcherSheetProps) {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const existingCategories = useMemo(() => getUniqueCategories(tasks), [tasks]);

  const handleSwitch = (taskId: string) => {
    if (taskId === activeTaskId) return;
    onSwitchTask(taskId);
    onClose();
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} zIndex={70} swipeToDismiss alignWithContent={false}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-[#938C7C]">
              Today
            </span>
            <button
              type="button"
              onClick={() => setAddSheetOpen(true)}
              aria-label="Add task to today"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#3D3530] transition-colors hover:bg-[#3D35300D]"
            >
              <Plus size={20} strokeWidth={2} />
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <List size={32} className="mb-3 text-[#938C7C]" strokeWidth={1.5} />
              <p className="text-base font-medium text-[#3D3530]">No tasks planned yet</p>
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {tasks.map((task) => (
                <TaskSwitcherRow
                  key={task.id}
                  task={task}
                  isActive={task.id === activeTaskId}
                  onPlay={() => handleSwitch(task.id)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-full border border-[#D8D2C4] bg-transparent py-3 text-[15px] font-medium text-[#3D3530] transition-colors hover:bg-[#3D35300D]"
          >
            Close
          </button>
        </div>
      </BottomSheet>

      <AddTodayTaskBottomSheet
        open={addSheetOpen}
        existingCategories={existingCategories}
        onClose={() => setAddSheetOpen(false)}
        onAdd={onAddTask}
        onAddToBacklog={onAddToBacklog}
        zIndex={80}
      />
    </>
  );
}
