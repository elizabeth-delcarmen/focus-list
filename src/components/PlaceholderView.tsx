import { Calendar } from 'lucide-react';
import type { View } from '../types';

interface PlaceholderViewProps {
  view: 'week';
}

const CONFIG = {
  week: {
    icon: Calendar,
    title: 'This week',
    message: 'This week — coming soon',
  },
} as const;

export function PlaceholderView({ view }: PlaceholderViewProps) {
  const { icon: Icon, message } = CONFIG[view];

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg p-8">
      <Icon size={40} className="mb-4 text-text-faint" strokeWidth={1.5} />
      <p className="text-base font-medium text-text-muted">{message}</p>
    </div>
  );
}

export function isPlaceholderView(view: View): view is 'week' {
  return view === 'week';
}
