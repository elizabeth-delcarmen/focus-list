import { useCallback, useEffect, useState } from 'react';
import { DAILY_CAPACITY_MINUTES, minutesUntilTime } from '../types';

const STORAGE_KEY = 'focus-list-capacity-until';

export interface CapacityEndTime {
  hours: number;
  minutes: number;
}

function readStoredEndTime(): CapacityEndTime | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CapacityEndTime;
    if (typeof parsed.hours === 'number' && typeof parsed.minutes === 'number') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function useCapacityWindow() {
  const [endTime, setEndTimeState] = useState<CapacityEndTime | null>(() =>
    readStoredEndTime(),
  );
  const [tick, setTick] = useState(0);

  // Refresh remaining minutes every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const availableMinutes = endTime
    ? minutesUntilTime(endTime.hours, endTime.minutes)
    : DAILY_CAPACITY_MINUTES;

  const isCustomWindow = endTime !== null;

  const setEndTime = useCallback((time: CapacityEndTime) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(time));
    setEndTimeState(time);
  }, []);

  const clearEndTime = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEndTimeState(null);
  }, []);

  // tick dependency ensures availableMinutes recalculates
  void tick;

  return {
    endTime,
    availableMinutes,
    isCustomWindow,
    setEndTime,
    clearEndTime,
  };
}
