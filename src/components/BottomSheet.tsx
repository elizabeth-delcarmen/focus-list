import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { lockBodyScroll, unlockBodyScroll } from '../lib/bodyScrollLock';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Align sheet with main content on desktop (after 200px sidebar) */
  alignWithContent?: boolean;
  zIndex?: number;
  /** Enable swipe-down on the drag handle to dismiss */
  swipeToDismiss?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  children,
  alignWithContent = true,
  zIndex = 60,
  swipeToDismiss = false,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setDragOffset(0);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    setDragOffset(0);
    const timer = window.setTimeout(() => setMounted(false), 250);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!swipeToDismiss) return;
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!swipeToDismiss || touchStartY.current === null) return;
    const delta = event.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (!swipeToDismiss) return;
    if (dragOffset > 80) {
      onClose();
    } else {
      setDragOffset(0);
    }
    touchStartY.current = null;
  };

  if (!mounted) return null;

  const sheetTransform = visible
    ? `translateY(${dragOffset}px)`
    : 'translateY(100%)';

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex }}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-[rgba(61,53,48,0.25)] transition-opacity duration-[250ms] ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 ${
          alignWithContent ? 'md:left-[200px]' : ''
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto mx-auto w-full transform rounded-t-[20px] bg-[#FAF8F3] transition-transform duration-[250ms] ease-out md:max-w-3xl"
          style={{ transform: sheetTransform }}
        >
          <div
            className="flex justify-center pt-3"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="h-1 w-10 rounded-full bg-[#938C7C]/40" aria-hidden />
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
