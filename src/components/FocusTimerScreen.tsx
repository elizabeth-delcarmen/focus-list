import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, List, Pause, Play } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../lib/bodyScrollLock';
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
  contextRoom?: string | null;
  contextMeta?: string | null;
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
  contextRoom,
  contextMeta,
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
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isCompleted]);

  const content = (
    <div className="fixed inset-0 z-[55] flex flex-col bg-bg">
      <div className="flex h-14 shrink-0 items-center gap-3 px-6 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Back"
          className="flex size-10 shrink-0 items-center justify-center rounded-[20px] border border-[#e5e7eb] bg-surface text-text-primary shadow-[0_4px_6px_rgba(0,0,0,0.02)]"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-display text-[24px] leading-tight text-text-primary">
          {task.title}
        </h1>
        {!isCompleted ? (
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            aria-label="Switch task"
            className="flex size-10 shrink-0 items-center justify-center rounded-[20px] border border-[#e5e7eb] bg-surface text-text-muted"
          >
            <List size={18} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-8">
        {isCompleted ? (
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft">
              <Check size={32} className="text-accent" strokeWidth={2.5} />
            </div>
            <h2 className="mt-6 text-[22px] font-semibold text-text-primary">Nice work!</h2>
            <p className="mt-2 text-[17px] font-medium leading-snug text-text-muted">
              You finished your focus block on &ldquo;{task.title}&rdquo;
            </p>
            {completionSubline ? (
              <p className="mt-1 text-[15px] font-normal text-text-muted">{completionSubline}</p>
            ) : null}

            <div className="mt-10 flex w-full flex-col gap-[10px]">
              <button
                type="button"
                onClick={onComplete}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-bright"
              >
                <Check size={18} strokeWidth={2.5} />
                Mark done &amp; return
              </button>
              {nextTask ? (
                <button
                  type="button"
                  onClick={() => onStartNext(nextTask.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-transparent py-3.5 text-[15px] font-medium text-text-primary transition-colors hover:bg-accent-soft"
                >
                  <Play size={18} strokeWidth={2} />
                  Start next: {nextTask.title}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <FocusTimerDial
              remainingSeconds={remainingSeconds}
              totalSeconds={totalSeconds}
              showElapsed
            />

            <div className="flex items-center justify-center gap-12">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onPauseResume}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                  className="flex size-16 items-center justify-center rounded-[32px] bg-accent text-white shadow-[0_6px_8px_rgba(92,107,240,0.2)] transition-colors hover:bg-accent-bright"
                >
                  {isPaused ? (
                    <Play size={22} fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Pause size={22} strokeWidth={2.5} />
                  )}
                </button>
                <span className="text-[13px] font-semibold text-accent">
                  {isPaused ? 'Resume' : 'Pause'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onComplete}
                  aria-label="Done"
                  className="flex size-16 items-center justify-center rounded-[32px] border-[1.5px] border-[#e5e7eb] bg-surface text-text-primary shadow-[0_4px_6px_rgba(0,0,0,0.02)] transition-colors hover:bg-accent-soft"
                >
                  <Check size={20} strokeWidth={2.5} />
                </button>
                <span className="text-[13px] font-semibold text-text-muted">Done</span>
              </div>
            </div>

            {contextRoom || contextMeta ? (
              <div className="flex w-[280px] max-w-full flex-col items-center gap-1.5 rounded-[16px] border border-[#e5e7eb] bg-surface p-4 text-center">
                {contextRoom ? (
                  <p className="text-[14px] font-bold text-text-primary">{contextRoom}</p>
                ) : null}
                {contextMeta ? (
                  <p className="text-[12px] font-medium text-text-muted">{contextMeta}</p>
                ) : null}
              </div>
            ) : null}
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
