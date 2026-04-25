'use client';
import Link from 'next/link';
import Avatar from './Avatar';
import Badge from './Badge';
import { formatDaysAgo } from '@/lib/utils';
import { CHILDREN } from '@/lib/mock-data';
import type { AvailableChild } from '@/lib/types';

function RotationHint({ myChildId, suggestedHostId, lastHostId }: {
  myChildId: string;
  suggestedHostId: string;
  lastHostId: string | null;
}) {
  if (!lastHostId) return null;
  const myChild = CHILDREN.find(c => c.id === myChildId);
  const lastHostName = CHILDREN.find(c => c.id === lastHostId)?.name.split(' ')[0];
  const nextHostName = CHILDREN.find(c => c.id === suggestedHostId)?.name.split(' ')[0];
  const lastWasMe = lastHostId === myChildId;

  return (
    <span className="text-[11px] text-[#0F6E56]">
      אחרון: {lastWasMe ? 'אצלכם' : `אצל ${lastHostName}`}
      {' · '}
      הפעם: {suggestedHostId === myChildId ? 'אצלכם' : `אצל ${nextHostName}`}
    </span>
  );
}

export default function ChildCard({
  item,
  myChildId,
}: {
  item: AvailableChild;
  myChildId: string;
}) {
  const { label, urgency } = formatDaysAgo(item.days_since_last_meetup);
  const badgeVariant = urgency === 'high' ? 'amber' : urgency === 'new' ? 'new' : 'gray';

  return (
    <Link href={`/child/${item.child.id}`} className="block">
      <div className="bg-white rounded-xl border border-[#e0ddf0] p-3 mb-2 flex items-center gap-3 active:opacity-70 transition-opacity">
        <Avatar initials={item.child.avatar_initials} color={item.child.avatar_color} />

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[15px] font-medium text-gray-900">{item.child.name}</span>
            <Badge variant={badgeVariant}>{label}</Badge>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <RotationHint
              myChildId={myChildId}
              suggestedHostId={item.suggested_host_id}
              lastHostId={item.last_meetup_host_id}
            />
            {item.activity && (
              <span className="text-[11px] bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">
                {item.activity}
              </span>
            )}
          </div>
        </div>

        <span className="text-gray-300 text-lg leading-none">‹</span>
      </div>
    </Link>
  );
}
