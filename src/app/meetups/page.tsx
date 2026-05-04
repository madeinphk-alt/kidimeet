'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { addDays, format, differenceInDays } from 'date-fns';
import { getPlannedMeetups, savePlannedMeetup, getFriends, getProfile, getActiveChild, formatTime } from '@/lib/storage';
import type { PlannedMeetup, Friend, UserProfile } from '@/lib/storage';
import { AVATAR_COLORS } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import ChildSwitcher from '@/components/ChildSwitcher';

const HEB_MONTHS     = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HEB_DAYS       = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const HEB_DAYS_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

function formatWaPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  return '972' + d;
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function MiniAvatar({ friend }: { friend: Friend }) {
  const c = AVATAR_COLORS[friend.avatarColor] ?? AVATAR_COLORS['purple'];
  return (
    <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0', c.bg, c.text)}>
      {friend.avatarInitials}
    </div>
  );
}

function lastMetLabel(days: number | null, pending?: boolean): { text: string; urgent: boolean } {
  if (pending)       return { text: '⏳ ממתין לזמינות', urgent: false };
  if (days === null) return { text: 'טרם נפגשו', urgent: true };
  if (days === 0)    return { text: 'היום!', urgent: false };
  if (days <= 7)     return { text: `לפני ${days} ימים`, urgent: false };
  if (days <= 14)    return { text: `לפני שבועיים`, urgent: false };
  const weeks = Math.round(days / 7);
  return { text: `לפני ${weeks} שבועות`, urgent: days > 21 };
}

