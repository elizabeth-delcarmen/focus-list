interface AddTaskFabProps {
  onClick: () => void;
  hidden?: boolean;
}

export function AddTaskFab({ onClick, hidden = false }: AddTaskFabProps) {
  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="New task"
      className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[28px] leading-none text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] md:hidden"
      style={{ bottom: 'calc(3.5rem + 24px + env(safe-area-inset-bottom))', right: '24px' }}
    >
      +
    </button>
  );
}
