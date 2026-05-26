'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

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

    setAuthChecked(true);
  }, [router]);

  if (!mounted || !authChecked || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100" />
    );
  }

  return <>{children}</>;
}
