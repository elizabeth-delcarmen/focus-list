import { useState } from 'react';
import { Clock } from 'lucide-react';

interface GapFinderProps {
  onApply: (minutes: number | null) => void;
  activeMinutes: number | null;
  suggestedMinutes?: number | null;
}

const PRESETS = [5, 10, 15, 30];

export function GapFinder({
  onApply,
  activeMinutes,
  suggestedMinutes,
}: GapFinderProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  const handleSelect = (minutes: number) => {
    onApply(minutes);
    setOpen(false);
    setCustom('');
  };

  const handleCustom = () => {
    const parsed = parseInt(custom, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      handleSelect(parsed);
    }
  };

  const handleClear = () => {
    onApply(null);
    setOpen(false);
    setCustom('');
  };

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-wrap items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition-colors hover:border-accent/50"
        >
          <Clock size={14} />
          I have a few minutes — what fits?
          {activeMinutes !== null && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs">
              ≤{activeMinutes}m
            </span>
          )}
        </button>
      ) : (
        <div className="rounded-[12px] border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary">How many minutes do you have?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedMinutes != null && suggestedMinutes > 0 && (
              <button
                type="button"
                onClick={() => handleSelect(suggestedMinutes)}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white"
              >
                My window ({suggestedMinutes}m)
              </button>
            )}
            {PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleSelect(mins)}
                className="rounded-full bg-surface-raised px-4 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
              >
                {mins}m
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min={1}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom"
              className="flex-1 rounded-full border border-border bg-bg px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleCustom}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Go
            </button>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="mt-2 text-xs text-text-faint hover:text-text-muted"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
