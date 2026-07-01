export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type Status = 'todo' | 'in_progress' | 'done';
export type View = 'today' | 'week' | 'backlog';
export type DurationFilter = 'all' | 'quick' | 'medium' | 'deep';
export type GroupMode = 'list' | 'category' | 'duration';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  estimate_minutes: number;
  actual_minutes: number;
  priority: Priority;
  category?: string | null;
  status: Status;
  order: number;
  created_at: string;
  completed_at?: string | null;
  scheduled_date: string;
}

export interface NewTaskInput {
  title: string;
  estimate_minutes: number;
  priority: Priority;
  category?: string;
}

export interface TaskFormValues {
  title: string;
  estimate_minutes: number;
  priority: Priority;
  category?: string;
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PRIORITY_COLORS: Record<
  Priority,
  { bg: string; border: string; line: string; dot: string; text: string }
> = {
  urgent: {
    bg: 'bg-urgent-bg',
    border: 'border-urgent-border',
    line: 'bg-urgent-line',
    dot: 'bg-urgent',
    text: 'text-urgent',
  },
  high: {
    bg: 'bg-high-bg',
    border: 'border-high-border',
    line: 'bg-high-line',
    dot: 'bg-high',
    text: 'text-high',
  },
  medium: {
    bg: 'bg-medium-bg',
    border: 'border-medium-border',
    line: 'bg-medium-line',
    dot: 'bg-medium',
    text: 'text-medium',
  },
  low: {
    bg: 'bg-low-bg',
    border: 'border-low-border',
    line: 'bg-low-line',
    dot: 'bg-low',
    text: 'text-low',
  },
};

export const TIME_CHIPS = [5, 15, 30, 45, 60] as const;
export const DAILY_CAPACITY_MINUTES = 300;

export interface TaskGroup {
  label: string;
  tasks: Task[];
}

export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${minutes}m`;
}

export function formatTimerDisplay(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return totalSeconds < 0 ? `+${formatted}` : formatted;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function matchesDurationFilter(
  estimateMinutes: number,
  filter: DurationFilter,
): boolean {
  switch (filter) {
    case 'quick':
      return estimateMinutes < 15;
    case 'medium':
      return estimateMinutes >= 15 && estimateMinutes <= 45;
    case 'deep':
      return estimateMinutes > 45;
    default:
      return true;
  }
}

export function getDurationBucket(estimateMinutes: number): string {
  if (estimateMinutes < 15) return 'Quick (<15m)';
  if (estimateMinutes <= 45) return 'Medium (15–45m)';
  return 'Deep (45m+)';
}

export function groupTasks(tasks: Task[], mode: GroupMode): TaskGroup[] {
  if (mode === 'list') {
    return [{ label: '', tasks }];
  }

  const buckets = new Map<string, Task[]>();

  for (const task of tasks) {
    const key =
      mode === 'category'
        ? task.category?.trim() || 'Uncategorized'
        : getDurationBucket(task.estimate_minutes);

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(task);
  }

  const labels = [...buckets.keys()].sort((a, b) => {
    if (mode === 'category') {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    }
    const order = ['Quick (<15m)', 'Medium (15–45m)', 'Deep (45m+)'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return labels.map((label) => {
    const bucketTasks = buckets.get(label)!;
    if (mode === 'duration') {
      bucketTasks.sort(
        (a, b) => a.estimate_minutes - b.estimate_minutes || a.order - b.order,
      );
    }
    return { label, tasks: bucketTasks };
  });
}

export function sumEstimateMinutes(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + t.estimate_minutes, 0);
}

export function getUniqueCategories(tasks: Task[]): string[] {
  const categories = new Set<string>();
  for (const task of tasks) {
    const name = task.category?.trim();
    if (name) categories.add(name);
  }
  return [...categories].sort((a, b) => a.localeCompare(b));
}

export function tasksFittingMinutes(tasks: Task[], maxMinutes: number): Task[] {
  const sorted = [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
  const result: Task[] = [];
  let used = 0;
  for (const task of sorted) {
    if (used + task.estimate_minutes <= maxMinutes) {
      result.push(task);
      used += task.estimate_minutes;
    }
  }
  return result;
}

export function minutesUntilTime(hours: number, minutes: number): number {
  const now = new Date();
  const end = new Date();
  end.setHours(hours, minutes, 0, 0);
  if (end <= now) return 0;
  return Math.floor((end.getTime() - now.getTime()) / 60000);
}

export function formatTimeLabel(hours: number, minutes: number): string {
  const h = hours % 12 || 12;
  const ampm = hours < 12 ? 'am' : 'pm';
  const m = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
  return `${h}${m}${ampm}`;
}
