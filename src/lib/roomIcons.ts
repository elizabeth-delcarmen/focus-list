import type { LucideIcon } from 'lucide-react';
import {
  Bath,
  BedDouble,
  CookingPot,
  DoorOpen,
  Home,
  LampDesk,
  Package,
  ShowerHead,
  Sofa,
  Toilet,
  Trees,
  Warehouse,
} from 'lucide-react';

/** Rooms that should always appear in the Rooms list (even with 0 tasks). */
export const DEFAULT_ROOMS: string[] = [
  'Attic Bedroom',
  'Baño de abajo',
  'Baño de abuelas',
  'Baño de nosotros',
  'Back Garden',
  'Cuarto abuelas',
  'Front Garden',
  "Liam's room",
  'Side Entrance',
];

/** Canonical renames for known room labels. */
const ROOM_RENAMES: Record<string, string> = {
  attic: 'Attic Bedroom',
  liam: "Liam's room",
};

/** Exact names to drop from the saved-room list (after rename). */
const ROOM_REMOVED = new Set(['liam']);

/**
 * Normalize a room name for display and storage.
 * - "Attic" → "Attic Bedroom"
 * - "Liam" → "Liam's room"
 */
export function normalizeRoomName(roomName: string): string {
  const trimmed = roomName.trim();
  if (!trimmed) return trimmed;
  const renamed = ROOM_RENAMES[trimmed.toLowerCase()];
  return renamed ?? trimmed;
}

export function shouldKeepRoomName(roomName: string): boolean {
  return !ROOM_REMOVED.has(roomName.trim().toLowerCase());
}

/**
 * Lucide icons used for rooms (from lucide-react).
 * Order matters: specific rooms before the generic "… room" bedroom fallback.
 */
const ROOM_ICON_RULES: { match: RegExp; icon: LucideIcon }[] = [
  // Bathrooms / toilets (ES baño)
  {
    match: /baño|bano|toilet|bathroom|bath\b|wc|loo|lavatory|restroom/i,
    icon: Toilet,
  },
  { match: /shower|ducha/i, icon: ShowerHead },
  { match: /bathtub|bañera|banera/i, icon: Bath },
  // Kitchen / dining
  {
    match: /kitchen|cocina|dining|comedor|cook/i,
    icon: CookingPot,
  },
  // Living
  { match: /living|lounge|family|sala|sal[oó]n/i, icon: Sofa },
  // Office
  { match: /office|study|desk|oficina|estudio/i, icon: LampDesk },
  // Outdoor
  { match: /garden|yard|patio|outdoor|jard[ií]n/i, icon: Trees },
  // Laundry / utility
  { match: /laundry|utility|lavander[ií]a/i, icon: Warehouse },
  // Storage (before generic "room")
  { match: /storage|closet|garage|trastero|s[oó]tano|basement/i, icon: Package },
  // Entry / doors
  { match: /hall|entr(y|ance)|foyer|pasillo|entrada|door/i, icon: DoorOpen },
  // Bedrooms — attic, cuarto, "Liam's room", etc.
  {
    match:
      /bedroom|bed\b|cuarto|dormitorio|habitaci[oó]n|nursery|attic|\broom\b/i,
    icon: BedDouble,
  },
];

export function iconForRoom(roomName: string): LucideIcon {
  const name = normalizeRoomName(roomName);
  for (const rule of ROOM_ICON_RULES) {
    if (rule.match.test(name)) return rule.icon;
  }
  return Home;
}
