'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  getProfile, saveProfile, getActiveChild, switchActiveChild, DEFAULT_DAY_SLOT,
} from '@/lib/storage';
import { openWa } from '@/lib/wa';
import type { UserProfile, ChildProfile, DaySlot } from '@/lib/storage';
import { AVATAR_COLORS, HEB_DAYS_SINGLE } from '@/lib/utils';
import DayAvailPicker from '@/components/DayAvailPicker';
import BottomNav from '@/components/BottomNav';
import ChildSwitcher from '@/components/ChildSwitcher';

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  // which child we're currently editing availability for
  const [editChildId, setEditChildId] = useState<string>('');
  const [avail, setAvail] = useState<Record<number, DaySlot>>(() => {
    const r: Record<number, DaySlot> = {};
    for (let i = 0; i < 7; i++) r[i] = { ...DEFAULT_DAY_SLOT };
    return r;
  });
  const [saved, setSaved] = useState(false);

  // Load profile once — create empty default if none exists
  useEffect(() => {
    const p = getProfile();
    if (p) {
      setProfile(p);
      const child = getActiveChild(p);
      setEditChildId(child.id);
      setAvail(child.availability ?? {});
    }
    // no profile → page renders empty, user can fill via פרטי ההורה
  }, []);

  // When editChildId changes, load that child's availability (and flush prev changes first)
  const switchToChild = useCallback((p: UserProfile, childId: string) => {
    const child = p.children.find(c => c.id === childId);
    if (!child) return;
    setEditChildId(childId);
    setAvail(child.availability ?? {});
    // also update the global activeChildId so the rest of the app follows
    const updated = switchActiveChild(p, childId);
    saveProfile(updated);
    setProfile(updated);
  }, []);

  const toggleDay = (i: number) => {
    setAvail(a => ({ ...a, [i]: { ...a[i], active: !a[i].active } }));
    setSaved(false);
  };

  const updateSlot = (i: number, updated: DaySlot) => {
    setAvail(a => ({ ...a, [i]: updated }));
    setSaved(false);
  };

  const handleSave = () => {
    if (!profile) return;
    const updatedChildren = profile.children.map(c =>
      c.id === editChildId ? { ...c, availability: avail } : c
    );
    const updatedProfile = { ...profile, children: updatedChildren };
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const editChild = profile?.children.find(c => c.id === editChildId) ?? profile?.children[0];

  return (
    <div className="flex flex-col h-full bg-[#f7f6fb] overflow-hidden">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <span className="text-white text-[15px] font-medium">פרופיל</span>
        <div className="flex items-center gap-2">
          {profile && (
            <ChildSwitcher
              profile={profile}
              onSwitch={(childId) => switchToChild(profile, childId)}
              onAdd={() => router.push('/children/add')}
            />
          )}
          <button
            onClick={handleSave}
            className={clsx(
              'text-[13px] rounded-full px-3 py-1 transition-colors',
              saved ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
            )}
          >
            {saved ? '✓ נשמר' : 'שמור'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3">

        {/* ── Children section ─────────────────────────────────────────── */}
        <div className="mb-3">
          <p className="text-[11px] font-medium text-gray-400 mb-2 text-right">הילדים שלי</p>

          <div className="flex flex-col gap-2" dir="rtl">
            {(profile?.children ?? []).map(child => {
              const colors = AVATAR_COLORS[child.avatarColor] ?? AVATAR_COLORS['purple'];
              const isActive = child.id === editChildId;
              return (
                <button
                  key={child.id}
                  onClick={() => profile && switchToChild(profile, child.id)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-right',
                    isActive
                      ? 'border-[#534AB7] bg-[#EEEDFE] shadow-sm'
                      : 'border-[#e0ddf0] bg-white'
                  )}
                >
                  <div className={clsx(
                    'w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0',
                    colors.bg, colors.text
                  )}>
                    {child.avatarInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-[15px] font-semibold', isActive ? 'text-[#534AB7]' : 'text-gray-900')}>
                      {child.name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {[child.className, child.school].filter(Boolean).join(' · ') || 'לא הוגדר בית ספר'}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {isActive && <span className="text-[#534AB7] text-base">✓</span>}
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/children/add?id=${child.id}`); }}
                      className="text-[11px] text-gray-400 bg-gray-100 rounded-lg px-2 py-1"
                    >
                      ערוך
                    </button>
                  </div>
                </button>
              );
            })}

            {/* Add child */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => router.push('/children/add')}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-[14px] text-gray-500 bg-white"
              >
                <span className="text-[#534AB7] font-bold text-lg">+</span>
                הוסף ילד
              </button>
              <p className="text-[10px] text-gray-400 text-center" dir="rtl">
                הפרטים שלכם נשמרים רק אצלכם ולא עוברים לאף גורם אחר*
              </p>
            </div>
          </div>
        </div>

        {/* ── Availability for selected child ──────────────────────────── */}
        <div className="mb-3">
          <p className="text-[11px] font-medium text-gray-400 mb-1 text-right">
            ימים פנויים — {editChild?.name}
          </p>
          <p className="text-[11px] text-gray-400 mb-2 text-right">
            מתי {editChild?.name?.split(' ')[0]} יכול להיפגש עם חברים?
          </p>

          {/* Day toggles */}
          <div className="flex justify-between mb-4">
            {HEB_DAYS_SINGLE.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={clsx(
                  'w-9 h-9 rounded-full text-[13px] font-medium transition-colors',
                  avail[i]?.active ? 'bg-[#534AB7] text-white' : 'bg-[#e8e6f0] text-gray-500'
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Per-day slot pickers */}
          {Array.from({ length: 7 }, (_, i) => i).map(i => {
            if (!avail[i]?.active) return null;
            return (
              <DayAvailPicker
                key={`${editChildId}-${i}`}
                dayIndex={i}
                slot={avail[i]}
                onChange={updated => updateSlot(i, updated)}
              />
            );
          })}

          {!Object.values(avail).some(d => d.active) && (
            <p className="text-[12px] text-gray-400 text-center mt-2 py-6 bg-white rounded-xl border border-[#e0ddf0]">
              לחץ על יום כדי להוסיף זמינות
            </p>
          )}
        </div>

        {/* ── Parent info ──────────────────────────────────────────────── */}
        <div className="mb-3">
          <p className="text-[11px] font-medium text-gray-400 mb-2 text-right">פרטי ההורה</p>
          <button
            onClick={() => router.push('/settings/parent')}
            className="w-full bg-white rounded-xl border border-[#e0ddf0] px-4 py-3 text-right"
            dir="rtl"
          >
            <p className="text-[14px] font-semibold text-gray-900">{profile?.parent.name || '—'}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{profile?.parent.phone || '—'}</p>
            {profile?.parent.address && (
              <p className="text-[11px] text-gray-400 mt-0.5">📍 {profile.parent.address}</p>
            )}
          </button>
        </div>

        {/* ── Message Templates ────────────────────────────────────────────── */}
        <div className="mb-3">
          <p className="text-[11px] font-medium text-gray-400 mb-2 text-right">הודעות</p>
          <button
            onClick={() => router.push('/settings/messages')}
            className="w-full bg-white rounded-xl border border-[#e0ddf0] px-4 py-3 text-right"
            dir="rtl"
          >
            <p className="text-[14px] font-semibold text-gray-900">עריכת הודעות</p>
            <p className="text-[12px] text-gray-400 mt-0.5">עריכת נוסח ההודעות הוואטסאפ שישלחו להורים</p>
          </button>
        </div>

        {/* Share box */}
        <button
          onClick={() => openWa('', 'היי, לאחרונה גילינו אפליקציה חדשה שעוזרת לנו במשפחה לקבוע יותר מפגשים לילדים בחיים העמוסים האלה. חשבנו אולי זה יעזור לכם גם אז מוזמנים לנסות. https://kidimeet.vercel.app/\nאגב זה פיתוח פרדסחנאי. תהנו')}
          className="w-full bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-5 py-4 text-center active:opacity-70 mt-2"
          dir="rtl"
        >
          <p className="text-[13px] text-green-800 leading-relaxed">
            אם אהבתם מוזמנים להעביר לעוד חברים מפרדס חנה בלבד כרגע כי רק עליהם אנחנו סומכים בינתיים 😊
          </p>
        </button>

        {/* Feedback box */}
        <button
          onClick={() => openWa('972546545850', 'היי, אני נעזר בקידימיט ואשמח לתת לכם פידבוק')}
          className="w-full bg-[#EEEDFE] border border-[#c0bce0] rounded-xl px-5 py-4 text-center active:opacity-70 mt-2"
          dir="rtl"
        >
          <p className="text-[13px] text-[#534AB7] leading-relaxed">
            אהבתם את מה שיצרנו? ממש נשמח לקבל מכם פידבק כדי לשפר.{' '}
            <span className="font-semibold underline">פשוט לחצו כאן</span>
          </p>
        </button>

      </main>

      <BottomNav active="settings" />
    </div>
  );
}
