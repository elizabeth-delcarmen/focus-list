import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Align sheet with main content on desktop (after 200px sidebar) */
  alignWithContent?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  children,
  alignWithContent = true,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 250);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-[rgba(0,0,0,0.2)] transition-opacity duration-[250ms] ease-out ${
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
          className={`pointer-events-auto mx-auto w-full transform rounded-t-[20px] bg-surface transition-transform duration-[250ms] ease-out md:max-w-3xl ${
            visible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex justify-center pt-3">
            <div className="h-1 w-10 rounded-full bg-text-faint/40" aria-hidden />
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
