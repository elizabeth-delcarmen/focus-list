import { useEffect } from 'react';
import { Button } from './Button';

interface UndoToastProps {
  taskTitle: string;
  detail?: string;
  onUndo: () => void;
  onDismiss: () => void;
}

const UNDO_MS = 5000;

export function UndoToast({
  taskTitle,
  detail = 'completed',
  onUndo,
  onDismiss,
}: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, UNDO_MS);
    return () => clearTimeout(timer);
  }, [onDismiss, taskTitle]);

  return (
    <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 shadow-lg lg:bottom-6">
      <p className="max-w-[220px] truncate text-base text-text-primary sm:max-w-xs md:text-sm">
        <span className="font-medium">{taskTitle}</span>
        <span className="text-text-muted"> {detail}</span>
      </p>
      <Button size="sm" onClick={onUndo}>
        Undo
      </Button>
    </div>
  );
}
