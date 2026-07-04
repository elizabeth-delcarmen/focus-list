import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, List, Pause, Play } from 'lucide-react';
import { FocusTimerDial } from './FocusTimerDial';
import { TaskSwitcherSheet } from './TaskSwitcherSheet';
import type { NewTaskInput, Task } from '../types';

interface FocusTimerScreenProps {
  task: Task;
  tasks: Task[];
  remainingSeconds: number;
  isPaused: boolean;
  isCompleted: boolean;
  completionSubline?: string;
  onMinimize: () => void;
  onPauseResume: () => void;
  onComplete: () => void;
  onStartNext: (taskId: string) => void;
  onSwitchTask: (taskId: string) => void;
  onAddTask: (task: NewTaskInput) => Promise<unknown>;
  onAddBacklogTask: (task: NewTaskInput) => Promise<unknown>;
}

export function FocusTimerScreen({
  task,
  tasks,
  remainingSeconds,
  isPaused,
  isCompleted,
  completionSubline,
  onMinimize,
  onPauseResume,
  onComplete,
  onStartNext,
  onSwitchTask,
  onAddTask,
  onAddBacklogTask,
}: FocusTimerScreenProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const totalSeconds = task.estimate_minutes * 60;

  const nextTask = tasks.find((t) => t.id !== task.id && t.status !== 'done') ?? null;

  useEffect(() => {
    if (!isCompleted) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCompleted]);

  const content = (
    <div className="fixed inset-0 z-[55] flex flex-col bg-[#FAF8F3]">
      <div className="flex shrink-0 items-start px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimize timer"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#3D3530] transition-colors hover:bg-[#3D35300D]"
        >
          <ChevronDown size={24} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {isCompleted ? (
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3D353014]">
              <Check size={32} className="text-[#3D3530]" strokeWidth={2.5} />
            </div>
            <h2 className="mt-6 text-[22px] font-semibold text-[#3D3530]">Nice work!</h2>
            <p className="mt-2 text-[17px] font-medium leading-snug text-[#938C7C]">
              You finished your focus block on &ldquo;{task.title}&rdquo;
            </p>
            {completionSubline ? (
              <p className="mt-1 text-[15px] font-normal text-[#938C7C]">{completionSubline}</p>
            ) : null}

            <div className="mt-10 flex w-full flex-col gap-[10px]">
              <button
                type="button"
                onClick={onComplete}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3D3530] py-3.5 text-[15px] font-semibold text-[#FAF8F3] transition-colors hover:bg-[#2E2824]"
              >
                <Check size={18} strokeWidth={2.5} />
                Mark done &amp; return
              </button>
              {nextTask ? (
                <button
                  type="button"
                  onClick={() => onStartNext(nextTask.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#D8D2C4] bg-transparent py-3.5 text-[15px] font-medium text-[#3D3530] transition-colors hover:bg-[#3D35300D]"
                >
                  <Play size={18} strokeWidth={2} />
                  Start next: {nextTask.title}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <h1 className="max-w-md text-center text-[17px] font-medium leading-snug text-[#3D3530]">
              {task.title}
            </h1>

            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              aria-label="Switch task"
              className="mt-4 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#D8D2C4] text-[#938C7C] transition-colors hover:bg-[#3D35300D]"
            >
              <List size={16} strokeWidth={2} />
            </button>

            <div className="mt-8">
              <FocusTimerDial
                priority={task.priority}
                remainingSeconds={remainingSeconds}
                totalSeconds={totalSeconds}
              />
            </div>

            <div className="mt-10 flex w-full max-w-sm flex-col gap-[10px]">
              <button
                type="button"
                onClick={onPauseResume}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3D3530] py-3.5 text-[15px] font-semibold text-[#FAF8F3] transition-colors hover:bg-[#2E2824]"
              >
                {isPaused ? (
                  <>
                    <Play size={18} fill="currentColor" strokeWidth={0} />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause size={18} strokeWidth={2.5} />
                    Pause
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onComplete}
                className="w-full rounded-full border border-[#D8D2C4] bg-transparent py-3.5 text-[15px] font-medium text-[#3D3530] transition-colors hover:bg-[#3D35300D]"
              >
                Complete task
              </button>
            </div>
          </>
        )}
      </div>

      <TaskSwitcherSheet
        open={switcherOpen}
        tasks={tasks}
        activeTaskId={task.id}
        onClose={() => setSwitcherOpen(false)}
        onSwitchTask={onSwitchTask}
        onAddTask={onAddTask}
        onAddToBacklog={onAddBacklogTask}
      />
    </div>
  );

  return createPortal(content, document.body);
}
