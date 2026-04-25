import clsx from 'clsx';

type BadgeVariant = 'amber' | 'green' | 'purple' | 'red' | 'gray' | 'new';

const VARIANTS: Record<BadgeVariant, string> = {
  amber:  'bg-[#FAEEDA] text-[#BA7517]',
  green:  'bg-[#E1F5EE] text-[#085041]',
  purple: 'bg-[#EEEDFE] text-[#3C3489]',
  red:    'bg-[#FCEBEB] text-[#A32D2D]',
  gray:   'bg-gray-100 text-gray-500',
  new:    'bg-[#EEEDFE] text-[#534AB7]',
};

export default function Badge({
  children,
  variant = 'gray',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={clsx('text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap', VARIANTS[variant], className)}>
      {children}
    </span>
  );
}
