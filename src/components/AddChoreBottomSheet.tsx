import { BottomSheet } from './BottomSheet';
import { ChoreForm } from './ChoreForm';
import {
  getChoreInterval,
  isChoreSomeday,
  nextDueAtToDateString,
  normalizeChoreTitle,
} from '../lib/choreSchedule';
import type { Chore, EditChoreInput, NewChoreInput } from '../types';

interface AddChoreBottomSheetProps {
  open: boolean;
  existingRooms: string[];
  defaultRoom?: string | null;
  /** When set, sheet opens in edit mode for this chore. */
  chore?: Chore | null;
  onClose: () => void;
  onAddChore?: (chore: NewChoreInput) => Promise<Chore | null>;
  onUpdateChore?: (id: string, values: NewChoreInput | EditChoreInput) => Promise<void>;
  onDeleteChore?: (id: string) => Promise<void>;
  onChoreAdded?: (chore: Chore) => void;
  saveError?: string | null;
  onRememberRoom?: (room: string) => void;
  zIndex?: number;
}

export function AddChoreBottomSheet({
  open,
  existingRooms,
  defaultRoom = null,
  chore = null,
  onClose,
  onAddChore,
  onUpdateChore,
  onDeleteChore,
  onChoreAdded,
  saveError,
  onRememberRoom,
  zIndex = 60,
}: AddChoreBottomSheetProps) {
  const isEdit = chore != null;

  return (
    <BottomSheet open={open} onClose={onClose} zIndex={zIndex} swipeToDismiss>
      <ChoreForm
        key={open ? (chore?.id ?? 'new') : 'closed'}
        mode={isEdit ? 'edit' : 'add'}
        existingRooms={existingRooms}
        defaultRoom={defaultRoom}
        initial={
          chore
            ? {
                title: normalizeChoreTitle(chore.title),
                room: chore.room ?? undefined,
                time_estimate_minutes: chore.time_estimate_minutes,
                is_someday: isChoreSomeday(chore),
                repeats: Boolean(getChoreInterval(chore)),
                interval_value: chore.interval_value ?? undefined,
                interval_unit: chore.interval_unit ?? undefined,
                day_of_week: chore.day_of_week ?? undefined,
                next_due_on: nextDueAtToDateString(chore.next_due_at) ?? undefined,
              }
            : undefined
        }
        submitLabel="Save Task"
        saveError={isEdit ? null : saveError}
        onRememberRoom={onRememberRoom}
        onSubmit={async (values) => {
          if (isEdit && chore) {
            await onUpdateChore?.(chore.id, values);
            onClose();
            return;
          }
          if (!onAddChore) return;
          const created = await onAddChore(values);
          if (!created) return;
          onChoreAdded?.(created);
          onClose();
        }}
        onCancel={onClose}
        onDelete={
          isEdit && onDeleteChore && chore
            ? async () => {
                if (!window.confirm(`Delete "${normalizeChoreTitle(chore.title)}"?`)) {
                  return;
                }
                await onDeleteChore(chore.id);
                onClose();
              }
            : undefined
        }
      />
    </BottomSheet>
  );
}
