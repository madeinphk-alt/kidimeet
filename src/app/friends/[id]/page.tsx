'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { getFriends, deleteFriend, getPlannedMeetups, getProfile, getActiveChild, MEETUP_TYPE_DEFS, formatTime } from '@/lib/storage';
import type { Friend, PlannedMeetup, UserProfile } from '@/lib/storage';
import { AVATAR_COLORS, HEB_DAYS } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';

const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function FriendProfile() {
  const params   = useParams();
  const router   = useRouter();
  const friendId = params.id as string;

  const [friend,         setFriend]         = useState<Friend | null>(null);
  const [meetups,        setMeetups]        = useState<PlannedMeetup[]>([]);
  const [profile,        setProfile]        = useState<UserProfile | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  useEffect(() => {
    const f = getFriends().find(x => x.id === friendId);
    setFriend(f ?? null);
    const all = getPlannedMeetups().filter(m => m.friendIds.includes(friendId));
    setMeetups(all.sort((a, b) => b.date.localeCompare(a.date)));
    setProfile(getProfile());
  }, [friendId]);

  if (!friend) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">חבר לא נמצא</div>
  );

  const colors    = AVATAR_COLORS[friend.avatarColor] ?? AVATAR_COLORS['purple'];
  const myChild   = profile ? getActiveChild(profile).name : '';
  const activeDays = Object.entries(friend.availability)
    .filter(([, s]) => s.active)
    .map(([d]) => HEB_DAYS[Number(d)])
    .join(', ');

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#f7f6fb]">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white/80 text-xl w-8">‹</button>
        <span className="text-white text-[15px] font-medium">{friend.name}</span>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { deleteFriend(friend.id); router.replace('/friends'); }}
              className="text-[12px] bg-red-500 text-white px-3 py-1 rounded-full"
            >מחק</button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[12px] bg-white/20 text-white px-3 py-1 rounded-full"
            >ביטול</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[12px] text-white/70 bg-white/10 px-3 py-1 rounded-full"
          >הסר</button>
        )}
      </header>

      {/* Profile card */}
      <div className="bg-white px-4 py-5 border-b border-[#e0ddf0] flex items-center gap-4" dir="rtl">
        <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0', colors.bg, colors.text)}>
          {friend.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-gray-900">{friend.name}</p>
          {(friend.school || friend.className) && (
            <p className="text-[12px] text-gray-500 mt-0.5">
              {[friend.className, friend.school].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-[12px] text-gray-400 mt-0.5">
            {friend.parents.map(p => `${p.name} (${p.role === 'mom' ? 'אמא' : 'אבא'})`).join(' + ')}
          </p>
          {activeDays && (
            <p className="text-[11px] text-[#534AB7] mt-1">פנוי: {activeDays}</p>
          )}
          {friend.availabilityPending && (
            <p className="text-[11px] text-amber-500 mt-1">⏳ ממתין לאישור זמינות</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">

        {/* Last met summary */}
        {meetups.length > 0 && (() => {
          const last = meetups[0];
          const d    = new Date(last.date + 'T00:00:00');
          const hostLabel = last.host === 'us' ? 'אצלנו' : last.host === 'them' ? `אצל ${friend.name.split(' ')[0]}` : '';
          return (
            <div className="bg-[#EEEDFE] rounded-xl border border-[#c0bce0] px-4 py-3" dir="rtl">
              <p className="text-[11px] font-medium text-[#534AB7] mb-0.5">מפגש אחרון</p>
              <p className="text-[14px] font-semibold text-gray-800">
                {d.getDate()} ב{HEB_MONTHS[d.getMonth()]} {d.getFullYear()}
                {hostLabel ? ` · ${hostLabel}` : ''}
              </p>
              {last.title && <p className="text-[12px] text-gray-500 mt-0.5">{last.title}</p>}
            </div>
          );
        })()}

        {/* Meetup history */}
        <div>
          <p className="text-[12px] font-medium text-gray-400 mb-2 px-1" dir="rtl">
            היסטוריית מפגשים ({meetups.length})
          </p>
          {meetups.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e0ddf0] p-6 text-center">
              <p className="text-gray-400 text-[13px]">עדיין לא נפגשתם עם {myChild}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e0ddf0] overflow-hidden">
              {meetups.map((m, i) => {
                const d         = new Date(m.date + 'T00:00:00');
                const icon      = MEETUP_TYPE_DEFS.find(t => t.value === m.type)?.icon ?? '🎉';
                const hostLabel = m.host === 'us' ? '🏠 אצלנו' : m.host === 'them' ? '🚶 אצלהם' : '';
                return (
                  <div key={m.id}
                    className={clsx('px-4 py-3 flex items-center justify-between gap-2',
                      i < meetups.length - 1 && 'border-b border-[#f0eef8]'
                    )}
                    dir="rtl"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-lg shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-gray-800 truncate">{m.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {d.getDate()} ב{HEB_MONTHS[d.getMonth()]} {d.getFullYear()} · {formatTime(m.timeFrom)}–{formatTime(m.timeTo)}
                        </p>
                      </div>
                    </div>
                    {hostLabel && (
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full shrink-0',
                        m.host === 'us' ? 'bg-[#EEEDFE] text-[#534AB7]' : 'bg-gray-100 text-gray-500'
                      )}>
                        {hostLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit button */}
        <a
          href={`/friends/add?id=${friend.id}`}
          className="block w-full text-center bg-[#534AB7] text-white py-3 rounded-xl text-[14px] font-medium mt-1"
        >
          ערוך פרטים
        </a>
      </div>
      <BottomNav active="friends" />
    </div>
  );
}

export default function FriendProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">טוען...</div>}>
      <FriendProfile />
    </Suspense>
  );
}
