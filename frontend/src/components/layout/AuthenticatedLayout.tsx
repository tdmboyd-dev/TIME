'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { Web3Provider } from '@/providers/Web3Provider';

// Routes that don't need the dashboard layout
const publicRoutes = ['/login', '/register', '/admin-login', '/forgot-password', '/reset-password'];

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

  // Public routes get full-page layout
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Loading state is handled by AuthProvider

  // Authenticated routes get dashboard layout
  if (isAuthenticated) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Not authenticated, AuthProvider will redirect
  return null;
}

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <AuthProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthProvider>
    </Web3Provider>
  );
}
