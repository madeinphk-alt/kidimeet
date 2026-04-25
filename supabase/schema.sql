-- KidiMeet — Supabase Schema
-- הרץ את הקובץ הזה ב-Supabase SQL Editor

-- כיתות
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,        -- "ב'1"
  school text not null,
  created_at timestamptz default now()
);

-- ילדים
create table children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references classes(id) on delete cascade,
  avatar_initials text not null,
  avatar_color text not null default 'purple',
  created_at timestamptz default now()
);

-- הורים (כל ילד יכול להיות בעל מספר הורים עם ימי משמורת שונים)
create table parents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  user_id uuid references auth.users(id),  -- null עד שההורה נרשם
  name text not null,
  phone text not null,
  role text not null check (role in ('mom', 'dad', 'guardian')),
  custody_days int[] default '{}',  -- 0=Sun..6=Sat, ריק = כל הימים
  address text,
  building_details text,
  created_at timestamptz default now()
);

-- זמינות שבועית קבועה
create table child_availability (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  morning boolean not null default false,
  noon boolean not null default false,
  afternoon boolean not null default true,
  afternoon_hour int not null default 16,
  active boolean not null default true,
  unique (child_id, day_of_week)
);

-- חסימות חד-פעמיות (ימי אירועים, חגים, וכו')
create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  blocked_date date not null,
  reason text,
  created_at timestamptz default now()
);

-- פתיחות חד-פעמיות (ימי שישי, חגים, חופשות)
create table availability_opens (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  open_date date not null,
  morning boolean not null default false,
  noon boolean not null default false,
  afternoon boolean not null default true,
  afternoon_hour int not null default 16,
  created_at timestamptz default now()
);

-- הערות על ילדים (אלרגיות, תזונה, וכו')
create table child_notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id) on delete cascade,
  note_text text not null,
  note_type text not null check (note_type in ('allergy', 'dietary', 'pet', 'other')),
  created_by uuid references parents(id),
  created_at timestamptz default now()
);

-- בקשות מפגש
create table meetup_requests (
  id uuid primary key default gen_random_uuid(),
  requester_child_id uuid references children(id),
  recipient_child_id uuid references children(id),
  scheduled_date date not null,
  host_child_id uuid references children(id),
  activity text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now()
);

-- מפגשים שהתקיימו (היסטוריה לחישוב רוטציה)
create table meetups (
  id uuid primary key default gen_random_uuid(),
  child1_id uuid references children(id),
  child2_id uuid references children(id),
  date date not null,
  host_child_id uuid references children(id),
  activity text,
  notes text,
  created_at timestamptz default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table classes           enable row level security;
alter table children          enable row level security;
alter table parents           enable row level security;
alter table child_availability enable row level security;
alter table availability_blocks enable row level security;
alter table availability_opens  enable row level security;
alter table child_notes       enable row level security;
alter table meetup_requests   enable row level security;
alter table meetups           enable row level security;

-- מדיניות בסיסית: הורה רואה רק מידע של הכיתה שלו
-- (להרחיב בהמשך לפי צרכים)
create policy "parents see own class"
  on children for select
  using (
    class_id in (
      select c.id from classes c
      join children ch on ch.class_id = c.id
      join parents p on p.child_id = ch.id
      where p.user_id = auth.uid()
    )
  );
