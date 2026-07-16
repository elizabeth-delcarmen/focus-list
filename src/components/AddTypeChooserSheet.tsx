import { CheckSquare, RefreshCw } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface AddTypeChooserSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectTask: () => void;
  onSelectChore: () => void;
  zIndex?: number;
}

interface OptionRowProps {
  icon: typeof CheckSquare;
  iconBg: string;
  title: string;
  description: string;
  onClick: () => void;
}

function OptionRow({ icon: Icon, iconBg, title, description, onClick }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-accent-soft"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${iconBg}`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-[13px] font-normal text-text-muted">{description}</p>
      </div>
    </button>
  );
}

export function AddTypeChooserSheet({
  open,
  onClose,
  onSelectTask,
  onSelectChore,
  zIndex = 60,
}: AddTypeChooserSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} zIndex={zIndex} swipeToDismiss>
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <h2 className="mb-4 text-center text-[17px] font-semibold text-text-primary">
          What are you adding?
        </h2>
        <div className="flex flex-col gap-2">
          <OptionRow
            icon={CheckSquare}
            iconBg="bg-medium-bg text-medium"
            title="Task"
            description="One-off, goes to Backlog or Today"
            onClick={onSelectTask}
          />
          <OptionRow
            icon={RefreshCw}
            iconBg="bg-accent-soft text-accent"
            title="House chore"
            description="Repeats on a schedule, tracked in Rooms"
            onClick={onSelectChore}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
