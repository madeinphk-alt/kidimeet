'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { getFriends, getPlannedMeetups, savePlannedMeetup, MEETUP_TYPE_DEFS, formatTime, DEFAULT_DAY_SLOT } from '@/lib/storage';
import type { Friend, PlannedMeetup, MeetupType } from '@/lib/storage';
import { AVATAR_COLORS } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';

const STEPS = ['סוג', 'תאריך', 'ילדים', 'מיקום'];

const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function FriendChip({ friend, selected, onToggle }: { friend: Friend; selected: boolean; onToggle: () => void }) {
  const c = AVATAR_COLORS[friend.avatarColor] ?? AVATAR_COLORS['purple'];
  return (
    <button onClick={onToggle}
      className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-right', selected ? 'bg-[#534AB7] border-[#534AB7]' : 'bg-white border-gray-200')}>
      <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0', selected ? 'bg-white/20 text-white' : c.bg, selected ? '' : c.text)}>
        {friend.avatarInitials}
      </div>
      <div className="min-w-0">
        <p className={clsx('text-[13px] font-medium truncate', selected ? 'text-white' : 'text-gray-800')}>{friend.name.split(' ')[0]}</p>
        {friend.groupLabel && friend.group !== 'class' && (
          <p className={clsx('text-[10px]', selected ? 'text-white/70' : 'text-gray-400')}>{friend.groupLabel}</p>
        )}
      </div>
      {selected && <span className="text-white text-sm ml-auto">✓</span>}
    </button>
  );
}

function NewMeetupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');

  const [step, setStep] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Form state
  const [type,       setType]       = useState<MeetupType>('birthday');
  const [title,      setTitle]      = useState('');
  const [date,       setDate]       = useState('');
  const [timeFrom,   setTimeFrom]   = useState(900);   // 09:00
  const [timeTo,     setTimeTo]     = useState(1200);  // 12:00
  const [selected,   setSelected]   = useState<string[]>([]);
  const [location,   setLocation]   = useState('');
  const [notes,      setNotes]      = useState('');

  useEffect(() => {
    setFriends(getFriends());
    if (editId) {
      const m = getPlannedMeetups().find(x => x.id === editId);
      if (m) {
        setType(m.type); setTitle(m.title); setDate(m.date);
        setTimeFrom(m.timeFrom); setTimeTo(m.timeTo);
        setSelected(m.friendIds); setLocation(m.location); setNotes(m.notes);
      }
    }
  }, [editId]);

  const STEP = 15;
  const adjFrom = (d: number) => setTimeFrom(t => Math.max(360, Math.min(1320, t + d * STEP)));
  const adjTo   = (d: number) => setTimeTo(t  => Math.max(360, Math.min(1320, t + d * STEP)));

  const toggleFriend = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const defaultTitle = MEETUP_TYPE_DEFS.find(t => t.value === type)?.label ?? '';

  const canNext = [
    type && (title.trim() || true), // type required, title optional
    date.trim().length > 0,
    selected.length > 0,
    true,
  ];

  const buildGCalUrl = (m: PlannedMeetup) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = new Date(m.date + 'T00:00:00');
    const dateBase = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    const fromH = Math.floor(m.timeFrom / 60);
    const fromM = m.timeFrom % 60;
    const toH   = Math.floor(m.timeTo / 60);
    const toM   = m.timeTo % 60;
    const dtStart = `${dateBase}T${pad(fromH)}${pad(fromM)}00`;
    const dtEnd   = `${dateBase}T${pad(toH)}${pad(toM)}00`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: m.title,
      dates: `${dtStart}/${dtEnd}`,
      details: m.notes || '',
      location: m.location || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const finish = () => {
    const meetup: PlannedMeetup = {
      id: editId ?? `meetup-${Date.now()}`,
      title: title.trim() || defaultTitle,
      type, date, timeFrom, timeTo,
      location: location.trim(),
      notes: notes.trim(),
      friendIds: selected,
      status: 'planning',
    };
    savePlannedMeetup(meetup);
    // Open Google Calendar to add the event
    window.open(buildGCalUrl(meetup), '_blank');
    router.push('/meetups');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f7f6fb]">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-4">
        <h1 className="text-white text-[17px] font-medium text-center">
          {editId ? 'עריכת מפגש' : 'מפגש חדש'}
        </h1>
      </header>

      {/* Progress */}
      <div className="bg-[#534AB7] pb-4 px-4">
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={clsx('w-7 h-7 rounded-full text-[12px] font-medium flex items-center justify-center',
                i < step ? 'bg-white text-[#534AB7]' : i === step ? 'bg-white text-[#534AB7]' : 'bg-white/20 text-white/50')}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={clsx('text-[10px]', i === step ? 'text-white' : 'text-white/40')}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">

        {/* ── Step 0: Type + title ── */}
        {step === 0 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">איזה סוג מפגש?</h2>
            <p className="text-[13px] text-gray-400 mb-4">בחר סוג ואם רוצה — הוסף שם</p>

            <div className="grid grid-cols-3 gap-2 mb-5" dir="rtl">
              {MEETUP_TYPE_DEFS.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={clsx('flex flex-col items-center gap-1.5 py-4 rounded-xl border transition-colors',
                    type === t.value ? 'bg-[#534AB7] border-[#534AB7]' : 'bg-white border-gray-200')}>
                  <span className="text-2xl">{t.icon}</span>
                  <span className={clsx('text-[12px] font-medium', type === t.value ? 'text-white' : 'text-gray-600')}>{t.label}</span>
                </button>
              ))}
            </div>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
              שם המפגש <span className="font-normal opacity-60">(אופציונלי)</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={`לדוגמא: ${defaultTitle} של ${''}`}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl" />
          </div>
        )}

        {/* ── Step 1: Date + time ── */}
        {step === 1 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">מתי?</h2>
            <p className="text-[13px] text-gray-400 mb-5">תאריך ושעות המפגש</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">תאריך</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#534AB7] bg-white mb-5 text-right"
              dir="rtl" />

            {/* Time pickers */}
            <div className="bg-white rounded-xl border border-[#e0ddf0] p-4" dir="rtl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-gray-700">שעת התחלה</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjFrom(-1)} className="w-7 h-7 rounded-full bg-[#f5f4fb] border border-gray-200 text-[#534AB7] flex items-center justify-center">−</button>
                  <span className="text-[15px] font-semibold text-gray-800 min-w-[48px] text-center">{formatTime(timeFrom)}</span>
                  <button onClick={() => adjFrom(+1)} className="w-7 h-7 rounded-full bg-[#f5f4fb] border border-gray-200 text-[#534AB7] flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-gray-700">שעת סיום</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjTo(-1)} className="w-7 h-7 rounded-full bg-[#f5f4fb] border border-gray-200 text-[#534AB7] flex items-center justify-center">−</button>
                  <span className="text-[15px] font-semibold text-gray-800 min-w-[48px] text-center">{formatTime(timeTo)}</span>
                  <button onClick={() => adjTo(+1)} className="w-7 h-7 rounded-full bg-[#f5f4fb] border border-gray-200 text-[#534AB7] flex items-center justify-center">+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Select children ── */}
        {step === 2 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">מי מוזמן?</h2>
            <p className="text-[13px] text-gray-400 mb-4">בחר ילדים מהרשימה — מכל קבוצה</p>

            {friends.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-[14px] mb-3">עדיין לא הוספת חברים</p>
                <a href="/friends/add" className="text-[#534AB7] text-[13px]">הוסף חברים תחילה →</a>
              </div>
            ) : (
              <div className="flex flex-col gap-2" dir="rtl">
                {friends.map(f => (
                  <FriendChip key={f.id} friend={f} selected={selected.includes(f.id)} onToggle={() => toggleFriend(f.id)} />
                ))}
              </div>
            )}

            {selected.length > 0 && (
              <p className="text-[12px] text-[#534AB7] text-center mt-3">
                {selected.length} ילדים נבחרו
              </p>
            )}
          </div>
        )}

        {/* ── Step 3: Location + summary ── */}
        {step === 3 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">איפה?</h2>
            <p className="text-[13px] text-gray-400 mb-5">כתובת או שם המקום</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">מיקום</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="לדוגמא: פארק הירקון, רחוב הורד 12..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white mb-4"
              dir="rtl" />

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">הערות <span className="font-normal opacity-60">(אופציונלי)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="פרטים נוספים..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-right focus:outline-none focus:border-[#534AB7] bg-white resize-none mb-4"
              dir="rtl" />

            {/* Summary */}
            {(() => {
              const icon = MEETUP_TYPE_DEFS.find(t => t.value === type)?.icon ?? '🎉';
              const d = date ? new Date(date + 'T00:00:00') : null;
              const HEB_DAYS_LONG = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
              const kids = selected.map(id => friends.find(f => f.id === id)).filter(Boolean) as Friend[];
              return (
                <div className="bg-[#EEEDFE] rounded-xl border border-[#c0bce0] p-4" dir="rtl">
                  <p className="text-[12px] font-medium text-[#534AB7] mb-2">סיכום</p>
                  <p className="text-[15px] font-semibold text-gray-900">{icon} {title || defaultTitle}</p>
                  {d && <p className="text-[13px] text-gray-600 mt-0.5">יום {HEB_DAYS_LONG[d.getDay()]} {d.getDate()} ב{HEB_MONTHS[d.getMonth()]} · {formatTime(timeFrom)}–{formatTime(timeTo)}</p>}
                  {location && <p className="text-[12px] text-gray-500 mt-0.5">📍 {location}</p>}
                  <p className="text-[12px] text-[#534AB7] mt-1">👫 {kids.map(k => k.name.split(' ')[0]).join(', ')}</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-[15px]">חזרה</button>
          ) : (
            <button onClick={() => router.back()} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-[15px]">ביטול</button>
          )}
          <button
            onClick={() => step < 3 ? setStep(s => s + 1) : finish()}
            disabled={!canNext[step]}
            className={clsx('flex-1 py-3 rounded-xl text-white text-[15px] font-medium', canNext[step] ? 'bg-[#534AB7]' : 'bg-[#534AB7] opacity-40')}>
            {step < 3 ? 'המשך' : (editId ? 'שמור' : 'צור מפגש 🎉')}
          </button>
        </div>
      </div>
      <BottomNav active="meetups" />
    </div>
  );
}

export default function NewMeetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">טוען...</div></div>}>
      <NewMeetupForm />
    </Suspense>
  );
}
