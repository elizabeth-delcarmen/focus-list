import { useState } from 'react';
import { Button } from './Button';
import { PRIORITY_COLORS, TIME_CHIPS } from '../types';
import type { Priority, TaskFormValues } from '../types';

interface TaskFormProps {
  initial?: Partial<TaskFormValues>;
  existingCategories?: string[];
  submitLabel: string;
  variant?: 'inline' | 'sheet';
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

export function TaskForm({
  initial,
  existingCategories = [],
  submitLabel,
  variant = 'inline',
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
      data-task-interactive={variant === 'inline' ? '' : undefined}
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
        placeholder="What needs your focus?"
        autoFocus
        className="w-full rounded-full border border-border bg-bg px-[14px] py-[14px] text-base text-text-primary outline-none placeholder:text-base placeholder:text-text-faint focus:border-accent md:text-[15px] md:placeholder:text-[15px]"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {TIME_CHIPS.map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => selectChip(mins)}
            className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
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
          className="w-20 rounded-full border border-border bg-bg px-3 py-1 text-base text-text-primary outline-none placeholder:text-base placeholder:text-text-faint focus:border-accent md:text-xs md:placeholder:text-xs"
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
            <p className="mb-2 text-[13px] font-medium text-text-faint md:text-[11px]">Recent categories</p>
            <div className="flex flex-wrap gap-2">
              {existingCategories.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`rounded-full px-3 py-1 text-[15px] font-medium transition-colors md:text-xs ${
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
          className={`w-full rounded-full border border-border bg-bg px-4 py-2 text-base text-text-primary outline-none placeholder:text-base placeholder:text-text-faint focus:border-accent md:text-sm md:placeholder:text-sm ${
            existingCategories.length > 0 ? 'mt-2' : ''
          }`}
        />
      </div>

      <div className={`mt-4 flex gap-2 ${variant === 'sheet' ? '' : 'flex-wrap'}`}>
        <Button
          variant={variant === 'sheet' ? 'secondary' : 'tertiary'}
          onClick={onCancel}
          className={variant === 'sheet' ? 'flex-1' : undefined}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || submitting}
          className={variant === 'sheet' ? 'flex-1' : undefined}
        >
          {submitLabel}
        </Button>
        {onDelete && variant === 'inline' && (
          <button
            type="button"
            onClick={() => void onDelete()}
            className="ml-auto rounded-full border border-urgent-border px-4 py-2 text-[15px] font-medium text-urgent transition-colors hover:bg-urgent-bg md:text-sm"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
