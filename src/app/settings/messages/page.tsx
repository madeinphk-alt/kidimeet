'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMsgTemplates } from '@/lib/storage';
import type { MessageTemplates } from '@/lib/storage';

const MSG_DEFS: { key: keyof MessageTemplates; label: string; desc: string }[] = [
  { key: 'initial',  label: 'פנייה ראשונית',      desc: 'היכרות ובקשת זמינות' },
  { key: 'propose1', label: 'הצעת מפגש נוסח #1',  desc: 'הצעה ישירה לפליידייט' },
  { key: 'propose2', label: 'הצעת מפגש נוסח #2',  desc: 'גרסה קצרה ולא פורמלית' },
];

export default function MessagesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplates | null>(null);

  useEffect(() => { setTemplates(getMsgTemplates()); }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb]">
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white/80 text-[13px] bg-white/15 rounded-full px-3 py-1.5">
          ← חזרה
        </button>
        <span className="text-white text-[15px] font-medium">עריכת הודעות</span>
        <div className="w-16" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {MSG_DEFS.map(({ key, label, desc }) => (
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
      </main>
    </div>
  );
}
