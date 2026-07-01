import { useState } from 'react';
import { Button } from './Button';
import { PRIORITY_COLORS, TIME_CHIPS } from '../types';
import type { Priority, TaskFormValues } from '../types';

interface TaskFormProps {
  initial?: Partial<TaskFormValues>;
  existingCategories?: string[];
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

export function TaskForm({
  initial,
  existingCategories = [],
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [estimate, setEstimate] = useState(initial?.estimate_minutes ?? 25);
  const [customEstimate, setCustomEstimate] = useState('');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        estimate_minutes: estimate,
        priority,
        category: category.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectChip = (minutes: number) => {
    setEstimate(minutes);
    setCustomEstimate('');
  };

  const handleCustomEstimate = (value: string) => {
    setCustomEstimate(value);
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setEstimate(parsed);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-dashed border-border bg-surface p-4"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs your focus?"
        autoFocus
        className="w-full rounded-full border border-border bg-bg px-[14px] py-[14px] text-[15px] text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {TIME_CHIPS.map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => selectChip(mins)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              estimate === mins && !customEstimate
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
          className="w-20 rounded-full border border-border bg-bg px-3 py-1 text-xs text-text-primary outline-none placeholder:text-text-faint focus:border-accent"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            title={p}
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
              priority === p ? 'border-text-primary scale-110' : 'border-transparent'
            }`}
          >
            <span className={`h-3 w-3 rounded-full ${PRIORITY_COLORS[p].dot}`} />
          </button>
        ))}
      </div>

      <div className="mt-3">
        {existingCategories.length > 0 && (
          <>
            <p className="mb-2 text-[11px] font-medium text-text-faint">Recent categories</p>
            <div className="flex flex-wrap gap-2">
              {existingCategories.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    category === name
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface-raised text-text-muted hover:text-text-primary'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={existingCategories.length > 0 ? 'Or type a new category' : 'Category (optional)'}
          className={`w-full rounded-full border border-border bg-bg px-4 py-2 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-accent ${
            existingCategories.length > 0 ? 'mt-2' : ''
          }`}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || submitting}>
          {submitLabel}
        </Button>
        {onDelete && (
          <button
            type="button"
            onClick={() => void onDelete()}
            className="ml-auto rounded-full border border-urgent-border px-4 py-2 text-sm font-medium text-urgent transition-colors hover:bg-urgent-bg"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
