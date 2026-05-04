'use client';
import { useState, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

// Contact Picker API — supported on Android Chrome only
declare global {
  interface Navigator {
    contacts?: {
      select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ tel?: string[]; name?: string[] }[]>;
    };
  }
}

export default function PhoneInput({ value, onChange, placeholder = '052-0000000', className = '' }: Props) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(!!navigator.contacts);
  }, []);

  const pickContact = async () => {
    try {
      const results = await navigator.contacts!.select(['tel'], { multiple: false });
      if (results.length > 0 && results[0].tel?.[0]) {
        onChange(results[0].tel[0]);
      }
    } catch {
      // user cancelled or error — do nothing
    }
  };

  return (
    <div className="flex gap-2" dir="rtl">
      {supported && (
        <button
          type="button"
          onClick={pickContact}
          className="w-10 h-10 shrink-0 flex items-center justify-center bg-[#EEEDFE] border border-[#c5c0f0] rounded-xl text-[16px] active:bg-[#534AB7] transition-colors"
          title="בחר מאנשי קשר"
        >
          👥
        </button>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type="tel"
        className={`flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] text-right focus:outline-none focus:border-[#534AB7] bg-white ${className}`}
        dir="rtl"
      />
    </div>
  );
}
