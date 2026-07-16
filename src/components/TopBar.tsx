import { LogOut } from 'lucide-react';

interface TopBarProps {
  onSignOut?: () => void;
}

export function TopBar({ onSignOut }: TopBarProps) {
  return (
    <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-4 sm:px-6 md:flex">
      <h1 className="font-display text-xl text-text-primary">Focus List</h1>
      {onSignOut ? (
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="flex items-center gap-1 text-base text-text-faint transition-colors hover:text-text-muted"
        >
          <LogOut size={16} />
          <span className="text-[15px]">Sign out</span>
        </button>
      ) : null}
    </header>
  );
}
