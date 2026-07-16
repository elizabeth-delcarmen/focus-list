import { iconForRoom } from '../lib/roomIcons';

export interface RoomSummary {
  name: string;
  taskCount: number;
}

interface RoomsOverviewProps {
  rooms: RoomSummary[];
  title?: string;
  loading?: boolean;
  onSelectRoom: (roomName: string) => void;
}

export function RoomsOverview({
  rooms,
  title = 'Focus List',
  loading = false,
  onSelectRoom,
}: RoomsOverviewProps) {
  if (loading) {
    return (
      <div className="px-6 pb-28 pt-6 md:pb-6">
        <h1 className="font-display text-[28px] leading-tight text-text-primary">{title}</h1>
        <div className="mt-8 grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[143px] animate-pulse rounded-[20px] bg-surface shadow-[0_4px_6px_rgba(0,0,0,0.02)]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-28 pt-6 md:pb-6">
      <h1 className="font-display text-[28px] leading-tight text-text-primary">{title}</h1>

      {rooms.length === 0 ? (
        <p className="mt-10 text-center text-base text-text-muted">
          No rooms yet. Add a chore with a room to see it here.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4">
          {rooms.map((room) => {
            const Icon = iconForRoom(room.name);
            const countLabel =
              room.taskCount === 1 ? '1 task' : `${room.taskCount} tasks`;

            return (
              <button
                key={room.name}
                type="button"
                onClick={() => onSelectRoom(room.name)}
                className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 text-left shadow-[0_4px_6px_rgba(0,0,0,0.02)] transition-transform active:scale-[0.98]"
              >
                <div className="flex size-10 items-center justify-center rounded-[12px] bg-surface">
                  <Icon size={24} strokeWidth={1.75} className="text-accent" aria-hidden />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[18px] font-bold leading-tight text-text-primary">
                    {room.name}
                  </p>
                  <p className="text-[14px] leading-normal text-text-muted">{countLabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
