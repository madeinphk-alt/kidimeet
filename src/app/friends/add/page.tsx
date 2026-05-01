'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { getFriends, saveFriend, getProfile, getInitials, pickColor, DEFAULT_DAY_SLOT, FRIEND_GROUP_LABELS, getActiveChild } from '@/lib/storage';
import type { DaySlot, FriendParent, Friend, FriendGroup, UserProfile } from '@/lib/storage';
import { HEB_DAYS, HEB_DAYS_SINGLE } from '@/lib/utils';
import DayAvailPicker from '@/components/DayAvailPicker';
import BottomNav from '@/components/BottomNav';

const STEPS = ['הילד', 'ההורים', 'זמינות', 'הערות'];
const DEFAULT_PARENT: FriendParent = { name: '', phone: '', role: 'mom', custodyDays: [] };

function formatWaPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  return '972' + d;
}

function buildAvailabilityWaMessage(profile: UserProfile, friendChildName: string, parent: FriendParent): string {
  const myName = profile.parent.name;
  const myChildName = getActiveChild(profile).name;
  const role = profile.parent.role === 'mom' ? 'אמא' : 'אבא';
  const parentFirst = parent.name.split(' ')[0];

  return (
    `היי ${parentFirst} 👋\n` +
    `זה ${myName} ${role} של ${myChildName}\n` +
    `הייתי שמח לעזור לילדים להיפגש יותר\n` +
    `ואשמח אם תגיד לי באלו ימים ${friendChildName} יהיה פנוי לפגוש את ${myChildName} 😊\n` +
    `ועוד פרטים שאתה חושב שאני צריך לדעת\n` +
    `ואשמח להכניס את ${friendChildName} ללוז מפגשים המשפחתי שלנו\n\n` +
    `אני עובד עם KidiMeet\n` +
    `אתה מוזמן גם לנסות 👉 www.KidiMeet.co.il`
  );
}

const GROUP_OPTIONS: { value: FriendGroup; icon: string }[] = [
  { value: 'class',    icon: '🏫' },
  { value: 'chug',     icon: '⚽' },
  { value: 'keitana',  icon: '🏕️' },
  { value: 'neighbor', icon: '🏠' },
  { value: 'family',   icon: '👨‍👩‍👧' },
  { value: 'other',    icon: '✨' },
];

function AddFriendForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');

  const [step, setStep] = useState(0);
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName,  setChildLastName]  = useState('');
  const [group, setGroup] = useState<FriendGroup>('class');
  const [groupLabel, setGroupLabel] = useState('');
  const [friendSchool, setFriendSchool] = useState('');
  const [friendClass, setFriendClass] = useState('');
  const [notes, setNotes] = useState('');
  const [friendAddress, setFriendAddress] = useState('');
  const [parents, setParents] = useState<FriendParent[]>([{ ...DEFAULT_PARENT }]);
  const [splitCustody, setSplitCustody] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avail, setAvail] = useState<Record<number, DaySlot>>(() => {
    const r: Record<number, DaySlot> = {};
    for (let i = 0; i < 7; i++) r[i] = { ...DEFAULT_DAY_SLOT };
    return r;
  });

  // Load existing friend if editing, and always load profile
  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    if (editId) {
      const f = getFriends().find(fr => fr.id === editId);
      if (f) {
        const parts = f.name.trim().split(' ');
        setChildFirstName(parts[0] ?? '');
        setChildLastName(parts.slice(1).join(' ') ?? '');
        setGroup(f.group ?? 'class');
        setGroupLabel(f.groupLabel ?? '');
        setFriendSchool(f.school ?? '');
        setFriendClass(f.className ?? '');
        setFriendAddress(f.address ?? '');
        setNotes(f.notes);
        setParents(f.parents.length > 0 ? f.parents : [{ ...DEFAULT_PARENT }]);
        setSplitCustody(f.parents.length > 1);
        setAvail(f.availability);
      }
    }
  }, [editId]);

  // ── Parent helpers ──────────────────────────────────────────────────────
  const updateParent = (idx: number, field: keyof FriendParent, value: string | number[]) => {
    setParents(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const toggleCustodyDay = (parentIdx: number, day: number) => {
    setParents(ps => ps.map((p, i) => {
      if (i !== parentIdx) return p;
      const days = p.custodyDays.includes(day)
        ? p.custodyDays.filter(d => d !== day)
        : [...p.custodyDays, day];
      return { ...p, custodyDays: days };
    }));
  };

  const enableSplit = () => {
    setSplitCustody(true);
    setParents(ps => {
      if (ps.length === 1) return [...ps, { name: '', phone: '', role: 'dad', custodyDays: [] }];
      return ps;
    });
  };

  const disableSplit = () => {
    setSplitCustody(false);
    setParents(ps => [{ ...ps[0], custodyDays: [] }]);
  };

  // ── Availability helpers ────────────────────────────────────────────────
  const toggleDay = (i: number) => {
    setAvail(a => ({ ...a, [i]: { ...a[i], active: !a[i].active } }));
  };

  const updateSlot = (i: number, updated: DaySlot) => {
    setAvail(a => ({ ...a, [i]: updated }));
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const childName = [childFirstName.trim(), childLastName.trim()].filter(Boolean).join(' ');

  const canNext = [
    childFirstName.trim().length > 0,
    parents[0].name.trim().length > 0 && parents[0].phone.trim().length > 0 &&
      (!splitCustody || (parents[1].name.trim().length > 0 && parents[1].phone.trim().length > 0)),
    true, // availability: always ok — can save pending or fill now
    true,
  ];

  // ── Build friend object ─────────────────────────────────────────────────
  const buildFriend = (pending = false): Friend => {
    const resolvedLabel = group === 'class' ? 'כיתה' : (groupLabel.trim() || FRIEND_GROUP_LABELS[group]);
    return {
      id: editId ?? `friend-${Date.now()}`,
      name: childName.trim(),
      avatarInitials: getInitials(childName),
      avatarColor: pickColor(childName),
      group,
      groupLabel: resolvedLabel,
      childId: profile?.activeChildId ?? '',
      school: group === 'class' && friendSchool.trim() ? friendSchool.trim() : undefined,
      className: group === 'class' && friendClass.trim() ? friendClass.trim() : undefined,
      availabilityPending: pending || undefined,
      address: friendAddress.trim() || undefined,
      parents: splitCustody ? parents : [{ ...parents[0], custodyDays: [] }],
      notes: notes.trim(),
      availability: avail,
    };
  };

  // ── Save (normal) ───────────────────────────────────────────────────────
  const finish = () => {
    saveFriend(buildFriend(false));
    router.push('/friends');
  };

  // ── Send WA + save as pending ───────────────────────────────────────────
  const sendAndWait = (parent: typeof parents[0]) => {
    if (!profile) return;
    const msg = buildAvailabilityWaMessage(profile, childFirstName.trim(), parent);
    window.open(`https://wa.me/${formatWaPhone(parent.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
    saveFriend(buildFriend(true));
    router.push('/friends');
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#f7f6fb]">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-4">
        <h1 className="text-white text-[17px] font-medium text-center">
          {editId ? 'עריכת חבר' : 'הוספת חבר'}
        </h1>
      </header>

      {/* Progress */}
      <div className="bg-[#534AB7] pb-4 px-4">
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={clsx(
                'w-7 h-7 rounded-full text-[12px] font-medium flex items-center justify-center transition-colors',
                i < step ? 'bg-white text-[#534AB7]' :
                i === step ? 'bg-white text-[#534AB7]' :
                'bg-white/20 text-white/50'
              )}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={clsx('text-[10px]', i === step ? 'text-white' : 'text-white/40')}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">

        {/* ── Step 0: Child name + group ── */}
        {step === 0 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">שם הילד</h2>
            <p className="text-[13px] text-gray-400 mb-5">שם מלא או כינוי + מאיפה מכירים</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם הילד</label>
            <div className="flex gap-2 mb-5 w-full max-w-sm mx-auto">
              <input
                value={childFirstName}
                onChange={e => setChildFirstName(e.target.value)}
                placeholder="שם פרטי"
                className="w-0 flex-1 border border-gray-200 rounded-xl px-3 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white min-w-0"
                dir="rtl"
                autoFocus
              />
              <input
                value={childLastName}
                onChange={e => setChildLastName(e.target.value)}
                placeholder="משפחה"
                className="w-0 flex-1 border border-gray-200 rounded-xl px-3 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white min-w-0"
                dir="rtl"
              />
            </div>

            <label className="block text-[12px] font-medium text-gray-500 mb-2">מאיפה מכירים?</label>
            <div className="flex flex-wrap gap-2 mb-3" dir="rtl">
              {GROUP_OPTIONS.map(g => (
                <button key={g.value} onClick={() => setGroup(g.value)}
                  className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] transition-colors',
                    group === g.value ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-600')}>
                  <span>{g.icon}</span>
                  <span>{FRIEND_GROUP_LABELS[g.value]}</span>
                </button>
              ))}
            </div>

            {group === 'class' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                    בית ספר <span className="font-normal opacity-60">(אופציונלי)</span>
                  </label>
                  <input
                    value={friendSchool}
                    onChange={e => setFriendSchool(e.target.value)}
                    placeholder='לדוגמא: בית ספר רמות, יסודי הדר...'
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                    כיתה <span className="font-normal opacity-60">(אופציונלי)</span>
                  </label>
                  <input
                    value={friendClass}
                    onChange={e => setFriendClass(e.target.value)}
                    placeholder='לדוגמא: ג׳2, כיתה ד׳...'
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white"
                    dir="rtl"
                  />
                </div>
              </div>
            )}

            {group !== 'class' && (
              <div>
                <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                  שם ה{FRIEND_GROUP_LABELS[group]} <span className="font-normal opacity-60">(אופציונלי)</span>
                </label>
                <input
                  value={groupLabel}
                  onChange={e => setGroupLabel(e.target.value)}
                  placeholder={group === 'chug' ? 'לדוגמא: חוג גודו, חוג כדורגל...' : group === 'keitana' ? 'לדוגמא: קייטנה קיץ 2025...' : ''}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white"
                  dir="rtl"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Parents ── */}
        {step === 1 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">פרטי ההורים</h2>
            <p className="text-[13px] text-gray-400 mb-5">מי אפשר לפנות לתאם מפגש?</p>

            {/* Parent 1 */}
            <div className="bg-white rounded-xl border border-[#e0ddf0] p-4 mb-3">
              <p className="text-[12px] font-medium text-gray-600 mb-3">
                {splitCustody ? 'הורה ראשון' : 'ההורה'}
              </p>

              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם</label>
              <input
                value={parents[0].name}
                onChange={e => updateParent(0, 'name', e.target.value)}
                placeholder="לדוגמא: ליאת לוי"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] text-right mb-3 focus:outline-none focus:border-[#534AB7] bg-white"
                dir="rtl"
              />

              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">טלפון</label>
              <input
                value={parents[0].phone}
                onChange={e => updateParent(0, 'phone', e.target.value)}
                placeholder="052-0000000"
                type="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] text-right mb-3 focus:outline-none focus:border-[#534AB7] bg-white"
                dir="rtl"
              />

              <div className="grid grid-cols-2 gap-2">
                {(['mom', 'dad'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => updateParent(0, 'role', r)}
                    className={clsx(
                      'py-2.5 rounded-xl border text-[14px] transition-colors',
                      parents[0].role === r ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-600'
                    )}
                  >
                    {r === 'mom' ? 'אמא' : 'אבא'}
                  </button>
                ))}
              </div>

              {/* Custody days for parent 1 when split */}
              {splitCustody && (
                <div className="mt-3">
                  <p className="text-[11px] text-gray-400 mb-2">ימי משמורת</p>
                  <div className="flex justify-between">
                    {HEB_DAYS_SINGLE.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => toggleCustodyDay(0, i)}
                        className={clsx(
                          'w-8 h-8 rounded-full text-[12px] font-medium transition-colors',
                          parents[0].custodyDays.includes(i)
                            ? 'bg-[#534AB7] text-white'
                            : 'bg-[#e8e6f0] text-gray-500'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Split custody toggle */}
            {!splitCustody ? (
              <button
                onClick={enableSplit}
                className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-[13px] text-gray-500 mb-3"
              >
                + הורים גרושים / משמורת משותפת
              </button>
            ) : (
              <>
                {/* Parent 2 */}
                <div className="bg-white rounded-xl border border-[#e0ddf0] p-4 mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[12px] font-medium text-gray-600">הורה שני</p>
                    <button
                      onClick={disableSplit}
                      className="text-[11px] text-gray-400"
                    >
                      הסר
                    </button>
                  </div>

                  <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם</label>
                  <input
                    value={parents[1]?.name ?? ''}
                    onChange={e => updateParent(1, 'name', e.target.value)}
                    placeholder="לדוגמא: רון לוי"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] text-right mb-3 focus:outline-none focus:border-[#534AB7] bg-white"
                    dir="rtl"
                  />

                  <label className="block text-[12px] font-medium text-gray-500 mb-1.5">טלפון</label>
                  <input
                    value={parents[1]?.phone ?? ''}
                    onChange={e => updateParent(1, 'phone', e.target.value)}
                    placeholder="052-0000000"
                    type="tel"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] text-right mb-3 focus:outline-none focus:border-[#534AB7] bg-white"
                    dir="rtl"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {(['mom', 'dad'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => updateParent(1, 'role', r)}
                        className={clsx(
                          'py-2.5 rounded-xl border text-[14px] transition-colors',
                          parents[1]?.role === r ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-600'
                        )}
                      >
                        {r === 'mom' ? 'אמא' : 'אבא'}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-gray-400 mb-2">ימי משמורת</p>
                    <div className="flex justify-between">
                      {HEB_DAYS_SINGLE.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => toggleCustodyDay(1, i)}
                          className={clsx(
                            'w-8 h-8 rounded-full text-[12px] font-medium transition-colors',
                            parents[1]?.custodyDays.includes(i)
                              ? 'bg-[#534AB7] text-white'
                              : 'bg-[#e8e6f0] text-gray-500'
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Availability ── */}
        {step === 2 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">מתי {childName} פנוי?</h2>
            <p className="text-[13px] text-gray-400 mb-4">הימים הרגילים לפגישות</p>

            {/* ── "Send & Wait" primary CTA ── */}
            {profile && parents.filter(p => p.phone.trim()).length > 0 && (
              <div className="mb-5" dir="rtl">
                {parents.filter(p => p.phone.trim()).map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendAndWait(p)}
                    className="w-full flex items-center gap-3 bg-[#25D366] text-white px-4 py-4 rounded-2xl mb-2 text-right"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold leading-snug">
                        שאל את {p.name.split(' ')[0]} מתי {childFirstName} פנוי
                      </p>
                      <p className="text-[11px] text-white/80 mt-0.5">
                        שמור וחכה לתשובה
                      </p>
                    </div>
                    <span className="text-white/70 text-lg">›</span>
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 shrink-0">או מלא עכשיו</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Day toggles */}
            <div className="flex justify-between mb-4">
              {HEB_DAYS_SINGLE.map((d, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={clsx(
                    'w-9 h-9 rounded-full text-[13px] font-medium transition-colors',
                    avail[i].active ? 'bg-[#534AB7] text-white' : 'bg-[#e8e6f0] text-gray-500'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Per-day slot + time pickers */}
            {HEB_DAYS_SINGLE.map((_, i) => {
              if (!avail[i].active) return null;
              return (
                <DayAvailPicker
                  key={i}
                  dayIndex={i}
                  slot={avail[i]}
                  onChange={updated => updateSlot(i, updated)}
                />
              );
            })}

            {!Object.values(avail).some(d => d.active) && (
              <p className="text-[12px] text-gray-400 text-center mt-2">בחר ימים פנויים או שלח ל{parents[0]?.name?.split(' ')[0] || 'ההורה'} למעלה</p>
            )}
          </div>
        )}

        {/* ── Step 3: Notes ── */}
        {step === 3 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">הערות על {childName}</h2>
            <p className="text-[13px] text-gray-400 mb-5">חופשי לכתוב כל מה שחשוב לזכור</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">כתובת בית <span className="font-normal opacity-60">(אופציונלי — לניווט)</span></label>
            <input
              value={friendAddress}
              onChange={e => setFriendAddress(e.target.value)}
              placeholder="לדוגמא: רחוב הרצל 12, תל אביב"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-5 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">הערות <span className="font-normal opacity-60">(אופציונלי)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="לדוגמא: צמחוני, אלרגי לאגוזים, אוהב מיינקראפט..."
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-right focus:outline-none focus:border-[#534AB7] bg-white resize-none"
              dir="rtl"
            />

            {/* Summary card */}
            <div className="mt-5 bg-[#EEEDFE] rounded-xl border border-[#c0bce0] p-4">
              <p className="text-[12px] font-medium text-[#534AB7] mb-2">סיכום</p>
              <p className="text-[14px] font-medium text-gray-800">{childName}</p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {parents.map(p => `${p.name} (${p.role === 'mom' ? 'אמא' : 'אבא'})`).join(' + ')}
              </p>
              <p className="text-[12px] text-[#534AB7] mt-1">
                פנוי ב: {Object.entries(avail)
                  .filter(([, s]) => s.active)
                  .map(([d]) => HEB_DAYS[Number(d)])
                  .join(', ') || '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-[15px]"
            >
              חזרה
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-[15px]"
            >
              ביטול
            </button>
          )}
          <button
            onClick={() => step < 3 ? setStep(s => s + 1) : finish()}
            disabled={!canNext[step]}
            className={clsx(
              'flex-1 py-3 rounded-xl text-white text-[15px] font-medium transition-opacity',
              canNext[step] ? 'bg-[#534AB7]' : 'bg-[#534AB7] opacity-40'
            )}
          >
            {step < 3 ? 'המשך' : (editId ? 'שמור שינויים' : 'הוסף חבר')}
          </button>
        </div>
      </div>
      <BottomNav active="friends" />
    </div>
  );
}

export default function AddFriendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">טוען...</div>
      </div>
    }>
      <AddFriendForm />
    </Suspense>
  );
}
