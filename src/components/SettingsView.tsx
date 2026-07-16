import { useState } from 'react';
import { Button } from './Button';
import { CapacityCardSkeleton } from './Skeleton';
import {
  DAILY_CAPACITY_MINUTES,
  formatMinutes,
  formatTimeLabel,
} from '../types';
import type { CapacityEndTime } from '../hooks/useCapacityWindow';

interface SettingsViewProps {
  plannedMinutes: number;
  availableMinutes: number;
  taskCount: number;
  isCustomWindow: boolean;
  onSetEndTime: (time: CapacityEndTime) => void;
  onClearEndTime: () => void;
  onSignOut: () => void;
  tasksLoading?: boolean;
}

const END_PRESETS: CapacityEndTime[] = [
  { hours: 12, minutes: 0 },
  { hours: 17, minutes: 0 },
  { hours: 18, minutes: 0 },
];

export function SettingsView({
  plannedMinutes,
  availableMinutes,
  taskCount,
  isCustomWindow,
  onSetEndTime,
  onClearEndTime,
  onSignOut,
  tasksLoading = false,
}: SettingsViewProps) {
  const [editing, setEditing] = useState(false);
  const [customTime, setCustomTime] = useState('17:00');

  const capacityPercent =
    availableMinutes > 0
      ? Math.min(100, (plannedMinutes / availableMinutes) * 100)
      : 100;
  const isOverCapacity = plannedMinutes > availableMinutes;

  const handleCustomApply = () => {
    const [h, m] = customTime.split(':').map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      onSetEndTime({ hours: h, minutes: m });
      setEditing(false);
    }
  };

  return (
    <div className="px-6 pb-28 pt-6 md:pb-6">
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Settings</h1>
      <p className="mt-1 text-[14px] text-text-muted">Focus List</p>

      <div className="mt-8 space-y-4">
        {tasksLoading ? (
          <CapacityCardSkeleton />
        ) : (
          <div className="rounded-[20px] bg-surface p-5 shadow-[0_4px_6px_rgba(0,0,0,0.02)]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-semibold text-text-primary">
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
              className={`mt-1 text-[14px] ${
                isOverCapacity ? 'text-urgent' : 'text-text-muted'
              }`}
            >
              {taskCount} task{taskCount === 1 ? '' : 's'} planned
              {' · '}
              {isOverCapacity
                ? `over by ${formatMinutes(plannedMinutes - availableMinutes)}`
                : `${formatMinutes(plannedMinutes)} total`}
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverCapacity ? 'bg-urgent' : 'bg-accent'
                }`}
                style={{ width: `${Math.min(100, capacityPercent)}%` }}
              />
            </div>

            {editing && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-[13px] text-text-muted">Available until…</p>
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
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="w-full rounded-[20px] bg-surface px-5 py-4 text-left text-[16px] font-medium text-urgent shadow-[0_4px_6px_rgba(0,0,0,0.02)]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
