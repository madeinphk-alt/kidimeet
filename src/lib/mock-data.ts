import type {
  Class, Child, Parent, ChildAvailability,
  ChildNote, Meetup, AvailabilityBlock
} from './types';

export const MY_CHILD_ID = 'child-yahali';

export const CLASSES: Class[] = [
  { id: 'class-bet1', name: "ב'1", school: 'בית ספר רמות' },
];

export const CHILDREN: Child[] = [
  { id: 'child-yahali', name: 'יהלי ברק',    class_id: 'class-bet1', avatar_initials: 'יב', avatar_color: 'purple' },
  { id: 'child-omer',   name: 'עומר כהן',    class_id: 'class-bet1', avatar_initials: 'עכ', avatar_color: 'purple' },
  { id: 'child-shira',  name: 'שירה לוי',    class_id: 'class-bet1', avatar_initials: 'של', avatar_color: 'teal'   },
  { id: 'child-idan',   name: 'עידן גולן',   class_id: 'class-bet1', avatar_initials: 'עג', avatar_color: 'blue'   },
  { id: 'child-noa',    name: 'נועה אבן',    class_id: 'class-bet1', avatar_initials: 'נא', avatar_color: 'coral'  },
  { id: 'child-tomer',  name: 'תומר נחום',   class_id: 'class-bet1', avatar_initials: 'תנ', avatar_color: 'purple' },
  { id: 'child-maya',   name: 'מיה שפירא',   class_id: 'class-bet1', avatar_initials: 'מש', avatar_color: 'pink'   },
  { id: 'child-yossi',  name: 'יוסי דוד',    class_id: 'class-bet1', avatar_initials: 'יד', avatar_color: 'teal'   },
];

// Parents — some children have two parents with split custody
export const PARENTS: Parent[] = [
  // יהלי — single home
  {
    id: 'parent-yahali-mom', child_id: 'child-yahali',
    name: 'דנה ברק', phone: '052-1234567', role: 'mom',
    custody_days: [], // empty = all days
    address: 'רחוב הורד 12, רמות', building_details: 'קומה 2, קוד כניסה: 1234',
  },
  // עומר — divorced parents
  {
    id: 'parent-omer-mom', child_id: 'child-omer',
    name: 'רחל כהן', phone: '054-9876543', role: 'mom',
    custody_days: [0, 1, 2], // Sun/Mon/Tue = אמא
    address: 'רחוב השושנה 7, רמות', building_details: 'קומה 1',
  },
  {
    id: 'parent-omer-dad', child_id: 'child-omer',
    name: 'דוד כהן', phone: '050-1111222', role: 'dad',
    custody_days: [3, 4, 5, 6], // Wed-Sat = אבא
    address: 'שדרות הרצל 33, ירושלים', building_details: 'קומה 5, קוד: 5678',
  },
  // שירה
  {
    id: 'parent-shira-mom', child_id: 'child-shira',
    name: 'מרים לוי', phone: '053-5555666', role: 'mom',
    custody_days: [],
    address: 'רחוב הגפן 4, רמות', building_details: 'קומה 3',
  },
  // עידן
  {
    id: 'parent-idan-mom', child_id: 'child-idan',
    name: 'יעל גולן', phone: '058-7778889', role: 'mom',
    custody_days: [],
    address: 'רחוב הזית 21, רמות', building_details: 'כניסה ב, קומה 4',
  },
  // נועה
  {
    id: 'parent-noa-mom', child_id: 'child-noa',
    name: 'תמר אבן', phone: '052-3334445', role: 'mom',
    custody_days: [],
    address: 'שכונת רמות ד, בלוק 14', building_details: 'דירה 8',
  },
  // תומר
  {
    id: 'parent-tomer-dad', child_id: 'child-tomer',
    name: 'ניר נחום', phone: '054-6667778', role: 'dad',
    custody_days: [],
    address: 'רחוב הדקל 8, רמות',
  },
  // מיה
  {
    id: 'parent-maya-mom', child_id: 'child-maya',
    name: 'אורית שפירא', phone: '050-9990001', role: 'mom',
    custody_days: [],
    address: 'שדרות גולדה 17, רמות',
  },
  // יוסי
  {
    id: 'parent-yossi-dad', child_id: 'child-yossi',
    name: 'משה דוד', phone: '053-2223334', role: 'dad',
    custody_days: [],
    address: 'רחוב הברוש 5, רמות', building_details: 'קומה 1',
  },
];

