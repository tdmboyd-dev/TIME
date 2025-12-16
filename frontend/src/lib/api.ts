/**
 * API Configuration Utility
 *
 * Ensures consistent API URL handling across all frontend pages.
 * Always appends /api/v1 if not already present.
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
 * Fetch wrapper with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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

export default API_BASE;
