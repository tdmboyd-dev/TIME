'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarProvider, MobileMenuButton } from './Sidebar';
import { TopNav } from './TopNav';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { Web3Provider } from '@/providers/Web3Provider';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { TimeIcon } from '@/components/branding/TimeLogo';
import { ErrorBoundary, PageErrorBoundary } from '@/components/ErrorBoundary';
import { AIChatWidget } from '@/components/support/AIChatWidget';

// PWA Service Worker Registration
function PWARegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}

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

  // Authenticated routes get dashboard layout with Error Boundaries
  if (isAuthenticated) {
    return (
      <PageErrorBoundary>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Mobile header with menu button */}
              <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-700/50">
                <MobileMenuButton />
                <TimeIcon size={28} animated />
              </div>
              <TopNav />
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </div>
          {/* AI Chat Support Widget */}
          <AIChatWidget />
        </SidebarProvider>
      </PageErrorBoundary>
    );
  }

  // Not authenticated, AuthProvider will redirect
  return null;
}

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <AuthProvider>
        <NotificationProvider>
          <PWARegistration />
          <LayoutContent>{children}</LayoutContent>
        </NotificationProvider>
      </AuthProvider>
    </Web3Provider>
  );
}
