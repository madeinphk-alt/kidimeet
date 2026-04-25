'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { saveProfile, getInitials, pickColor, DEFAULT_DAY_SLOT } from '@/lib/storage';
import type { DaySlot } from '@/lib/storage';
import DayAvailPicker from '@/components/DayAvailPicker';

const HEB_DAYS_SINGLE = ['א','ב','ג','ד','ה','ו','ש'];

const STEPS = ['הילד', 'ההורה', 'כתובת', 'זמינות'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 — Child
  const [childName, setChildName] = useState('');
  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');

  // Step 2 — Parent
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'mom' | 'dad'>('mom');

  // Step 3 — Address
  const [address, setAddress] = useState('');
  const [buildingDetails, setBuildingDetails] = useState('');

  // Step 4 — Availability
  const [avail, setAvail] = useState<Record<number, DaySlot>>(() => {
    const r: Record<number, DaySlot> = {};
    for (let i = 0; i < 7; i++) r[i] = { ...DEFAULT_DAY_SLOT };
    return r;
  });

  const toggleDay = (i: number) => {
    setAvail(a => ({ ...a, [i]: { ...a[i], active: !a[i].active } }));
  };

  const updateSlot = (i: number, updated: DaySlot) => {
    setAvail(a => ({ ...a, [i]: updated }));
  };

  const canNext = [
    childName.trim() && school.trim() && className.trim(),
    parentName.trim() && phone.trim(),
    address.trim(),
    Object.values(avail).some(d => d.active),
  ];

  const finish = () => {
    const childId = `child-${Date.now()}`;
    saveProfile({
      children: [{
        id: childId,
        name: childName.trim(),
        school: school.trim(),
        className: className.trim(),
        avatarInitials: getInitials(childName),
        avatarColor: pickColor(childName),
        availability: avail,
      }],
      activeChildId: childId,
      parent: {
        name: parentName.trim(),
        phone: phone.trim(),
        role,
        address: address.trim(),
        buildingDetails: buildingDetails.trim(),
      },
    });
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-4">
        <h1 className="text-white text-[17px] font-medium text-center">KidiMeet</h1>
        <p className="text-white/70 text-[12px] text-center mt-0.5">הגדרה ראשונית</p>
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
      <div className="flex-1 p-4">

        {/* ── Step 0: Child ── */}
        {step === 0 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">פרטי הילד</h2>
            <p className="text-[13px] text-gray-400 mb-5">נתחיל עם השם, בית הספר והכיתה</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם הילד</label>
            <input
              value={childName}
              onChange={e => setChildName(e.target.value)}
              placeholder="לדוגמא: יהלי ברק"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-4 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם בית הספר</label>
            <input
              value={school}
              onChange={e => setSchool(e.target.value)}
              placeholder="לדוגמא: בית ספר רמות"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-4 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">כיתה</label>
            <input
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder="לדוגמא: ב'1"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-4 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />
          </div>
        )}

        {/* ── Step 1: Parent ── */}
        {step === 1 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">פרטי ההורה</h2>
            <p className="text-[13px] text-gray-400 mb-5">מי מנהל את הפרופיל הזה?</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שמך</label>
            <input
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              placeholder="לדוגמא: דנה ברק"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-4 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">טלפון</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="052-0000000"
              type="tel"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-4 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />

            <label className="block text-[12px] font-medium text-gray-500 mb-2">אני</label>
            <div className="grid grid-cols-2 gap-2">
              {(['mom', 'dad'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={clsx(
                    'py-3 rounded-xl border text-[15px] transition-colors',
                    role === r ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-600'
                  )}
                >
                  {r === 'mom' ? 'אמא' : 'אבא'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Address ── */}
        {step === 2 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">הכתובת שלך</h2>
            <p className="text-[13px] text-gray-400 mb-5">כשמפגש יהיה אצלך, הורים אחרים יראו את הפרטים האלה</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">רחוב ומספר בית</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="לדוגמא: רחוב הורד 12, רמות"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-4 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
              פרטי כניסה <span className="font-normal opacity-60">(אופציונלי)</span>
            </label>
            <input
              value={buildingDetails}
              onChange={e => setBuildingDetails(e.target.value)}
              placeholder="קומה 2, קוד כניסה: 1234"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-2 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />
            <p className="text-[11px] text-gray-400">פרטים אלה יישלחו להורים רק כשמפגש אושר</p>
          </div>
        )}

        {/* ── Step 3: Availability ── */}
        {step === 3 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">הימים הפנויים</h2>
            <p className="text-[13px] text-gray-400 mb-4">באילו ימים בדרך כלל פנוי לפגישות?</p>

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
              <p className="text-[13px] text-gray-400 text-center mt-4">בחר לפחות יום אחד</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-[15px]"
            >
              חזרה
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
            {step < 3 ? 'המשך' : 'בוא נתחיל!'}
          </button>
        </div>
      </div>
    </div>
  );
}
