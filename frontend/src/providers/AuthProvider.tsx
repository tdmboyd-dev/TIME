'use client';

/**
 * Auth Provider - v74.2.0
 * Handles user authentication state and session management
 * - Timeout protection to prevent infinite loading
 * - localStorage fallback when API is slow/unavailable
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { TimeIcon } from '@/components/branding/TimeLogo';

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
const publicRoutes = ['/login', '/register', '/admin-login', '/forgot-password', '/reset-password', '/privacy', '/terms', '/support'];

// Routes that require admin access
const adminRoutes = ['/admin', '/admin/', '/admin-portal', '/admin-bot', '/ai-trade-god', '/timebeunus', '/gift-access'];

function getCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  } catch (error) {
    console.error('[AuthProvider] Error reading cookie:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize with null/true - will hydrate on client
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage AFTER mount to avoid SSR mismatch
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    const hydrate = () => {
      try {
        const stored = localStorage.getItem('time_user');
        const token = getCookie('time_auth_token');
        const justLoggedIn = sessionStorage.getItem('time_just_logged_in');

        console.log('[AuthProvider] Hydration check:', {
          hasStored: !!stored,
          hasToken: !!token,
          justLoggedIn: !!justLoggedIn,
          retryCount
        });

        if (stored && token) {
          console.log('[AuthProvider] Hydrating user from localStorage');
          setUser(JSON.parse(stored));
          setIsLoading(false);
          setIsHydrated(true);
          // Clear the just logged in flag
          sessionStorage.removeItem('time_just_logged_in');
        } else if (justLoggedIn && retryCount < maxRetries) {
          // Just logged in but cookies not ready yet - retry after a short delay
          console.log('[AuthProvider] Just logged in, waiting for cookies... retry', retryCount + 1);
          retryCount++;
          setTimeout(hydrate, 300);
          return; // Don't finish hydration yet
        } else {
          // No stored user/token - stop loading
          console.log('[AuthProvider] No stored user or token, stopping loading');
          setIsLoading(false);
          setIsHydrated(true);
          sessionStorage.removeItem('time_just_logged_in');
        }
      } catch (err) {
        console.log('[AuthProvider] Error during hydration:', err);
        setIsLoading(false);
        setIsHydrated(true);
      }
    };

    hydrate();

    // Safety timeout - never stay stuck on loading for more than 5 seconds
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setIsHydrated(true);
      sessionStorage.removeItem('time_just_logged_in');
      console.log('[AuthProvider] Safety timeout - forcing isLoading=false');
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname?.startsWith(route));

  const refreshUser = async () => {
    try {
      const token = getCookie('time_auth_token');
      console.log('[AuthProvider] Checking auth token:', token ? `${token.substring(0, 10)}...` : 'none');

      if (!token) {
        console.log('[AuthProvider] No token found, setting user to null');
        setUser(null);
        return;
      }

      console.log('[AuthProvider] Fetching /auth/me...');

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('[AuthProvider] /auth/me response:', response.status, response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('[AuthProvider] User data received:', data.user ? 'yes' : 'no');
          if (data.user) {
            setUser(data.user);
          } else {
            // Try to get user from localStorage as fallback
            const storedUser = localStorage.getItem('time_user');
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
                console.log('[AuthProvider] Using stored user data');
              } catch {
                setUser(null);
              }
            } else {
              setUser(null);
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log('[AuthProvider] Auth failed:', errorData.error || response.status);
          setUser(null);
          // Clear invalid token
          document.cookie = 'time_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'time_is_admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('[AuthProvider] /auth/me timed out, using stored user');
        } else {
          console.error('[AuthProvider] Fetch error:', fetchError);
        }
        // Try to use localStorage user as fallback
        const storedUser = localStorage.getItem('time_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            console.log('[AuthProvider] Using stored user data after fetch failure');
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[AuthProvider] Error checking auth:', error);
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
    // Wait for hydration to complete before running auth check
    if (!isHydrated) return;

    const checkAuth = async () => {
      console.log('[AuthProvider] Starting auth check...');

      // If we already have a user from localStorage hydration, just verify in background
      if (user) {
        console.log('[AuthProvider] User already loaded from localStorage, verifying in background...');
        // Verify in background without blocking - don't set loading
        refreshUser().catch(err => {
          console.warn('[AuthProvider] Background verification failed:', err);
        });
        return;
      }

      // No stored user found during hydration, check if we need to load
      const token = getCookie('time_auth_token');
      if (!token) {
        console.log('[AuthProvider] No token, setting isLoading=false');
        setIsLoading(false);
        return;
      }

      // Have token but no user - try to load from API
      console.log('[AuthProvider] Have token, loading user from API...');
      setIsLoading(true);
      try {
        await refreshUser();
      } catch (error) {
        console.error('[AuthProvider] Auth check failed:', error);
      } finally {
        console.log('[AuthProvider] Auth check complete, setting isLoading=false');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isHydrated, user]);

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
          <div className="mx-auto mb-4">
            <TimeIcon size={64} animated />
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
