function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-raised ${className}`}
      aria-hidden
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="flex items-stretch">
      <div className="hidden w-4 shrink-0 md:block" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-[14px] rounded-[12px] border border-border bg-surface px-4 py-[14px]">
        <div className="flex w-10 shrink-0 flex-col items-center gap-1">
          <SkeletonBlock className="h-6 w-7 rounded" />
          <SkeletonBlock className="h-2 w-5 rounded" />
        </div>
        <SkeletonBlock className="h-9 w-px shrink-0 rounded-none" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <SkeletonBlock className="h-4 w-[72%] max-w-[220px]" />
          <SkeletonBlock className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonBlock className="h-7 w-7 shrink-0 rounded-full" />
        <SkeletonBlock className="h-7 w-[52px] shrink-0 rounded-full" />
      </div>
    </div>
  );
}

export function TaskQueueSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, index) => (
        <TaskCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ActiveTaskPanelSkeleton() {
  return (
    <div
      className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-[14px] border border-border bg-surface p-5 sm:min-h-[360px] sm:p-8"
      aria-busy
      aria-label="Loading focus panel"
    >
      <SkeletonBlock className="h-6 w-24 rounded-full" />
      <SkeletonBlock className="mt-6 h-6 w-56 max-w-[80%]" />
      <SkeletonBlock className="mt-8 h-[72px] w-44 rounded-lg md:h-[96px] md:w-52" />
      <SkeletonBlock className="mt-4 h-3 w-36" />
      <SkeletonBlock className="mt-6 h-1.5 w-full max-w-[280px] rounded-full" />
      <SkeletonBlock className="mt-8 h-10 w-36 rounded-full" />
    </div>
  );
}

export function CapacityCardSkeleton() {
  return (
    <div
      className="rounded-[12px] border border-border bg-surface p-3"
      aria-busy
      aria-label="Loading capacity"
    >
      <div className="flex items-start justify-between gap-2">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-4 w-16 rounded-full" />
      </div>
      <SkeletonBlock className="mt-2 h-5 w-36" />
      <SkeletonBlock className="mt-2 h-1.5 w-full rounded-full" />
    </div>
  );
}

export function TodayViewSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row">
      <div className="flex w-full flex-col lg:w-[55%]">
        <ActiveTaskPanelSkeleton />
      </div>
      <div className="w-full lg:w-[45%]">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-7 w-16 rounded-full" />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-7 w-14 rounded-full" />
          ))}
        </div>
        <SkeletonBlock className="mt-6 h-3 w-16" />
        <div className="mt-3">
          <TaskQueueSkeleton />
        </div>
        <SkeletonBlock className="mt-4 h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
