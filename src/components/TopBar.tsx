import { LogOut } from 'lucide-react';
import { Search } from 'lucide-react';

interface TopBarProps {
  onSignOut?: () => void;
}

export function TopBar({ onSignOut }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-4 sm:px-6">
      <h1 className="text-base font-semibold text-text-primary">Focus List</h1>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            type="search"
            placeholder="Search tasks…"
            disabled
            className="w-40 rounded-full border border-border bg-surface py-2 pl-9 pr-4 text-base text-text-primary outline-none placeholder:text-base placeholder:text-text-faint md:w-56 md:text-sm md:placeholder:text-sm"
          />
        </div>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="flex items-center gap-1 text-base text-text-faint transition-colors hover:text-text-muted md:hidden"
          >
            <LogOut size={16} />
            <span className="text-[15px]">Out</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
