import { useCallback, useMemo, useState } from 'react';
import { getUniqueRooms } from '../lib/choreSchedule';
import {
  DEFAULT_ROOMS,
  normalizeRoomName,
  shouldKeepRoomName,
} from '../lib/roomIcons';
import type { Chore } from '../types';

const STORAGE_KEY = 'focus-list-chore-rooms';

function uniqueSortedRooms(rooms: string[]): string[] {
  return [...new Set(rooms.map(normalizeRoomName).filter(shouldKeepRoomName))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function loadSavedChoreRooms(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const fromStorage: string[] = [];
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        fromStorage.push(
          ...parsed.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0,
          ),
        );
      }
    }
    const merged = uniqueSortedRooms([...DEFAULT_ROOMS, ...fromStorage]);
    persistSavedChoreRooms(merged);
    return merged;
  } catch {
    const fallback = uniqueSortedRooms(DEFAULT_ROOMS);
    persistSavedChoreRooms(fallback);
    return fallback;
  }
}

function persistSavedChoreRooms(rooms: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export function useChoreRooms(chores: Chore[]) {
  const [savedRooms, setSavedRooms] = useState(() => loadSavedChoreRooms());

  const existingRooms = useMemo(() => {
    return uniqueSortedRooms([
      ...DEFAULT_ROOMS,
      ...getUniqueRooms(chores),
      ...savedRooms,
    ]);
  }, [chores, savedRooms]);

  const rememberRoom = useCallback((name: string) => {
    const trimmed = normalizeRoomName(name);
    if (!trimmed || !shouldKeepRoomName(trimmed)) return;

    setSavedRooms((prev) => {
      const next = uniqueSortedRooms([...DEFAULT_ROOMS, ...prev, trimmed]);
      if (next.join('|') === prev.join('|')) return prev;
      persistSavedChoreRooms(next);
      return next;
    });
  }, []);

  return { existingRooms, rememberRoom };
}
