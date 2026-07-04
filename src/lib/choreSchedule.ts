import type { Chore, ChoreScheduleFilter, IntervalUnit } from '../types';
import { getTodayDateString } from '../types';

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

export function isChoreSomeday(chore: Chore): boolean {
  return chore.recurrence_type === 'someday';
}

export function dateStringToISO(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return new Date().toISOString();
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

export function nextDueAtToDateString(
  nextDueAt: string | null | undefined,
): string | null {
  if (!nextDueAt) return null;
  const d = new Date(nextDueAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const parts = parseDateInput(dateStr);
  const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const result = getLocalDateParts(date);
  return `${result.year}-${String(result.month).padStart(2, '0')}-${String(result.day).padStart(2, '0')}`;
}

export function formatChoreShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function getChoreDateSubtitle(chore: Chore): string {
  if (isChoreSomeday(chore)) {
    if (!chore.last_completed_at) return 'Never done';
    return `Last done ${formatChoreShortDate(chore.last_completed_at)}`;
  }
  const due = formatChoreShortDate(chore.next_due_at!);
  if (!chore.last_completed_at) {
    return `Due ${due}`;
  }
  const last = formatChoreShortDate(chore.last_completed_at);
  return `Last done ${last} · due ${due}`;
}

export function formatChoreDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type LocalDateParts = { year: number; month: number; day: number };

function getLocalDateParts(value: string | Date): LocalDateParts {
  const d = typeof value === 'string' ? new Date(value) : value;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

function localDateToDayNumber(parts: LocalDateParts): number {
  return Math.floor(new Date(parts.year, parts.month - 1, parts.day).getTime() / 86_400_000);
}

function localDateToISO(parts: LocalDateParts): string {
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0).toISOString();
}

function parseDateInput(input: string | Date): LocalDateParts {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split('-').map(Number);
    return { year, month, day };
  }
  return getLocalDateParts(input);
}

function addInterval(
  parts: LocalDateParts,
  value: number,
  unit: IntervalUnit,
): LocalDateParts {
  const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  switch (unit) {
    case 'days':
      date.setDate(date.getDate() + value);
      break;
    case 'weeks':
      date.setDate(date.getDate() + value * 7);
      break;
    case 'months':
      date.setMonth(date.getMonth() + value);
      break;
  }
  return getLocalDateParts(date);
}

const LEGACY_INTERVAL_MAP: Record<string, { value: number; unit: IntervalUnit }> = {
  weekly: { value: 1, unit: 'weeks' },
  monthly: { value: 1, unit: 'months' },
  bimonthly: { value: 2, unit: 'months' },
  quarterly: { value: 3, unit: 'months' },
  biannual: { value: 6, unit: 'months' },
  yearly: { value: 12, unit: 'months' },
};

/** Resolve interval from new columns or legacy recurrence_type */
export function getChoreInterval(
  chore: Chore,
): { value: number; unit: IntervalUnit } | null {
  if (chore.interval_value != null && chore.interval_unit) {
    return { value: chore.interval_value, unit: chore.interval_unit };
  }
  const legacyType = chore.recurrence_type as string | null | undefined;
  if (legacyType && legacyType !== 'someday') {
    return LEGACY_INTERVAL_MAP[legacyType] ?? null;
  }
  return null;
}

/** Advance anchor date by one chore interval (used on completion) */
export function computeNextDueAt(
  intervalValue: number,
  intervalUnit: IntervalUnit,
  anchor: string | Date,
): string {
  const parts = parseDateInput(anchor);
  return localDateToISO(addInterval(parts, intervalValue, intervalUnit));
}

export function getDueDatePreview(nextDueOn: string): {
  label: string;
  isOverdue: boolean;
} {
  const dueDay = localDateToDayNumber(parseDateInput(nextDueOn));
  const todayDay = localDateToDayNumber(getLocalDateParts(new Date()));
  const formatted = formatChoreDueDate(dateStringToISO(nextDueOn));

  if (dueDay < todayDay) {
    return {
      label: `Marked overdue as of ${formatted}`,
      isOverdue: true,
    };
  }
  if (dueDay === todayDay) {
    return {
      label: 'Marked overdue as of today',
      isOverdue: true,
    };
  }
  return {
    label: `Next due: ${formatted}`,
    isOverdue: false,
  };
}

export function isChoreOverdue(chore: Chore): boolean {
  if (isChoreSomeday(chore) || !chore.next_due_at) return false;
  const dueDay = localDateToDayNumber(getLocalDateParts(chore.next_due_at));
  const todayDay = localDateToDayNumber(getLocalDateParts(new Date()));
  return dueDay < todayDay;
}

export function isChoreDueToday(chore: Chore): boolean {
  if (!chore.next_due_at) return false;
  const due = getLocalDateParts(chore.next_due_at);
  const today = getLocalDateParts(new Date());
  return due.year === today.year && due.month === today.month && due.day === today.day;
}

export function isChoreDueThisWeekOrOverdue(chore: Chore): boolean {
  if (isChoreSomeday(chore) || !chore.next_due_at) return false;
  const dueDay = localDateToDayNumber(getLocalDateParts(chore.next_due_at));
  const todayDay = localDateToDayNumber(getLocalDateParts(new Date()));
  if (dueDay < todayDay) return true;
  return dueDay <= todayDay + 7;
}

export function isChoreDueTodayOrOverdue(chore: Chore): boolean {
  if (isChoreSomeday(chore) || !chore.next_due_at) return false;
  return isChoreOverdue(chore) || isChoreDueToday(chore);
}

export function isChoreVisibleInScheduleFilter(
  chore: Chore,
  filter: ChoreScheduleFilter,
): boolean {
  if (filter === 'someday') {
    return isChoreSomeday(chore);
  }
  if (isChoreSomeday(chore)) {
    return false;
  }
  if (filter === 'today') {
    return isChoreDueTodayOrOverdue(chore);
  }
  if (filter === 'weekly') {
    return isChoreDueThisWeekOrOverdue(chore);
  }
  return true;
}

export function getScheduleFilterForChore(chore: Chore): ChoreScheduleFilter {
  if (isChoreSomeday(chore)) return 'someday';
  if (isChoreDueTodayOrOverdue(chore)) return 'today';
  if (isChoreDueThisWeekOrOverdue(chore)) return 'weekly';
  return 'all';
}

export function pickScheduleFilterForChores(
  chores: Chore[],
  preferred?: ChoreScheduleFilter,
): ChoreScheduleFilter {
  if (preferred && chores.some((c) => isChoreVisibleInScheduleFilter(c, preferred))) {
    return preferred;
  }
  const filters: ChoreScheduleFilter[] = ['today', 'weekly', 'all', 'someday'];
  return (
    filters.find((filter) => chores.some((c) => isChoreVisibleInScheduleFilter(c, filter))) ??
    preferred ??
    'weekly'
  );
}

export function getChoreDueStatus(chore: Chore): {
  kind: 'overdue' | 'today' | 'later' | 'someday';
  label: string;
} {
  if (isChoreSomeday(chore)) {
    return { kind: 'someday', label: 'No due date' };
  }
  if (!chore.next_due_at) {
    return { kind: 'later', label: 'No due date' };
  }
  if (isChoreOverdue(chore)) {
    const dueDay = localDateToDayNumber(getLocalDateParts(chore.next_due_at));
    const todayDay = localDateToDayNumber(getLocalDateParts(new Date()));
    const days = todayDay - dueDay;
    return {
      kind: 'overdue',
      label: `${days} day${days === 1 ? '' : 's'} overdue`,
    };
  }
  if (isChoreDueToday(chore)) {
    return { kind: 'today', label: 'Due today' };
  }
  const dueDay = localDateToDayNumber(getLocalDateParts(chore.next_due_at));
  const todayDay = localDateToDayNumber(getLocalDateParts(new Date()));
  const days = dueDay - todayDay;
  return {
    kind: 'later',
    label: `Due in ${days} day${days === 1 ? '' : 's'}`,
  };
}

export function formatIntervalLabel(
  value: number | null | undefined,
  unit: IntervalUnit | null | undefined,
): string {
  if (value == null || !unit) return 'Someday';
  const unitLabel =
    unit === 'days' ? 'day' : unit === 'weeks' ? 'week' : 'month';
  const plural = value === 1 ? unitLabel : `${unitLabel}s`;
  if (value === 1 && unit === 'weeks') return 'Weekly';
  if (value === 1 && unit === 'months') return 'Monthly';
  if (value === 1 && unit === 'days') return 'Daily';
  return `Every ${value} ${plural}`;
}

export function getChoreIntervalLabel(chore: Chore): string {
  if (isChoreSomeday(chore)) return 'Someday';
  const interval = getChoreInterval(chore);
  if (!interval) return 'Repeating';
  return formatIntervalLabel(interval.value, interval.unit);
}

export function formatNextDueInterval(chore: Chore): string {
  const interval = getChoreInterval(chore);
  if (!interval) return 'soon';
  const { value, unit } = interval;
  if (value === 1 && unit === 'weeks') return '1 week';
  if (value === 1 && unit === 'months') return '1 month';
  if (value === 1 && unit === 'days') return '1 day';
  const unitLabel = unit === 'days' ? 'days' : unit === 'weeks' ? 'weeks' : 'months';
  return `${value} ${unitLabel}`;
}

export interface ChoreGroup {
  label: string;
  chores: Chore[];
}

function sortChoresByDue(chores: Chore[]): Chore[] {
  return [...chores].sort((a, b) => {
    const aDue = a.next_due_at ? new Date(a.next_due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.next_due_at ? new Date(b.next_due_at).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.title.localeCompare(b.title);
  });
}

function sortChoresForRoom(chores: Chore[]): Chore[] {
  return [...chores].sort((a, b) => {
    const aSomeday = isChoreSomeday(a);
    const bSomeday = isChoreSomeday(b);
    if (aSomeday !== bSomeday) return aSomeday ? 1 : -1;

    const aOverdue = isChoreOverdue(a);
    const bOverdue = isChoreOverdue(b);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const aDue = a.next_due_at ? new Date(a.next_due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.next_due_at ? new Date(b.next_due_at).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.title.localeCompare(b.title);
  });
}

export function groupChoresForScheduleView(
  chores: Chore[],
  filter: ChoreScheduleFilter,
): ChoreGroup[] {
  if (filter === 'someday') {
    return chores.length > 0
      ? [{ label: '', chores: [...chores].sort((a, b) => a.title.localeCompare(b.title)) }]
      : [];
  }

  if (filter === 'all') {
    const sorted = sortChoresByDue(chores);
    return sorted.length > 0 ? [{ label: '', chores: sorted }] : [];
  }

  const overdue = sortChoresByDue(chores.filter(isChoreOverdue));
  const overdueIds = new Set(overdue.map((c) => c.id));
  const rest = sortChoresByDue(chores.filter((c) => !overdueIds.has(c.id)));

  const groups: ChoreGroup[] = [];
  if (overdue.length > 0) {
    groups.push({ label: 'Overdue', chores: overdue });
  }
  if (rest.length > 0) {
    groups.push({ label: '', chores: rest });
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
    chores: sortChoresForRoom(buckets.get(room)!),
  }));

  if (unassigned.length > 0) {
    groups.push({ label: 'Unassigned', chores: sortChoresForRoom(unassigned) });
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

/** Couple-weeks default for "when's this next due?" */
export function getCoupleWeeksDateString(): string {
  return addDaysToDateString(getTodayDateString(), 14);
}
