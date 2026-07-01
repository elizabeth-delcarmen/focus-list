import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from './Button';

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
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          className="h-auto flex-wrap px-4 py-2"
        >
          <Clock size={14} />
          I have a few minutes — what fits?
          {activeMinutes !== null && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs">
              ≤{activeMinutes}m
            </span>
          )}
        </Button>
      ) : (
        <div className="rounded-[12px] border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary">How many minutes do you have?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedMinutes != null && suggestedMinutes > 0 && (
              <Button size="sm" onClick={() => handleSelect(suggestedMinutes)}>
                My window ({suggestedMinutes}m)
              </Button>
            )}
            {PRESETS.map((mins) => (
              <Button key={mins} variant="secondary" size="sm" onClick={() => handleSelect(mins)}>
                {mins}m
              </Button>
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
            <Button onClick={handleCustom}>Go</Button>
          </div>
          <Button variant="tertiary" size="sm" onClick={handleClear} className="mt-2 px-2">
            Clear filter
          </Button>
        </div>
      )}
    </div>
  );
}
