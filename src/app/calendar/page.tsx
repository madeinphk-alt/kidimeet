'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { format, addMonths, subMonths, startOfMonth, getDaysInMonth } from 'date-fns';
import {
  getProfile, getSpecialDays, saveSpecialDay, deleteSpecialDay,
  getEvents, saveEvent, deleteEvent,
  getActiveChild,
  DEFAULT_DAY_SLOT, formatTime,
} from '@/lib/storage';
import { getHoliday } from '@/lib/jewish-holidays';
import type { UserProfile, SpecialDay, SchoolEvent, EventType } from '@/lib/storage';
import DayAvailPicker from '@/components/DayAvailPicker';
import BottomNav from '@/components/BottomNav';
import ChildSwitcher from '@/components/ChildSwitcher';

// ─── Constants ────────────────────────────────────────────────────────────────
const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HEB_DAYS_LONG = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const CAL_HEADER = ['א','ב','ג','ד','ה','ו','ש'];

const EVENT_TYPES: { value: EventType; label: string; icon: string }[] = [
  { value: 'trip',        label: 'טיול',        icon: '🚌' },
  { value: 'ceremony',    label: 'טקס / אירוע', icon: '🎭' },
  { value: 'special-day', label: 'יום מיוחד',   icon: '🏛️' },
  { value: 'reminder',    label: 'תזכורת',      icon: '📌' },
  { value: 'other',       label: 'אחר',          icon: '📋' },
];

function eventIcon(type: EventType) {
  return EVENT_TYPES.find(t => t.value === type)?.icon ?? '📋';
}

// ─── Day status ───────────────────────────────────────────────────────────────
type DayStatus = 'regular-open' | 'regular-off' | 'special-open' | 'blocked' | 'past';

function getDayStatus(date: Date, profile: UserProfile | null, specialDays: SpecialDay[]): DayStatus {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  const dateStr = format(date, 'yyyy-MM-dd');
  const special = specialDays.find(s => s.date === dateStr);
  if (special) return special.type === 'block' ? 'blocked' : 'special-open';
  if (d < today) return 'past';
  const activeChild = profile ? getActiveChild(profile) : null;
  const slot = activeChild?.availability?.[date.getDay()];
  return slot?.active ? 'regular-open' : 'regular-off';
}

// ─── ICS Generation ───────────────────────────────────────────────────────────

