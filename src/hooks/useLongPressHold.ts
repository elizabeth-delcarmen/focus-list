import { useCallback, useRef, type TouchEvent as ReactTouchEvent } from 'react';

const HOLD_VISUAL_MS = 300;
const MOVE_CANCEL_PX = 16;

interface UseLongPressHoldOptions {
  enabled: boolean;
  onHoldStart?: () => void;
}

export function useLongPressHold({ enabled, onHoldStart }: UseLongPressHoldOptions) {
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const holdingRef = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetHold = useCallback(() => {
    clearHoldTimer();
    originRef.current = null;
    holdingRef.current = false;
  }, [clearHoldTimer]);

  const touchHandlers = enabled
    ? {
        onTouchStart: (event: ReactTouchEvent) => {
          if (event.touches.length !== 1) return;

          clearHoldTimer();
          holdingRef.current = false;
          originRef.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };

          timerRef.current = window.setTimeout(() => {
            holdingRef.current = true;
            onHoldStart?.();
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(12);
            }
          }, HOLD_VISUAL_MS);
        },
        onTouchMove: (event: ReactTouchEvent) => {
          if (!originRef.current || event.touches.length !== 1) return;

          const dx = event.touches[0].clientX - originRef.current.x;
          const dy = event.touches[0].clientY - originRef.current.y;

          if (Math.hypot(dx, dy) > MOVE_CANCEL_PX && !holdingRef.current) {
            clearHoldTimer();
            originRef.current = null;
          }
        },
        onTouchEnd: () => {
          resetHold();
        },
        onTouchCancel: () => {
          resetHold();
        },
      }
    : {};

  return { touchHandlers, isHoldingRef: holdingRef, resetHold };
}
