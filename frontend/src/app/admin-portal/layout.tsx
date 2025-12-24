/**
 * Admin Portal Layout - Dedicated admin control panel layout
 * PROTECTED: Only accessible to admin and owner roles
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getCookie('time_auth_token');

        if (!token) {
          router.push('/login?redirect=/admin-portal');
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://time-backend-hosting.fly.dev'}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });

        if (!res.ok) {
          router.push('/login?redirect=/admin-portal');
          return;
        }

        const data = await res.json();
        const userRole = data.user?.role;

        if (userRole !== 'admin' && userRole !== 'owner') {
          router.push('/dashboard?error=unauthorized');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login?redirect=/admin-portal');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl">Access Denied</p>
          <p className="text-gray-400 mt-2">Admin privileges required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {children}
    </div>
  );
}
