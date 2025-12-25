/**
 * Portfolio Store using Zustand
 * Manages portfolio data with real-time updates
 */

import { create } from 'zustand';
import { Portfolio, Position } from '../types';

interface PortfolioState {
  portfolio: Portfolio | null;
  positions: Position[];
  isLoading: boolean;
  lastUpdated: Date | null;

  // Actions
  setPortfolio: (portfolio: Portfolio) => void;
  setPositions: (positions: Position[]) => void;
  updatePosition: (positionId: string, updates: Partial<Position>) => void;
  clearPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolio: null,
  positions: [],
  isLoading: false,
  lastUpdated: null,

  setPortfolio: (portfolio) =>
    set({ portfolio, lastUpdated: new Date() }),

  setPositions: (positions) =>
    set({ positions, lastUpdated: new Date() }),

  updatePosition: (positionId, updates) =>
    set((state) => ({
      positions: state.positions.map((pos) =>
        pos.id === positionId ? { ...pos, ...updates } : pos
      ),
      lastUpdated: new Date(),
    })),

  clearPortfolio: () =>
    set({ portfolio: null, positions: [], lastUpdated: null }),
}));
