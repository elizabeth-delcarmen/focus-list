import { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { TaskForm } from './TaskForm';
import type { NewTaskInput } from '../types';

export type TaskDestination = 'today' | 'backlog';

interface AddTaskBottomSheetProps {
  open: boolean;
  defaultDestination: TaskDestination;
  existingCategories: string[];
  onClose: () => void;
  onAddToToday: (task: NewTaskInput) => Promise<unknown>;
  onAddToBacklog: (task: NewTaskInput) => Promise<unknown>;
  zIndex?: number;
}

function DestinationToggle({
  value,
  onChange,
}: {
  value: TaskDestination;
  onChange: (destination: TaskDestination) => void;
}) {
  const options: { id: TaskDestination; label: string }[] = [
    { id: 'today', label: 'Add to Today' },
    { id: 'backlog', label: 'Add to Backlog' },
  ];

  return (
    <div className="mb-3 flex gap-2 px-4 pt-1">
      {options.map(({ id, label }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex-1 rounded-full px-3 py-2 text-[14px] font-normal transition-colors md:text-[13px] ${
              selected
                ? 'bg-[#3D3530] text-white'
                : 'border border-[#D8D2C4] bg-transparent text-[#938C7C]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function AddTaskBottomSheet({
  open,
  defaultDestination,
  existingCategories,
  onClose,
  onAddToToday,
  onAddToBacklog,
  zIndex = 60,
}: AddTaskBottomSheetProps) {
  const [destination, setDestination] = useState<TaskDestination>(defaultDestination);

  useEffect(() => {
    if (open) {
      setDestination(defaultDestination);
    }
  }, [open, defaultDestination]);

  const submitLabel = destination === 'today' ? 'Add to today' : 'Add to backlog';

  return (
    <BottomSheet open={open} onClose={onClose} zIndex={zIndex}>
      <DestinationToggle value={destination} onChange={setDestination} />
      <TaskForm
        key={open ? 'open' : 'closed'}
        existingCategories={existingCategories}
        submitLabel={submitLabel}
        variant="sheet"
        onSubmit={async (values) => {
          if (destination === 'today') {
            await onAddToToday(values);
          } else {
            await onAddToBacklog(values);
          }
          onClose();
        }}
        onCancel={onClose}
      />
    </BottomSheet>
  );
}
