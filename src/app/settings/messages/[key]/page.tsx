'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import clsx from 'clsx';
import { getMsgTemplates, saveMsgTemplates, DEFAULT_MSG_TEMPLATES } from '@/lib/storage';
import type { MessageTemplates } from '@/lib/storage';

const MSG_LABELS: Record<keyof MessageTemplates, string> = {
  initial:  'פנייה ראשונית',
  propose1: 'הצעת מפגש נוסח #1',
  propose2: 'הצעת מפגש נוסח #2',
};

const VARS: { label: string; value: string }[] = [
  { label: 'שם הורה',   value: '{שם_הורה}'   },
  { label: 'שם שלי',    value: '{שם_שלי}'    },
  { label: 'הילד שלי',  value: '{הילד_שלי}'  },
  { label: 'שם חבר',    value: '{שם_חבר}'    },
  { label: 'תפקיד',     value: '{תפקיד}'     },
];

function EditMessageForm() {
  const router  = useRouter();
  const params  = useParams();
  const key     = params.key as keyof MessageTemplates;

  const [text,  setText]  = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = getMsgTemplates();
    if (key in t) setText(t[key]);
  }, [key]);

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) { setText(t => t + v); return; }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const newText = text.slice(0, start) + v + text.slice(end);
    setText(newText);
    // restore cursor after inserted variable
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  };

  const handleSave = () => {
    const t = getMsgTemplates();
    saveMsgTemplates({ ...t, [key]: text });
    setSaved(true);
    setTimeout(() => router.back(), 800);
  };

  const handleReset = () => {
    if (confirm('לאפס לנוסח המקורי?')) setText(DEFAULT_MSG_TEMPLATES[key]);
  };

  if (!(key in MSG_LABELS)) return null;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb]">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white/80 text-[13px] bg-white/15 rounded-full px-3 py-1.5">
          ← חזרה
        </button>
        <span className="text-white text-[14px] font-medium">{MSG_LABELS[key]}</span>
        <button
          onClick={handleReset}
          className="text-white/70 text-[12px] bg-white/15 rounded-full px-3 py-1.5"
        >
          איפוס
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); setSaved(false); }}
          rows={12}
          className="w-full text-[14px] text-gray-800 bg-white rounded-xl border border-[#e0ddf0] px-4 py-3 resize-none focus:outline-none focus:border-[#534AB7] leading-relaxed"
          dir="rtl"
        />

        {/* Variable buttons */}
        <div dir="rtl">
          <p className="text-[11px] text-gray-400 mb-2">הוסף משתנה לתוך ההודעה:</p>
          <div className="flex flex-wrap gap-2">
            {VARS.map(v => (
              <button
                key={v.value}
                onClick={() => insertVar(v.value)}
                className="px-3 py-1.5 rounded-lg bg-[#EEEDFE] text-[#534AB7] text-[12px] font-medium border border-[#c5c0f0] active:bg-[#534AB7] active:text-white transition-colors"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview hint */}
        <div className="bg-[#f0eeff] rounded-xl px-3 py-2.5" dir="rtl">
          <p className="text-[10px] text-[#534AB7] font-medium mb-1">משתנים זמינים:</p>
          <p className="text-[10px] text-gray-500 leading-5">
            {VARS.map(v => `${v.label} = ${v.value}`).join('  ·  ')}
          </p>
        </div>

      </main>

      {/* Save */}
      <div className="p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          className={clsx(
            'w-full py-3.5 rounded-xl text-white text-[15px] font-medium transition-all',
            saved ? 'bg-green-500' : 'bg-[#534AB7]'
          )}
        >
          {saved ? '✓ נשמר' : 'שמור'}
        </button>
      </div>
    </div>
  );
}

export default function EditMessagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">טוען...</div>}>
      <EditMessageForm />
    </Suspense>
  );
}
