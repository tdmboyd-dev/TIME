'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_BASE } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription?: any;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  logout: () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/admin-login', '/forgot-password', '/reset-password'];

// Routes that require admin access
const adminRoutes = ['/admin', '/admin/', '/admin-portal', '/admin-bot', '/ai-trade-god', '/timebeunus', '/gift-access'];

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname?.startsWith(route));

  const refreshUser = async () => {
    try {
      const token = getCookie('time_auth_token');
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        // Clear invalid token
        document.cookie = 'time_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'time_is_admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    } catch (error) {
      setUser(null);
    }
  };

  const logout = () => {
    // Clear cookies
    document.cookie = 'time_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'time_is_admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('time_user');
    setUser(null);
    router.push('/login');
  };

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated and on a protected route, redirect to login
    if (!user && !isPublicRoute) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }

    // If authenticated and on admin route, check admin access
    if (user && isAdminRoute) {
      const isAdmin = user.role === 'admin' || user.role === 'owner';
      if (!isAdmin) {
        router.push('/?error=unauthorized');
      }
    }
  }, [user, isLoading, pathname, isPublicRoute, isAdminRoute, router]);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  // Show loading state
  if (isLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-3xl font-black text-white">T</span>
          </div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on public route, show nothing (will redirect)
  if (!isAuthenticated && !isPublicRoute && !isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
