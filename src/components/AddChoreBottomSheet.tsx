import { BottomSheet } from './BottomSheet';
import { ChoreForm } from './ChoreForm';
import type { NewChoreInput } from '../types';

interface AddChoreBottomSheetProps {
  open: boolean;
  existingRooms: string[];
  onClose: () => void;
  onAddChore: (chore: NewChoreInput) => Promise<unknown>;
  zIndex?: number;
}

export function AddChoreBottomSheet({
  open,
  existingRooms,
  onClose,
  onAddChore,
  zIndex = 60,
}: AddChoreBottomSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} zIndex={zIndex} swipeToDismiss>
      <ChoreForm
        key={open ? 'open' : 'closed'}
        existingRooms={existingRooms}
        onSubmit={async (values) => {
          await onAddChore(values);
          onClose();
        }}
        onCancel={onClose}
      />
    </BottomSheet>
  );
}