// Weekly recurring availability (day_of_week: 0=Sun, 1=Mon, ..., 6=Sat)
// Default slot: afternoon 16:00
export const AVAILABILITY: ChildAvailability[] = [
  // יהלי: Mon + Wed afternoons
  { id: 'av-yahali-1', child_id: 'child-yahali', day_of_week: 1, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },
  { id: 'av-yahali-3', child_id: 'child-yahali', day_of_week: 3, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },

  // עומר: Mon + Tue afternoons (Mon=16, Tue=17 because of activity until 17)
  { id: 'av-omer-1', child_id: 'child-omer', day_of_week: 1, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },
  { id: 'av-omer-2', child_id: 'child-omer', day_of_week: 2, morning: false, noon: false, afternoon: true, afternoon_hour: 17, active: true },

  // שירה: Mon + Thu
  { id: 'av-shira-1', child_id: 'child-shira', day_of_week: 1, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },
  { id: 'av-shira-4', child_id: 'child-shira', day_of_week: 4, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },

  // עידן: Mon (with pool activity offer)
  { id: 'av-idan-1', child_id: 'child-idan', day_of_week: 1, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },

  // נועה: Wed + Thu
  { id: 'av-noa-3', child_id: 'child-noa', day_of_week: 3, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },
  { id: 'av-noa-4', child_id: 'child-noa', day_of_week: 4, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },

  // תומר: Wed (but has soccer on Thu)
  { id: 'av-tomer-3', child_id: 'child-tomer', day_of_week: 3, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },

  // מיה: Wed + Thu
  { id: 'av-maya-3', child_id: 'child-maya', day_of_week: 3, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },
  { id: 'av-maya-4', child_id: 'child-maya', day_of_week: 4, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },

  // יוסי: Thu
  { id: 'av-yossi-4', child_id: 'child-yossi', day_of_week: 4, morning: false, noon: false, afternoon: true, afternoon_hour: 16, active: true },
];

// Optional activity offers per child per day
export const ACTIVITIES: Record<string, string> = {
  'child-idan-1': 'בריכה', // idan on Monday offers pool
};

export const CHILD_NOTES: ChildNote[] = [
  { id: 'note-1', child_id: 'child-omer', note_text: 'טבעוני',         note_type: 'dietary' },
  { id: 'note-2', child_id: 'child-omer', note_text: 'אלרגי לבוטנים',  note_type: 'allergy' },
  { id: 'note-3', child_id: 'child-omer', note_text: 'לא אוהב כלבים',  note_type: 'pet'     },
  { id: 'note-4', child_id: 'child-shira', note_text: 'צמחונית',        note_type: 'dietary' },
  { id: 'note-5', child_id: 'child-noa',   note_text: 'אלרגית לחלב',   note_type: 'allergy' },
];

// Past meetups — used to calculate rotation & "days since last meetup"
// Dates are relative to today (2026-04-24)
export const MEETUPS: Meetup[] = [
  { id: 'm1', child1_id: 'child-yahali', child2_id: 'child-omer',  date: '2026-04-02', host_child_id: 'child-yahali', created_at: '2026-04-02T15:00:00Z' },
  { id: 'm2', child1_id: 'child-yahali', child2_id: 'child-omer',  date: '2026-03-19', host_child_id: 'child-omer',   created_at: '2026-03-19T15:00:00Z' },
  { id: 'm3', child1_id: 'child-yahali', child2_id: 'child-omer',  date: '2026-03-05', host_child_id: 'child-yahali', created_at: '2026-03-05T15:00:00Z' },
  { id: 'm4', child1_id: 'child-yahali', child2_id: 'child-shira', date: '2026-04-10', host_child_id: 'child-shira',  created_at: '2026-04-10T15:00:00Z' },
  { id: 'm5', child1_id: 'child-yahali', child2_id: 'child-idan',  date: '2026-04-17', host_child_id: 'child-idan',   created_at: '2026-04-17T15:00:00Z' },
];

export const AVAILABILITY_BLOCKS: AvailabilityBlock[] = [
  { id: 'block-1', child_id: 'child-yahali', blocked_date: '2026-04-28', reason: 'אירוע משפחתי' },
];
