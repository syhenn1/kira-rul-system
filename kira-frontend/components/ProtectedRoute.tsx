'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
