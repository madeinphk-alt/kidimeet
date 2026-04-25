// LocalStorage keys
const PROFILE_KEY = 'kidimeet_profile';
const MEETUPS_KEY = 'kidimeet_meetups';
const FRIENDS_KEY = 'kidimeet_friends';
const SPECIAL_DAYS_KEY = 'kidimeet_special_days';

export interface DaySlot {
  active: boolean;
  morning: boolean;
  morningFrom: number;   // minutes from midnight, e.g. 480 = 08:00
  morningTo: number;
  noon: boolean;
  noonFrom: number;
  noonTo: number;
  afternoon: boolean;
  afternoonFrom: number;
  afternoonTo: number;
}

export const DEFAULT_DAY_SLOT: DaySlot = {
  active: false,
  morning: false,   morningFrom: 600,   morningTo: 780,     // 10:00–13:00
  noon: false,      noonFrom: 780,      noonTo: 960,        // 13:00–16:00
  afternoon: true,  afternoonFrom: 960, afternoonTo: 1125,  // 16:00–18:45
};

/** Format minutes-from-midnight → "HH:MM" */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Migrate old DaySlot that only had `hour` field */
function migrateDaySlot(raw: DaySlot & { hour?: number }): DaySlot {
  if (raw.afternoonFrom !== undefined) return raw; // already new format
  const fromH = raw.hour ?? 16;
  return {
    active: raw.active,
    morning: raw.morning,     morningFrom: 600,        morningTo: 780,
    noon: raw.noon,           noonFrom: 780,           noonTo: 960,
    afternoon: raw.afternoon, afternoonFrom: fromH * 60, afternoonTo: Math.min(fromH * 60 + 105, 1320),
  };
}

export interface ChildProfile {
  id: string;
  name: string;
  school: string;
  className: string;
  avatarInitials: string;
  avatarColor: string;
  availability: Record<number, DaySlot>;
}

export interface UserProfile {
  children: ChildProfile[];
  activeChildId: string;
  parent: {
    name: string;
    phone: string;
    role: 'mom' | 'dad';
    address: string;
    buildingDetails: string;
  };
}

export function getActiveChild(profile: UserProfile): ChildProfile {
  return profile.children.find(c => c.id === profile.activeChildId) ?? profile.children[0];
}

export function switchActiveChild(profile: UserProfile, childId: string): UserProfile {
  return { ...profile, activeChildId: childId };
}

function migrateAvailability(avail: Record<string, any>): Record<number, DaySlot> {
  return Object.fromEntries(Object.entries(avail).map(([k, v]) => [k, migrateDaySlot(v as any)]));
}

function migrateProfileData(raw: any): UserProfile {
  if (Array.isArray(raw.children)) {
    // already new format — just migrate DaySlot format in each child's availability
    return {
      ...raw,
      children: raw.children.map((c: any) => ({
        ...c,
        availability: migrateAvailability(c.availability ?? {}),
      })),
    };
  }
  // old format: has raw.child (singular) and raw.availability (top-level)
  const child: ChildProfile = {
    id: raw.child?.id ?? `child-${Date.now()}`,
    name: raw.child?.name ?? '',
    school: raw.child?.school ?? '',
    className: raw.child?.className ?? '',
    avatarInitials: raw.child?.avatarInitials ?? '',
    avatarColor: raw.child?.avatarColor ?? 'purple',
    availability: migrateAvailability(raw.availability ?? {}),
  };
  return {
    children: [child],
    activeChildId: child.id,
    parent: raw.parent ?? { name: '', phone: '', role: 'mom', address: '', buildingDetails: '' },
  };
}

export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrateProfileData(parsed);
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

// ─── Friends ────────────────────────────────────────────────────────────────

export type FriendGroup = 'class' | 'chug' | 'keitana' | 'neighbor' | 'family' | 'other';

export const FRIEND_GROUP_LABELS: Record<FriendGroup, string> = {
  class:    'כיתה',
  chug:     'חוג',
  keitana:  'קייטנה',
  neighbor: 'שכנים',
  family:   'משפחה',
  other:    'אחר',
};

export interface FriendParent {
  name: string;
  phone: string;
  role: 'mom' | 'dad';
  /** day indices (0=Sun) this parent is responsible. Empty = all days */
  custodyDays: number[];
}

export interface Friend {
  id: string;
  name: string;
  avatarInitials: string;
  avatarColor: string;
  group: FriendGroup;
  groupLabel: string;  // e.g. "חוג גודו", "קייטנה קיץ 2025"
  childId: string;     // which of our children this friend belongs to
  school?: string;          // school name (for class group)
  className?: string;       // class/grade name (for class group)
  availabilityPending?: boolean; // true = WA was sent, waiting for parent reply
  address?: string;              // home address (used for navigation when meeting at their place)
  /** 1 parent = regular, 2 parents = split custody */
  parents: FriendParent[];
  notes: string;
  availability: Record<number, DaySlot>;
}

