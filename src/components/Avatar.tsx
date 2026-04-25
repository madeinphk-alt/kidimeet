import clsx from 'clsx';
import { AVATAR_COLORS } from '@/lib/utils';

export default function Avatar({
  initials,
  color,
  size = 'md',
}: {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const colors = AVATAR_COLORS[color] ?? AVATAR_COLORS.purple;
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';

  return (
    <div className={clsx('rounded-full flex items-center justify-center font-medium flex-shrink-0', sizeClass, colors.bg, colors.text)}>
      {initials}
    </div>
  );
}
