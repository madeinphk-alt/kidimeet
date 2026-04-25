'use client';
import clsx from 'clsx';
import type { DaySlot } from '@/lib/storage';
import { formatTime } from '@/lib/storage';
import { HEB_DAYS } from '@/lib/utils';

interface Props {
  dayIndex: number;
  slot: DaySlot;
  onChange: (updated: DaySlot) => void;
}

const STEP = 15;      // minutes per click
const MIN_T = 360;    // 06:00
const MAX_T = 1320;   // 22:00

type SlotKey = 'morning' | 'noon' | 'afternoon';
type TimeKey = 'morningFrom' | 'morningTo' | 'noonFrom' | 'noonTo' | 'afternoonFrom' | 'afternoonTo';

// RTL order: אחה"צ (right) | צהרים (middle) | בוקר (left)
const SLOT_DEFS: { key: SlotKey; label: string; fromKey: TimeKey; toKey: TimeKey }[] = [
  { key: 'afternoon', label: 'אחה"צ',   fromKey: 'afternoonFrom', toKey: 'afternoonTo' },
  { key: 'noon',      label: 'צהרים',   fromKey: 'noonFrom',      toKey: 'noonTo'      },
  { key: 'morning',   label: 'בוקר',    fromKey: 'morningFrom',   toKey: 'morningTo'   },
];

function TimeAdj({
  value,
  onDec,
  onInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onDec}
        className="w-5 h-5 rounded-full bg-[#f5f4fb] border border-gray-200 text-[#534AB7] text-xs flex items-center justify-center leading-none"
      >
        −
      </button>
      <span className="text-[12px] font-medium text-gray-800 min-w-[42px] text-center tabular-nums">
        {formatTime(value)}
      </span>
      <button
        onClick={onInc}
        className="w-5 h-5 rounded-full bg-[#f5f4fb] border border-gray-200 text-[#534AB7] text-xs flex items-center justify-center leading-none"
      >
        +
      </button>
    </div>
  );
}

export default function DayAvailPicker({ dayIndex, slot, onChange }: Props) {
  const toggle = (key: SlotKey) => onChange({ ...slot, [key]: !slot[key] });

  const adjust = (field: TimeKey, delta: number) => {
    const cur = slot[field] as number;
    onChange({ ...slot, [field]: Math.max(MIN_T, Math.min(MAX_T, cur + delta * STEP)) });
  };

  const activeSlots = SLOT_DEFS.filter(s => slot[s.key]);

  return (
    <div className="bg-white rounded-xl border border-[#e0ddf0] p-3 mb-2.5">
      <p className="text-[12px] font-medium text-gray-600 mb-2.5">יום {HEB_DAYS[dayIndex]}</p>

      {/* Toggle buttons */}
      <div className="flex gap-2 mb-0">
        {SLOT_DEFS.map(s => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className={clsx(
              'flex-1 py-1.5 text-[11px] rounded-lg border transition-colors',
              slot[s.key]
                ? 'bg-[#534AB7] border-[#534AB7] text-white'
                : 'bg-white border-gray-200 text-gray-500'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Time pickers — one row per active slot */}
      {activeSlots.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-col gap-2">
          {activeSlots.map(s => (
            <div key={s.key} className="flex items-center gap-1.5" dir="rtl">
              <span className="text-[11px] text-gray-500 w-10 text-right shrink-0">{s.label}</span>
              <span className="text-[10px] text-gray-400 shrink-0">משעה</span>
              <TimeAdj
                value={slot[s.fromKey] as number}
                onDec={() => adjust(s.fromKey, -1)}
                onInc={() => adjust(s.fromKey, +1)}
              />
              <span className="text-[10px] text-gray-400 shrink-0">עד</span>
              <TimeAdj
                value={slot[s.toKey] as number}
                onDec={() => adjust(s.toKey, -1)}
                onInc={() => adjust(s.toKey, +1)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
