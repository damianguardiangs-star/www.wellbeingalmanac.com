import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'forest' | 'brass' | 'muted' | 'red';
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      variant === 'default' && 'bg-cream-100 text-ink-700 border-cream-300',
      variant === 'forest' && 'bg-forest-100 text-forest-800 border-forest-200',
      variant === 'brass' && 'bg-brass-300/20 text-brass-600 border-brass-300/40',
      variant === 'muted' && 'bg-ink-100 text-ink-500 border-ink-200',
      variant === 'red' && 'bg-red-50 text-red-700 border-red-200',
      className
    )}>
      {children}
    </span>
  );
}
