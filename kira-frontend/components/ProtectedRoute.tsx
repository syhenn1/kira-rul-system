'use client';

import { useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // useLayoutEffect fires before browser paints — no gray flash while checking auth
  useLayoutEffect(() => {
    const token = localStorage.getItem('kira_token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: 'Anda belum login, mengembalikan anda ke landing page...',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      }).then(() => router.push('/'));
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
