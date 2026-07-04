import { useMemo, useRef, useState } from 'react';
import {
  CHORE_RECURRENCE_OPTIONS,
  TIME_CHIPS,
  getTodayDateString,
  type ChoreRecurrencePreset,
  type ChoreWhenChoice,
  type EditChoreInput,
  type IntervalUnit,
  type NewChoreInput,
} from '../types';
import {
  formatChoreDueDate,
  formatIntervalLabel,
  getDueDatePreview,
  dateStringToISO,
  matchChoreFrequencyPreset,
  normalizeChoreTitle,
} from '../lib/choreSchedule';

interface ChoreFormProps {
  existingRooms: string[];
  initial?: Partial<NewChoreInput>;
  mode?: 'add' | 'edit';
  submitLabel?: string;
  variant?: 'sheet' | 'inline';
  saveError?: string | null;
  onSubmit: (values: NewChoreInput | EditChoreInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#938C7C]">
      {children}
    </p>
  );
}

function SelectChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
        selected
          ? 'border-[#3D3530] bg-[#3D3530] text-white'
          : 'border-[#D8D2C4] bg-white text-[#938C7C] hover:text-[#3D3530]'
      }`}
    >
      {children}
    </button>
  );
}

function inferWhenChoice(initial?: Partial<NewChoreInput>): ChoreWhenChoice {
  if (initial?.is_someday) return 'someday';
  const dueOn = initial?.next_due_on;
  if (!dueOn) return 'today';
  if (dueOn === getTodayDateString()) return 'today';
  return 'pick';
}

function inferRecurrence(
  initial?: Partial<NewChoreInput>,
): ChoreRecurrencePreset | null {
  if (initial?.is_someday || !initial?.repeats) return null;
  const preset = matchChoreFrequencyPreset(
    true,
    initial?.interval_value,
    initial?.interval_unit,
  );
  if (preset && preset !== 'someday') return preset;
  return null;
}

export function ChoreForm({
  existingRooms,
  initial,
  mode = 'add',
  submitLabel = 'Add chore',
  variant = 'sheet',
  saveError,
  onSubmit,
  onCancel,
  onDelete,
}: ChoreFormProps) {
  const initialWhen = inferWhenChoice(initial);
  const initialRecurrence = inferRecurrence(initial);
  const initialHasRecurrence = Boolean(initial?.repeats && !initial?.is_someday);
  const initialIntervalValue = initial?.interval_value ?? 1;
  const initialIntervalUnit = initial?.interval_unit ?? 'weeks';
  const initialPreset = matchChoreFrequencyPreset(
    initialHasRecurrence,
    initialIntervalValue,
    initialIntervalUnit,
  );

  const [title, setTitle] = useState(initial?.title ?? '');
  const [room, setRoom] = useState<string | null>(initial?.room ?? null);
  const [addedRooms, setAddedRooms] = useState<string[]>(() => {
    const initialRoom = initial?.room?.trim();
    return initialRoom ? [initialRoom] : [];
  });
  const [newRoomMode, setNewRoomMode] = useState(false);
  const [newRoomValue, setNewRoomValue] = useState('');
  const [whenChoice, setWhenChoice] = useState<ChoreWhenChoice>(
    () => initialWhen ?? (mode === 'add' ? 'today' : 'someday'),
  );
  const [recurrence, setRecurrence] = useState<ChoreRecurrencePreset | null>(
    () => initialRecurrence ?? null,
  );
  const [pickedDueOn, setPickedDueOn] = useState<string | null>(() => {
    if (initialWhen === 'pick' && initial?.next_due_on) return initial.next_due_on;
    return null;
  });
  const dateInputRef = useRef<HTMLInputElement>(null);
  const initialMinutes = initial?.time_estimate_minutes ?? 25;
  const [timeEstimate, setTimeEstimate] = useState(initialMinutes);
  const [customEstimate, setCustomEstimate] = useState(() => {
    const mins = initial?.time_estimate_minutes;
    if (mins != null && !(TIME_CHIPS as readonly number[]).includes(mins)) {
      return String(mins);
    }
    return '';
  });
  const [submitting, setSubmitting] = useState(false);

  const isSomeday = whenChoice === 'someday';
  const showRecurrence = !isSomeday;
  const customFrequencyLabel =
    showRecurrence && recurrence === null && initialHasRecurrence && initialPreset === null
      ? formatIntervalLabel(initialIntervalValue, initialIntervalUnit)
      : null;

  const firstDueOn = useMemo(() => {
    if (isSomeday) return '';
    if (whenChoice === 'today') return getTodayDateString();
    if (whenChoice === 'pick' && pickedDueOn) return pickedDueOn;
    if (mode === 'edit' && initial?.next_due_on && whenChoice === initialWhen) {
      return initial.next_due_on;
    }
    return '';
  }, [isSomeday, whenChoice, pickedDueOn, mode, initial, initialWhen]);

  const dueDatePreview = useMemo(() => {
    if (isSomeday || !firstDueOn) return null;
    return getDueDatePreview(firstDueOn);
  }, [isSomeday, firstDueOn]);

  const canSubmit = Boolean(title.trim()) && (isSomeday || Boolean(firstDueOn));

  const displayRooms = useMemo(() => {
    const names = new Set(existingRooms);
    for (const name of addedRooms) names.add(name);
    if (room) names.add(room);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [existingRooms, addedRooms, room]);

  const handleRoomSelect = (selectedRoom: string) => {
    setNewRoomMode(false);
    setNewRoomValue('');
    setRoom(selectedRoom);
  };

  const handleNewRoomApply = () => {
    const trimmed = newRoomValue.trim();
    if (!trimmed) return;
    setRoom(trimmed);
    setAddedRooms((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setNewRoomMode(false);
    setNewRoomValue('');
  };

  const resolveRoom = (): string | undefined => {
    if (newRoomMode) {
      const trimmed = newRoomValue.trim();
      return trimmed || undefined;
    }
    return room ?? undefined;
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  };

  const handleWhenChange = (next: ChoreWhenChoice) => {
    setWhenChoice(next);
    if (next === 'someday') {
      setRecurrence(null);
      setPickedDueOn(null);
    } else if (next === 'today') {
      setPickedDueOn(null);
    }
  };

  const handlePickDate = () => {
    setWhenChoice('pick');
    openDatePicker();
  };

  const handleDatePicked = (value: string) => {
    if (!value) return;
    setWhenChoice('pick');
    setPickedDueOn(value);
  };

  const toggleRecurrence = (id: ChoreRecurrencePreset) => {
    setRecurrence((current) => (current === id ? null : id));
  };

  const selectTimeChip = (minutes: number) => {
    setTimeEstimate(minutes);
    setCustomEstimate('');
  };

  const handleCustomEstimate = (value: string) => {
    setCustomEstimate(value);
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setTimeEstimate(parsed);
    }
  };

  const resolveInterval = (): { intervalValue: number; intervalUnit: IntervalUnit } | null => {
    if (recurrence) {
      const option = CHORE_RECURRENCE_OPTIONS.find((item) => item.id === recurrence)!;
      return { intervalValue: option.interval_value, intervalUnit: option.interval_unit };
    }
    if (mode === 'edit' && initialHasRecurrence && initialPreset === null) {
      return { intervalValue: initialIntervalValue, intervalUnit: initialIntervalUnit };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !canSubmit) return;

    setSubmitting(true);
    try {
      const normalizedTitle = normalizeChoreTitle(title);
      const hasRecurrence = Boolean(recurrence);
      const interval = hasRecurrence ? resolveInterval() : null;

      const base: NewChoreInput = {
        title: normalizedTitle,
        room: resolveRoom(),
        time_estimate_minutes: timeEstimate,
        is_someday: isSomeday,
        repeats: hasRecurrence,
        interval_value: interval?.intervalValue,
        interval_unit: interval?.intervalUnit,
        next_due_on: isSomeday ? undefined : firstDueOn,
      };

      if (mode === 'edit') {
        const wasSomeday = initial?.is_someday === true;
        const enablingSchedule = !isSomeday && wasSomeday;
        const scheduleChanged =
          recurrence !== initialPreset ||
          whenChoice !== initialWhen ||
          (whenChoice === 'pick' && pickedDueOn !== (initial?.next_due_on ?? null)) ||
          (whenChoice === 'today' && initialWhen !== 'today');
        const dueDateChanged =
          whenChoice === 'pick' ? Boolean(pickedDueOn) : whenChoice === 'today';

        await onSubmit({
          ...base,
          next_due_on_changed:
            enablingSchedule || dueDateChanged || (scheduleChanged && !isSomeday),
        });
      } else {
        await onSubmit(base);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        variant === 'sheet'
          ? 'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1'
          : 'rounded-[12px] border border-dashed border-border bg-surface p-4'
      }
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Chore name"
        autoComplete="off"
        autoCorrect="off"
        autoFocus
        className="w-full rounded-full border border-[#D8D2C4] bg-[#FAF8F3] px-[14px] py-[14px] text-base text-[#3D3530] outline-none placeholder:text-[#938C7C] focus:border-[#3D3530] md:text-[15px]"
      />

      <div className="mt-4">
        <SectionLabel>Room</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {displayRooms.map((name) => (
            <SelectChip
              key={name}
              selected={room === name && !newRoomMode}
              onClick={() => handleRoomSelect(name)}
            >
              {name}
            </SelectChip>
          ))}
          <SelectChip
            selected={newRoomMode}
            onClick={() => {
              setNewRoomMode(true);
              setRoom(null);
            }}
          >
            + New
          </SelectChip>
        </div>
        {newRoomMode ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newRoomValue}
              onChange={(e) => setNewRoomValue(e.target.value)}
              placeholder="Room name"
              autoFocus
              className="min-w-0 flex-1 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] px-4 py-2 text-base text-[#3D3530] outline-none placeholder:text-[#938C7C] focus:border-[#3D3530] md:text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleNewRoomApply();
                }
              }}
            />
            <button
              type="button"
              onClick={handleNewRoomApply}
              disabled={!newRoomValue.trim()}
              className="shrink-0 rounded-full bg-[#3D3530] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <SectionLabel>
          {mode === 'edit' && initialHasRecurrence && !isSomeday && whenChoice === initialWhen
            ? "When's this due?"
            : "When's this first due?"}
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          <SelectChip selected={whenChoice === 'today'} onClick={() => handleWhenChange('today')}>
            Today
          </SelectChip>
          <SelectChip
            selected={whenChoice === 'pick'}
            onClick={handlePickDate}
          >
            Pick a date
          </SelectChip>
          <SelectChip selected={whenChoice === 'someday'} onClick={() => handleWhenChange('someday')}>
            Someday
          </SelectChip>
        </div>

        {whenChoice === 'pick' && pickedDueOn ? (
          <button
            type="button"
            onClick={openDatePicker}
            className="mt-2 w-full rounded-[12px] border border-[#D8D2C4] bg-[#FAF8F3] px-[14px] py-[14px] text-left text-base text-[#3D3530] md:text-[15px]"
          >
            {formatChoreDueDate(dateStringToISO(pickedDueOn))}
          </button>
        ) : null}

        <input
          ref={dateInputRef}
          type="date"
          value={pickedDueOn ?? getTodayDateString()}
          onChange={(e) => handleDatePicked(e.target.value)}
          className="fixed left-0 top-0 h-px w-px opacity-0"
          tabIndex={-1}
          aria-hidden
        />

        {isSomeday ? (
          <p className="mt-2 text-[14px] font-normal text-[#938C7C] md:text-[13px]">
            No due date yet — tracked by room until you schedule or complete it.
          </p>
        ) : null}

        {!isSomeday && firstDueOn && dueDatePreview ? (
          <p
            className={`mt-3 text-[13px] font-normal md:text-[12px] ${
              dueDatePreview.isOverdue ? 'text-[#C0463F]' : 'text-[#938C7C]'
            }`}
          >
            {mode === 'edit' && initialHasRecurrence && whenChoice === initialWhen
              ? `Next due ${formatChoreDueDate(dateStringToISO(firstDueOn)).toLowerCase()}`
              : `First due ${formatChoreDueDate(dateStringToISO(firstDueOn)).toLowerCase()}`}
            {dueDatePreview.isOverdue ? ' · overdue' : null}
          </p>
        ) : null}
      </div>

      {showRecurrence ? (
        <div className="mt-4">
          <SectionLabel>How often after that?</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {CHORE_RECURRENCE_OPTIONS.map(({ id, label }) => (
              <SelectChip
                key={id}
                selected={recurrence === id}
                onClick={() => toggleRecurrence(id)}
              >
                {label}
              </SelectChip>
            ))}
          </div>

          {customFrequencyLabel ? (
            <p className="mt-2 text-[13px] font-normal text-[#938C7C] md:text-[12px]">
              Currently {customFrequencyLabel.toLowerCase()}. Pick an option above to change it.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <SectionLabel>Time estimate</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {TIME_CHIPS.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => selectTimeChip(mins)}
              className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
                timeEstimate === mins && !customEstimate
                  ? 'bg-accent-soft text-accent'
                  : 'bg-surface-raised text-text-muted hover:text-text-primary'
              }`}
            >
              {mins}m
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={customEstimate}
            onChange={(e) => handleCustomEstimate(e.target.value)}
            placeholder="Custom"
            className="w-20 rounded-full border border-border bg-bg px-3 py-1 text-base text-text-primary outline-none placeholder:text-base placeholder:text-text-faint focus:border-accent md:text-xs md:placeholder:text-xs"
          />
        </div>
      </div>

      <div className={`mt-6 flex gap-2 ${variant === 'inline' && onDelete ? 'flex-wrap' : ''}`}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-[#D8D2C4] bg-transparent py-3 text-[15px] font-medium text-[#3D3530]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex-1 rounded-full bg-[#3D3530] py-3 text-[15px] font-semibold text-[#FAF8F3] disabled:opacity-40"
        >
          {submitLabel}
        </button>
        {onDelete && variant === 'inline' ? (
          <button
            type="button"
            onClick={() => void onDelete()}
            className="ml-auto rounded-full border border-urgent-border px-4 py-2 text-[15px] font-medium text-urgent transition-colors hover:bg-urgent-bg md:text-sm"
          >
            Delete
          </button>
        ) : null}
      </div>
      {saveError && mode === 'add' ? (
        <p className="mt-2 text-center text-[13px] font-normal text-[#C0463F] md:text-[12px]">
          {saveError}
        </p>
      ) : null}
    </form>
  );
}
