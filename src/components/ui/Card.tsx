import { cn } from '@/lib/utils';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-cream-200 rounded-lg shadow-sm', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-b border-cream-200', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-lg p-5 border', accent ? 'bg-forest-900 border-forest-700' : 'bg-white border-cream-200')}>
      <p className={cn('text-xs tracking-widest uppercase mb-2', accent ? 'text-brass-400' : 'text-ink-400')}>
        {label}
      </p>
      <p className={cn('text-3xl font-light tabular-nums', accent ? 'text-cream-100' : 'text-ink-900')}>
        {value}
      </p>
      {sub && (
        <p className={cn('text-xs mt-1', accent ? 'text-forest-300' : 'text-ink-400')}>{sub}</p>
      )}
    </div>
  );
}
