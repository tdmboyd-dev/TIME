/**
 * Settings Store using Zustand
 * Manages app preferences and user settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'dark' | 'light' | 'system';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

interface NotificationSettings {
  trades: boolean;
  bots: boolean;
  priceAlerts: boolean;
  system: boolean;
  email: boolean;
  sound: boolean;
  vibration: boolean;
}

interface TradingSettings {
  paperTradingMode: boolean;
  confirmTrades: boolean;
  defaultOrderType: 'market' | 'limit';
  riskLevel: 'low' | 'medium' | 'high';
  maxPositionSize: number;
  stopLossEnabled: boolean;
  defaultStopLoss: number;
  takeProfitEnabled: boolean;
  defaultTakeProfit: number;
}

interface SecuritySettings {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockMinutes: number;
  requireAuthForTrades: boolean;
}

interface DisplaySettings {
  showBalances: boolean;
  compactMode: boolean;
  chartStyle: 'candle' | 'line' | 'bar';
  defaultTimeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

interface SettingsState {
  theme: Theme;
  language: Language;
  notifications: NotificationSettings;
  trading: TradingSettings;
  security: SecuritySettings;
  display: DisplaySettings;
  isLoading: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  updateTrading: (settings: Partial<TradingSettings>) => void;
  updateSecurity: (settings: Partial<SecuritySettings>) => void;
  updateDisplay: (settings: Partial<DisplaySettings>) => void;
  resetToDefaults: () => void;
}

const defaultSettings: Omit<SettingsState, 'isLoading' | keyof ReturnType<typeof createActions>> = {
  theme: 'dark',
  language: 'en',
  notifications: {
    trades: true,
    bots: true,
    priceAlerts: true,
    system: true,
    email: false,
    sound: true,
    vibration: true,
  },
  trading: {
    paperTradingMode: false,
    confirmTrades: true,
    defaultOrderType: 'market',
    riskLevel: 'medium',
    maxPositionSize: 10000,
    stopLossEnabled: true,
    defaultStopLoss: 5,
    takeProfitEnabled: true,
    defaultTakeProfit: 10,
  },
  security: {
    biometricEnabled: true,
    pinEnabled: false,
    autoLockMinutes: 5,
    requireAuthForTrades: false,
  },
  display: {
    showBalances: true,
    compactMode: false,
    chartStyle: 'candle',
    defaultTimeframe: '1h',
  },
};

const createActions = (set: any) => ({
  setTheme: (theme: Theme) => set({ theme }),

  setLanguage: (language: Language) => set({ language }),

  updateNotifications: (settings: Partial<NotificationSettings>) =>
    set((state: SettingsState) => ({
      notifications: { ...state.notifications, ...settings },
    })),

  updateTrading: (settings: Partial<TradingSettings>) =>
    set((state: SettingsState) => ({
      trading: { ...state.trading, ...settings },
    })),

  updateSecurity: (settings: Partial<SecuritySettings>) =>
    set((state: SettingsState) => ({
      security: { ...state.security, ...settings },
    })),

  updateDisplay: (settings: Partial<DisplaySettings>) =>
    set((state: SettingsState) => ({
      display: { ...state.display, ...settings },
    })),

  resetToDefaults: () => set({ ...defaultSettings }),
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      isLoading: false,
      ...createActions(set),
    }),
    {
      name: 'time-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        notifications: state.notifications,
        trading: state.trading,
        security: state.security,
        display: state.display,
      }),
    }
  )
);