export function getFriends(): Friend[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    const friends: Friend[] = JSON.parse(raw);
    // migrate: add group/groupLabel if missing, migrate old DaySlot format, add childId if missing
    return friends.map(f => {
      const migrated = Object.fromEntries(
        Object.entries(f.availability).map(([k, v]) => [k, migrateDaySlot(v as DaySlot & { hour?: number })])
      );
      return {
        ...f,
        group: (f.group ?? 'class') as FriendGroup,
        groupLabel: f.groupLabel ?? 'כיתה',
        childId: f.childId ?? 'legacy',
        availability: migrated,
      };
    });
  } catch {
    return [];
  }
}

export function saveFriend(friend: Friend): void {
  const friends = getFriends();
  const idx = friends.findIndex(f => f.id === friend.id);
  if (idx >= 0) {
    friends[idx] = friend;
  } else {
    friends.push(friend);
  }
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

export function deleteFriend(id: string): void {
  const friends = getFriends().filter(f => f.id !== id);
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

// ─── Special Days (one-time overrides) ──────────────────────────────────────

/**
 * A one-time override for a specific date.
 * type='block'  → user is NOT available that day (reason is private)
 * type='open'   → user IS available (e.g. school holiday they opened up)
 * privateNote is never shared with other parents.
 */
export interface SpecialDay {
  id: string;
  date: string;          // YYYY-MM-DD
  type: 'block' | 'open';
  privateNote: string;   // stored locally, never shown to others
  // time slots — only meaningful for type='open'
  morning: boolean;    morningFrom: number;    morningTo: number;
  noon: boolean;       noonFrom: number;       noonTo: number;
  afternoon: boolean;  afternoonFrom: number;  afternoonTo: number;
}

export function getSpecialDays(): SpecialDay[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SPECIAL_DAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSpecialDay(day: SpecialDay): void {
  const days = getSpecialDays();
  const idx = days.findIndex(d => d.id === day.id);
  if (idx >= 0) days[idx] = day; else days.push(day);
  localStorage.setItem(SPECIAL_DAYS_KEY, JSON.stringify(days));
}

export function deleteSpecialDay(id: string): void {
  const days = getSpecialDays().filter(d => d.id !== id);
  localStorage.setItem(SPECIAL_DAYS_KEY, JSON.stringify(days));
}

// ─── Planned Meetups ─────────────────────────────────────────────────────────

export type MeetupType = 'birthday' | 'park' | 'playdate' | 'activity' | 'other';

export const MEETUP_TYPE_DEFS: { value: MeetupType; label: string; icon: string }[] = [
  { value: 'birthday',  label: 'יום הולדת', icon: '🎂' },
  { value: 'park',      label: 'פארק',       icon: '🌳' },
  { value: 'playdate',  label: 'ביקור',      icon: '🎮' },
  { value: 'activity',  label: 'פעילות',     icon: '🎭' },
  { value: 'other',     label: 'אחר',        icon: '📋' },
];

export interface PlannedMeetup {
  id: string;
  title: string;
  type: MeetupType;
  date: string;        // YYYY-MM-DD
  timeFrom: number;    // minutes from midnight
  timeTo: number;
  location: string;
  notes: string;
  friendIds: string[]; // Friend.id list
  status: 'planning' | 'confirmed' | 'done';
  host?: 'us' | 'them'; // who hosted the playdate
}

const MEETUPS_PLANNED_KEY = 'kidimeet_planned_meetups';

export function getPlannedMeetups(): PlannedMeetup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEETUPS_PLANNED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePlannedMeetup(m: PlannedMeetup): void {
  const list = getPlannedMeetups();
  const idx = list.findIndex(x => x.id === m.id);
  if (idx >= 0) list[idx] = m; else list.push(m);
  localStorage.setItem(MEETUPS_PLANNED_KEY, JSON.stringify(list));
}

export function deletePlannedMeetup(id: string): void {
  const list = getPlannedMeetups().filter(m => m.id !== id);
  localStorage.setItem(MEETUPS_PLANNED_KEY, JSON.stringify(list));
}

// ─── School Events ───────────────────────────────────────────────────────────

/**
 * A class/school event — visible to all connected parents.
 * In solo mode: local only. In connected mode: synced to the whole class.
 */
export type EventType = 'trip' | 'ceremony' | 'special-day' | 'reminder' | 'other';

export interface SchoolEvent {
  id: string;
  date: string;        // YYYY-MM-DD
  title: string;       // "טיול שנתי"
  bring: string;       // "נעלי ספורט, אוכל לדרך"
  note: string;        // extra info
  type: EventType;
  addedBy: string;     // parent name — shown to others in connected mode
}

const EVENTS_KEY = 'kidimeet_events';

export function getEvents(): SchoolEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveEvent(event: SchoolEvent): void {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event; else events.push(event);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function deleteEvent(id: string): void {
  const events = getEvents().filter(e => e.id !== id);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Generate initials from a Hebrew name: "יהלי ברק" → "יב"
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('');
}

const COLORS = ['purple', 'teal', 'coral', 'blue', 'pink'];
export function pickColor(name: string): string {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
}
