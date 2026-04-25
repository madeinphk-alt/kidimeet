'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';
import { CHILDREN, CHILD_NOTES, MY_CHILD_ID } from '@/lib/mock-data';
import { getMeetupHistory, formatMeetupDate, formatDaysAgo, getLastMeetup } from '@/lib/utils';

const NOTE_STYLES: Record<string, { bg: string; text: string }> = {
  allergy:  { bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]' },
  dietary:  { bg: 'bg-[#E1F5EE]', text: 'text-[#085041]' },
  pet:      { bg: 'bg-[#FAEEDA]', text: 'text-[#BA7517]' },
  other:    { bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]' },
};

export default function ChildPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const child = CHILDREN.find(c => c.id === childId);
  if (!child) return <div className="p-8 text-center text-gray-400">ילד לא נמצא</div>;

  const notes = CHILD_NOTES.filter(n => n.child_id === childId);
  const history = getMeetupHistory(MY_CHILD_ID, childId);
  const lastMeetup = getLastMeetup(MY_CHILD_ID, childId);
  const { label: agoLabel, urgency } = formatDaysAgo(
    lastMeetup ? Math.floor((Date.now() - new Date(lastMeetup.date).getTime()) / 86400000) : null
  );

  const lastHostedByMe = lastMeetup?.host_child_id === MY_CHILD_ID;
  const rotationHint = lastMeetup
    ? (lastHostedByMe ? 'המפגש האחרון היה אצלכם — הפעם מומלץ אצלו' : 'המפגש האחרון היה אצלו — הפעם מומלץ אצלכם')
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-[#534AB7] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 text-xl leading-none">›</button>
        <span className="text-white text-[15px] font-medium">{child.name}</span>
      </header>

      {/* Profile */}
      <div className="bg-white px-4 py-5 text-center border-b border-[#e0ddf0]">
        <Avatar initials={child.avatar_initials} color={child.avatar_color} size="lg" />
        <h1 className="text-lg font-medium text-gray-900 mt-3">{child.name}</h1>
        <p className="text-[12px] text-gray-400 mt-1">ב'1</p>
        <div className="mt-2">
          <Badge variant={urgency === 'high' ? 'amber' : urgency === 'new' ? 'new' : 'gray'}>
            {agoLabel === 'מפגש ראשון' ? 'מפגש ראשון' : `לא נפגשנו ${agoLabel}`}
          </Badge>
        </div>
      </div>

      <div className="p-4 flex-1">
        {/* Notes */}
        {notes.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[12px] font-medium text-gray-400 mb-2">הערות חשובות</h2>
            <div className="flex flex-wrap gap-2">
              {notes.map(note => {
                const style = NOTE_STYLES[note.note_type] ?? NOTE_STYLES.other;
                return (
                  <span key={note.id} className={`text-[12px] px-3 py-1 rounded-full ${style.bg} ${style.text}`}>
                    {note.note_text}
                  </span>
                );
              })}
              <span className="text-[12px] px-3 py-1 rounded-full bg-[#EEEDFE] text-[#534AB7] cursor-pointer">
                + הוסף
              </span>
            </div>
          </section>
        )}

        {/* Meetup history */}
        <section className="mb-5">
          <h2 className="text-[12px] font-medium text-gray-400 mb-2">היסטוריית מפגשים</h2>
          {history.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e0ddf0] p-4 text-center text-gray-400 text-sm">
              עדיין לא נפגשתם
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e0ddf0] overflow-hidden">
              {history.map((m, i) => {
                const hostedByMe = m.host_child_id === MY_CHILD_ID;
                return (
                  <div key={m.id} className={`px-4 py-2.5 flex justify-between items-center ${i < history.length - 1 ? 'border-b border-[#f0eef8]' : ''}`}>
                    <div>
                      <p className="text-[13px] text-gray-800">{formatMeetupDate(m.date)}</p>
                      <p className="text-[11px] text-gray-400">{hostedByMe ? 'אצלכם' : `אצל ${child.name.split(' ')[0]}`}{m.activity ? ` • ${m.activity}` : ''}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${hostedByMe ? 'bg-[#f0eeff] text-[#534AB7]' : 'bg-gray-100 text-gray-500'}`}>
                      {hostedByMe ? 'אצלכם' : 'אצלו'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Rotation hint */}
        {rotationHint && (
          <div className="bg-[#E1F5EE] rounded-lg px-3 py-2.5 border border-[#5DCAA5] mb-5">
            <p className="text-[12px] text-[#085041]">{rotationHint}</p>
          </div>
        )}

        {/* Invite button */}
        <Link
          href={`/invite/${childId}`}
          className="block w-full text-center bg-[#534AB7] text-white py-3 rounded-xl text-[15px] font-medium active:opacity-80 transition-opacity"
        >
          הזמן את {child.name.split(' ')[0]} למחר
        </Link>
      </div>
    </div>
  );
}
