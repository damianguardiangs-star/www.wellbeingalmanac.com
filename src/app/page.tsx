'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKBIStore } from '@/lib/store';

export default function RootPage() {
  const { isAuthenticated } = useKBIStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  return null;
}