function generateICS(profile: UserProfile, specialDays: SpecialDay[], events: SchoolEvent[]): string {
  const child = getActiveChild(profile);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KidiMeet//IL',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:KidiMeet - ' + child.name,
    'X-WR-TIMEZONE:Asia/Jerusalem',
  ];

  const HEB_DAYS_LONG = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Weekly recurring events
  Object.entries(child.availability).forEach(([dayStr, slot]) => {
    if (!slot.active) return;
    const dow = parseInt(dayStr);
    const slotList = [
      slot.afternoon && { label: 'אחה"צ', from: slot.afternoonFrom, to: slot.afternoonTo },
      slot.noon      && { label: 'צהרים',  from: slot.noonFrom,      to: slot.noonTo },
      slot.morning   && { label: 'בוקר',   from: slot.morningFrom,   to: slot.morningTo },
    ].filter(Boolean) as { label: string; from: number; to: number }[];

    slotList.forEach((s, idx) => {
      // find next occurrence of this day of week
      const next = new Date(today);
      while (next.getDay() !== dow) next.setDate(next.getDate() + 1);
      const dateStr2 = `${next.getFullYear()}${pad(next.getMonth()+1)}${pad(next.getDate())}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:weekly-${dow}-${idx}-${child.id}@kidimeet`);
      lines.push(`DTSTART;TZID=Asia/Jerusalem:${dateStr2}T${pad(Math.floor(s.from/60))}${pad(s.from%60)}00`);
      lines.push(`DTEND;TZID=Asia/Jerusalem:${dateStr2}T${pad(Math.floor(s.to/60))}${pad(s.to%60)}00`);
      lines.push(`SUMMARY:${child.name} פנוי - ${s.label}`);
      lines.push(`DESCRIPTION:זמינות קבועה של ${child.name} - KidiMeet\\nwww.matovli.co.il`);
      lines.push('RRULE:FREQ=WEEKLY;COUNT=26');
      lines.push('COLOR:purple');
      lines.push('END:VEVENT');
    });
  });

  // Special open days
  specialDays.filter(sd => sd.type === 'open').forEach(sd => {
    const slotList = [
      sd.afternoon && { label: 'אחה"צ', from: sd.afternoonFrom, to: sd.afternoonTo },
      sd.noon      && { label: 'צהרים',  from: sd.noonFrom,      to: sd.noonTo },
      sd.morning   && { label: 'בוקר',   from: sd.morningFrom,   to: sd.morningTo },
    ].filter(Boolean) as { label: string; from: number; to: number }[];
    const dateClean = sd.date.replace(/-/g, '');
    slotList.forEach((s, idx) => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:open-${sd.date}-${idx}@kidimeet`);
      lines.push(`DTSTART;TZID=Asia/Jerusalem:${dateClean}T${pad(Math.floor(s.from/60))}${pad(s.from%60)}00`);
      lines.push(`DTEND;TZID=Asia/Jerusalem:${dateClean}T${pad(Math.floor(s.to/60))}${pad(s.to%60)}00`);
      lines.push(`SUMMARY:✅ ${child.name} פנוי (מיוחד) - ${s.label}`);
      lines.push('END:VEVENT');
    });
  });

  // School events (all-day)
  events.forEach(ev => {
    const dateClean = ev.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:event-${ev.id}@kidimeet`);
    lines.push(`DTSTART;VALUE=DATE:${dateClean}`);
    lines.push(`DTEND;VALUE=DATE:${dateClean}`);
    lines.push(`SUMMARY:${ev.title}`);
    if (ev.bring) lines.push(`DESCRIPTION:להביא: ${ev.bring}${ev.note ? '\\n' + ev.note : ''}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Calendar grid ────────────────────────────────────────────────────────────
function buildGrid(year: number, month: number): (Date | null)[] {
  const first = startOfMonth(new Date(year, month));
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= getDaysInMonth(new Date(year, month)); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Default open slots ───────────────────────────────────────────────────────
const DEFAULT_OPEN = { active: true, morning: false, morningFrom: 480, morningTo: 720, noon: false, noonFrom: 720, noonTo: 840, afternoon: true, afternoonFrom: 840, afternoonTo: 1080 };

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const router = useRouter();
  const today = new Date(); today.setHours(0,0,0,0);

  const [viewDate,    setViewDate]    = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [events,      setEvents]      = useState<SchoolEvent[]>([]);
  const [selected,    setSelected]    = useState<Date | null>(null);

  // ── Availability sheet state ────────────────────────────────────────────
  const [availMode, setAvailMode] = useState<'view' | 'block' | 'open'>('view');
  const [openSlots, setOpenSlots] = useState({ ...DEFAULT_OPEN });
  const [privateNote, setPrivateNote] = useState('');

  // ── Event form state ────────────────────────────────────────────────────
  const [showEventForm,   setShowEventForm]   = useState(false);
  const [editingEventId,  setEditingEventId]  = useState<string | null>(null);
  const [evTitle,  setEvTitle]  = useState('');
  const [evBring,  setEvBring]  = useState('');
  const [evNote,   setEvNote]   = useState('');
  const [evType,   setEvType]   = useState<EventType>('trip');

  useEffect(() => {
    setProfile(getProfile());
    setSpecialDays(getSpecialDays());
    setEvents(getEvents());
  }, []);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid  = buildGrid(year, month);

  // ── Open sheet ──────────────────────────────────────────────────────────
  const openSheet = (date: Date) => {
    setSelected(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = specialDays.find(s => s.date === dateStr);
    if (existing) {
      setPrivateNote(existing.privateNote);
      if (existing.type === 'open') {
        setOpenSlots({ active: true, morning: existing.morning, morningFrom: existing.morningFrom, morningTo: existing.morningTo, noon: existing.noon, noonFrom: existing.noonFrom, noonTo: existing.noonTo, afternoon: existing.afternoon, afternoonFrom: existing.afternoonFrom, afternoonTo: existing.afternoonTo });
        setAvailMode('open');
      } else { setAvailMode('block'); }
    } else {
      setPrivateNote(''); setOpenSlots({ ...DEFAULT_OPEN }); setAvailMode('view');
    }
    setShowEventForm(false); setEditingEventId(null);
  };

  const closeSheet = () => { setSelected(null); setShowEventForm(false); setEditingEventId(null); };

  // ── Save availability ───────────────────────────────────────────────────
  const saveAvail = () => {
    if (!selected || availMode === 'view') return;
    const dateStr = format(selected, 'yyyy-MM-dd');
    const id = `sd-${dateStr}`;
    if (availMode === 'block') {
      saveSpecialDay({ id, date: dateStr, type: 'block', privateNote, morning: false, morningFrom: 480, morningTo: 720, noon: false, noonFrom: 720, noonTo: 840, afternoon: false, afternoonFrom: 840, afternoonTo: 1080 });
    } else {
      saveSpecialDay({ id, date: dateStr, type: 'open', privateNote, morning: openSlots.morning, morningFrom: openSlots.morningFrom, morningTo: openSlots.morningTo, noon: openSlots.noon, noonFrom: openSlots.noonFrom, noonTo: openSlots.noonTo, afternoon: openSlots.afternoon, afternoonFrom: openSlots.afternoonFrom, afternoonTo: openSlots.afternoonTo });
    }
    setSpecialDays(getSpecialDays()); setAvailMode('view');
  };

  const removeAvail = () => {
    if (!selected) return;
    deleteSpecialDay(`sd-${format(selected, 'yyyy-MM-dd')}`);
    setSpecialDays(getSpecialDays()); setAvailMode('view');
  };

  // ── Event form helpers ──────────────────────────────────────────────────
  const startNewEvent = () => {
    setEditingEventId(null); setEvTitle(''); setEvBring(''); setEvNote(''); setEvType('trip');
    setShowEventForm(true);
  };

  const startEditEvent = (ev: SchoolEvent) => {
    setEditingEventId(ev.id); setEvTitle(ev.title); setEvBring(ev.bring); setEvNote(ev.note); setEvType(ev.type);
    setShowEventForm(true);
  };

  const saveEvForm = () => {
    if (!selected || !evTitle.trim()) return;
    const dateStr = format(selected, 'yyyy-MM-dd');
    const parentName = profile?.parent?.name ?? '';
    saveEvent({ id: editingEventId ?? `ev-${dateStr}-${Date.now()}`, date: dateStr, title: evTitle.trim(), bring: evBring.trim(), note: evNote.trim(), type: evType, addedBy: parentName });
    setEvents(getEvents()); setShowEventForm(false); setEditingEventId(null);
  };

  const removeEvent = (id: string) => { deleteEvent(id); setEvents(getEvents()); };

  // ── Derived ─────────────────────────────────────────────────────────────
  const selectedStr   = selected ? format(selected, 'yyyy-MM-dd') : '';
  const existingSD    = specialDays.find(s => s.date === selectedStr);
  const dayEvents     = events.filter(e => e.date === selectedStr);
  const dayStatus     = selected ? getDayStatus(selected, profile, specialDays) : null;
  const isPast        = selected ? new Date(selected) < today : false;
  const selectedLabel = selected ? `יום ${HEB_DAYS_LONG[selected.getDay()]} ${selected.getDate()} ב${HEB_MONTHS[selected.getMonth()]}` : '';
  const selectedHoliday = selectedStr ? getHoliday(selectedStr) : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb] overflow-hidden">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <div className="w-8" />
        <span className="text-white text-[15px] font-medium">לוח שנה</span>
        {profile ? (
          <ChildSwitcher profile={profile} onSwitch={() => setProfile(getProfile())} onAdd={() => router.push('/children/add')} />
        ) : <div className="w-8" />}
      </header>

      <main className="flex-1 overflow-y-auto p-3">
        {/* Month navigation */}
        <div className="bg-white rounded-xl border border-[#e0ddf0] p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewDate(v => addMonths(v, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-[#534AB7] text-lg flex items-center justify-center">‹</button>
            <span className="text-[15px] font-semibold text-gray-800">{HEB_MONTHS[month]} {year}</span>
            <button onClick={() => setViewDate(v => subMonths(v, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-[#534AB7] text-lg flex items-center justify-center">›</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1" dir="rtl">
            {CAL_HEADER.map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5" dir="rtl">
            {grid.map((date, idx) => {
              if (!date) return <div key={`e-${idx}`} />;
              const dateStr  = format(date, 'yyyy-MM-dd');
              const isToday  = dateStr === format(today, 'yyyy-MM-dd');
              const status   = getDayStatus(date, profile, specialDays);
              const past     = date < today;
              const hasEvent = events.some(e => e.date === dateStr);
              const holiday  = getHoliday(dateStr);

              return (
                <button key={date.toISOString()} onClick={() => openSheet(date)}
                  className={clsx(
                    'flex flex-col items-center py-0.5 rounded-lg min-h-[40px]',
                    isToday && 'bg-[#534AB7]/10',
                    holiday?.type === 'major' && !past && 'bg-orange-50',
                    !past && 'active:bg-[#534AB7]/10'
                  )}>
                  <span className={clsx(
                    'text-[13px] leading-none',
                    isToday ? 'font-bold text-[#534AB7]' :
                    holiday?.type === 'major' ? 'font-semibold text-orange-600' :
                    holiday?.type === 'memorial' ? 'text-gray-500' :
                    past ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    {date.getDate()}
                  </span>
                  {/* Holiday name */}
                  {holiday && (
                    <span className={clsx(
                      'text-[7px] leading-tight text-center px-0.5 mt-0.5 truncate w-full',
                      holiday.type === 'major'    ? 'text-orange-500' :
                      holiday.type === 'memorial' ? 'text-gray-400' :
                                                    'text-amber-500'
                    )}>
                      {holiday.name.split(' ')[0]}
                    </span>
                  )}
                  {/* Dots row */}
                  <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
                    {status === 'regular-open'  && <span className="w-1.5 h-1.5 rounded-full bg-[#534AB7]" />}
                    {status === 'special-open'  && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {status === 'blocked'        && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                    {hasEvent                    && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    {holiday                     && <span className={clsx('w-1.5 h-1.5 rounded-full',
                      holiday.type === 'major' ? 'bg-orange-400' :
                      holiday.type === 'memorial' ? 'bg-gray-400' : 'bg-yellow-400'
                    )} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-3 mb-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5" dir="rtl">
            {[
              { color: 'bg-[#534AB7]', label: 'פנוי (שבועי)' },
              { color: 'bg-emerald-500', label: 'פתיחה חד פעמית' },
              { color: 'bg-red-400', label: 'לא פנוי' },
              { color: 'bg-amber-400', label: 'אירוע ביום' },
              { color: 'bg-orange-400', label: 'חג / מועד' },
              { color: 'bg-gray-400', label: 'יום זיכרון' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={clsx('w-2 h-2 rounded-full', color)} />
                <span className="text-[11px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="bg-[#EEEDFE] rounded-xl border border-[#c5c0f0] px-4 py-3 mb-3" dir="rtl">
          <p className="text-[12px] text-[#534AB7] leading-5">
            💡 לחצו על יום כדי לעדכן אותו באופן ספציפי — אם אתם רוצים מפגשים או לא, מעבר לימים הפנויים הקבועים
          </p>
        </div>

        {/* ICS Export */}
        {profile && (
          <div className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-3 mb-3" dir="rtl">
            <button
              onClick={() => {
                const child = getActiveChild(profile);
                downloadICS(generateICS(profile, specialDays, events), `kidimeet-${child.name}.ics`);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#534AB7] text-white text-[14px] font-medium py-2.5 rounded-xl active:opacity-80"
            >
              <span>📤</span>
              <span>ייצוא לגוגל קלנדר</span>
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              פתח את הקובץ ביישום לוח שנה גוגל כדי לייבא את הנתונים
            </p>
          </div>
        )}

        {/* Upcoming events */}
        {events.filter(e => e.date >= format(today, 'yyyy-MM-dd')).length > 0 && (
          <div className="bg-white rounded-xl border border-[#e0ddf0] overflow-hidden mb-3">
            <p className="text-[12px] font-medium text-gray-400 px-4 pt-3 pb-2">אירועים קרובים</p>
            {events
              .filter(e => e.date >= format(today, 'yyyy-MM-dd'))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 6)
              .map((ev, i, arr) => {
                const d = new Date(ev.date + 'T00:00:00');
                return (
                  <div key={ev.id} className={clsx('px-4 py-2.5 flex items-start gap-3', i < arr.length - 1 && 'border-b border-[#f0eef8]')} dir="rtl">
                    <span className="text-xl shrink-0 mt-0.5">{eventIcon(ev.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800">{ev.title}</p>
                      <p className="text-[11px] text-gray-400">{d.getDate()} ב{HEB_MONTHS[d.getMonth()]} · יום {HEB_DAYS_LONG[d.getDay()]}</p>
                      {ev.bring && <p className="text-[11px] text-amber-600 mt-0.5">להביא: {ev.bring}</p>}
                      {ev.addedBy && <p className="text-[10px] text-gray-300 mt-0.5">נוסף ע"י {ev.addedBy}</p>}
                    </div>
                    <button onClick={() => removeEvent(ev.id)} className="text-gray-300 text-[12px] px-1 shrink-0">✕</button>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      <BottomNav active="calendar" />

      {/* ── Day sheet ──────────────────────────────────────────────────────── */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeSheet} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[88vh] overflow-y-auto">
            {/* Handle + title */}
            <div className="sticky top-0 bg-white pt-3 px-4 pb-2 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <p className="text-[16px] font-semibold text-gray-900 text-center" dir="rtl">{selectedLabel}</p>
              {selectedHoliday && (
                <p className={clsx(
                  'text-[13px] font-medium text-center mt-0.5',
                  selectedHoliday.type === 'major'    ? 'text-orange-500' :
                  selectedHoliday.type === 'memorial' ? 'text-gray-500'   : 'text-amber-500'
                )}>
                  {selectedHoliday.type === 'major' ? '🕍' : selectedHoliday.type === 'memorial' ? '🕯️' : '✨'} {selectedHoliday.name}
                </p>
              )}
            </div>

            <div className="p-4">
              {/* ── AVAILABILITY SECTION ─────────────────────────────────── */}
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2" dir="rtl">זמינות</p>

              {/* Status badge */}
              <div className="flex justify-end mb-3" dir="rtl">
                {dayStatus === 'regular-open'  && <span className="text-[12px] bg-[#EEEDFE] text-[#534AB7] px-3 py-1 rounded-full">פנוי לפי הלוח</span>}
                {dayStatus === 'regular-off'   && <span className="text-[12px] bg-gray-100 text-gray-500 px-3 py-1 rounded-full">לא פנוי בדרך כלל</span>}
                {dayStatus === 'special-open'  && <span className="text-[12px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">פתיחה חד פעמית ✓</span>}
                {dayStatus === 'blocked'       && <span className="text-[12px] bg-red-50 text-red-600 px-3 py-1 rounded-full">חסום ביום זה</span>}
                {dayStatus === 'past'          && <span className="text-[12px] bg-gray-100 text-gray-400 px-3 py-1 rounded-full">יום שעבר</span>}
              </div>

              {!isPast && availMode === 'view' && (
                <div className="flex flex-col gap-2 mb-4" dir="rtl">
                  {existingSD ? (
                    <button onClick={removeAvail} className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 text-[13px]">
                      הסר עקיפה — חזור ללוח הרגיל
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setAvailMode('block')} className="flex-1 py-2.5 rounded-xl border border-dashed border-red-300 text-red-500 text-[13px]">
                        ✕ חסום
                      </button>
                      <button onClick={() => setAvailMode('open')} className="flex-1 py-2.5 rounded-xl border border-dashed border-emerald-400 text-emerald-600 text-[13px]">
                        ✓ פתח + שעות
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!isPast && availMode === 'block' && (
                <div className="mb-4" dir="rtl">
                  <p className="text-[12px] text-gray-400 mb-2">הורים אחרים יראו רק "לא פנוי" — בלי סיבה</p>
                  <input value={privateNote} onChange={e => setPrivateNote(e.target.value)}
                    placeholder="הערה פרטית (לא תוצג לאחרים)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-right focus:outline-none focus:border-[#534AB7] bg-white mb-3" dir="rtl" />
                  <div className="flex gap-2">
                    <button onClick={() => setAvailMode('view')} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-[14px]">ביטול</button>
                    <button onClick={saveAvail} className="flex-1 py-2.5 rounded-xl bg-[#534AB7] text-white text-[14px] font-medium">שמור</button>
                  </div>
                </div>
              )}

              {!isPast && availMode === 'open' && (
                <div className="mb-4">
                  <DayAvailPicker dayIndex={selected.getDay()} slot={openSlots} onChange={s => setOpenSlots(s)} />
                  <input value={privateNote} onChange={e => setPrivateNote(e.target.value)}
                    placeholder="הערה פרטית (לא תוצג לאחרים)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-right focus:outline-none focus:border-[#534AB7] bg-white mb-3 mt-1" dir="rtl" />
                  <div className="flex gap-2">
                    <button onClick={() => setAvailMode('view')} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-[14px]">ביטול</button>
                    <button onClick={saveAvail} className="flex-1 py-2.5 rounded-xl bg-[#534AB7] text-white text-[14px] font-medium">שמור</button>
                  </div>
                </div>
              )}

              {/* ── EVENTS SECTION ──────────────────────────────────────── */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3" dir="rtl">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">אירועים ביום זה</p>
                  {!showEventForm && (
                    <button onClick={startNewEvent} className="text-[12px] text-[#534AB7] bg-[#EEEDFE] rounded-full px-3 py-1">
                      + הוסף אירוע
                    </button>
                  )}
                </div>

                {/* Existing events */}
                {dayEvents.length > 0 && !showEventForm && (
                  <div className="flex flex-col gap-2 mb-3">
                    {dayEvents.map(ev => (
                      <div key={ev.id} className="bg-[#fafafe] rounded-xl border border-[#e0ddf0] px-3 py-2.5" dir="rtl">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-lg shrink-0">{eventIcon(ev.type)}</span>
                            <div className="min-w-0">
                              <p className="text-[14px] font-medium text-gray-800">{ev.title}</p>
                              {ev.bring && (
                                <p className="text-[12px] text-amber-600 mt-0.5">
                                  🎒 להביא: {ev.bring}
                                </p>
                              )}
                              {ev.note && <p className="text-[12px] text-gray-500 mt-0.5">{ev.note}</p>}
                              {ev.addedBy && <p className="text-[10px] text-gray-300 mt-1">נוסף ע"י {ev.addedBy}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEditEvent(ev)} className="text-[11px] text-gray-400 bg-gray-100 rounded px-1.5 py-1">עריכה</button>
                            <button onClick={() => removeEvent(ev.id)} className="text-[11px] text-red-400 bg-red-50 rounded px-1.5 py-1">✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {dayEvents.length === 0 && !showEventForm && (
                  <p className="text-[12px] text-gray-300 text-center py-2" dir="rtl">אין אירועים ביום זה</p>
                )}

                {/* Event form */}
                {showEventForm && (
                  <div className="bg-[#fafafe] rounded-xl border border-[#e0ddf0] p-3 mb-3" dir="rtl">
                    <p className="text-[13px] font-medium text-gray-700 mb-3">
                      {editingEventId ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
                    </p>

                    {/* Event type selector */}
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {EVENT_TYPES.map(t => (
                        <button key={t.value} onClick={() => setEvType(t.value)}
                          className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] border transition-colors',
                            evType === t.value ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-600')}>
                          <span>{t.icon}</span><span>{t.label}</span>
                        </button>
                      ))}
                    </div>

                    <label className="block text-[12px] font-medium text-gray-500 mb-1">כותרת האירוע</label>
                    <input value={evTitle} onChange={e => setEvTitle(e.target.value)}
                      placeholder='לדוגמא: טיול שנתי, יום ירושלים...'
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-right focus:outline-none focus:border-[#534AB7] bg-white mb-2.5" dir="rtl" />

                    <label className="block text-[12px] font-medium text-gray-500 mb-1">מה להביא <span className="font-normal opacity-60">(אופציונלי)</span></label>
                    <input value={evBring} onChange={e => setEvBring(e.target.value)}
                      placeholder='לדוגמא: תמונה של ירושלים, כסף לאוכל...'
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-right focus:outline-none focus:border-[#534AB7] bg-white mb-2.5" dir="rtl" />

                    <label className="block text-[12px] font-medium text-gray-500 mb-1">הערה <span className="font-normal opacity-60">(אופציונלי)</span></label>
                    <input value={evNote} onChange={e => setEvNote(e.target.value)}
                      placeholder='פרטים נוספים...'
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] text-right focus:outline-none focus:border-[#534AB7] bg-white mb-3" dir="rtl" />

                    {/* Connected mode teaser */}
                    <div className="bg-[#EEEDFE] rounded-lg px-3 py-2 mb-3 flex items-center gap-2" dir="rtl">
                      <span className="text-sm">🔗</span>
                      <p className="text-[11px] text-[#534AB7]">
                        במצב מחובר — כל הורי הכיתה יראו את האירוע אוטומטית
                      </p>
                      <span className="text-[10px] bg-[#534AB7] text-white px-1.5 py-0.5 rounded-full shrink-0">בקרוב</span>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => { setShowEventForm(false); setEditingEventId(null); }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-[14px]">ביטול</button>
                      <button onClick={saveEvForm} disabled={!evTitle.trim()}
                        className={clsx('flex-1 py-2.5 rounded-xl text-white text-[14px] font-medium transition-opacity', evTitle.trim() ? 'bg-[#534AB7]' : 'bg-[#534AB7] opacity-40')}>
                        שמור אירוע
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={closeSheet} className="w-full py-2.5 rounded-xl border border-gray-100 text-gray-400 text-[14px] mt-2">
                סגור
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
