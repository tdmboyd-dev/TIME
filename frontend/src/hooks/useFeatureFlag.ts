'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { API_BASE, getTokenFromCookie } from '@/lib/api';

// ============================================================
// TYPES
// ============================================================

interface Feature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface FeatureFlagContextValue {
  features: Feature[];
  isLoading: boolean;
  error: string | null;
  isFeatureEnabled: (featureName: string) => boolean;
  refreshFeatures: () => Promise<void>;
}

// ============================================================
// CONTEXT
// ============================================================

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface FeatureFlagProviderProps {
  children: ReactNode;
  refreshInterval?: number; // ms, 0 to disable
}

export function FeatureFlagProvider({
  children,
  refreshInterval = 300000, // 5 minutes default
}: FeatureFlagProviderProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      const token = getTokenFromCookie();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/features`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatures(data.features || []);
          setError(null);
        }
      } else if (response.status === 401) {
        // Not authenticated, clear features
        setFeatures([]);
      } else {
        setError('Failed to fetch features');
      }
    } catch (err) {
      setError('Network error fetching features');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchFeatures, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchFeatures, refreshInterval]);

  // Check if feature is enabled
  const isFeatureEnabled = useCallback((featureName: string): boolean => {
    const feature = features.find(f =>
      f.name.toLowerCase() === featureName.toLowerCase()
    );
    return feature?.enabled ?? false;
  }, [features]);

  const value: FeatureFlagContextValue = {
    features,
    isLoading,
    error,
    isFeatureEnabled,
    refreshFeatures: fetchFeatures,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Hook to access feature flag context
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);

  if (!context) {
    // Return default values if used outside provider
    return {
      features: [],
      isLoading: false,
      error: null,
      isFeatureEnabled: () => false,
      refreshFeatures: async () => {},
    };
  }

  return context;
}

/**
 * Hook to check if a specific feature is enabled
 *
 * @param featureName - The name of the feature to check
 * @returns boolean indicating if the feature is enabled
 *
 * @example
 * const isDarkModeEnabled = useFeatureFlag('dark_mode');
 * if (isDarkModeEnabled) {
 *   // Render dark mode UI
 * }
 */
export function useFeatureFlag(featureName: string): boolean {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();

  // While loading, return false to prevent flash of gated content
  if (isLoading) return false;

  return isFeatureEnabled(featureName);
}

/**
 * Hook to check multiple features at once
 *
 * @param featureNames - Array of feature names to check
 * @returns Object with feature names as keys and boolean values
 *
 * @example
 * const features = useFeatureFlagMultiple(['dark_mode', 'ai_bots', 'social_trading']);
 * if (features.dark_mode && features.ai_bots) {
 *   // Both features enabled
 * }
 */
export function useFeatureFlagMultiple(featureNames: string[]): Record<string, boolean> {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();

  if (isLoading) {
    return featureNames.reduce((acc, name) => ({ ...acc, [name]: false }), {});
  }

  return featureNames.reduce((acc, name) => ({
    ...acc,
    [name]: isFeatureEnabled(name),
  }), {});
}

/**
 * Standalone hook for checking a feature without context
 * Useful for one-off checks or when provider isn't available
 *
 * @param featureName - The name of the feature to check
 * @returns Object with enabled state, loading state, and error
 */
export function useFeatureFlagStandalone(featureName: string): {
  enabled: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkFeature = async () => {
      try {
        const token = getTokenFromCookie();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          `${API_BASE}/features/check/${encodeURIComponent(featureName)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setEnabled(data.enabled ?? false);
          setError(null);
        } else {
          setError('Failed to check feature');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    };

    checkFeature();
  }, [featureName]);

  return { enabled, isLoading, error };
}

// ============================================================
// COMPONENT HELPERS
// ============================================================

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if feature is enabled
 *
 * @example
 * <FeatureGate feature="ai_trading" fallback={<UpgradePrompt />}>
 *   <AITradingPanel />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: FeatureGateProps): ReactNode {
  const enabled = useFeatureFlag(feature);
  return enabled ? children : fallback;
}

interface FeatureGateMultipleProps {
  features: string[];
  mode?: 'all' | 'any'; // all = AND, any = OR
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that gates content based on multiple features
 *
 * @example
 * <FeatureGateMultiple features={['premium', 'ai_bots']} mode="all">
 *   <PremiumAIPanel />
 * </FeatureGateMultiple>
 */
export function FeatureGateMultiple({
  features,
  mode = 'all',
  children,
  fallback = null,
}: FeatureGateMultipleProps): ReactNode {
  const featureStates = useFeatureFlagMultiple(features);

  const shouldRender = mode === 'all'
    ? features.every(f => featureStates[f])
    : features.some(f => featureStates[f]);

  return shouldRender ? children : fallback;
}

export default useFeatureFlag;
