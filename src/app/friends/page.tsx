'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { differenceInDays } from 'date-fns';
import { getFriends, getProfile, getActiveChild, getPlannedMeetups, getMsgTemplates, applyMsgTemplate } from '@/lib/storage';
import type { Friend, UserProfile } from '@/lib/storage';
import BottomNav from '@/components/BottomNav';
import ChildSwitcher from '@/components/ChildSwitcher';

function formatWaPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  return '972' + d;
}

const HEB_DAYS_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

function custodyLabel(days: number[]): string | null {
  if (!days || days.length === 0) return null;
  return days.map(d => HEB_DAYS_SHORT[d]).join(' ');
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setFriends(getFriends());
    setProfile(getProfile());
  }, []);

  const activeFriends = friends.filter(f =>
    !f.childId || f.childId === 'legacy' || f.childId === profile?.activeChildId
  );

  // ── Last-met map ──────────────────────────────────────────────────────────
  const meetups = getPlannedMeetups();
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const lastMetMap = new Map<string, { days: number; host?: 'us' | 'them' }>();
  meetups.forEach(m => {
    m.friendIds.forEach(fid => {
      const d    = differenceInDays(todayDate, new Date(m.date + 'T00:00:00'));
      const prev = lastMetMap.get(fid);
      if (!prev || d < prev.days) lastMetMap.set(fid, { days: d, host: m.host });
    });
  });

  const lastMetLabel = (fid: string): string => {
    const e = lastMetMap.get(fid);
    if (!e) return 'טרם נפגשו';
    if (e.days === 0) return 'היום';
    if (e.days === 1) return 'אתמול';
    if (e.days <= 7)  return `לפני ${e.days} ימים`;
    if (e.days <= 14) return 'לפני שבועיים';
    return `לפני ${Math.round(e.days / 7)} שבועות`;
  };

  const lastMetHostLabel = (fid: string): string | null => {
    const e = lastMetMap.get(fid);
    if (!e?.host) return null;
    return e.host === 'us' ? 'אצלנו' : 'אצלהם';
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openWa = (phone: string, msg: string) =>
    window.open(`https://wa.me/${formatWaPhone(phone)}?text=${encodeURIComponent(msg)}`, '_blank');

  const buildVars = (friend: Friend, parent: { name: string; phone: string }) => ({
    parentFirst: parent.name.split(' ')[0],
    myName:      profile?.parent.name.split(' ')[0] ?? '',
    myChild:     getActiveChild(profile!).name.split(' ')[0],
    friendName:  friend.name.split(' ')[0],
    role:        profile?.parent.role === 'mom' ? 'אמא' : 'אבא',
  });

  const buildProposeMsg = (friend: Friend, parent: { name: string; phone: string }, variant: 1 | 2 = 1): string => {
    if (!profile) return '';
    const tpl = variant === 2 ? getMsgTemplates().propose2 : getMsgTemplates().propose1;
    return applyMsgTemplate(tpl, buildVars(friend, parent));
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb] overflow-hidden">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <Link href="/friends/add" className="text-white/90 text-[12px] bg-white/20 rounded-full px-3 py-1.5">
          + הוסף
        </Link>
        <span className="text-white text-[15px] font-medium">חברים</span>
        {profile ? (
          <ChildSwitcher profile={profile} onSwitch={() => { setFriends(getFriends()); setProfile(getProfile()); }} onAdd={() => router.push('/children/add')} />
        ) : <div className="w-16" />}
      </header>

      <main className="flex-1 overflow-y-auto p-3">
        {activeFriends.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#EEEDFE] flex items-center justify-center text-2xl">👫</div>
            <p className="text-gray-500 text-[15px] font-medium">עדיין אין חברים</p>
            <p className="text-gray-400 text-[13px] text-center px-8">הוסף חברים מהכיתה כדי לעקוב אחרי מי פנוי ומתי</p>
            <Link href="/friends/add" className="bg-[#534AB7] text-white text-[14px] font-medium px-6 py-3 rounded-xl">
              הוסף חבר ראשון
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeFriends.map(friend => {
              const fFirst      = friend.name.split(' ')[0];
              const parentNames = friend.parents.map(p => p.name.split(' ')[0]).join(' ו');
              const metLabel    = lastMetLabel(friend.id);
              const hostLabel   = lastMetHostLabel(friend.id);
              const isUrgent    = !lastMetMap.has(friend.id);

              return (
                <div key={friend.id} className="bg-white rounded-xl border border-[#e0ddf0] overflow-hidden" dir="rtl">

                  {/* ── Info row — לחיץ לפרופיל ──────────────────────────── */}
                  <Link href={`/friends/${friend.id}`} className="px-4 py-3 flex items-center gap-0 active:bg-gray-50">
                    <span className="text-[15px] font-semibold text-gray-900 shrink-0">{fFirst}</span>
                    {parentNames && (
                      <>
                        <span className="mx-2 text-gray-200 shrink-0">|</span>
                        <span className="text-[13px] text-gray-500 shrink-0">של {parentNames}</span>
                      </>
                    )}
                    <span className="mx-2 text-gray-200 shrink-0">|</span>
                    <span className={clsx('text-[12px] truncate flex-1', isUrgent ? 'text-orange-500 font-medium' : 'text-gray-400')}>
                      {metLabel}{hostLabel ? ` · ${hostLabel}` : ''}
                    </span>
                    <span className="text-[15px] mr-2 shrink-0">👤</span>
                  </Link>

                  {/* ── שורה לכל הורה: זמינות + הודעה + הצעות ──────────── */}
                  {friend.parents.filter(p => p.phone).map((p, i) => {
                    const days = custodyLabel(p.custodyDays);
                    return (
                      <div key={i} className="border-t border-[#f0eef8]" dir="rtl">
                        {days && (
                          <div className="px-3 pt-1.5 flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">ימים:</span>
                            <span className="text-[10px] text-[#534AB7] font-medium">{days}</span>
                          </div>
                        )}
                        <div className="px-3 py-2 flex items-center gap-2">
                          <button
                            onClick={() => window.open(`https://wa.me/${formatWaPhone(p.phone)}`, '_blank')}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 shrink-0">
                            <span className="text-[#25D366]"><WaIcon /></span>
                            הודעה ל{p.name.split(' ')[0]}
                          </button>
                          {profile && (
                            <>
                              <button
                                onClick={() => openWa(p.phone, buildProposeMsg(friend, p, 1))}
                                className="px-2 py-1.5 rounded-lg bg-[#25D366] text-white text-[11px] font-medium">
                                נוסח #1
                              </button>
                              <button
                                onClick={() => openWa(p.phone, buildProposeMsg(friend, p, 2))}
                                className="px-2 py-1.5 rounded-lg bg-[#1aab55] text-white text-[11px] font-medium">
                                נוסח #2
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="px-4 py-2.5 bg-[#f7f6fb] border-t border-[#e8e5f5]">
        <Link
          href="/friends/add"
          className="block w-full bg-[#534AB7] text-white text-[15px] font-medium text-center py-3 rounded-xl"
        >
          + הוסף חבר.ה
        </Link>
      </div>
      <BottomNav active="friends" />
    </div>
  );
}
