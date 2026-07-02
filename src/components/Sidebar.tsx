import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import { CapacityCardSkeleton } from './Skeleton';
import { Calendar, Clock, List } from 'lucide-react';
import { Button } from './Button';
import {
  DAILY_CAPACITY_MINUTES,
  formatMinutes,
  formatTimeLabel,
  NAV_DROP_TARGET_TODAY,
} from '../types';
import type { CapacityEndTime } from '../hooks/useCapacityWindow';
import type { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  plannedMinutes: number;
  availableMinutes: number;
  taskCount: number;
  isCustomWindow: boolean;
  endTime: CapacityEndTime | null;
  onSetEndTime: (time: CapacityEndTime) => void;
  onClearEndTime: () => void;
  tasksLoading?: boolean;
  enableTodayDropTarget?: boolean;
}

const NAV_ITEMS: { id: View; label: string; icon: typeof Clock }[] = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'backlog', label: 'Backlog', icon: List },
  { id: 'week', label: 'This week', icon: Calendar },
];

const END_PRESETS: CapacityEndTime[] = [
  { hours: 12, minutes: 0 },
  { hours: 17, minutes: 0 },
  { hours: 18, minutes: 0 },
];

function CapacityCard({
  plannedMinutes,
  availableMinutes,
  taskCount,
  isCustomWindow,
  onSetEndTime,
  onClearEndTime,
  loading = false,
}: {
  plannedMinutes: number;
  availableMinutes: number;
  taskCount: number;
  isCustomWindow: boolean;
  onSetEndTime: (time: CapacityEndTime) => void;
  onClearEndTime: () => void;
  loading?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [customTime, setCustomTime] = useState('17:00');

  if (loading) {
    return <CapacityCardSkeleton />;
  }

  const capacityPercent =
    availableMinutes > 0
      ? Math.min(100, (plannedMinutes / availableMinutes) * 100)
      : 100;
  const isOverCapacity = plannedMinutes > availableMinutes;
  const taskLabel = `${taskCount} task${taskCount === 1 ? '' : 's'} planned`;

  const handleCustomApply = () => {
    const [h, m] = customTime.split(':').map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      onSetEndTime({ hours: h, minutes: m });
      setEditing(false);
    }
  };

  return (
    <div className="rounded-[12px] border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-text-primary md:text-sm">
          {formatMinutes(availableMinutes)} left today
        </p>
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => setEditing(!editing)}
          className="h-auto min-h-0 px-1 py-0 font-medium"
        >
          {editing ? 'Close' : 'Set window'}
        </Button>
      </div>

      <p
        className={`mt-1 text-base md:text-[11px] ${
          isOverCapacity ? 'text-urgent' : 'font-normal text-text-muted'
        }`}
      >
        {taskLabel}
        {' · '}
        {isOverCapacity
          ? `over by ${formatMinutes(plannedMinutes - availableMinutes)}`
          : `${formatMinutes(plannedMinutes)} total`}
      </p>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all ${isOverCapacity ? 'bg-urgent' : 'bg-accent'}`}
          style={{ width: `${Math.min(100, capacityPercent)}%` }}
        />
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-base text-text-muted md:text-[11px]">Available until…</p>
          <div className="flex flex-wrap gap-1.5">
            {END_PRESETS.map((preset) => (
              <Button
                key={`${preset.hours}:${preset.minutes}`}
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSetEndTime(preset);
                  setEditing(false);
                }}
                className="px-2.5 py-1"
              >
                {formatTimeLabel(preset.hours, preset.minutes)}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="flex-1 rounded-full border border-border bg-bg px-3 py-1.5 text-base outline-none focus:border-accent md:text-xs"
            />
            <Button size="sm" onClick={handleCustomApply}>
              Set
            </Button>
          </div>
          {isCustomWindow && (
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => {
                onClearEndTime();
                setEditing(false);
              }}
              className="h-auto min-h-0 px-1 py-0 text-text-faint hover:text-text-muted"
            >
              Reset to {formatMinutes(DAILY_CAPACITY_MINUTES)} default
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function NavButtonBase({
  label,
  icon: Icon,
  isActive,
  compact,
  isOver,
  buttonRef,
  onClick,
}: {
  label: string;
  icon: typeof Clock;
  isActive: boolean;
  compact: boolean;
  isOver?: boolean;
  buttonRef?: (element: HTMLButtonElement | null) => void;
  onClick: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full font-medium transition-colors ${
        compact
          ? `flex-1 flex-col px-2 py-2 text-[15px] ${isActive ? 'bg-accent-soft text-accent' : 'text-text-muted'}`
          : `w-full px-3 py-2 text-sm ${isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-raised hover:text-text-primary'}`
      } ${isOver ? 'ring-2 ring-accent' : ''}`}
    >
      <Icon size={compact ? 18 : 16} />
      <span className={compact ? 'leading-tight' : undefined}>{label}</span>
    </button>
  );
}

function TodayDropNavButton({
  label,
  icon: Icon,
  isActive,
  compact,
  onClick,
}: {
  label: string;
  icon: typeof Clock;
  isActive: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: NAV_DROP_TARGET_TODAY });

  return (
    <NavButtonBase
      label={label}
      icon={Icon}
      isActive={isActive}
      compact={compact}
      isOver={isOver}
      buttonRef={setNodeRef}
      onClick={onClick}
    />
  );
}

function NavButton({
  id,
  label,
  icon,
  currentView,
  onNavigate,
  compact = false,
  enableTodayDropTarget = false,
}: {
  id: View;
  label: string;
  icon: typeof Clock;
  currentView: View;
  onNavigate: (view: View) => void;
  compact?: boolean;
  enableTodayDropTarget?: boolean;
}) {
  const isActive = currentView === id;
  const onClick = () => onNavigate(id);

  if (enableTodayDropTarget && id === 'today') {
    return (
      <TodayDropNavButton
        label={label}
        icon={icon}
        isActive={isActive}
        compact={compact}
        onClick={onClick}
      />
    );
  }

  return (
    <NavButtonBase
      label={label}
      icon={icon}
      isActive={isActive}
      compact={compact}
      onClick={onClick}
    />
  );
}

function NavButtons({
  currentView,
  onNavigate,
  compact = false,
  enableTodayDropTarget = false,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  compact?: boolean;
  enableTodayDropTarget?: boolean;
}) {
  return (
    <>
      {NAV_ITEMS.map(({ id, label, icon }) => (
        <NavButton
          key={id}
          id={id}
          label={label}
          icon={icon}
          currentView={currentView}
          onNavigate={onNavigate}
          compact={compact}
          enableTodayDropTarget={enableTodayDropTarget}
        />
      ))}
    </>
  );
}

export function Sidebar({
  currentView,
  onNavigate,
  onSignOut,
  plannedMinutes,
  availableMinutes,
  taskCount,
  isCustomWindow,
  onSetEndTime,
  onClearEndTime,
  tasksLoading = false,
  enableTodayDropTarget = false,
}: SidebarProps) {
  const capacityProps = {
    plannedMinutes,
    availableMinutes,
    taskCount,
    isCustomWindow,
    onSetEndTime,
    onClearEndTime,
    loading: tasksLoading,
  };

  return (
    <>
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border bg-bg px-3 py-4 md:flex">
        <nav className="space-y-1">
          <NavButtons
            currentView={currentView}
            onNavigate={onNavigate}
            enableTodayDropTarget={enableTodayDropTarget}
          />
        </nav>

        <div className="mt-6">
          <CapacityCard {...capacityProps} />
        </div>

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={onSignOut}
            className="text-base text-text-faint transition-colors hover:text-text-muted md:text-xs"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="border-b border-border bg-bg px-4 py-3 md:hidden">
        <CapacityCard {...capacityProps} />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-1 border-t border-border bg-surface px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        <NavButtons currentView={currentView} onNavigate={onNavigate} compact />
      </nav>
    </>
  );
}
