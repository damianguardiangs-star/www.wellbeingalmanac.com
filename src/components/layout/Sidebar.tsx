'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  {
    label: 'Intelligence',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: GridIcon },
      { href: '/species', label: 'Species Library', icon: LeafIcon },
      { href: '/samples', label: 'Field Samples', icon: FlaskIcon },
    ],
  },
  {
    label: 'Laboratory',
    items: [
      { href: '/extractions', label: 'Extraction Batches', icon: BeakerIcon },
      { href: '/aroma', label: 'Aroma Profiles', icon: WaveIcon },
      { href: '/chemistry', label: 'GC-MS Chemistry', icon: AtomIcon },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { href: '/commercial', label: 'Commercial Scores', icon: StarIcon },
    ],
  },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-forest-900 w-64 flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-forest-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-brass-500/40 bg-forest-800 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C8 2 4 5 4 8C4 10.21 5.79 12 8 12C10.21 12 12 10.21 12 8C12 5 8 2 8 2Z" stroke="#d4aa22" strokeWidth="0.8" fill="none"/>
              <path d="M8 12V14.5" stroke="#d4aa22" strokeWidth="0.8" strokeLinecap="round"/>
              <circle cx="8" cy="7.5" r="1.5" fill="#d4aa22" fillOpacity="0.6"/>
            </svg>
          </div>
          <div>
            <div className="text-cream-100 text-sm font-light tracking-widest uppercase">Khmere</div>
            <div className="text-brass-500 text-[10px] tracking-[0.2em] uppercase">Botanical Intelligence</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV.map(group => (
          <div key={group.label}>
            <p className="text-ink-400 text-[10px] tracking-[0.25em] uppercase px-3 mb-2">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all',
                        active
                          ? 'bg-brass-500/15 text-brass-300 border-l-2 border-brass-400'
                          : 'text-cream-300 hover:bg-forest-700/60 hover:text-cream-100 border-l-2 border-transparent'
                      )}
                    >
                      <item.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-brass-400' : 'text-ink-400')} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-forest-700">
        <p className="text-ink-400 text-[10px] tracking-wider">
          KBI Platform v0.1 — Private
        </p>
      </div>
    </div>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  );
}
function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M2 14C2 14 3 7 8 4C13 1 14 2 14 2C14 2 13 9 8 11C6 11.8 4 12 2 14Z"/>
      <path d="M2 14L7 9" strokeLinecap="round"/>
    </svg>
  );
}
function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M6 2V7L2 13H14L10 7V2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 2H10.5" strokeLinecap="round"/>
    </svg>
  );
}
function BeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 2H12V8L14 13H2L4 8V2Z" strokeLinejoin="round"/>
      <path d="M4 9H12" strokeLinecap="round"/>
    </svg>
  );
}
function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M1 8C2.5 5 4 3 5.5 8C7 13 8.5 3 10 8C11.5 13 13 5 15 8" strokeLinecap="round"/>
    </svg>
  );
}
function AtomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="8" cy="8" r="2"/>
      <ellipse cx="8" cy="8" rx="7" ry="3"/>
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)"/>
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)"/>
    </svg>
  );
}
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M8 1L10 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H6L8 1Z" strokeLinejoin="round"/>
    </svg>
  );
}
