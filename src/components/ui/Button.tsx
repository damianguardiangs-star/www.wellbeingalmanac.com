import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-xs tracking-wide',
        size === 'md' && 'px-4 py-2.5 text-sm tracking-wide',
        size === 'lg' && 'px-6 py-3 text-sm tracking-widest uppercase',
        variant === 'primary' && 'bg-forest-700 hover:bg-forest-600 text-cream-50 border border-forest-600',
        variant === 'secondary' && 'bg-cream-100 hover:bg-cream-200 text-ink-800 border border-cream-300',
        variant === 'ghost' && 'bg-transparent hover:bg-cream-100 text-ink-600 hover:text-ink-900',
        variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white border border-red-700',
        className
      )}
    >
      {children}
    </button>
  );
}
