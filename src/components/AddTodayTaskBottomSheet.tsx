import { AddTaskBottomSheet } from './AddTaskBottomSheet';
import type { NewTaskInput } from '../types';

interface AddTodayTaskBottomSheetProps {
  open: boolean;
  existingCategories: string[];
  onClose: () => void;
  onAdd: (task: NewTaskInput) => Promise<unknown>;
  onAddToBacklog: (task: NewTaskInput) => Promise<unknown>;
  zIndex?: number;
}

export function AddTodayTaskBottomSheet({
  open,
  existingCategories,
  onClose,
  onAdd,
  onAddToBacklog,
  zIndex = 80,
}: AddTodayTaskBottomSheetProps) {
  return (
    <AddTaskBottomSheet
      open={open}
      defaultDestination="today"
      existingCategories={existingCategories}
      onClose={onClose}
      onAddToToday={onAdd}
      onAddToBacklog={onAddToBacklog}
      zIndex={zIndex}
    />
  );
}
