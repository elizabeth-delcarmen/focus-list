import { useCallback, useMemo, useState } from 'react';
import { getUniqueRooms } from '../lib/choreSchedule';
import type { Chore } from '../types';

const STORAGE_KEY = 'focus-list-chore-rooms';

function loadSavedChoreRooms(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

function persistSavedChoreRooms(rooms: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export function useChoreRooms(chores: Chore[]) {
  const [savedRooms, setSavedRooms] = useState(() => loadSavedChoreRooms());

  const existingRooms = useMemo(() => {
    const rooms = new Set([...getUniqueRooms(chores), ...savedRooms]);
    return [...rooms].sort((a, b) => a.localeCompare(b));
  }, [chores, savedRooms]);

  const rememberRoom = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSavedRooms((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed].sort((a, b) => a.localeCompare(b));
      persistSavedChoreRooms(next);
      return next;
    });
  }, []);

  return { existingRooms, rememberRoom };
}
