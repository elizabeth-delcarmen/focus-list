import { BottomSheet } from './BottomSheet';
import { TaskForm } from './TaskForm';
import type { NewTaskInput } from '../types';

interface AddTaskBottomSheetProps {
  open: boolean;
  existingCategories: string[];
  onClose: () => void;
  onAdd: (task: NewTaskInput) => Promise<unknown>;
}

export function AddTaskBottomSheet({
  open,
  existingCategories,
  onClose,
  onAdd,
}: AddTaskBottomSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <TaskForm
        key={open ? 'open' : 'closed'}
        existingCategories={existingCategories}
        submitLabel="Add to backlog"
        variant="sheet"
        onSubmit={async (values) => {
          await onAdd(values);
          onClose();
        }}
        onCancel={onClose}
      />
    </BottomSheet>
  );
}
