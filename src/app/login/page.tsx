'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';

export default function LoginPage() {
  const { login } = useKBIStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(email, password);
    if (ok) {
      router.replace('/dashboard');
    } else {
      setError('Invalid credentials. Use any demo email with password: demo');
    }
  }

  return (
    <div className="min-h-screen bg-forest-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-brass-400/40 bg-forest-800 mb-6">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3C14 3 7 8 7 14C7 17.866 10.134 21 14 21C17.866 21 21 17.866 21 14C21 8 14 3 14 3Z" stroke="#d4aa22" strokeWidth="1.2" fill="none"/>
              <path d="M14 21V25M14 25L11 23M14 25L17 23" stroke="#d4aa22" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="14" cy="13" r="2.5" fill="#d4aa22" fillOpacity="0.5"/>
            </svg>
          </div>
          <h1 className="text-cream-100 text-xl font-light tracking-[0.2em] uppercase">
            Khmere Botanical
          </h1>
          <p className="text-brass-400 text-xs tracking-[0.3em] uppercase mt-1">
            Intelligence Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-cream-300 text-xs tracking-widest uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@khmere.co"
              required
              className="w-full bg-forest-800 border border-forest-600 text-cream-100 rounded px-4 py-3 text-sm placeholder:text-ink-400 focus:outline-none focus:border-brass-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-cream-300 text-xs tracking-widest uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-forest-800 border border-forest-600 text-cream-100 rounded px-4 py-3 text-sm placeholder:text-ink-400 focus:outline-none focus:border-brass-400 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/30 border border-red-800/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-brass-500 hover:bg-brass-400 text-forest-950 font-medium py-3 rounded text-sm tracking-wider uppercase transition-colors mt-2"
          >
            Access Platform
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-8 border-t border-forest-700 pt-6">
          <p className="text-ink-400 text-xs text-center mb-3 tracking-wider uppercase">Demo Credentials</p>
          <div className="space-y-1.5">
            {[
              ['admin@khmere.co', 'Administrator'],
              ['collector@khmere.co', 'Field Collector'],
              ['analyst@khmere.co', 'Lab Analyst'],
              ['commercial@khmere.co', 'Commercial Reviewer'],
            ].map(([em, role]) => (
              <button
                key={em}
                type="button"
                onClick={() => { setEmail(em); setPassword('demo'); }}
                className="w-full text-left px-3 py-2 rounded bg-forest-800/50 hover:bg-forest-700/50 transition-colors"
              >
                <span className="text-cream-200 text-xs font-mono">{em}</span>
                <span className="text-ink-400 text-xs ml-2">— {role}</span>
              </button>
            ))}
          </div>
          <p className="text-ink-400 text-xs text-center mt-3">Password: <span className="font-mono text-brass-400">demo</span></p>
        </div>
      </div>
    </div>
  );
}
