'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/auth';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const name = searchParams.get('name') || '';
    const email = searchParams.get('email') || '';

    if (token && email) {
      authApi.saveSession(token, { id: '', name, email });
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
