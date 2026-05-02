'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { saveCustomTemplate } from '@/lib/storage';

const VARS: { label: string; value: string }[] = [
  { label: 'שם הורה',  value: '{שם_הורה}'  },
  { label: 'שם שלי',   value: '{שם_שלי}'   },
  { label: 'הילד שלי', value: '{הילד_שלי}' },
  { label: 'שם חבר',   value: '{שם_חבר}'   },
  { label: 'תפקיד',    value: '{תפקיד}'    },
];

export default function NewMessagePage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [text,  setText]  = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSave = label.trim() && text.trim();

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) { setText(t => t + v); return; }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const newText = text.slice(0, start) + v + text.slice(end);
    setText(newText);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    saveCustomTemplate({ id: `custom-${Date.now()}`, label: label.trim(), text: text.trim() });
    setSaved(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f6fb]">
      <header className="bg-[#534AB7] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white/80 text-[13px] bg-white/15 rounded-full px-3 py-1.5">
          ← חזרה
        </button>
        <span className="text-white text-[15px] font-medium">הודעה חדשה</span>
        <div className="w-16" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

        {/* Label */}
        <div dir="rtl">
          <label className="block text-[12px] font-medium text-gray-500 mb-1.5">שם ההודעה</label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder='לדוגמא: הצעת מפגש קצרה'
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white"
            dir="rtl"
            autoFocus
          />
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="כתוב את נוסח ההודעה כאן..."
          rows={10}
          className="w-full text-[14px] text-gray-800 bg-white rounded-xl border border-[#e0ddf0] px-4 py-3 resize-none focus:outline-none focus:border-[#534AB7] leading-relaxed"
          dir="rtl"
        />

        {/* Variable buttons */}
        <div dir="rtl">
          <p className="text-[11px] text-gray-400 mb-2">הוסף משתנה:</p>
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

        {/* Hint */}
        <div className="bg-[#f0eeff] rounded-xl px-3 py-2.5" dir="rtl">
          <p className="text-[10px] text-gray-500 leading-5">
            {VARS.map(v => `${v.label} = ${v.value}`).join('  ·  ')}
          </p>
        </div>

      </main>

      <div className="p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={clsx(
            'w-full py-3.5 rounded-xl text-white text-[15px] font-medium transition-all',
            saved ? 'bg-green-500' : canSave ? 'bg-[#534AB7]' : 'bg-[#534AB7] opacity-40'
          )}
        >
          {saved ? '✓ נשמר' : 'שמור הודעה'}
        </button>
      </div>
    </div>
  );
}
