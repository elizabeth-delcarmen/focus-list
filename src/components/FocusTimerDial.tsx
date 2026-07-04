import { PRIORITY_HEX, formatTimerDisplay, type Priority } from '../types';

interface FocusTimerDialProps {
  priority: Priority;
  remainingSeconds: number;
  totalSeconds: number;
}

const SIZE = 260;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function FocusTimerDial({ priority, remainingSeconds, totalSeconds }: FocusTimerDialProps) {
  const colors = PRIORITY_HEX[priority];
  const fraction =
    totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const displaySeconds = Math.max(0, remainingSeconds);

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
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
          stroke={colors.track}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={colors.solid}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span
        className="absolute text-[42px] font-medium leading-none text-[#3D3530]"
        aria-live="polite"
        aria-atomic="true"
      >
        {formatTimerDisplay(displaySeconds)}
      </span>
    </div>
  );
}
