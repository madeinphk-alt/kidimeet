// 0=Sunday, 1=Monday, ..., 6=Saturday (standard JS)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Class {
  id: string;
  name: string;   // e.g. "ב'1"
  school: string;
}

export interface Child {
  id: string;
  name: string;
  class_id: string;
  avatar_initials: string; // e.g. "יה"
  avatar_color: 'purple' | 'teal' | 'coral' | 'blue' | 'pink';
}

// One record per parent/guardian per child.
// A child can have 2 records (mom + dad) with different custody_days.
export interface Parent {
  id: string;
  child_id: string;
  name: string;
  phone: string;
  role: 'mom' | 'dad' | 'guardian';
  // Days this parent has the child (0-6). Empty = every day (single parent).
  custody_days: DayOfWeek[];
  address: string;
  building_details?: string; // "קומה 3, קוד 1234"
}

// Weekly recurring availability for a child
export interface ChildAvailability {
  id: string;
  child_id: string;
  day_of_week: DayOfWeek;
  morning: boolean;    // ~08:00-12:00
  noon: boolean;       // ~12:00-16:00
  afternoon: boolean;  // ~16:00+ (default slot)
  afternoon_hour: number; // start hour, default 16
  active: boolean;     // false = this day is a regular activity day
}

// One-off block: overrides a recurring available day
export interface AvailabilityBlock {
  id: string;
  child_id: string;
  blocked_date: string; // ISO "YYYY-MM-DD"
  reason?: string;
}

// One-off open: adds availability on a normally unavailable day (Fri/holiday etc.)
export interface AvailabilityOpen {
  id: string;
  child_id: string;
  open_date: string;
  morning: boolean;
  noon: boolean;
  afternoon: boolean;
  afternoon_hour: number;
}

export interface ChildNote {
  id: string;
  child_id: string;
  note_text: string;
  note_type: 'allergy' | 'dietary' | 'pet' | 'other';
  // allergy=red, dietary=green, pet=amber, other=purple
}

export type RequestStatus = 'pending' | 'accepted' | 'declined';

export interface MeetupRequest {
  id: string;
  requester_child_id: string;
  recipient_child_id: string;
  scheduled_date: string;
  host_child_id: string; // whose home
  activity?: string;
  status: RequestStatus;
  created_at: string;
}

// Confirmed past meetup — used for rotation & history
export interface Meetup {
  id: string;
  child1_id: string;
  child2_id: string;
  date: string;
  host_child_id: string;
  activity?: string;
  created_at: string;
}

// ─── Computed / display types ──────────────────────────────────────────────

export interface AvailableChild {
  child: Child;
  responsible_parent: Parent; // parent responsible on the requested day
  days_since_last_meetup: number | null; // null = never met
  last_meetup_host_id: string | null;
  suggested_host_id: string; // rotation suggestion
  activity?: string;          // optional activity offer for that day
  slots: {
    morning: boolean;
    noon: boolean;
    afternoon: boolean;
    afternoon_hour: number;
  };
}
