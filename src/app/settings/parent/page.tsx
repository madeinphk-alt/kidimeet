'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { getProfile, saveProfile } from '@/lib/storage';

export default function EditParentPage() {
  const router = useRouter();

  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]        = useState('');
  const [phone,           setPhone]           = useState('');
  const [role,            setRole]            = useState<'mom' | 'dad'>('mom');
  const [address,         setAddress]         = useState('');
  const [buildingDetails, setBuildingDetails] = useState('');
  const [saved,           setSaved]           = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (!p) { router.replace('/onboarding'); return; }
    const parts = p.parent.name.trim().split(' ');
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' ') ?? '');
    setPhone(p.parent.phone);
    setRole(p.parent.role);
    setAddress(p.parent.address ?? '');
    setBuildingDetails(p.parent.buildingDetails ?? '');
  }, [router]);

  const canSave = firstName.trim() && phone.trim();

  const handleSave = () => {
    const p = getProfile();
    if (!p) return;
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    saveProfile({
      ...p,
      parent: { ...p.parent, name: fullName, phone: phone.trim(), role, address: address.trim(), buildingDetails: buildingDetails.trim() },
    });
    setSaved(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb]">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white/80 text-[13px] bg-white/15 rounded-full px-3 py-1.5">
          ← חזרה
        </button>
        <span className="text-white text-[15px] font-medium">פרטי ההורה</span>
        <div className="w-16" />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-4 flex flex-col gap-4" dir="rtl">

          {/* שם פרטי + משפחה */}
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם</label>
            <div className="flex gap-2">
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="שם פרטי"
                className="w-0 flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-[#fafafa]"
                dir="rtl"
              />
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="משפחה"
                className="w-0 flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-[#fafafa]"
                dir="rtl"
              />
            </div>
          </div>

          {/* טלפון */}
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">טלפון</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="052-0000000"
              type="tel"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-[#fafafa]"
              dir="rtl"
            />
          </div>

          {/* אמא / אבא */}
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">אני</label>
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

        </div>

        {/* כתובת */}
        <div className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-4 flex flex-col gap-4 mt-3" dir="rtl">
          <p className="text-[11px] font-medium text-gray-400">כתובת</p>

          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">רחוב ומספר בית</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="לדוגמא: רחוב הורד 12, רמות"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-[#fafafa]"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
              תיאור נוסף <span className="font-normal opacity-60">(קומה, קוד, מספר דלת ומה שיעזור למצוא בקלות)</span>
            </label>
            <input
              value={buildingDetails}
              onChange={e => setBuildingDetails(e.target.value)}
              placeholder="קומה 2, קוד כניסה 1234, דלת ימין"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-[#fafafa]"
              dir="rtl"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">יישלח להורים רק כשמפגש אצלך מאושר</p>
          </div>
        </div>

      </main>

      {/* Save button */}
      <div className="p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={clsx(
            'w-full py-3.5 rounded-xl text-white text-[15px] font-medium transition-all',
            saved ? 'bg-green-500' : canSave ? 'bg-[#534AB7]' : 'bg-[#534AB7] opacity-40'
          )}
        >
          {saved ? '✓ נשמר' : 'שמור'}
        </button>
      </div>
    </div>
  );
}
