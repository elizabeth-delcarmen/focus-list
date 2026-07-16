import { useDroppable } from '@dnd-kit/core';
import {
  CalendarDays,
  ClipboardList,
  Home,
  Plus,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { NAV_DROP_TARGET_TODAY } from '../types';
import type { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onAdd: () => void;
  enableTodayDropTarget?: boolean;
}

type NavId = 'rooms' | 'today' | 'schedule' | 'settings';

const SIDE_NAV: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: 'rooms', label: 'Rooms', icon: Home },
  { id: 'today', label: 'Tasks', icon: ClipboardList },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function isNavActive(currentView: View, id: NavId): boolean {
  if (id === 'rooms') return currentView === 'rooms';
  if (id === 'today') return currentView === 'today' || currentView === 'backlog';
  if (id === 'schedule') return currentView === 'schedule';
  if (id === 'settings') return currentView === 'settings';
  return false;
}

function NavButtonBase({
  label,
  icon: Icon,
  isActive,
  compact,
  isOver,
  buttonRef,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  compact: boolean;
  isOver?: boolean;
  buttonRef?: (element: HTMLButtonElement | null) => void;
  onClick: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full font-medium transition-colors ${
        compact
          ? `flex-1 flex-col gap-1 px-1 py-1 text-[10px] ${
              isActive ? 'font-bold text-accent' : 'font-medium text-text-muted'
            }`
          : `w-full px-3 py-2 text-sm ${
              isActive
                ? 'bg-accent-soft text-accent'
                : 'text-text-muted hover:bg-surface-raised hover:text-text-primary'
            }`
      } ${isOver ? 'ring-2 ring-accent' : ''}`}
    >
      <Icon size={compact ? 24 : 16} strokeWidth={isActive ? 2.25 : 1.75} />
      <span className={compact ? 'leading-tight' : undefined}>{label}</span>
    </button>
  );
}

function TodayDropNavButton({
  label,
  icon,
  isActive,
  compact,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: NAV_DROP_TARGET_TODAY });

  return (
    <NavButtonBase
      label={label}
      icon={icon}
      isActive={isActive}
      compact={compact}
      isOver={isOver}
      buttonRef={setNodeRef}
      onClick={onClick}
    />
  );
}

function DesktopNav({
  currentView,
  onNavigate,
  enableTodayDropTarget,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  enableTodayDropTarget: boolean;
}) {
  return (
    <nav className="space-y-1">
      {SIDE_NAV.map(({ id, label, icon }) => {
        const isActive = isNavActive(currentView, id);
        const onClick = () => onNavigate(id);

        if (enableTodayDropTarget && id === 'today') {
          return (
            <TodayDropNavButton
              key={id}
              label={label}
              icon={icon}
              isActive={isActive}
              compact={false}
              onClick={onClick}
            />
          );
        }

        return (
          <NavButtonBase
            key={id}
            label={label}
            icon={icon}
            isActive={isActive}
            compact={false}
            onClick={onClick}
          />
        );
      })}
      <NavButtonBase
        label="Backlog"
        icon={ClipboardList}
        isActive={currentView === 'backlog'}
        compact={false}
        onClick={() => onNavigate('backlog')}
      />
    </nav>
  );
}

export function Sidebar({
  currentView,
  onNavigate,
  onAdd,
  enableTodayDropTarget = false,
}: SidebarProps) {
  return (
    <>
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border bg-bg px-3 py-4 md:flex">
        <p className="mb-4 px-3 font-display text-lg text-text-primary">Focus List</p>
        <DesktopNav
          currentView={currentView}
          onNavigate={onNavigate}
          enableTodayDropTarget={enableTodayDropTarget}
        />
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[88px] items-center bg-surface px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] md:hidden">
        <NavButtonBase
          label="Rooms"
          icon={Home}
          isActive={isNavActive(currentView, 'rooms')}
          compact
          onClick={() => onNavigate('rooms')}
        />
        {enableTodayDropTarget ? (
          <TodayDropNavButton
            label="Tasks"
            icon={ClipboardList}
            isActive={isNavActive(currentView, 'today')}
            compact
            onClick={() => onNavigate('today')}
          />
        ) : (
          <NavButtonBase
            label="Tasks"
            icon={ClipboardList}
            isActive={isNavActive(currentView, 'today')}
            compact
            onClick={() => onNavigate('today')}
          />
        )}
        <div className="flex flex-1 items-center justify-center pt-1.5">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add"
            className="flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_8px_rgba(0,0,0,0.08)] transition-transform active:scale-95"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>
        <NavButtonBase
          label="Schedule"
          icon={CalendarDays}
          isActive={isNavActive(currentView, 'schedule')}
          compact
          onClick={() => onNavigate('schedule')}
        />
        <NavButtonBase
          label="Settings"
          icon={Settings}
          isActive={isNavActive(currentView, 'settings')}
          compact
          onClick={() => onNavigate('settings')}
        />
      </nav>
    </>
  );
}
