'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { format, differenceInDays } from 'date-fns';
import { getPlannedMeetups, deletePlannedMeetup, getFriends, getProfile, getActiveChild, MEETUP_TYPE_DEFS, formatTime } from '@/lib/storage';
import type { PlannedMeetup, Friend, UserProfile } from '@/lib/storage';
import { AVATAR_COLORS } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import ChildSwitcher from '@/components/ChildSwitcher';

const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HEB_DAYS   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

function eventDateLabel(dateStr: string, todayStr: string): string {
  const d     = new Date(dateStr + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diff  = differenceInDays(d, today);
  if (diff === 0)  return 'היום';
  if (diff === 1)  return 'מחר';
  if (diff === -1) return 'אתמול';
  return `יום ${HEB_DAYS[d.getDay()]} ${d.getDate()} ב${HEB_MONTHS[d.getMonth()]}`;
}

export default function LuzPage() {
  const router = useRouter();
  const [meetups, setMeetups] = useState<PlannedMeetup[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready,   setReady]   = useState(false);

  const loadProfile = () => {
    const p = getProfile();
    if (!p) { router.replace('/onboarding'); return; }
    setProfile(p);
    setReady(true);
  };

  useEffect(() => {
    loadProfile();
    setMeetups(getPlannedMeetups());
    setFriends(getFriends());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayStr   = format(new Date(), 'yyyy-MM-dd');
  const sorted     = [...meetups].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming   = sorted.filter(m => m.date >= todayStr);
  const past       = sorted.filter(m => m.date <  todayStr).reverse();

  const getFriendById = (id: string) => friends.find(f => f.id === id);

  // ── Action helpers ──────────────────────────────────────────────────────
  function formatWaPhone(phone: string): string {
    const d = phone.replace(/\D/g, '');
    if (d.startsWith('972')) return d;
    if (d.startsWith('0')) return '972' + d.slice(1);
    return '972' + d;
  }

  function buildGCalUrl(m: PlannedMeetup): string {
    const toBasic = (dateStr: string, mins: number) => {
      const h = Math.floor(mins / 60).toString().padStart(2, '0');
      const mn = (mins % 60).toString().padStart(2, '0');
      return `${dateStr.replace(/-/g, '')}T${h}${mn}00`;
    };
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: m.title,
      dates: `${toBasic(m.date, m.timeFrom)}/${toBasic(m.date, m.timeTo)}`,
      details: m.notes || '',
      location: m.location || '',
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }

  function getNavAddress(m: PlannedMeetup): string {
    if (m.host === 'them') {
      const f = getFriendById(m.friendIds[0]);
      if (f?.address) return f.address;
    }
    return m.location;
  }

  function buildWaContactUrl(m: PlannedMeetup): string | null {
    const f = getFriendById(m.friendIds[0]);
    if (!f) return null;
    const parent = f.parents.find(p => p.phone.trim());
    if (!parent) return null;
    const timeStr = `${formatTime(m.timeFrom)}–${formatTime(m.timeTo)}`;
    const msg = `היי ${parent.name.split(' ')[0]}, רק לאשר את הפגישה: ${m.title} ב-${m.date} ${timeStr}${m.location ? ` (${m.location})` : ''} 😊`;
    return `https://wa.me/${formatWaPhone(parent.phone)}?text=${encodeURIComponent(msg)}`;
  }

  function cancelMeetup(id: string) {
    if (!confirm('לבטל את המפגש?')) return;
    deletePlannedMeetup(id);
    setMeetups(getPlannedMeetups());
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">טוען...</div>
    </div>
  );

  const EventRow = ({ m, isPast }: { m: PlannedMeetup; isPast: boolean }) => {
    const icon   = MEETUP_TYPE_DEFS.find(t => t.value === m.type)?.icon ?? '🎉';
    const kids   = m.friendIds.map(id => getFriendById(id)).filter(Boolean) as Friend[];
    const dl     = eventDateLabel(m.date, todayStr);
    const isToday = m.date === todayStr;

    return (
      <div className={clsx(
        'bg-white rounded-xl border px-3 py-2.5 mb-1.5',
        isToday ? 'border-[#534AB7] shadow-sm' : 'border-[#e0ddf0]',
        isPast && 'opacity-50'
      )} dir="rtl">

        {/* Main row: event info (right) + friend circles (left) */}
        <div className="flex items-center gap-2">
          {/* Event info */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span className="text-base shrink-0 mt-0.5">{icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={clsx('text-[13px] font-semibold truncate', isPast ? 'text-gray-500' : 'text-gray-900')}>{m.title}</p>
                {isToday && <span className="text-[9px] bg-[#534AB7] text-white px-1.5 py-0.5 rounded-full shrink-0">היום</span>}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {dl} · {formatTime(m.timeFrom)}–{formatTime(m.timeTo)}
              </p>
              {(() => {
                const addr = getNavAddress(m);
                const display = addr || m.location;
                return display ? <p className="text-[10px] text-gray-400 mt-0.5 truncate">📍 {display}</p> : null;
              })()}
            </div>
          </div>

          {/* Friend circles on the LEFT */}
          {kids.length > 0 && (
            <div className="flex flex-col items-center gap-1 shrink-0">
              {kids.map(k => {
                const colors = AVATAR_COLORS[k.avatarColor] ?? AVATAR_COLORS['purple'];
                const firstName = k.name.split(' ')[0];
                const fontSize = firstName.length > 4 ? 'text-[8px]' : 'text-[9px]';
                return (
                  <Link key={k.id} href={`/friends/${k.id}`}
                    className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-center leading-tight px-1',
                      colors.bg, colors.text, fontSize
                    )}
                  >
                    {firstName}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isPast && (
          <div className="flex gap-1.5 mt-2.5" dir="rtl">
            {/* הודעה */}
            {(() => {
              const url = buildWaContactUrl(m);
              return url ? (
                <button
                  onClick={() => window.open(url, '_blank')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#25D366] rounded-lg"
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3 shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  <span className="text-[10px] text-white font-medium">הודעה</span>
                </button>
              ) : null;
            })()}

            {/* נווט */}
            {(() => {
              const addr = getNavAddress(m);
              return addr ? (
                <button
                  onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`, '_blank')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#EEEDFE] rounded-lg"
                >
                  <span className="text-[13px]">🗺️</span>
                  <span className="text-[10px] text-[#534AB7] font-medium">נווט</span>
                </button>
              ) : null;
            })()}

            {/* הוסף ללוח */}
            <button
              onClick={() => window.open(buildGCalUrl(m), '_blank')}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#EEEDFE] rounded-lg"
            >
              <span className="text-[13px]">📅</span>
              <span className="text-[10px] text-[#534AB7] font-medium">ללוח</span>
            </button>

            {/* בטל מפגש */}
            <button
              onClick={() => cancelMeetup(m.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-50 rounded-lg"
            >
              <span className="text-[13px]">🗑️</span>
              <span className="text-[10px] text-red-400 font-medium">בטל</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb] overflow-hidden">
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <Link
          href="/meetups/new"
          className="text-white/90 text-[12px] bg-white/20 rounded-full px-3 py-1.5"
        >
          + צור מפגש
        </Link>
        <span className="text-white text-[15px] font-medium">לוז</span>
        {profile ? (
          <ChildSwitcher
            profile={profile}
            onSwitch={() => loadProfile()}
            onAdd={() => router.push('/children/add')}
          />
        ) : <div className="w-24" />}
      </header>

      <main className="flex-1 overflow-y-auto p-3">
        {meetups.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#EEEDFE] flex items-center justify-center text-3xl">📋</div>
            <p className="text-gray-500 text-[15px] font-medium">הלוז ריק</p>
            <p className="text-gray-400 text-[13px] text-center px-8">קבע פליידייטים ואירועים — הם יופיעו כאן לפי סדר</p>
            <Link href="/meetups" className="bg-[#534AB7] text-white text-[14px] font-medium px-6 py-3 rounded-xl">
              לפליידייט →
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-medium text-gray-400 mb-2 px-1" dir="rtl">קרובים</p>
                {upcoming.map(m => <EventRow key={m.id} m={m} isPast={false} />)}
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="text-[12px] font-medium text-gray-300 mb-2 px-1" dir="rtl">עבר</p>
                {past.map(m => <EventRow key={m.id} m={m} isPast={true} />)}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  );
}
