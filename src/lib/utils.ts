import { differenceInCalendarDays, format, addDays } from 'date-fns';
import type {
  Child, Parent, ChildAvailability, AvailabilityBlock,
  AvailabilityOpen, Meetup, AvailableChild, DayOfWeek
} from './types';
import {
  CHILDREN, PARENTS, AVAILABILITY, MEETUPS,
  AVAILABILITY_BLOCKS, MY_CHILD_ID, ACTIVITIES
} from './mock-data';

// Hebrew day names (0=Sun)
export const HEB_DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
export const HEB_DAYS_SHORT = ['א\'','ב\'','ג\'','ד\'','ה\'','ו\'','ש\''];
export const HEB_DAYS_SINGLE = ['א','ב','ג','ד','ה','ו','ש'];

export function formatHebrewDate(date: Date): string {
  const day = HEB_DAYS[date.getDay()];
  return `יום ${day} ${format(date, 'dd.MM')}`;
}

export function getDayOffset(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(target, today);
  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  return `יום ${HEB_DAYS[date.getDay()]}`;
}

// Find the responsible parent for a child on a given day
export function getResponsibleParent(childId: string, date: Date): Parent | undefined {
  const parents = PARENTS.filter(p => p.child_id === childId);
  if (parents.length === 0) return undefined;
  if (parents.length === 1) return parents[0];

  // Split custody: find which parent has this day
  const dow = date.getDay() as DayOfWeek;
  const responsible = parents.find(p => p.custody_days.includes(dow));
  return responsible ?? parents[0];
}

// Is a child available on a given date?
export function isChildAvailable(
  childId: string,
  date: Date,
  availabilities: ChildAvailability[] = AVAILABILITY,
  blocks: AvailabilityBlock[] = AVAILABILITY_BLOCKS,
  opens: AvailabilityOpen[] = []
): ChildAvailability | null {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dow = date.getDay() as DayOfWeek;

  // Check explicit blocks first
  if (blocks.some(b => b.child_id === childId && b.blocked_date === dateStr)) {
    return null;
  }

  // Check explicit opens (Fri/holidays)
  const open = opens.find(o => o.child_id === childId && o.open_date === dateStr);
  if (open) {
    return {
      id: `open-${open.id}`,
      child_id: childId,
      day_of_week: dow,
      morning: open.morning,
      noon: open.noon,
      afternoon: open.afternoon,
      afternoon_hour: open.afternoon_hour,
      active: true,
    };
  }

  // Check recurring availability
  return availabilities.find(a =>
    a.child_id === childId && a.day_of_week === dow && a.active
  ) ?? null;
}

// Get last meetup between two children
export function getLastMeetup(child1Id: string, child2Id: string): Meetup | undefined {
  return MEETUPS
    .filter(m =>
      (m.child1_id === child1Id && m.child2_id === child2Id) ||
      (m.child1_id === child2Id && m.child2_id === child1Id)
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Rotation: who should host next?
// If last meetup host was child A → suggest child B, and vice versa.
// If never met → suggest the child who has "more room" (undefined for now, default to recipient)
export function suggestNextHost(
  myChildId: string,
  otherChildId: string
): string {
  const last = getLastMeetup(myChildId, otherChildId);
  if (!last) return otherChildId; // first time: go to them
  return last.host_child_id === myChildId ? otherChildId : myChildId;
}

// Get all classmates who are available on a given date, sorted by priority
export function getAvailableClassmates(
  myChildId: string,
  date: Date
): AvailableChild[] {
  const myChild = CHILDREN.find(c => c.id === myChildId);
  if (!myChild) return [];

  const classmates = CHILDREN.filter(
    c => c.id !== myChildId && c.class_id === myChild.class_id
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const available: AvailableChild[] = [];

  for (const child of classmates) {
    const avail = isChildAvailable(child.id, date);
    if (!avail) continue;

    const responsibleParent = getResponsibleParent(child.id, date);
    if (!responsibleParent) continue;

    const lastMeetup = getLastMeetup(myChildId, child.id);
    const daysSince = lastMeetup
      ? differenceInCalendarDays(today, new Date(lastMeetup.date))
      : null;

    const suggestedHost = suggestNextHost(myChildId, child.id);

    // Activity offer for this child on this day
    const activityKey = `${child.id}-${date.getDay()}`;
    const activity = ACTIVITIES[activityKey];

    available.push({
      child,
      responsible_parent: responsibleParent,
      days_since_last_meetup: daysSince,
      last_meetup_host_id: lastMeetup?.host_child_id ?? null,
      suggested_host_id: suggestedHost,
      activity,
      slots: {
        morning: avail.morning,
        noon: avail.noon,
        afternoon: avail.afternoon,
        afternoon_hour: avail.afternoon_hour,
      },
    });
  }

  // Sort: never met first, then by days since last meetup (most days = highest priority)
  available.sort((a, b) => {
    if (a.days_since_last_meetup === null) return -1;
    if (b.days_since_last_meetup === null) return 1;
    return b.days_since_last_meetup - a.days_since_last_meetup;
  });

  return available;
}

// Get classmates who are NOT available on the given date (to show in the "not available" section)
export function getUnavailableClassmates(
  myChildId: string,
  date: Date
): Child[] {
  const myChild = CHILDREN.find(c => c.id === myChildId);
  if (!myChild) return [];

  return CHILDREN.filter(c => {
    if (c.id === myChildId) return false;
    if (c.class_id !== myChild.class_id) return false;
    return !isChildAvailable(c.id, date);
  });
}

// Format "days ago" in Hebrew
export function formatDaysAgo(days: number | null): { label: string; urgency: 'high' | 'medium' | 'low' | 'new' } {
  if (days === null) return { label: 'מפגש ראשון', urgency: 'new' };
  if (days >= 21) return { label: `${Math.floor(days / 7)} שבועות`, urgency: 'high' };
  if (days >= 14) return { label: 'שבועיים', urgency: 'high' };
  if (days >= 7)  return { label: 'שבוע', urgency: 'medium' };
  return { label: `${days} ימים`, urgency: 'low' };
}

// Get meetup history between two children
export function getMeetupHistory(child1Id: string, child2Id: string): Meetup[] {
  return MEETUPS
    .filter(m =>
      (m.child1_id === child1Id && m.child2_id === child2Id) ||
      (m.child1_id === child2Id && m.child2_id === child1Id)
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
}

export function formatMeetupDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${d.getDate()} ב${months[d.getMonth()]}`;
}

export const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  purple: { bg: 'bg-[#CECBF6]', text: 'text-[#3C3489]' },
  teal:   { bg: 'bg-[#9FE1CB]', text: 'text-[#085041]' },
  coral:  { bg: 'bg-[#F5C4B3]', text: 'text-[#712B13]' },
  blue:   { bg: 'bg-[#B5D4F4]', text: 'text-[#0C447C]' },
  pink:   { bg: 'bg-[#F4C0D1]', text: 'text-[#72243E]' },
};
