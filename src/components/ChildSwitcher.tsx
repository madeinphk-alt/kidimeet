'use client';
import { useState } from 'react';
import clsx from 'clsx';
import { saveProfile, switchActiveChild } from '@/lib/storage';
import type { UserProfile } from '@/lib/storage';
import { AVATAR_COLORS } from '@/lib/utils';

interface Props {
  profile: UserProfile;
  onSwitch: (childId: string) => void;
  onAdd: () => void;
}

export default function ChildSwitcher({ profile, onSwitch, onAdd }: Props) {
  const [open, setOpen] = useState(false);

  const activeChild = profile.children.find(c => c.id === profile.activeChildId) ?? profile.children[0];

  const handleSwitch = (childId: string) => {
    const updated = switchActiveChild(profile, childId);
    saveProfile(updated);
    setOpen(false);
    onSwitch(childId);
  };

  return (
    <>
      {/* Trigger button — shows active child name */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-right"
      >
        <div className="text-right">
          <p className="text-white/90 text-[12px] font-medium leading-tight">{activeChild?.name ?? ''}</p>
          <p className="text-white/60 text-[10px] leading-tight">
            {activeChild?.school ?? ''}{activeChild?.className ? ` • ${activeChild.className}` : ''}
          </p>
        </div>
        {profile.children.length > 1 && (
          <span className="text-white/60 text-[10px]">▾</span>
        )}
      </button>

      {/* Bottom sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl" dir="rtl">
            <div className="pt-3 px-4 pb-2 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <p className="text-[15px] font-semibold text-gray-900 text-center">בחר ילד</p>
            </div>

            <div className="p-4 flex flex-col gap-2">
              {profile.children.map(child => {
                const colors = AVATAR_COLORS[child.avatarColor] ?? AVATAR_COLORS['purple'];
                const isActive = child.id === profile.activeChildId;
                return (
                  <button
                    key={child.id}
                    onClick={() => handleSwitch(child.id)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                      isActive
                        ? 'border-[#534AB7] bg-[#EEEDFE]'
                        : 'border-gray-200 bg-white'
                    )}
                  >
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0', colors.bg, colors.text)}>
                      {child.avatarInitials}
                    </div>
                    <div className="flex-1 text-right">
                      <p className={clsx('text-[14px] font-medium', isActive ? 'text-[#534AB7]' : 'text-gray-900')}>
                        {child.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {child.school}{child.className ? ` • ${child.className}` : ''}
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-[#534AB7] text-[13px]">✓</span>
                    )}
                  </button>
                );
              })}

              {/* Add child button */}
              <button
                onClick={() => { setOpen(false); onAdd(); }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-[14px] text-gray-500 mt-1"
              >
                <span className="text-[#534AB7] font-medium text-[16px]">+</span>
                הוסף ילד
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
