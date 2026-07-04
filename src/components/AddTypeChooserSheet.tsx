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
      className="flex w-full items-center gap-3 rounded-[14px] border border-[#D8D2C4] bg-white px-4 py-3 text-left transition-colors hover:bg-[#3D353008]"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${iconBg}`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[#3D3530]">{title}</p>
        <p className="mt-0.5 text-[13px] font-normal text-[#938C7C]">{description}</p>
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
        <h2 className="mb-4 text-center text-[17px] font-semibold text-[#3D3530]">
          What are you adding?
        </h2>
        <div className="flex flex-col gap-2">
          <OptionRow
            icon={CheckSquare}
            iconBg="bg-[#4F739620] text-[#4F7396]"
            title="Task"
            description="One-off, goes to Backlog or Today"
            onClick={onSelectTask}
          />
          <OptionRow
            icon={RefreshCw}
            iconBg="bg-[#938C7C20] text-[#938C7C]"
            title="House chore"
            description="Repeats on a schedule, tracked in Chores"
            onClick={onSelectChore}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
