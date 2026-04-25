'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { getProfile, saveProfile, getInitials, pickColor, DEFAULT_DAY_SLOT } from '@/lib/storage';
import type { ChildProfile, DaySlot } from '@/lib/storage';
import DayAvailPicker from '@/components/DayAvailPicker';
import BottomNav from '@/components/BottomNav';

const HEB_DAYS_SINGLE = ['א','ב','ג','ד','ה','ו','ש'];
const STEPS = ['הילד', 'זמינות'];

export default function AddChildPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');

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
    name.trim() && school.trim() && className.trim(),
    Object.values(avail).some(d => d.active),
  ];

  const finish = () => {
    const p = getProfile();
    if (p) {
      const newChild: ChildProfile = {
        id: `child-${Date.now()}`,
        name: name.trim(),
        school: school.trim(),
        className: className.trim(),
        avatarInitials: getInitials(name),
        avatarColor: pickColor(name),
        availability: avail,
      };
      saveProfile({
        ...p,
        children: [...p.children, newChild],
        activeChildId: newChild.id,
      });
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f7f6fb]">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-4">
        <h1 className="text-white text-[17px] font-medium text-center">הוספת ילד</h1>
        <p className="text-white/70 text-[12px] text-center mt-0.5">הגדרת פרופיל לילד נוסף</p>
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
      <div className="flex-1 overflow-y-auto p-4">

        {/* Step 0: Child info */}
        {step === 0 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">פרטי הילד</h2>
            <p className="text-[13px] text-gray-400 mb-5">שם, בית ספר וכיתה</p>

            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם הילד</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="לדוגמא: עומר ברק"
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
              placeholder="לדוגמא: ד'2"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right mb-4 focus:outline-none focus:border-[#534AB7] bg-white"
              dir="rtl"
            />
          </div>
        )}

        {/* Step 1: Availability */}
        {step === 1 && (
          <div>
            <h2 className="text-[17px] font-medium text-gray-800 mb-1">הימים הפנויים</h2>
            <p className="text-[13px] text-gray-400 mb-4">באילו ימים בדרך כלל פנוי {name}?</p>

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
            onClick={() => step < 1 ? setStep(s => s + 1) : finish()}
            disabled={!canNext[step]}
            className={clsx(
              'flex-1 py-3 rounded-xl text-white text-[15px] font-medium transition-opacity',
              canNext[step] ? 'bg-[#534AB7]' : 'bg-[#534AB7] opacity-40'
            )}
          >
            {step < 1 ? 'המשך' : 'הוסף ילד'}
          </button>
        </div>
      </div>
      <BottomNav active="settings" />
    </div>
  );
}
