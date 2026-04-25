'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { addDays, format } from 'date-fns';
import Avatar from '@/components/Avatar';
import { CHILDREN, PARENTS, MY_CHILD_ID } from '@/lib/mock-data';
import { getResponsibleParent, suggestNextHost, formatHebrewDate } from '@/lib/utils';

type Step = 'form' | 'sent';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [hostSide, setHostSide] = useState<'us' | 'them'>('us');
  const [activity, setActivity] = useState('');
  const [step, setStep] = useState<Step>('form');

  const tomorrow = addDays(new Date(), 1);
  const child = CHILDREN.find(c => c.id === childId);
  const myChild = CHILDREN.find(c => c.id === MY_CHILD_ID);
  const responsibleParent = getResponsibleParent(childId, tomorrow);
  const myParent = PARENTS.find(p => p.child_id === MY_CHILD_ID);
  const suggestedHost = suggestNextHost(MY_CHILD_ID, childId);
  const allParents = PARENTS.filter(p => p.child_id === childId);

  if (!child || !myChild) return null;

  // Apply rotation suggestion as default
  const defaultHost = suggestedHost === MY_CHILD_ID ? 'us' : 'them';
  const [init] = useState(() => { setHostSide(defaultHost); return null; });

  const hostChild = hostSide === 'us' ? myChild : child;
  const hostAddress = hostSide === 'us' ? myParent?.address : responsibleParent?.address;
  const previewMsg = `${myChild.name.split(' ')[0]} רוצה להזמין את ${child.name.split(' ')[0]} ${hostSide === 'us' ? 'אליהם' : 'אצלכם'} מחר (${format(tomorrow, 'dd.MM')}). מתאים לכם?`;

  if (step === 'sent') {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-[#534AB7] px-4 py-3">
          <span className="text-white text-[15px] font-medium">נשלח</span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#E1F5EE] border-2 border-[#1D9E75] flex items-center justify-center mb-4">
            <svg width="26" height="26" viewBox="0 0 26 26">
              <path d="M5 13l5 5L21 7" stroke="#1D9E75" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-[18px] font-medium text-gray-900 mb-1">ההזמנה נשלחה!</h1>
          <p className="text-[13px] text-gray-500 mb-6">
            {responsibleParent?.name} תקבל הודעה עכשיו
          </p>

          {/* Preview notification */}
          <div className="bg-white rounded-xl border border-[#e0ddf0] p-3 w-full text-right mb-6">
            <p className="text-[10px] text-gray-400 mb-2">ההתראה שנשלחה:</p>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-[#EEEDFE] flex items-center justify-center text-[12px] font-medium text-[#534AB7] flex-shrink-0">K</div>
              <div>
                <p className="text-[12px] font-medium text-gray-800 mb-1">KidiMeet</p>
                <p className="text-[12px] text-gray-700 leading-relaxed">{previewMsg}</p>
                <div className="flex gap-1.5 mt-2">
                  <span className="text-[11px] bg-[#E1F5EE] text-[#085041] px-2.5 py-1 rounded-full">מאשר</span>
                  <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">דוחה</span>
                  <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">אחר כך</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="bg-gray-100 text-gray-700 px-8 py-2.5 rounded-xl text-[14px]"
          >
            חזרה לבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#534AB7] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 text-xl">›</button>
        <div>
          <p className="text-white text-[15px] font-medium">הזמן את {child.name.split(' ')[0]}</p>
          <p className="text-white/70 text-[11px]">מחר • {formatHebrewDate(tomorrow)}</p>
        </div>
      </header>

      <div className="p-4 flex-1">
        {/* Location toggle */}
        <p className="text-[12px] font-medium text-gray-400 mb-2">היכן יהיה המפגש?</p>
        <div className="grid grid-cols-2 gap-2 mb-1">
          <button
            onClick={() => setHostSide('us')}
            className={`p-3 rounded-xl border text-right transition-all ${hostSide === 'us' ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            <p className="text-[14px] font-medium">אצלנו</p>
            <p className={`text-[11px] mt-0.5 ${hostSide === 'us' ? 'opacity-75' : 'text-gray-400'}`}>{myParent?.address?.split(',')[0]}</p>
          </button>
          <button
            onClick={() => setHostSide('them')}
            className={`p-3 rounded-xl border text-right transition-all ${hostSide === 'them' ? 'bg-[#534AB7] border-[#534AB7] text-white' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            <p className="text-[14px] font-medium">אצלו</p>
            <p className={`text-[11px] mt-0.5 ${hostSide === 'them' ? 'opacity-75' : 'text-gray-400'}`}>{responsibleParent?.address?.split(',')[0]}</p>
          </button>
        </div>
        <p className="text-[11px] text-[#0F6E56] mb-4">
          {suggestedHost === MY_CHILD_ID ? 'מומלץ: אצלנו — המפגש האחרון היה אצלו' : 'מומלץ: אצלו — המפגש האחרון היה אצלכם'}
        </p>

        {/* Responsible parent */}
        <p className="text-[12px] font-medium text-gray-400 mb-2">שלח אל:</p>
        <div className="bg-white rounded-xl border border-[#e0ddf0] overflow-hidden mb-4">
          {/* Active parent */}
          <div className="p-3 flex justify-between items-center border-b border-[#f0eef8]">
            <div className="flex items-center gap-2">
              <Avatar initials={responsibleParent?.name?.slice(0, 2) ?? '??'} color="teal" size="sm" />
              <div>
                <p className="text-[13px] font-medium text-gray-800">{responsibleParent?.name} ({responsibleParent?.role === 'mom' ? 'אמא' : 'אבא'})</p>
                <p className="text-[11px] text-[#0F6E56]">
                  {format(tomorrow, 'EEEE', { locale: undefined })} → {responsibleParent?.role === 'mom' ? 'אצל אמא' : 'אצל אבא'} (לפי הגדרות)
                </p>
              </div>
            </div>
            <button className="text-[12px] text-[#534AB7] border border-[#c0bce0] rounded-md px-2 py-1">שנה</button>
          </div>
          {/* Other parent (dimmed) */}
          {allParents.length > 1 && allParents.filter(p => p.id !== responsibleParent?.id).map(p => (
            <div key={p.id} className="p-3 flex items-center gap-2 opacity-40">
              <Avatar initials={p.name.slice(0, 2)} color="purple" size="sm" />
              <div>
                <p className="text-[12px] text-gray-600">{p.name} ({p.role === 'mom' ? 'אמא' : 'אבא'})</p>
                <p className="text-[11px] text-gray-400">
                  אחראי בימים: {p.custody_days.map(d => ['א','ב','ג','ד','ה','ו','ש'][d]).join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <p className="text-[12px] font-medium text-gray-400 mb-1.5">
          פעילות <span className="font-normal opacity-60">(אופציונלי)</span>
        </p>
        <input
          type="text"
          value={activity}
          onChange={e => setActivity(e.target.value)}
          placeholder="לדוגמא: בריכה, גן שעשועים..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[14px] text-right mb-3 focus:outline-none focus:border-[#534AB7] bg-white"
          dir="rtl"
        />

        {/* Message preview */}
        <div className="bg-[#f0eeff] rounded-lg p-3 border border-[#c0bce0] mb-4">
          <p className="text-[10px] text-gray-400 mb-1">תצוגה מקדימה:</p>
          <p className="text-[12px] text-gray-800">{previewMsg}</p>
        </div>

        {/* Send button */}
        <button
          onClick={() => setStep('sent')}
          className="w-full bg-[#534AB7] text-white py-3 rounded-xl text-[15px] font-medium active:opacity-80 transition-opacity"
        >
          שלח ל{responsibleParent?.name}
        </button>
      </div>
    </div>
  );
}
