'use client';
import { useState, useEffect } from 'react';
import { registerWaChooser } from '@/lib/wa';

type WaTarget = { phone: string; message: string };

export default function WaChooser() {
  const [target, setTarget] = useState<WaTarget | null>(null);

  useEffect(() => registerWaChooser(setTarget), []);

  if (!target) return null;

  const send = (type: 'regular' | 'business') => {
    const encodedText = encodeURIComponent(target.message);
    let url: string;

    if (type === 'business') {
      // Android intent → forces WhatsApp Business (package: com.whatsapp.w4b)
      // iOS fallback: same wa.me link (iOS has no separate scheme for WA Business)
      const isAndroid = /android/i.test(navigator.userAgent);
      if (isAndroid) {
        url = target.message
          ? `intent://send?phone=${target.phone}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`
          : `intent://send?phone=${target.phone}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      } else {
        // iOS: no way to force WA Business, open wa.me and let OS choose
        url = target.message
          ? `https://wa.me/${target.phone}?text=${encodedText}`
          : `https://wa.me/${target.phone}`;
      }
    } else {
      url = target.message
        ? `https://wa.me/${target.phone}?text=${encodedText}`
        : `https://wa.me/${target.phone}`;
    }

    window.open(url, '_blank');
    setTarget(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => setTarget(null)}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl pb-6 pt-4 px-4 z-50 shadow-xl" dir="rtl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <p className="text-[13px] text-gray-400 text-center mb-4">פתח הודעה עם:</p>

        <div className="flex gap-3 mb-3">
          <button
            onClick={() => send('regular')}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-[#25D366] bg-[#25D366]/5 active:bg-[#25D366]/20"
          >
            <svg viewBox="0 0 24 24" fill="#25D366" className="w-8 h-8">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-[13px] font-semibold text-gray-800">WhatsApp</span>
          </button>

          <button
            onClick={() => send('business')}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-[#1aab55] bg-[#1aab55]/5 active:bg-[#1aab55]/20"
          >
            <svg viewBox="0 0 24 24" fill="#1aab55" className="w-8 h-8">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-[13px] font-semibold text-gray-800">WhatsApp Business</span>
          </button>
        </div>

        <button
          onClick={() => setTarget(null)}
          className="w-full py-3 text-[13px] text-gray-400 active:opacity-60"
        >
          ביטול
        </button>
      </div>
    </>
  );
}
