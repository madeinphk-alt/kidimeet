import Link from 'next/link';
import clsx from 'clsx';

type NavKey = 'home' | 'friends' | 'calendar' | 'meetups' | 'settings';

const NAV_ITEMS: { key: NavKey; href: string; icon: string; label: string }[] = [
  { key: 'home',     href: '/',         icon: '📋', label: 'לוז'      },
  { key: 'friends',  href: '/friends',  icon: '👥', label: 'חברים'    },
  { key: 'meetups',  href: '/meetups',  icon: '🎉', label: 'מפגשים'   },
  { key: 'calendar', href: '/calendar', icon: '📅', label: 'לוח שנה'  },
  { key: 'settings', href: '/settings', icon: '👤', label: 'פרופיל'   },
];

export default function BottomNav({ active }: { active: NavKey }) {
  return (
    <nav className="bg-white border-t border-gray-100 px-2 py-2 flex justify-around shrink-0">
      {NAV_ITEMS.map(item => {
        const isActive = item.key === active;
        return (
          <Link key={item.key} href={item.href} className="flex flex-col items-center gap-0.5 w-16">
            <span className={clsx('text-lg leading-none', isActive ? 'text-[#534AB7]' : 'text-gray-300')}>
              {item.icon}
            </span>
            <span className={clsx('text-[10px]', isActive ? 'text-[#534AB7] font-medium' : 'text-gray-300')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
