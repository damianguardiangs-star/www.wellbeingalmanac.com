'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore, DEMO_USERS_LIST } from '@/lib/store';
import { roleLabel } from '@/lib/utils';

export default function Header({ title, onMenuClick }: { title: string; onMenuClick?: () => void }) {
  const { currentUser, logout, switchRole } = useKBIStore();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="bg-cream-50 border-b border-cream-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded hover:bg-cream-200 text-ink-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <rect x="2" y="5" width="16" height="1.5" rx="1"/>
            <rect x="2" y="9.25" width="16" height="1.5" rx="1"/>
            <rect x="2" y="13.5" width="16" height="1.5" rx="1"/>
          </svg>
        </button>
        <h1 className="text-ink-800 font-light tracking-wide text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Role switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2.5 text-sm text-ink-700 hover:text-ink-900 bg-cream-100 border border-cream-300 px-3 py-1.5 rounded transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-forest-400 flex-shrink-0" />
            <span className="hidden sm:block">{currentUser?.name}</span>
            <span className="text-ink-400 text-xs hidden sm:block">
              — {roleLabel(currentUser?.role ?? '')}
            </span>
            <svg className="w-3 h-3 text-ink-400 ml-1" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4L6 8L10 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {showRoleMenu && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-cream-300 rounded shadow-lg z-50">
              <p className="text-[10px] tracking-widest uppercase text-ink-400 px-4 pt-3 pb-1">Switch role (demo)</p>
              {DEMO_USERS_LIST.map(u => (
                <button
                  key={u.id}
                  onClick={() => { switchRole(u.id); setShowRoleMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-cream-100 transition-colors ${currentUser?.id === u.id ? 'bg-cream-100' : ''}`}
                >
                  <div className="text-sm text-ink-800">{u.name}</div>
                  <div className="text-xs text-ink-400">{roleLabel(u.role)}</div>
                </button>
              ))}
              <div className="border-t border-cream-200 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRoleMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowRoleMenu(false)} />
      )}
    </header>
  );
}
