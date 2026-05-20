'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('kira_token');
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('kira_token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: 'Anda belum login, mengembalikan anda ke landing page...',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      }).then(() => {
        router.push('/');
      });
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
