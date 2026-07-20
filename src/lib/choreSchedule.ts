import type {
  Chore,
  ChoreScheduleFilter,
  ChoreFrequencyPreset,
  ChoreRecurrenceChoice,
  ChoreRecurrencePreset,
  IntervalUnit,
} from '../types';
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

/** Scheduled chore with a due date but no repeat interval */
export function isChoreOneOff(chore: Chore): boolean {
  return !isChoreSomeday(chore) && getChoreInterval(chore) == null;
}

/** One-off that was completed and should no longer appear in schedule filters */
export function isChoreDismissed(chore: Chore): boolean {
  return isChoreOneOff(chore) && !chore.next_due_at;
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

export function addIntervalToDateString(
  dateStr: string,
  value: number,
  unit: IntervalUnit,
): string {
  const parts = addInterval(parseDateInput(dateStr), value, unit);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function dayOfWeekFromDateString(dateStr: string): number {
  const parts = parseDateInput(dateStr);
  return new Date(parts.year, parts.month - 1, parts.day).getDay();
}

export function dayOfWeekFromDate(value: string | Date): number {
  return dayOfWeekFromDateString(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : nextDueAtToDateString(typeof value === 'string' ? value : value.toISOString()) ??
          getTodayDateString(),
  );
}

export function getIntervalFromRecurrencePreset(
  preset: ChoreRecurrencePreset,
): { value: number; unit: IntervalUnit } {
  switch (preset) {
    case 'weekly':
      return { value: 1, unit: 'weeks' };
    case 'biweekly':
      return { value: 2, unit: 'weeks' };
    case 'monthly':
      return { value: 1, unit: 'months' };
  }
}

export function deriveDayOfWeekForChore(
  intervalValue: number,
  intervalUnit: IntervalUnit,
  anchorDateStr: string,
): number | null {
  if (intervalUnit === 'weeks' && intervalValue === 1) {
    return dayOfWeekFromDateString(anchorDateStr);
  }
  return null;
}

export function needsChoreRepeatPrompt(chore: Chore): boolean {
  return isChoreSomeday(chore);
}

/** Apply recurrence choice after completing a Someday chore */
export function applyRecurrenceChoiceToChoreChanges(
  choice: ChoreRecurrenceChoice,
  lastCompletedAt: string,
): Partial<Chore> {
  if (choice === 'one_off') {
    return {
      last_completed_at: lastCompletedAt,
      recurrence_type: 'someday',
      interval_value: null,
      interval_unit: null,
      day_of_week: null,
      next_due_at: null,
    };
  }

  const { value, unit } = getIntervalFromRecurrencePreset(choice);
  const anchorDateStr = nextDueAtToDateString(lastCompletedAt) ?? getTodayDateString();

  return {
    last_completed_at: lastCompletedAt,
    recurrence_type: null,
    interval_value: value,
    interval_unit: unit,
    day_of_week: deriveDayOfWeekForChore(value, unit, anchorDateStr),
    next_due_at: computeNextDueAt(value, unit, lastCompletedAt),
  };
}

/** First due date for a new repeating chore from interval + optional weekday */
export function computeInitialNextDueOn(
  intervalValue: number,
  intervalUnit: IntervalUnit,
  dayOfWeek: number | null,
  dueNow = false,
): string {
  const todayStr = getTodayDateString();
  if (dueNow) return todayStr;

  if (intervalUnit === 'weeks' && intervalValue === 1 && dayOfWeek != null) {
    const todayParts = parseDateInput(todayStr);
    const todayDow = new Date(todayParts.year, todayParts.month - 1, todayParts.day).getDay();
    return addDaysToDateString(todayStr, dayOfWeek - todayDow);
  }

  return addIntervalToDateString(todayStr, intervalValue, intervalUnit);
}

export function formatChoreShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function getChoreDateSubtitle(chore: Chore): string {
  if (isChoreSomeday(chore)) {
    if (!chore.last_completed_at) return '';
    return `Last done ${formatChoreShortDate(chore.last_completed_at)}`;
  }
  if (!chore.next_due_at) {
    if (!chore.last_completed_at) return '';
    return `Last done ${formatChoreShortDate(chore.last_completed_at)}`;
  }
  const due = formatChoreShortDate(chore.next_due_at);
  if (isChoreOverdue(chore)) {
    if (!chore.last_completed_at) return `Was due ${due}`;
    const last = formatChoreShortDate(chore.last_completed_at);
    return `Last done ${last} · was due ${due}`;
  }
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

/** Advance a due date by one chore interval.
 * `anchor` should be the scheduled due date (YYYY-MM-DD or ISO).
 * Late/early completion must not pass "today" here or the calendar drifts.
 */
export function computeNextDueAt(
  intervalValue: number,
  intervalUnit: IntervalUnit,
  anchor: string | Date,
): string {
  const anchorStr =
    typeof anchor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(anchor)
      ? anchor
      : nextDueAtToDateString(
          typeof anchor === 'string' ? anchor : anchor.toISOString(),
        ) ?? getTodayDateString();
  return dateStringToISO(
    addIntervalToDateString(anchorStr, intervalValue, intervalUnit),
  );
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

/** Due today through the next 7 days, excluding overdue */
export function isChoreDueThisWeekIncludingToday(chore: Chore): boolean {
  if (isChoreSomeday(chore) || !chore.next_due_at || isChoreOverdue(chore)) return false;
  const dueDay = localDateToDayNumber(getLocalDateParts(chore.next_due_at));
  const todayDay = localDateToDayNumber(getLocalDateParts(new Date()));
  return dueDay >= todayDay && dueDay <= todayDay + 7;
}

/** Due in the next 7 days after today (excludes overdue and today) */
export function isChoreDueLaterThisWeek(chore: Chore): boolean {
  if (isChoreSomeday(chore) || !chore.next_due_at || isChoreOverdue(chore)) return false;
  const dueDay = localDateToDayNumber(getLocalDateParts(chore.next_due_at));
  const todayDay = localDateToDayNumber(getLocalDateParts(new Date()));
  return dueDay > todayDay && dueDay <= todayDay + 7;
}

export function isChoreDueTodayOrOverdue(chore: Chore): boolean {
  if (isChoreSomeday(chore) || !chore.next_due_at) return false;
  return isChoreOverdue(chore) || isChoreDueToday(chore);
}

export function isChoreVisibleInScheduleFilter(
  chore: Chore,
  filter: ChoreScheduleFilter,
): boolean {
  if (isChoreDismissed(chore)) {
    return false;
  }
  if (filter === 'overdue') {
    return isChoreOverdue(chore);
  }
  if (filter === 'someday') {
    return isChoreSomeday(chore);
  }
  if (isChoreSomeday(chore)) {
    return false;
  }
  if (isChoreOverdue(chore)) {
    return false;
  }
  if (filter === 'today') {
    return isChoreDueToday(chore);
  }
  if (filter === 'weekly') {
    return isChoreDueLaterThisWeek(chore);
  }
  return true;
}

export function getScheduleFilterForChore(chore: Chore): ChoreScheduleFilter {
  if (isChoreSomeday(chore)) return 'someday';
  if (isChoreOverdue(chore)) return 'overdue';
  if (isChoreDueToday(chore)) return 'today';
  if (isChoreDueLaterThisWeek(chore)) return 'weekly';
  return 'all';
}

export function pickScheduleFilterForChores(
  chores: Chore[],
  preferred?: ChoreScheduleFilter,
): ChoreScheduleFilter {
  if (preferred && chores.some((c) => isChoreVisibleInScheduleFilter(c, preferred))) {
    return preferred;
  }
  const filters: ChoreScheduleFilter[] = ['overdue', 'today', 'weekly', 'all', 'someday'];
  return (
    filters.find((filter) => chores.some((c) => isChoreVisibleInScheduleFilter(c, filter))) ??
    preferred ??
    'today'
  );
}

export function countChoresInScheduleFilter(
  chores: Chore[],
  filter: ChoreScheduleFilter,
): number {
  return chores.filter((c) => isChoreVisibleInScheduleFilter(c, filter)).length;
}

/** Trim and collapse accidental back-to-back title duplication (e.g. "foo foo" → "foo"). */
export function normalizeChoreTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return trimmed;

  for (let i = 1; i < trimmed.length; i++) {
    if (trimmed[i] !== ' ') continue;
    const first = trimmed.slice(0, i);
    const second = trimmed.slice(i + 1);
    if (first === second) return first;
  }

  return trimmed;
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

export function matchChoreFrequencyPreset(
  repeats: boolean,
  intervalValue?: number | null,
  intervalUnit?: IntervalUnit | null,
): ChoreFrequencyPreset | null {
  if (!repeats) return null;
  if (intervalUnit === 'weeks' && intervalValue === 1) return 'weekly';
  if (intervalUnit === 'weeks' && intervalValue === 2) return 'biweekly';
  if (intervalUnit === 'months' && intervalValue === 1) return 'monthly';
  return null;
}

export function getChoreIntervalLabel(chore: Chore): string {
  if (isChoreSomeday(chore)) return 'Someday';
  const interval = getChoreInterval(chore);
  if (!interval) return 'One-off';
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

  if (filter === 'overdue') {
    const sorted = sortChoresByDue(chores);
    return sorted.length > 0 ? [{ label: '', chores: sorted }] : [];
  }

  if (filter === 'all') {
    const thisWeek = sortChoresByDue(chores.filter(isChoreDueThisWeekIncludingToday));
    const thisWeekIds = new Set(thisWeek.map((c) => c.id));
    const later = sortChoresByDue(chores.filter((c) => !thisWeekIds.has(c.id)));

    const groups: ChoreGroup[] = [];
    if (thisWeek.length > 0) {
      groups.push({ label: 'This week', chores: thisWeek });
    }
    if (later.length > 0) {
      groups.push({ label: 'Later', chores: later });
    }
    return groups;
  }

  const sorted = sortChoresByDue(chores);
  return sorted.length > 0 ? [{ label: '', chores: sorted }] : [];
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

export function getOverdueChores(chores: Chore[]): Chore[] {
  return sortChoresByDue(chores.filter(isChoreOverdue));
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
