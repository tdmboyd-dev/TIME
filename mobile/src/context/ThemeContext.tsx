/**
 * Theme Context for Dark/Light Mode Support
 * TIME BEYOND US - Dynamic Theme Management
 */

import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme, ColorSchemeName } from 'react-native';
import { useSettingsStore, Theme } from '../store/settingsStore';

// Color palette definitions
export const lightColors = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  success: '#22c55e',
  successLight: '#4ade80',
  successDark: '#16a34a',
  error: '#ef4444',
  errorLight: '#f87171',
  errorDark: '#dc2626',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#d97706',
  info: '#06b6d4',
  infoLight: '#22d3ee',
  infoDark: '#0891b2',

  // Background colors
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  backgroundTertiary: '#f1f5f9',

  // Surface colors
  surface: '#ffffff',
  surfaceSecondary: '#f8fafc',
  surfaceElevated: '#ffffff',

  // Text colors
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textInverse: '#f8fafc',

  // Border colors
  border: '#e2e8f0',
  borderSecondary: '#cbd5e1',
  borderFocus: '#6366f1',

  // Trading colors
  buyGreen: '#22c55e',
  sellRed: '#ef4444',
  profit: '#22c55e',
  loss: '#ef4444',
  neutral: '#64748b',

  // Special colors
  accent: '#00ff88',
  accentDark: '#00cc6a',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadowColor: '#000000',
};

export const darkColors = {
  primary: '#00ff88',
  primaryLight: '#4dffaa',
  primaryDark: '#00cc6a',
  success: '#00ff88',
  successLight: '#4dffaa',
  successDark: '#00cc6a',
  error: '#ef4444',
  errorLight: '#f87171',
  errorDark: '#dc2626',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#d97706',
  info: '#22d3ee',
  infoLight: '#67e8f9',
  infoDark: '#06b6d4',

  // Background colors
  background: '#020617',
  backgroundSecondary: '#0f172a',
  backgroundTertiary: '#1e293b',

  // Surface colors
  surface: '#1e293b',
  surfaceSecondary: '#334155',
  surfaceElevated: '#334155',

  // Text colors
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textInverse: '#0f172a',

  // Border colors
  border: '#334155',
  borderSecondary: '#475569',
  borderFocus: '#00ff88',

  // Trading colors
  buyGreen: '#00ff88',
  sellRed: '#ef4444',
  profit: '#00ff88',
  loss: '#ef4444',
  neutral: '#94a3b8',

  // Special colors
  accent: '#6366f1',
  accentDark: '#4f46e5',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadowColor: '#000000',
};

export type ThemeColors = typeof darkColors;

export interface ThemeContextType {
  theme: 'dark' | 'light';
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const { theme: storedTheme, setTheme } = useSettingsStore();

  // Determine the actual theme to use
  const resolvedTheme = useMemo((): 'dark' | 'light' => {
    if (storedTheme === 'system') {
      return systemColorScheme === 'light' ? 'light' : 'dark';
    }
    return storedTheme;
  }, [storedTheme, systemColorScheme]);

  // Get the colors for the current theme
  const colors = useMemo((): ThemeColors => {
    return resolvedTheme === 'dark' ? darkColors : lightColors;
  }, [resolvedTheme]);

  // Toggle between dark and light
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const contextValue: ThemeContextType = {
    theme: resolvedTheme,
    colors,
    isDark: resolvedTheme === 'dark',
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper function to create dynamic styles
export function createThemedStyles<T extends Record<string, any>>(
  styleFactory: (colors: ThemeColors, isDark: boolean) => T
) {
  return (colors: ThemeColors, isDark: boolean): T => {
    return styleFactory(colors, isDark);
  };
}

// Hook for dynamic styles
export function useThemedStyles<T extends Record<string, any>>(
  styleFactory: (colors: ThemeColors, isDark: boolean) => T
): T {
  const { colors, isDark } = useTheme();
  return useMemo(() => styleFactory(colors, isDark), [colors, isDark, styleFactory]);
}

export default ThemeContext;
