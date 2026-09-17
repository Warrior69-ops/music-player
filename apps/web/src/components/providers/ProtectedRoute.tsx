'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
    }
  }, [user, router, hydrated]);

  if (!hydrated) return null;
  if (!user) return null;

  return <>{children}</>;
}
