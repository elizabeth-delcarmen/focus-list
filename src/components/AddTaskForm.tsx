import { TaskForm } from './TaskForm';
import type { NewTaskInput } from '../types';

interface AddTaskFormProps {
  existingCategories: string[];
  onAdd: (task: NewTaskInput) => Promise<void>;
  onCancel: () => void;
}

export function AddTaskForm({ existingCategories, onAdd, onCancel }: AddTaskFormProps) {
  return (
    <TaskForm
      existingCategories={existingCategories}
      submitLabel="Add to queue"
      onSubmit={onAdd}
      onCancel={onCancel}
    />
  );
}
