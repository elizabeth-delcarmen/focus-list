import { formatTimerDisplay } from '../types';

interface FocusTimerDialProps {
  remainingSeconds: number;
  totalSeconds: number;
  /** When true, show elapsed time instead of remaining (Figma style). */
  showElapsed?: boolean;
}

const SIZE = 220;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ACCENT = '#5c6bf0';
const TRACK = '#e5e7eb';

export function FocusTimerDial({
  remainingSeconds,
  totalSeconds,
  showElapsed = true,
}: FocusTimerDialProps) {
  const elapsed = Math.max(0, totalSeconds - Math.max(0, remainingSeconds));
  const progress =
    totalSeconds > 0 ? Math.max(0, Math.min(1, elapsed / totalSeconds)) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const displaySeconds = showElapsed
    ? elapsed
    : Math.max(0, remainingSeconds);
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={TRACK}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ACCENT}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">
        <span
          className="text-[40px] font-extrabold leading-none text-text-primary tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatTimerDisplay(displaySeconds)}
        </span>
        <span className="text-[14px] font-medium text-text-muted">
          of {totalMinutes} min
        </span>
      </div>
    </div>
  );
}
