import { useState } from 'react';
import { Calendar, Clock, List, LogOut } from 'lucide-react';
import {
  DAILY_CAPACITY_MINUTES,
  formatMinutes,
  formatTimeLabel,
} from '../types';
import type { CapacityEndTime } from '../hooks/useCapacityWindow';
import type { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onSignOut: () => void;
  plannedMinutes: number;
  availableMinutes: number;
  isCustomWindow: boolean;
  endTime: CapacityEndTime | null;
  onSetEndTime: (time: CapacityEndTime) => void;
  onClearEndTime: () => void;
}

const NAV_ITEMS: { id: View; label: string; icon: typeof Clock }[] = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'week', label: 'This week', icon: Calendar },
  { id: 'backlog', label: 'Backlog', icon: List },
];

const END_PRESETS: CapacityEndTime[] = [
  { hours: 12, minutes: 0 },
  { hours: 17, minutes: 0 },
  { hours: 18, minutes: 0 },
];

function CapacityCard({
  plannedMinutes,
  availableMinutes,
  isCustomWindow,
  endTime,
  onSetEndTime,
  onClearEndTime,
}: {
  plannedMinutes: number;
  availableMinutes: number;
  isCustomWindow: boolean;
  endTime: CapacityEndTime | null;
  onSetEndTime: (time: CapacityEndTime) => void;
  onClearEndTime: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [customTime, setCustomTime] = useState('17:00');

  const capacityPercent =
    availableMinutes > 0
      ? Math.min(100, (plannedMinutes / availableMinutes) * 100)
      : 100;

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
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-faint">
          {isCustomWindow ? 'Time until end' : "Today's capacity"}
        </p>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="text-[10px] font-medium text-accent hover:text-accent-bright"
        >
          {editing ? 'Close' : 'Set window'}
        </button>
      </div>

      <p className="mt-1 text-sm font-semibold text-text-primary">
        {formatMinutes(plannedMinutes)}{' '}
        <span className="font-normal text-text-muted">
          / {formatMinutes(availableMinutes)}
        </span>
      </p>

      {isCustomWindow && endTime && (
        <p className="mt-0.5 text-[11px] text-text-faint">
          Until {formatTimeLabel(endTime.hours, endTime.minutes)} ·{' '}
          {formatMinutes(availableMinutes)} left
        </p>
      )}

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all ${capacityPercent > 100 ? 'bg-urgent' : 'bg-accent'}`}
          style={{ width: `${Math.min(100, capacityPercent)}%` }}
        />
      </div>

      {capacityPercent > 100 && (
        <p className="mt-1.5 text-[11px] text-urgent">Over your available time</p>
      )}

      {editing && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-[11px] text-text-muted">Available until…</p>
          <div className="flex flex-wrap gap-1.5">
            {END_PRESETS.map((preset) => (
              <button
                key={`${preset.hours}:${preset.minutes}`}
                type="button"
                onClick={() => {
                  onSetEndTime(preset);
                  setEditing(false);
                }}
                className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-accent-soft hover:text-accent"
              >
                {formatTimeLabel(preset.hours, preset.minutes)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="flex-1 rounded-full border border-border bg-bg px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleCustomApply}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white"
            >
              Set
            </button>
          </div>
          {isCustomWindow && (
            <button
              type="button"
              onClick={() => {
                onClearEndTime();
                setEditing(false);
              }}
              className="text-[11px] text-text-faint hover:text-text-muted"
            >
              Reset to {formatMinutes(DAILY_CAPACITY_MINUTES)} default
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NavButtons({
  currentView,
  onNavigate,
  compact = false,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  compact?: boolean;
}) {
  return (
    <>
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = currentView === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={`flex items-center justify-center gap-2 rounded-full font-medium transition-colors ${
              compact
                ? `flex-1 flex-col px-2 py-2 text-[11px] ${isActive ? 'text-accent' : 'text-text-muted'}`
                : `w-full px-3 py-2 text-sm ${isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-raised hover:text-text-primary'}`
            }`}
          >
            <Icon size={compact ? 18 : 16} />
            <span className={compact ? 'leading-tight' : undefined}>{label}</span>
          </button>
        );
      })}
    </>
  );
}

export function Sidebar({
  currentView,
  onNavigate,
  onSignOut,
  plannedMinutes,
  availableMinutes,
  isCustomWindow,
  endTime,
  onSetEndTime,
  onClearEndTime,
}: SidebarProps) {
  const capacityProps = {
    plannedMinutes,
    availableMinutes,
    isCustomWindow,
    endTime,
    onSetEndTime,
    onClearEndTime,
  };

  return (
    <>
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border bg-bg px-3 py-4 lg:flex">
        <nav className="space-y-1">
          <NavButtons currentView={currentView} onNavigate={onNavigate} />
        </nav>

        <div className="mt-6">
          <CapacityCard {...capacityProps} />
        </div>

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs text-text-faint transition-colors hover:text-text-muted"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="border-b border-border bg-bg px-4 py-3 lg:hidden">
        <CapacityCard {...capacityProps} />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-1 border-t border-border bg-surface px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <NavButtons currentView={currentView} onNavigate={onNavigate} compact />
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="flex shrink-0 flex-col items-center justify-center px-3 py-2 text-text-faint"
        >
          <LogOut size={18} />
          <span className="text-[11px]">Out</span>
        </button>
      </nav>
    </>
  );
}
