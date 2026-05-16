'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMsgTemplates, getCustomTemplates, deleteCustomTemplate } from '@/lib/storage';
import type { MessageTemplates, CustomTemplate } from '@/lib/storage';

const FIXED_DEFS: { key: keyof MessageTemplates; label: string; desc: string }[] = [
  { key: 'initial',  label: 'הודעה #1 — ימים פנויים',    desc: 'בקשת זמינות וכל הפרטים' },
  { key: 'initial2', label: 'הודעה #2 — כתובת',          desc: 'בקשת כתובת ופרטי כניסה' },
  { key: 'initial3', label: 'הודעה #3 — פרטים נוספים',   desc: 'בקשת פרטים חשובים על הילד' },
  { key: 'propose1', label: 'אצלנו.כם',                  desc: 'הצעת מפגש עם בחירת מיקום' },
  { key: 'propose2', label: 'הזמנה#1',                   desc: 'הזמנה פתוחה — אצלנו או אצלכם' },
];

export default function MessagesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplates | null>(null);
  const [customs,   setCustoms]   = useState<CustomTemplate[]>([]);

  const load = () => {
    setTemplates(getMsgTemplates());
    setCustoms(getCustomTemplates());
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (id: string) => {
    if (!confirm('למחוק הודעה זו?')) return;
    deleteCustomTemplate(id);
    load();
  };

  return (
    <div className="flex flex-col h-full bg-[#f7f6fb]">
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/settings/messages/new')}
          className="text-white text-[13px] bg-white/20 rounded-full px-3 py-1.5 font-medium"
        >
          + הוספה
        </button>
        <span className="text-white text-[15px] font-medium">עריכת הודעות</span>
        <button onClick={() => router.back()} className="text-white/80 text-[13px] bg-white/15 rounded-full px-3 py-1.5">
          חזרה
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

        {/* Fixed templates */}
        {FIXED_DEFS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => router.push(`/settings/messages/${key}`)}
            className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-4 text-right w-full"
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-lg shrink-0">›</span>
              <div className="text-right flex-1 ml-2">
                <p className="text-[15px] font-semibold text-gray-900">{label}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{desc}</p>
                {templates && (
                  <p className="text-[11px] text-gray-300 mt-1 truncate">
                    {templates[key].split('\n')[0]}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* Custom templates */}
        {customs.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-[#e0ddf0] px-4 py-4" dir="rtl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-[11px] text-red-400 bg-red-50 rounded-lg px-2 py-1"
                >
                  מחק
                </button>
                <span className="text-gray-400 text-lg">›</span>
              </div>
              <button
                onClick={() => router.push(`/settings/messages/${c.id}`)}
                className="text-right flex-1 ml-2"
              >
                <p className="text-[15px] font-semibold text-gray-900">{c.label}</p>
                <p className="text-[11px] text-gray-300 mt-1 truncate">{c.text.split('\n')[0]}</p>
              </button>
            </div>
          </div>
        ))}

      </main>
    </div>
  );
}
