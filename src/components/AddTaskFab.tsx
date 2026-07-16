interface AddTaskFabProps {
  onClick: () => void;
  hidden?: boolean;
  /** Show on desktop too (default: mobile only) */
  showOnDesktop?: boolean;
}

export function AddTaskFab({ onClick, hidden = false, showOnDesktop = false }: AddTaskFabProps) {
  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="New task"
      className={`fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[28px] leading-none text-white shadow-[0_6px_8px_rgba(0,0,0,0.08)] ${showOnDesktop ? '' : 'md:hidden'}`}
      style={{ bottom: 'calc(3.5rem + 24px + env(safe-area-inset-bottom))', right: '24px' }}
    >
      +
    </button>
  );
}