export default function MeetupsPage() {
  const router = useRouter();
  const [meetups,    setMeetups]    = useState<PlannedMeetup[]>([]);
  const [friends,    setFriends]    = useState<Friend[]>([]);
  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [offset,     setOffset]     = useState(0);
  const [proposals,  setProposals]  = useState<Map<string, 'suggested' | 'waiting' | 'skipped' | 'confirmed'>>(new Map());
  const [hostPick,   setHostPick]   = useState<Map<string, 'us' | 'them' | 'other'>>(new Map());

  useEffect(() => {
    setMeetups(getPlannedMeetups());
    setFriends(getFriends());
    setProfile(getProfile());
  }, []);

  // ── Base date ─────────────────────────────────────────────────────────────
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // ── Last-met calculation ──────────────────────────────────────────────────
  const lastMetMap = new Map<string, { date: string; host?: 'us' | 'them' }>();
  meetups.forEach(m => {
    m.friendIds.forEach(fid => {
      const prev = lastMetMap.get(fid);
      if (!prev || m.date > prev.date) lastMetMap.set(fid, { date: m.date, host: m.host });
    });
  });

  const daysAgo = (friendId: string): number | null => {
    const entry = lastMetMap.get(friendId);
    if (!entry) return null;
    return differenceInDays(todayDate, new Date(entry.date + 'T00:00:00'));
  };

  const lastMetHost = (friendId: string): 'us' | 'them' | null =>
    lastMetMap.get(friendId)?.host ?? null;

  const activeFriends = friends.filter(f =>
    !f.childId || f.childId === 'legacy' || f.childId === profile?.activeChildId
  );

  // ── Per-date proposal helpers ─────────────────────────────────────────────
  const pKey        = (fid: string, dateStr: string) => `${fid}_${dateStr}`;
  const getProposal = (fid: string, dateStr: string) => proposals.get(pKey(fid, dateStr));
  const setProposal = (fid: string, dateStr: string, status: 'suggested' | 'waiting' | 'skipped' | 'confirmed' | null) => {
    setProposals(p => {
      const next = new Map(p);
      if (status === null) next.delete(pKey(fid, dateStr));
      else next.set(pKey(fid, dateStr), status);
      return next;
    });
  };
  const getHostPick = (fid: string, dateStr: string) => hostPick.get(pKey(fid, dateStr));
  const setHostFor  = (fid: string, dateStr: string, h: 'us' | 'them' | 'other') =>
    setHostPick(m => new Map(m).set(pKey(fid, dateStr), h));

  // ── Available friends for a given day ────────────────────────────────────
  const availableForDay = (dow: number, dateStr: string) =>
    activeFriends
      .filter(f => {
        const s = getProposal(f.id, dateStr);
        return f.availability[dow]?.active && s !== 'confirmed';
      })
      .sort((a, b) => {
        const sa = getProposal(a.id, dateStr) === 'skipped' ? 1 : 0;
        const sb = getProposal(b.id, dateStr) === 'skipped' ? 1 : 0;
        if (sa !== sb) return sa - sb;
        return (daysAgo(b.id) ?? 9999) - (daysAgo(a.id) ?? 9999);
      });

  const confirmedForDay = (dateStr: string) =>
    activeFriends.filter(f => getProposal(f.id, dateStr) === 'confirmed');

  // ── Day label ─────────────────────────────────────────────────────────────
  const selectedDate    = addDays(todayDate, offset);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDow     = selectedDate.getDay();
  const dayLabel = (off: number) => {
    if (off === 0) return 'היום';
    if (off === 1) return 'מחר';
    if (off === 2) return 'מחרתיים';
    const d = addDays(todayDate, off);
    return `יום ${HEB_DAYS[d.getDay()]} ${d.getDate()} ב${HEB_MONTHS[d.getMonth()]}`;
  };
  const dayStrip = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(todayDate, i);
    return { offset: i, dow: d.getDay(), date: d };
  });

  // ── Propose playdate ──────────────────────────────────────────────────────
  const proposePlaydate = (friend: Friend, host: 'us' | 'them', date: Date, dateStr: string) => {
    const parent = friend.parents[0];
    if (!parent?.phone) return;
    const myChild     = profile ? getActiveChild(profile).name.split(' ')[0] : '';
    const parentFirst = parent.name.split(' ')[0];
    const friendFirst = friend.name.split(' ')[0];
    const dateLabel   = `יום ${HEB_DAYS[date.getDay()]} ${date.getDate()} ב${HEB_MONTHS[date.getMonth()]}`;
    const dow  = date.getDay();
    const slot = friend.availability[dow];
    const timeHint = slot?.afternoon ? `אחה"צ`
      : slot?.noon    ? `צהריים`
      : slot?.morning ? `בוקר` : '';

    const prevHost = lastMetHost(friend.id);
    const prevLine = prevHost
      ? `פעם אחרונה היה ${prevHost === 'us' ? 'אצלנו' : 'אצלכם'}, אולי ${host === 'us' ? 'אצלנו' : 'אצלכם'} הפעם?`
      : host === 'us' ? 'חשבנו לארח אצלנו 🙂' : 'נשמח לבוא אליכם 🙂';

    const msg =
      `היי ${parentFirst} 👋\n` +
      `חשבנו ש${friendFirst} ו${myChild} אולי ירצו להיפגש\n` +
      `ב- ${dateLabel}${timeHint ? ` ${timeHint}` : ''}\n` +
      `${prevLine}\n\n` +
      `מה דעתכם?`;

    window.open(`https://wa.me/${formatWaPhone(parent.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
    setProposal(friend.id, dateStr, 'suggested');
  };

  // ── Confirm meetup ────────────────────────────────────────────────────────
  const confirmMeetup = (friend: Friend, date: Date, dateStr: string) => {
    const dow  = date.getDay();
    const slot = friend.availability[dow];
    const timeFrom = slot?.afternoon ? slot.afternoonFrom : slot?.noon ? slot.noonFrom : slot?.morning ? slot.morningFrom : 960;
    const timeTo   = slot?.afternoon ? slot.afternoonTo   : slot?.noon ? slot.noonTo   : slot?.morning ? slot.morningTo   : 1125;
    const myChild  = profile ? getActiveChild(profile).name : '';
    const host     = getHostPick(friend.id, dateStr);
    const meetup: PlannedMeetup = {
      id: `meetup-${Date.now()}`,
      title: `פליידייט ${friend.name.split(' ')[0]} ו${myChild}`,
      type: 'playdate',
      date: dateStr,
      timeFrom, timeTo,
      friendIds: [friend.id],
      location: host === 'us' ? 'אצלנו' : host === 'them' ? `אצל ${friend.name.split(' ')[0]}` : '',
      notes: '',
      status: 'confirmed',
      host: host === 'other' ? undefined : host,
    };
    savePlannedMeetup(meetup);
    setMeetups(getPlannedMeetups());
    setProposal(friend.id, dateStr, 'confirmed');
  };


  // ── Friend cards for one day ────────────────────────────────────────────
  const DayFriendList = ({ date, dateStr, dow, available, confirmed }: {
    date: Date; dateStr: string; dow: number; available: Friend[]; confirmed: Friend[];
  }) => (
    <div className="flex flex-col gap-2">
      {available.map(friend => {
        const ago        = daysAgo(friend.id);
        const host       = lastMetHost(friend.id);
        const { text: lastMetText, urgent } = lastMetLabel(ago, friend.availabilityPending);
        const hostText   = host === 'us' ? 'אצלנו' : host === 'them' ? 'אצלהם' : null;
        const status     = getProposal(friend.id, dateStr);
        const pickedHost = getHostPick(friend.id, dateStr);
        const slot       = friend.availability[dow];
        const slotLabel  = slot?.afternoon ? `אחה"צ ${formatTime(slot.afternoonFrom)}`
          : slot?.noon ? `צהרים ${formatTime(slot.noonFrom)}`
          : slot?.morning ? `בוקר ${formatTime(slot.morningFrom)}` : '';
        const canPropose = !!pickedHost && !!friend.parents[0]?.phone;
        const firstName  = friend.name.split(' ')[0];
        const isSkipped  = status === 'skipped';
        return (
          <div key={friend.id}
            className={clsx('rounded-xl border overflow-hidden', isSkipped ? 'bg-gray-50 border-gray-100 opacity-50' : 'bg-white border-[#e0ddf0]')}
            dir="rtl"
          >
            <div className="px-4 py-3 flex items-center">
              <span className={clsx('text-[15px] font-semibold shrink-0', isSkipped ? 'text-gray-400' : 'text-gray-900')}>{firstName}</span>
              <span className="mx-2 text-gray-200 shrink-0">|</span>
              <span className={clsx('text-[13px] font-medium shrink-0', isSkipped ? 'text-gray-300' : 'text-[#534AB7]')}>{slotLabel}</span>
              <span className="mx-2 text-gray-200 shrink-0">|</span>
              <span className={clsx('text-[12px] truncate', isSkipped ? 'text-gray-300' : urgent ? 'text-orange-500 font-medium' : 'text-gray-400')}>
                {isSkipped ? 'לא הפעם' : `${lastMetText}${hostText ? ` · ${hostText}` : ''}`}
              </span>
            </div>
            {isSkipped && (
              <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                <button onClick={() => setProposal(friend.id, dateStr, null)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-medium bg-white text-gray-500 border border-gray-200">↩ הצע שוב</button>
                <button onClick={() => confirmMeetup(friend, date, dateStr)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-[#534AB7] text-white">🎉 נפגשים</button>
              </div>
            )}
            {!status && (
              <>
                {/* שורה 1: בחירת מיקום */}
                <div className="px-3 pb-2 flex gap-2" dir="rtl">
                  <button onClick={() => setHostFor(friend.id, dateStr, 'us')}
                    className={clsx('flex-1 py-2 rounded-xl border text-[12px] font-medium transition-colors',
                      pickedHost === 'us' ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-500'
                    )}>🏠 אצלנו</button>
                  <button onClick={() => setHostFor(friend.id, dateStr, 'them')}
                    className={clsx('flex-1 py-2 rounded-xl border text-[12px] font-medium transition-colors',
                      pickedHost === 'them' ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-500'
                    )}>🚶 אצלהם</button>
                  <button onClick={() => setHostFor(friend.id, dateStr, 'other')}
                    className={clsx('flex-1 py-2 rounded-xl border text-[12px] font-medium transition-colors',
                      pickedHost === 'other' ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-500'
                    )}>📍 אחר</button>
                </div>
                {/* שורה 2: הצעה */}
                <div className="border-t border-[#f0eef8] px-3 py-2 flex gap-2" dir="rtl">
                  <button disabled={!canPropose}
                    onClick={() => canPropose && proposePlaydate(friend, pickedHost === 'other' ? 'us' : pickedHost!, date, dateStr)}
                    className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                      canPropose
                        ? 'bg-gray-50 border border-gray-200 text-gray-600'
                        : 'bg-gray-50 border border-gray-200 text-gray-300'
                    )}>
                    <span className={canPropose ? 'text-[#25D366]' : 'text-gray-300'}><WaIcon /></span>
                    הצע ל{firstName}
                  </button>
                </div>
              </>
            )}
            {(status === 'suggested' || status === 'waiting') && (
              <div className="border-t border-[#f0eef8] px-3 py-2.5 flex gap-1.5">
                <button onClick={() => setProposal(friend.id, dateStr, 'waiting')}
                  className={clsx('flex-1 py-2 rounded-xl text-[12px] font-medium',
                    status === 'waiting' ? 'bg-amber-100 text-amber-600 border border-amber-300' : 'bg-gray-50 text-gray-500 border border-gray-200'
                  )}>⏳ ממתין</button>
                <button onClick={() => { const h = getHostPick(friend.id, dateStr); proposePlaydate(friend, h === 'other' || !h ? 'us' : h, date, dateStr); }}
                  className="flex-1 py-2 rounded-xl text-[12px] font-medium bg-gray-50 text-gray-500 border border-gray-200">🔁 הקפץ</button>
                <button onClick={() => setProposal(friend.id, dateStr, 'skipped')}
                  className="flex-1 py-2 rounded-xl text-[12px] font-medium bg-gray-50 text-red-400 border border-gray-200">✕ לא הפעם</button>
                <button onClick={() => confirmMeetup(friend, date, dateStr)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-[#534AB7] text-white">🎉 נפגשים</button>
              </div>
            )}
          </div>
        );
      })}
      {confirmed.map(friend => {
        const h = getHostPick(friend.id, dateStr);
        return (
          <div key={friend.id} className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 flex items-center gap-3" dir="rtl">
            <MiniAvatar friend={friend} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-gray-900">{friend.name.split(' ')[0]}</p>
              <p className="text-[11px] text-green-600 mt-0.5">🎉 פליידייט מאושר{h === 'us' ? ' · אצלנו' : h === 'them' ? ` · אצל ${friend.name.split(' ')[0]}` : ''}</p>
            </div>
            <span className="text-xl">✅</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb] overflow-hidden">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <Link href="/meetups/new" className="text-white/90 text-[12px] bg-white/20 rounded-full px-3 py-1.5">
          + צור אירוע
        </Link>
        <span className="text-white text-[15px] font-medium">מפגשים</span>
        {profile ? (
          <ChildSwitcher profile={profile} onSwitch={() => { setFriends(getFriends()); setProfile(getProfile()); }} onAdd={() => router.push('/children/add')} />
        ) : <div className="w-24" />}
      </header>

      <main className="flex-1 overflow-y-auto">

        {/* ── Section 1: Playdate finder ─────────────────────────────────── */}
        <div className="bg-white border-b border-[#e8e6f5]">
          <div className="px-4 pt-4 pb-2" dir="rtl">
            <p className="text-[17px] font-bold text-gray-900">👫 פליידייט</p>
            <p className="text-[12px] text-gray-400 mt-0.5">מי פנוי — ומתי לא נפגשנו?</p>
          </div>

          {/* Day strip */}
          <div className="px-3 pb-3">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {dayStrip.map(({ offset: o, dow, date }) => {
                const isSelected  = o === offset;
                const hasFriends  = activeFriends.some(f => f.availability[dow]?.active);
                const lbl         = o === 0 ? 'היום' : o === 1 ? 'מחר' : o === 2 ? 'מחרתיים' : null;
                return (
                  <button
                    key={o}
                    onClick={() => setOffset(o)}
                    className={clsx(
                      'flex flex-col items-center px-3 py-2 rounded-xl text-[12px] shrink-0 transition-colors relative',
                      lbl ? 'min-w-[58px]' : 'min-w-[44px]',
                      isSelected ? 'bg-[#534AB7] text-white' : 'bg-[#f5f4fb] text-gray-600'
                    )}
                  >
                    <span className={clsx('text-[10px]', isSelected ? 'text-white/70' : 'text-gray-400')}>
                      {lbl ?? HEB_DAYS_SHORT[dow]}
                    </span>
                    <span className="font-semibold mt-0.5">{date.getDate()}</span>
                    {hasFriends && !isSelected && (
                      <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-[#534AB7] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Friend list */}
        <div className="px-3 pt-3 pb-4">
          {friends.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e0ddf0] p-6 text-center">
              <p className="text-gray-400 text-[14px] mb-2">עדיין אין חברים ברשימה</p>
              <Link href="/friends/add" className="text-[#534AB7] text-[13px] font-medium">הוסף חברים →</Link>
            </div>
          ) : offset === 0 ? (
            // ── Default: 3 days stacked ──────────────────────────────────────
            [0, 1, 2].map(off => {
              const date    = addDays(todayDate, off);
              const dateStr = format(date, 'yyyy-MM-dd');
              const dow     = date.getDay();
              const label   = off === 0 ? 'היום' : off === 1 ? 'מחר' : 'מחרתיים';
              const available = availableForDay(dow, dateStr);
              const confirmed = confirmedForDay(dateStr);
              return (
                <div key={off} className="mb-4">
                  <p className="text-[12px] font-semibold text-gray-500 mb-2 px-1" dir="rtl">
                    {label}
                    <span className="font-normal text-gray-400"> · {available.length} חברים פנויים</span>
                  </p>
                  {available.length === 0 && confirmed.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-3 text-center">
                      <p className="text-gray-300 text-[13px]">אין חברים פנויים {label}</p>
                    </div>
                  ) : (
                    <DayFriendList date={date} dateStr={dateStr} dow={dow} available={available} confirmed={confirmed} />
                  )}
                </div>
              );
            })
          ) : (
            // ── Selected day: only that day ──────────────────────────────────
            (() => {
              const available = availableForDay(selectedDow, selectedDateStr);
              const confirmed = confirmedForDay(selectedDateStr);
              return (
                <div>
                  <p className="text-[12px] font-semibold text-gray-500 mb-2 px-1" dir="rtl">
                    {dayLabel(offset)}
                    <span className="font-normal text-gray-400"> · {available.length} חברים פנויים</span>
                  </p>
                  {available.length === 0 && confirmed.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-5 text-center">
                      <p className="text-gray-400 text-[14px]">אין חברים פנויים {dayLabel(offset)}</p>
                      <p className="text-gray-300 text-[12px] mt-1">נסה יום אחר</p>
                    </div>
                  ) : (
                    <DayFriendList date={selectedDate} dateStr={selectedDateStr} dow={selectedDow} available={available} confirmed={confirmed} />
                  )}
                </div>
              );
            })()
          )}
        </div>


      </main>

      <BottomNav active="meetups" />
    </div>
  );
}
