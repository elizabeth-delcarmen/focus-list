import { BottomSheet } from './BottomSheet';
import { ChoreForm } from './ChoreForm';
import type { Chore, NewChoreInput } from '../types';

interface AddChoreBottomSheetProps {
  open: boolean;
  existingRooms: string[];
  onClose: () => void;
  onAddChore: (chore: NewChoreInput) => Promise<Chore | null>;
  onChoreAdded?: (chore: Chore) => void;
  saveError?: string | null;
  zIndex?: number;
}

export function AddChoreBottomSheet({
  open,
  existingRooms,
  onClose,
  onAddChore,
  onChoreAdded,
  saveError,
  zIndex = 60,
}: AddChoreBottomSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} zIndex={zIndex} swipeToDismiss>
      <ChoreForm
        key={open ? 'open' : 'closed'}
        existingRooms={existingRooms}
        saveError={saveError}
        onSubmit={async (values) => {
          const created = await onAddChore(values);
          if (!created) return;
          onChoreAdded?.(created);
          onClose();
        }}
        onCancel={onClose}
      />
    </BottomSheet>
  );
}
