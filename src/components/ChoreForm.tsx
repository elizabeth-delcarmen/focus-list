import { useState } from 'react';
import {
  CHORE_TIME_CHIPS,
  RECURRENCE_OPTIONS,
  type NewChoreInput,
  type RecurrenceType,
} from '../types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

interface ChoreFormProps {
  existingRooms: string[];
  onSubmit: (values: NewChoreInput) => Promise<void>;
  onCancel: () => void;
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

export function ChoreForm({ existingRooms, onSubmit, onCancel }: ChoreFormProps) {
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState<string | null>(null);
  const [newRoomMode, setNewRoomMode] = useState(false);
  const [newRoomValue, setNewRoomValue] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [timeEstimate, setTimeEstimate] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const handleRoomSelect = (selectedRoom: string) => {
    setNewRoomMode(false);
    setNewRoomValue('');
    setRoom(selectedRoom);
  };

  const handleNewRoomApply = () => {
    const trimmed = newRoomValue.trim();
    if (trimmed) {
      setRoom(trimmed);
      setNewRoomMode(false);
      setNewRoomValue('');
    }
  };

  const toggleDay = (day: number) => {
    setDayOfWeek((prev) => (prev === day ? null : day));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        room: room ?? undefined,
        time_estimate_minutes: timeEstimate,
        recurrence_type: recurrence,
        day_of_week: recurrence === 'weekly' ? dayOfWeek : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1"
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
          {existingRooms.map((name) => (
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
        <SectionLabel>Repeats</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {RECURRENCE_OPTIONS.map(({ id, label }) => (
            <SelectChip
              key={id}
              selected={recurrence === id}
              onClick={() => {
                setRecurrence(id);
                if (id !== 'weekly') setDayOfWeek(null);
              }}
            >
              {label}
            </SelectChip>
          ))}
        </div>
        {recurrence === 'weekly' ? (
          <div className="mt-3 flex gap-2">
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
        ) : null}
      </div>

      <div className="mt-4">
        <SectionLabel>Time estimate</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {CHORE_TIME_CHIPS.map((mins) => (
            <SelectChip
              key={mins}
              selected={timeEstimate === mins}
              onClick={() => setTimeEstimate(mins)}
            >
              {mins}m
            </SelectChip>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-[#D8D2C4] bg-transparent py-3 text-[15px] font-medium text-[#3D3530]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          className="flex-1 rounded-full bg-[#3D3530] py-3 text-[15px] font-semibold text-[#FAF8F3] disabled:opacity-40"
        >
          Add chore
        </button>
      </div>
    </form>
  );
}
