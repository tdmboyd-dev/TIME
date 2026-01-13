/**
 * API Configuration Utility
 *
 * Ensures consistent API URL handling across all frontend pages.
 * Always appends /api/v1 if not already present.
 *
 * SECURITY: Implements CSRF protection for all state-changing requests
 */

const DEFAULT_API_URL = 'https://time-backend-hosting.fly.dev';

function getApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

  // Ensure URL ends with /api/v1
  if (envUrl.endsWith('/api/v1')) {
    return envUrl;
  }

  // Remove trailing slash if present
  const baseUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;

  // Append /api/v1
  return `${baseUrl}/api/v1`;
}

export const API_BASE = getApiBase();

/**
 * CSRF Token Management
 * SECURITY: Required for all POST/PUT/DELETE requests
 */
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Get CSRF token from cookie
 */
export function getCSRFTokenFromCookie(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/time_csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch CSRF token from server
 * SECURITY: Must be called before any state-changing request
 */
export async function fetchCSRFToken(): Promise<string> {
  // Check if we already have a valid token in cookie
  const cookieToken = getCSRFTokenFromCookie();
  if (cookieToken) {
    csrfToken = cookieToken;
    return cookieToken;
  }

  // Avoid duplicate requests
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      csrfToken = data.csrfToken;
      return data.csrfToken;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

/**
 * Get current CSRF token (from memory or cookie)
 */
export function getCSRFToken(): string | null {
  return csrfToken || getCSRFTokenFromCookie();
}

/**
 * Ensure CSRF token is available
 * SECURITY: Call this before making state-changing requests
 */
export async function ensureCSRFToken(): Promise<string> {
  const token = getCSRFToken();
  if (token) return token;
  return fetchCSRFToken();
}

/**
 * Fetch wrapper with error handling and CSRF protection
 * SECURITY: Automatically includes CSRF token for state-changing requests
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const method = options?.method?.toUpperCase() || 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    // SECURITY: Include CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const token = await ensureCSRFToken();
      headers['x-csrf-token'] = token;
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'include', // SECURITY: Include httpOnly cookies for auth
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Get auth token from cookie
 * The login page stores token in a non-httpOnly cookie for API auth headers
 */
export function getTokenFromCookie(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/time_auth_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Get auth headers for API requests
 * Reads token from cookie and returns proper Authorization header
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getTokenFromCookie();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

/**
 * Get auth token from cookie (for backward compatibility)
 * Note: httpOnly cookies are not accessible via JavaScript by design
 * This function returns the user info stored in localStorage
 */
export function getAuthUser(): any {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('time_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * Check if user is logged in (based on user info in localStorage)
 * Note: Actual auth validation happens server-side via httpOnly cookie
 */
export function isLoggedIn(): boolean {
  return !!getAuthUser();
}

/**
 * Logout - clear local storage and call logout endpoint
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Continue even if API call fails
  }
  localStorage.removeItem('time_user');
  localStorage.removeItem('time_remember_email');
}

export default API_BASE;
