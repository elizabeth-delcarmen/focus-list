import { BottomSheet } from './BottomSheet';
import { CHORE_RECURRENCE_OPTIONS, type ChoreRecurrenceChoice } from '../types';

interface ChoreRepeatPromptSheetProps {
  open: boolean;
  choreTitle: string;
  onSelect: (choice: ChoreRecurrenceChoice) => void;
  onClose: () => void;
}

export function ChoreRepeatPromptSheet({
  open,
  choreTitle,
  onSelect,
  onClose,
}: ChoreRepeatPromptSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} zIndex={70}>
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <h2 className="text-[17px] font-semibold text-[#3D3530]">Should this repeat?</h2>
        <p className="mt-1 text-[14px] font-normal leading-snug text-[#938C7C]">
          You finished &ldquo;{choreTitle}&rdquo;. Set a schedule for next time, or leave it as a
          one-off.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {CHORE_RECURRENCE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="w-full rounded-full border border-[#D8D2C4] bg-white px-4 py-3 text-left text-[15px] font-medium text-[#3D3530] transition-colors hover:border-[#3D3530]/40 hover:bg-[#3D353008]"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelect('one_off')}
            className="w-full rounded-full border border-[#D8D2C4] bg-transparent px-4 py-3 text-left text-[15px] font-medium text-[#938C7C] transition-colors hover:border-[#3D3530]/40 hover:text-[#3D3530]"
          >
            Just this once
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
