import type { Chore, ChoreFrequencyFilter, RecurrenceType } from '../types';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? 'Unknown';
}

export function computeNextDueAt(
  recurrenceType: RecurrenceType,
  dayOfWeek: number | null | undefined,
  lastCompletedAt: string | null | undefined,
  createdAt: string,
): string {
  if (!lastCompletedAt) {
    return createdAt;
  }

  const base = new Date(lastCompletedAt);

  switch (recurrenceType) {
    case 'weekly':
      if (dayOfWeek != null) {
        const next = new Date(base);
        next.setDate(next.getDate() + 1);
        while (next.getDay() !== dayOfWeek) {
          next.setDate(next.getDate() + 1);
        }
        next.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
        return next.toISOString();
      }
      {
        const next = new Date(base);
        next.setDate(next.getDate() + 7);
        return next.toISOString();
      }
    case 'monthly': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }
    case 'quarterly': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 3);
      return next.toISOString();
    }
    case 'biannual': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 6);
      return next.toISOString();
    }
    case 'yearly': {
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      return next.toISOString();
    }
    default:
      return createdAt;
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function endOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
}

function endOfHalfYear(date: Date): Date {
  const halfStart = date.getMonth() < 6 ? 0 : 6;
  return new Date(date.getFullYear(), halfStart + 6, 0, 23, 59, 59, 999);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function endOfPeriod(now: Date, filter: ChoreFrequencyFilter): Date {
  switch (filter) {
    case 'weekly':
      return endOfWeek(now);
    case 'monthly':
      return endOfMonth(now);
    case 'quarterly':
      return endOfQuarter(now);
    case 'biannual':
      return endOfHalfYear(now);
    case 'yearly':
      return endOfYear(now);
  }
}

export function choreMatchesFrequencyFilter(
  chore: Chore,
  filter: ChoreFrequencyFilter,
): boolean {
  return chore.recurrence_type === filter;
}

export function isChoreVisibleInPeriod(chore: Chore, filter: ChoreFrequencyFilter): boolean {
  if (!choreMatchesFrequencyFilter(chore, filter)) return false;
  const now = new Date();
  const due = new Date(chore.next_due_at);
  return due <= endOfPeriod(now, filter);
}

export function isChoreOverdue(chore: Chore): boolean {
  return new Date(chore.next_due_at) < startOfDay(new Date());
}

export function isChoreDueToday(chore: Chore): boolean {
  const due = startOfDay(new Date(chore.next_due_at));
  const today = startOfDay(new Date());
  return due.getTime() === today.getTime();
}

export function getChoreDueStatus(chore: Chore): {
  kind: 'overdue' | 'today' | 'later';
  label: string;
} {
  if (isChoreOverdue(chore)) {
    const due = startOfDay(new Date(chore.next_due_at));
    const today = startOfDay(new Date());
    const days = Math.round((today.getTime() - due.getTime()) / 86_400_000);
    return {
      kind: 'overdue',
      label: `${days} day${days === 1 ? '' : 's'} overdue`,
    };
  }
  if (isChoreDueToday(chore)) {
    return { kind: 'today', label: 'Due today' };
  }
  const due = startOfDay(new Date(chore.next_due_at));
  const today = startOfDay(new Date());
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  return {
    kind: 'later',
    label: `Due in ${days} day${days === 1 ? '' : 's'}`,
  };
}

export function getRecurrenceLabel(type: RecurrenceType): string {
  const labels: Record<RecurrenceType, string> = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    biannual: 'Biannual',
    yearly: 'Yearly',
  };
  return labels[type];
}

export function formatNextDueInterval(
  recurrenceType: RecurrenceType,
  dayOfWeek: number | null | undefined,
): string {
  switch (recurrenceType) {
    case 'weekly':
      return dayOfWeek != null ? `1 week (${getDayName(dayOfWeek)})` : '1 week';
    case 'monthly':
      return '1 month';
    case 'quarterly':
      return '3 months';
    case 'biannual':
      return '6 months';
    case 'yearly':
      return '1 year';
    default:
      return 'soon';
  }
}

export interface ChoreGroup {
  label: string;
  chores: Chore[];
}

export function groupChoresByDay(chores: Chore[]): ChoreGroup[] {
  const buckets = new Map<string, Chore[]>();
  const anytime: Chore[] = [];

  for (const chore of chores) {
    if (chore.day_of_week != null) {
      const label = getDayName(chore.day_of_week);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(chore);
    } else {
      anytime.push(chore);
    }
  }

  const orderedDays = DAY_NAMES.filter((name) => buckets.has(name));
  const groups: ChoreGroup[] = orderedDays.map((label) => ({
    label,
    chores: buckets.get(label)!,
  }));

  if (anytime.length > 0) {
    groups.push({ label: 'Anytime this week', chores: anytime });
  }

  return groups;
}

export function groupChoresByRoom(chores: Chore[]): ChoreGroup[] {
  const buckets = new Map<string, Chore[]>();
  const unassigned: Chore[] = [];

  for (const chore of chores) {
    const room = chore.room?.trim();
    if (room) {
      if (!buckets.has(room)) buckets.set(room, []);
      buckets.get(room)!.push(chore);
    } else {
      unassigned.push(chore);
    }
  }

  const sortedRooms = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  const groups: ChoreGroup[] = sortedRooms.map((room) => ({
    label: `${room} · ${buckets.get(room)!.length} chore${buckets.get(room)!.length === 1 ? '' : 's'}`,
    chores: buckets.get(room)!,
  }));

  if (unassigned.length > 0) {
    groups.push({ label: 'Unassigned', chores: unassigned });
  }

  return groups;
}

export function countOverdueChores(chores: Chore[]): number {
  return chores.filter(isChoreOverdue).length;
}

export function getUniqueRooms(chores: Chore[]): string[] {
  const rooms = new Set<string>();
  for (const chore of chores) {
    const room = chore.room?.trim();
    if (room) rooms.add(room);
  }
  return [...rooms].sort((a, b) => a.localeCompare(b));
}
