import { useMemo, useState } from 'react';
import { Calendar, ChevronDown, Clock, Minus, Plus, X } from 'lucide-react';
import {
  getTodayDateString,
  type EditChoreInput,
  type IntervalUnit,
  type NewChoreInput,
} from '../types';
import {
  dayOfWeekFromDateString,
  normalizeChoreTitle,
} from '../lib/choreSchedule';

type RecurrenceMode = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const RECURRENCE_OPTIONS: { id: RecurrenceMode; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const WEEKDAYS = [
  { id: 0, label: 'Sun', full: 'Sunday' },
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

interface ChoreFormProps {
  existingRooms: string[];
  initial?: Partial<NewChoreInput>;
  mode?: 'add' | 'edit';
  submitLabel?: string;
  variant?: 'sheet' | 'inline';
  saveError?: string | null;
  defaultRoom?: string | null;
  onRememberRoom?: (room: string) => void;
  onSubmit: (values: NewChoreInput | EditChoreInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-wide text-black">
      {children}
    </p>
  );
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function unitLabel(mode: RecurrenceMode, count: number): string {
  if (mode === 'daily') return count === 1 ? 'day' : 'days';
  if (mode === 'weekly') return count === 1 ? 'week' : 'weeks';
  if (mode === 'monthly') return count === 1 ? 'month' : 'months';
  return count === 1 ? 'year' : 'years';
}

function inferRecurrenceMode(initial?: Partial<NewChoreInput>): RecurrenceMode {
  if (!initial?.repeats || initial.is_someday) return 'once';
  const value = initial.interval_value ?? 1;
  const unit = initial.interval_unit;
  if (unit === 'days') return 'daily';
  if (unit === 'weeks') return 'weekly';
  if (unit === 'months') {
    if (value % 12 === 0) return 'yearly';
    return 'monthly';
  }
  return 'once';
}

function dateWithDayOfMonth(base: string, day: number): string {
  const [y, m] = base.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const clamped = Math.min(day, lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

function dateWithMonth(base: string, monthIndex: number): string {
  const [y, , d] = base.split('-').map(Number);
  const lastDay = new Date(y, monthIndex + 1, 0).getDate();
  const clamped = Math.min(d, lastDay);
  return `${y}-${String(monthIndex + 1).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

function nextDateForWeekday(base: string, weekday: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const current = date.getDay();
  const delta = (weekday - current + 7) % 7;
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ChoreForm({
  existingRooms,
  initial,
  mode = 'add',
  submitLabel = 'Save Task',
  variant = 'sheet',
  saveError,
  defaultRoom = null,
  onRememberRoom,
  onSubmit,
  onCancel,
  onDelete,
}: ChoreFormProps) {
  const inferredMode = inferRecurrenceMode(initial);
  const initialInterval = initial?.interval_value ?? 1;
  const initialEvery =
    inferredMode === 'yearly' ? Math.max(1, Math.round(initialInterval / 12)) : initialInterval;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [room, setRoom] = useState<string>(
    initial?.room ?? defaultRoom ?? existingRooms[0] ?? '',
  );
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [newRoomValue, setNewRoomValue] = useState('');
  const [dueOn, setDueOn] = useState(
    () => initial?.next_due_on ?? getTodayDateString(),
  );
  const [timeEstimateInput, setTimeEstimateInput] = useState(
    String(initial?.time_estimate_minutes ?? 30),
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(
    () => mode === 'edit' && !initial?.is_someday,
  );
  const [recurrence, setRecurrence] = useState<RecurrenceMode>(inferredMode);
  const [everyCount, setEveryCount] = useState(Math.max(1, initialEvery));
  const [weekday, setWeekday] = useState(() => {
    if (initial?.day_of_week != null) return initial.day_of_week;
    if (initial?.next_due_on) return dayOfWeekFromDateString(initial.next_due_on);
    return dayOfWeekFromDateString(getTodayDateString());
  });
  const [monthDay, setMonthDay] = useState(() => {
    const src = initial?.next_due_on ?? getTodayDateString();
    return Number(src.split('-')[2]) || 1;
  });
  const [yearMonth, setYearMonth] = useState(() => {
    const src = initial?.next_due_on ?? getTodayDateString();
    return Math.max(0, Number(src.split('-')[1]) - 1);
  });
  const [submitting, setSubmitting] = useState(false);

  const displayRooms = useMemo(() => {
    const names = new Set(existingRooms);
    if (room.trim()) names.add(room.trim());
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [existingRooms, room]);

  const summary = useMemo(() => {
    if (recurrence === 'once') {
      return `Complete on ${formatDisplayDate(dueOn)}`;
    }
    if (recurrence === 'daily') {
      return everyCount === 1
        ? 'Complete every day'
        : `Complete every ${everyCount} days`;
    }
    if (recurrence === 'weekly') {
      const dayName = WEEKDAYS.find((d) => d.id === weekday)?.full ?? 'day';
      return everyCount === 1
        ? `Complete every week on ${dayName}`
        : `Complete every ${everyCount} weeks on ${dayName}`;
    }
    if (recurrence === 'monthly') {
      return everyCount === 1
        ? `Complete every month on the ${ordinal(monthDay)}`
        : `Complete every ${everyCount} months on the ${ordinal(monthDay)}`;
    }
    const monthName = MONTHS[yearMonth] ?? 'month';
    return everyCount === 1
      ? `Complete every year in ${monthName}`
      : `Complete every ${everyCount} years in ${monthName}`;
  }, [recurrence, dueOn, everyCount, weekday, monthDay, yearMonth]);

  const canSubmit = Boolean(title.trim());

  const resolvedTimeEstimate = (() => {
    const parsed = parseInt(timeEstimateInput, 10);
    return !Number.isNaN(parsed) && parsed > 0 ? parsed : 30;
  })();

  const bumpEvery = (delta: number) => {
    setEveryCount((n) => Math.max(1, Math.min(99, n + delta)));
  };

  const resolveInterval = (): {
    repeats: boolean;
    intervalValue?: number;
    intervalUnit?: IntervalUnit;
    dayOfWeek?: number | null;
    nextDueOn: string;
  } => {
    if (recurrence === 'once') {
      return { repeats: false, nextDueOn: dueOn, dayOfWeek: null };
    }
    if (recurrence === 'daily') {
      return {
        repeats: true,
        intervalValue: everyCount,
        intervalUnit: 'days',
        nextDueOn: dueOn,
        dayOfWeek: null,
      };
    }
    if (recurrence === 'weekly') {
      return {
        repeats: true,
        intervalValue: everyCount,
        intervalUnit: 'weeks',
        // Starting On is the source of truth; keep weekday in sync with that date.
        dayOfWeek: dayOfWeekFromDateString(dueOn),
        nextDueOn: dueOn,
      };
    }
    if (recurrence === 'monthly') {
      return {
        repeats: true,
        intervalValue: everyCount,
        intervalUnit: 'months',
        nextDueOn: dateWithDayOfMonth(dueOn, monthDay),
        dayOfWeek: null,
      };
    }
    return {
      repeats: true,
      intervalValue: everyCount * 12,
      intervalUnit: 'months',
      nextDueOn: dateWithMonth(dateWithDayOfMonth(dueOn, monthDay), yearMonth),
      dayOfWeek: null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    try {
      const resolvedRoom = room.trim() || undefined;
      if (resolvedRoom) onRememberRoom?.(resolvedRoom);

      if (!scheduleEnabled) {
        const someday: NewChoreInput = {
          title: normalizeChoreTitle(title),
          room: resolvedRoom,
          time_estimate_minutes: resolvedTimeEstimate,
          is_someday: true,
          repeats: false,
          day_of_week: null,
        };

        if (mode === 'edit') {
          await onSubmit({
            ...someday,
            next_due_on_changed: true,
          });
        } else {
          await onSubmit(someday);
        }
        return;
      }

      const resolved = resolveInterval();
      const base: NewChoreInput = {
        title: normalizeChoreTitle(title),
        room: resolvedRoom,
        time_estimate_minutes: resolvedTimeEstimate,
        is_someday: false,
        repeats: resolved.repeats,
        interval_value: resolved.intervalValue,
        interval_unit: resolved.intervalUnit,
        day_of_week: resolved.dayOfWeek,
        next_due_on: resolved.nextDueOn,
      };

      if (mode === 'edit') {
        await onSubmit({
          ...base,
          next_due_on_changed: true,
        });
      } else {
        await onSubmit(base);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-[12px] border border-[#e5e7eb] bg-[#f3f4fb] px-4 py-4 text-[15px] text-text-primary outline-none focus:border-accent';

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className={
        variant === 'sheet'
          ? 'max-h-[min(85dvh,720px)] overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2'
          : 'rounded-[20px] border border-[#e5e7eb] bg-surface p-5'
      }
    >
      {/* Absorb browser autofill so real fields stay clean */}
      <input
        type="text"
        name="prevent-autofill-username"
        autoComplete="username"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
      <input
        type="password"
        name="prevent-autofill-password"
        autoComplete="new-password"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      {variant === 'sheet' ? (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-[24px] text-text-primary">
            {mode === 'edit' ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-[16px] bg-[#f3f4fb] text-text-muted"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <FieldLabel>Task Name</FieldLabel>
          <input
            type="search"
            name="chore-title"
            id="chore-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Organise black cabinet"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            enterKeyHint="done"
            inputMode="text"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Room</FieldLabel>
          <button
            type="button"
            onClick={() => setShowRoomPicker((v) => !v)}
            className={`${inputClass} flex items-center justify-between text-left`}
          >
            <span>{room.trim() || 'Select a room'}</span>
            <ChevronDown size={16} className="text-text-muted" />
          </button>
          {showRoomPicker ? (
            <div className="rounded-[12px] border border-[#e5e7eb] bg-surface p-2">
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {displayRooms.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setRoom(name);
                      setShowRoomPicker(false);
                    }}
                    className={`flex min-h-11 items-center rounded-[10px] px-3 text-left text-[14px] ${
                      room === name
                        ? 'bg-accent text-white'
                        : 'text-text-primary hover:bg-[#f3f4fb]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2 border-t border-[#e5e7eb] pt-2">
                <input
                  type="search"
                  name="chore-new-room"
                  value={newRoomValue}
                  onChange={(e) => setNewRoomValue(e.target.value)}
                  placeholder="New room"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  enterKeyHint="done"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-[#e5e7eb] bg-[#f3f4fb] px-3 text-[14px] outline-none"
                />
                <button
                  type="button"
                  disabled={!newRoomValue.trim()}
                  onClick={() => {
                    const trimmed = newRoomValue.trim();
                    if (!trimmed) return;
                    setRoom(trimmed);
                    onRememberRoom?.(trimmed);
                    setNewRoomValue('');
                    setShowRoomPicker(false);
                  }}
                  className="min-h-11 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Estimated Time</FieldLabel>
          <div className="flex items-center gap-2 rounded-[12px] bg-[#f7f7fa] px-4 py-4">
            <Clock size={14} className="text-text-muted" aria-hidden />
            <input
              type="text"
              name="chore-estimate-minutes"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              value={timeEstimateInput}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '');
                setTimeEstimateInput(digitsOnly);
              }}
              onBlur={() => {
                const parsed = parseInt(timeEstimateInput, 10);
                if (Number.isNaN(parsed) || parsed < 1) {
                  setTimeEstimateInput('30');
                } else {
                  setTimeEstimateInput(String(parsed));
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-text-primary outline-none"
            />
            <span className="text-[14px] text-text-muted">min</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-[14px] font-medium text-[#4a5463]">Set Schedule</span>
          <button
            type="button"
            role="switch"
            aria-checked={scheduleEnabled}
            aria-label="Set Schedule"
            onClick={() => setScheduleEnabled((v) => !v)}
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            <span
              className={`relative h-7 w-12 rounded-full transition-colors ${
                scheduleEnabled ? 'bg-accent' : 'bg-[#d1d5db]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform ${
                  scheduleEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>

        {scheduleEnabled ? (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel>Starting On</FieldLabel>
              <label className={`${inputClass} relative flex cursor-pointer items-center gap-3`}>
                <Calendar size={20} className="pointer-events-none text-text-muted" aria-hidden />
                <span className="pointer-events-none flex-1">{formatDisplayDate(dueOn)}</span>
                <input
                  type="date"
                  value={dueOn}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setDueOn(e.target.value);
                    setMonthDay(Number(e.target.value.split('-')[2]) || monthDay);
                    setWeekday(dayOfWeekFromDateString(e.target.value));
                    setYearMonth(Math.max(0, Number(e.target.value.split('-')[1]) - 1));
                  }}
                  onClick={(e) => {
                    const input = e.currentTarget;
                    try {
                      input.showPicker?.();
                    } catch {
                      // Older browsers open via the native click instead.
                    }
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>Recurrence</FieldLabel>
              <div className="flex gap-1">
                {RECURRENCE_OPTIONS.map(({ id, label }) => {
                  const selected = recurrence === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRecurrence(id)}
                      className={`flex min-h-11 flex-1 items-center justify-center rounded-[10px] text-[11px] font-semibold ${
                        selected
                          ? 'bg-[#4e5ddc] text-white'
                          : 'border border-[#e5e7eb] bg-[#f3f4fb] text-text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {recurrence !== 'once' ? (
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wide text-text-muted">
                  Every
                </p>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => bumpEvery(-1)}
                    aria-label="Decrease"
                    className="flex size-11 items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-[#f3f4fb]"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[4.5rem] text-center text-[16px] font-semibold text-text-primary">
                    {everyCount} {unitLabel(recurrence, everyCount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => bumpEvery(1)}
                    aria-label="Increase"
                    className="flex size-11 items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-[#f3f4fb]"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ) : null}

            {recurrence === 'weekly' ? (
              <div className="flex justify-between gap-1">
                {WEEKDAYS.map((day) => {
                  const selected = weekday === day.id;
                  return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => {
                    setWeekday(day.id);
                    setDueOn(nextDateForWeekday(dueOn, day.id));
                  }}
                  className={`flex size-11 items-center justify-center rounded-[20px] text-[12px] font-semibold ${
                    selected
                      ? 'bg-[#4e5ddc] text-white'
                      : 'border border-[#e5e7eb] bg-surface text-text-muted'
                  }`}
                >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {recurrence === 'monthly' ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const selected = monthDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setMonthDay(day)}
                      className={`flex min-h-11 items-center justify-center rounded-[8px] text-[13px] ${
                        selected
                          ? 'bg-[#4e5ddc] font-bold text-white'
                          : 'bg-[#f3f4fb] text-text-primary'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {recurrence === 'yearly' ? (
              <div className="max-h-[200px] overflow-y-auto rounded-[12px] border border-[#e5e7eb]">
                {MONTHS.map((name, index) => {
                  const selected = yearMonth === index;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setYearMonth(index)}
                      className="flex min-h-11 w-full items-center justify-between border-b border-[#e5e7eb] px-3 text-left last:border-b-0"
                    >
                      <span className="text-[14px] text-text-primary">{name}</span>
                      <span
                        className={`flex size-5 items-center justify-center rounded-[10px] border-2 border-[#4e5ddc] ${
                          selected ? 'bg-[#4e5ddc]' : 'bg-transparent'
                        }`}
                      >
                        {selected ? (
                          <span className="size-2.5 rounded-[5px] bg-white" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <p className="text-center text-[13px] text-text-muted">{summary}</p>
          </>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="mt-6 flex h-14 w-full items-center justify-center rounded-[16px] bg-[#4e5ddc] text-[18px] font-bold text-white disabled:opacity-40"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>

      {onDelete && mode === 'edit' ? (
        <button
          type="button"
          onClick={() => void onDelete()}
          className="mt-3 flex min-h-11 w-full items-center justify-center text-[14px] font-medium text-urgent"
        >
          Delete
        </button>
      ) : null}

      {saveError && mode === 'add' ? (
        <p className="mt-2 text-center text-[13px] text-urgent">{saveError}</p>
      ) : null}
    </form>
  );
}
