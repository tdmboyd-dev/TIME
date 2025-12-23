import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';

interface Bot {
  id: string;
  name: string;
  source: string;
  status: string;
  performance: {
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    totalPnL: number;
  };
}

interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  status: string;
  botIds: string[];
  entryTime: Date;
  exitTime?: Date;
}

interface Insight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  actionable: boolean;
  createdAt: Date;
}

interface TimeState {
  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Evolution Mode
  evolutionMode: 'controlled' | 'autonomous';
  setEvolutionMode: (mode: 'controlled' | 'autonomous') => void;

  // Market Regime
  regime: string;
  regimeConfidence: number;
  setRegime: (regime: string, confidence: number) => void;

  // Bots
  bots: Bot[];
  setBots: (bots: Bot[]) => void;
  addBot: (bot: Bot) => void;

  // Trades
  trades: Trade[];
  setTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;

  // Insights
  insights: Insight[];
  setInsights: (insights: Insight[]) => void;
  addInsight: (insight: Insight) => void;

  // Metrics
  metrics: {
    totalBotsAbsorbed: number;
    totalTradesAnalyzed: number;
    totalInsightsGenerated: number;
    totalStrategiesSynthesized: number;
  };
  setMetrics: (metrics: TimeState['metrics']) => void;

  // System Health
  health: Array<{
    component: string;
    status: string;
  }>;
  setHealth: (health: TimeState['health']) => void;

  // User preferences (persisted)
  userPreferences: {
    watchMode: boolean;
    autoTradeEnabled: boolean;
    notifications: boolean;
    theme: 'dark' | 'light';
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
  };
  setUserPreferences: (prefs: Partial<TimeState['userPreferences']>) => void;
}

export const useTimeStore = create<TimeState>()(
  persist(
    (set) => ({
  // Connection
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Evolution Mode
  evolutionMode: 'controlled',
  setEvolutionMode: (mode) => set({ evolutionMode: mode }),

  // Market Regime
  regime: 'unknown',
  regimeConfidence: 0,
  setRegime: (regime, confidence) => set({ regime, regimeConfidence: confidence }),

  // Bots
  bots: [],
  setBots: (bots) => set({ bots }),
  addBot: (bot) => set((state) => ({ bots: [...state.bots, bot] })),

  // Trades
  trades: [],
  setTrades: (trades) => set({ trades }),
  addTrade: (trade) => set((state) => ({ trades: [...state.trades, trade] })),

  // Insights
  insights: [],
  setInsights: (insights) => set({ insights }),
  addInsight: (insight) => set((state) => ({ insights: [insight, ...state.insights].slice(0, 100) })),

  // Metrics
  metrics: {
    totalBotsAbsorbed: 0,
    totalTradesAnalyzed: 0,
    totalInsightsGenerated: 0,
    totalStrategiesSynthesized: 0,
  },
  setMetrics: (metrics) => set({ metrics }),

  // System Health
  health: [],
  setHealth: (health) => set({ health }),

  // User preferences (persisted to localStorage)
  userPreferences: {
    watchMode: false,
    autoTradeEnabled: false,
    notifications: true,
    theme: 'dark',
    riskProfile: 'moderate',
  },
  setUserPreferences: (prefs) => set((state) => ({
    userPreferences: { ...state.userPreferences, ...prefs }
  })),
    }),
    {
      name: 'time-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences, not transient state like connection status
      partialize: (state) => ({
        evolutionMode: state.evolutionMode,
        userPreferences: state.userPreferences,
      }),
      // Hydration callback - state is restored from localStorage
      onRehydrateStorage: () => () => {
        // Hydration complete - persisted state restored
      },
    }
  )
);

// Hook to ensure hydration is complete before using persisted values
// This prevents the flash of default values on page load
export const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Check if we're on client side
    const unsubFinishHydration = useTimeStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Check if already hydrated
    if (useTimeStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};

// Direct access to persisted state (useful for debugging)
export const getPersistedState = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('time-storage');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};
