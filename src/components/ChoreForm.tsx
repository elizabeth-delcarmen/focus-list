import { useMemo, useRef, useState } from 'react';
import {
  INTERVAL_UNITS,
  TIME_CHIPS,
  getTodayDateString,
  type EditChoreInput,
  type IntervalUnit,
  type NewChoreInput,
} from '../types';
import {
  formatChoreDueDate,
  getCoupleWeeksDateString,
  getDueDatePreview,
  dateStringToISO,
} from '../lib/choreSchedule';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

type DueDateChoice = 'overdue' | 'couple_weeks' | 'pick' | null;

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

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-[#3D3530]' : 'bg-[#D8D2C4]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const initialRepeats = initial?.repeats ?? true;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [room, setRoom] = useState<string | null>(initial?.room ?? null);
  const [addedRooms, setAddedRooms] = useState<string[]>(() => {
    const initialRoom = initial?.room?.trim();
    return initialRoom ? [initialRoom] : [];
  });
  const [newRoomMode, setNewRoomMode] = useState(false);
  const [newRoomValue, setNewRoomValue] = useState('');
  const [repeats, setRepeats] = useState(initialRepeats);
  const [intervalValue, setIntervalValue] = useState(initial?.interval_value ?? 1);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(
    initial?.interval_unit ?? 'weeks',
  );
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(initial?.day_of_week ?? null);
  const [nextDueOn, setNextDueOn] = useState(initial?.next_due_on ?? '');
  const [dueDateChoice, setDueDateChoice] = useState<DueDateChoice>(null);
  const [nextDueOnDirty, setNextDueOnDirty] = useState(false);
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

  const todayStr = getTodayDateString();
  const coupleWeeksStr = getCoupleWeeksDateString();
  const showDayPicker = repeats && intervalUnit === 'weeks' && intervalValue === 1;
  const needsDueDateOnEdit = mode === 'edit' && repeats && !initialRepeats && !nextDueOn;
  const showDueDateSection =
    repeats && (mode === 'add' || needsDueDateOnEdit);

  const dueDatePreview = useMemo(() => {
    if (!repeats || !nextDueOn) return null;
    return getDueDatePreview(nextDueOn);
  }, [repeats, nextDueOn]);

  const hasNextDueDate = Boolean(nextDueOn);
  const canSubmit =
    Boolean(title.trim()) &&
    (mode === 'edit' || !repeats || hasNextDueDate);

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

  const toggleDay = (day: number) => {
    setDayOfWeek((prev) => (prev === day ? null : day));
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

  const handleRepeatsChange = (on: boolean) => {
    setRepeats(on);
    if (!on) {
      setDayOfWeek(null);
    }
  };

  const handleIntervalUnitChange = (unit: IntervalUnit) => {
    setIntervalUnit(unit);
    if (unit !== 'weeks' || intervalValue !== 1) {
      setDayOfWeek(null);
    }
  };

  const handleIntervalValueChange = (value: number) => {
    const next = Math.max(1, value);
    setIntervalValue(next);
    if (intervalUnit !== 'weeks' || next !== 1) {
      setDayOfWeek(null);
    }
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

  const selectOverdueNow = () => {
    setDueDateChoice('overdue');
    setNextDueOn(todayStr);
    if (mode === 'edit') setNextDueOnDirty(true);
  };

  const selectCoupleWeeks = () => {
    setDueDateChoice('couple_weeks');
    setNextDueOn(coupleWeeksStr);
    if (mode === 'edit') setNextDueOnDirty(true);
  };

  const selectPickDate = () => {
    setDueDateChoice('pick');
    openDatePicker();
  };

  const handleDatePicked = (value: string) => {
    setNextDueOn(value);
    setDueDateChoice('pick');
    if (mode === 'edit') setNextDueOnDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (mode === 'add' && repeats && !nextDueOn) return;

    setSubmitting(true);
    try {
      const base: NewChoreInput = {
        title: title.trim(),
        room: resolveRoom(),
        time_estimate_minutes: timeEstimate,
        repeats,
        interval_value: repeats ? intervalValue : undefined,
        interval_unit: repeats ? intervalUnit : undefined,
        day_of_week: showDayPicker ? dayOfWeek : null,
        next_due_on: repeats ? nextDueOn : undefined,
      };

      if (mode === 'edit') {
        await onSubmit({
          ...base,
          next_due_on_changed: nextDueOnDirty,
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
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionLabel>Repeats</SectionLabel>
          <ToggleSwitch checked={repeats} onChange={handleRepeatsChange} label="Repeats" />
        </div>

        {!repeats ? (
          <p className="text-[14px] font-normal text-[#938C7C] md:text-[13px]">
            Someday — no due date, just tracked by room.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleIntervalValueChange(intervalValue - 1)}
                disabled={intervalValue <= 1}
                aria-label="Decrease interval"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D2C4] bg-white text-lg font-medium text-[#3D3530] disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-[17px] font-medium tabular-nums text-[#3D3530]">
                {intervalValue}
              </span>
              <button
                type="button"
                onClick={() => handleIntervalValueChange(intervalValue + 1)}
                aria-label="Increase interval"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D2C4] bg-white text-lg font-medium text-[#3D3530]"
              >
                +
              </button>
              <div className="flex flex-wrap gap-2">
                {INTERVAL_UNITS.map(({ id, label }) => (
                  <SelectChip
                    key={id}
                    selected={intervalUnit === id}
                    onClick={() => handleIntervalUnitChange(id)}
                  >
                    {label}
                  </SelectChip>
                ))}
              </div>
            </div>

            {showDayPicker ? (
              <div className="mt-3">
                <p className="mb-2 text-[12px] font-normal text-[#938C7C]">
                  Optional day of week
                </p>
                <div className="flex gap-2">
                  {DAY_LABELS.map((label, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      aria-label={`${label} day of week`}
                      aria-pressed={dayOfWeek === index}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${
                        dayOfWeek === index
                          ? 'bg-[#3D3530] text-white'
                          : 'border border-[#D8D2C4] bg-white text-[#938C7C]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {showDueDateSection ? (
        <div className="mt-4">
          <SectionLabel>When&apos;s this next due?</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <SelectChip
              selected={dueDateChoice === 'overdue' || nextDueOn === todayStr}
              onClick={selectOverdueNow}
            >
              Overdue now
            </SelectChip>
            <SelectChip
              selected={dueDateChoice === 'couple_weeks' || nextDueOn === coupleWeeksStr}
              onClick={selectCoupleWeeks}
            >
              In a couple weeks
            </SelectChip>
            <SelectChip selected={dueDateChoice === 'pick'} onClick={selectPickDate}>
              Pick a date
            </SelectChip>
          </div>
          {hasNextDueDate ? (
            <div className="mt-2 rounded-[12px] border border-[#D8D2C4] bg-[#FAF8F3] px-[14px] py-[14px] text-base text-[#3D3530] md:text-[15px]">
              {formatChoreDueDate(dateStringToISO(nextDueOn))}
            </div>
          ) : (
            <div className="mt-2 rounded-[12px] border border-dashed border-[#D8D2C4] bg-transparent px-[14px] py-[14px] text-center text-[14px] text-[#938C7C] md:text-[13px]">
              Choose when this chore is next due
            </div>
          )}
          {dueDatePreview ? (
            <p
              className={`mt-2 text-[14px] font-normal md:text-[13px] ${
                dueDatePreview.isOverdue ? 'text-[#C0463F]' : 'text-[#4F7396]'
              }`}
            >
              {dueDatePreview.label}
            </p>
          ) : null}
          <input
            ref={dateInputRef}
            type="date"
            value={nextDueOn}
            onChange={(e) => handleDatePicked(e.target.value)}
            className="fixed left-0 top-0 h-px w-px opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
      ) : null}

      {mode === 'edit' && repeats && nextDueOn && !showDueDateSection ? (
        <div className="mt-4">
          <SectionLabel>Next due</SectionLabel>
          <p className="text-[14px] font-normal text-[#3D3530] md:text-[13px]">
            {formatChoreDueDate(dateStringToISO(nextDueOn))}
          </p>
          {dueDatePreview ? (
            <p
              className={`mt-1 text-[13px] font-normal md:text-[12px] ${
                dueDatePreview.isOverdue ? 'text-[#C0463F]' : 'text-[#4F7396]'
              }`}
            >
              {dueDatePreview.label}
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
      {mode === 'add' && repeats && !hasNextDueDate ? (
        <p className="mt-2 text-center text-[13px] font-normal text-[#938C7C] md:text-[12px]">
          Set when this is next due to continue
        </p>
      ) : null}
      {saveError && mode === 'add' ? (
        <p className="mt-2 text-center text-[13px] font-normal text-[#C0463F] md:text-[12px]">
          {saveError}
        </p>
      ) : null}
    </form>
  );
}
