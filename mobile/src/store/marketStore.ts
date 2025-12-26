/**
 * Market Store using Zustand
 * Manages market data and real-time prices
 */

import { create } from 'zustand';
import { Market, Candle } from '../types';

interface MarketState {
  markets: Market[];
  watchlist: string[];
  selectedMarket: Market | null;
  candles: Record<string, Candle[]>;
  priceMap: Record<string, number>;
  isLoading: boolean;
  lastUpdated: Date | null;

  // Actions
  setMarkets: (markets: Market[]) => void;
  updateMarket: (symbol: string, updates: Partial<Market>) => void;
  updatePrice: (symbol: string, price: number, change24h?: number) => void;
  setSelectedMarket: (market: Market | null) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setCandles: (symbol: string, candles: Candle[]) => void;
  clearMarkets: () => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  markets: [],
  watchlist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT'],
  selectedMarket: null,
  candles: {},
  priceMap: {},
  isLoading: false,
  lastUpdated: null,

  setMarkets: (markets) => {
    const priceMap: Record<string, number> = {};
    markets.forEach((market) => {
      priceMap[market.symbol] = market.price;
    });
    set({ markets, priceMap, lastUpdated: new Date() });
  },

  updateMarket: (symbol, updates) =>
    set((state) => ({
      markets: state.markets.map((market) =>
        market.symbol === symbol ? { ...market, ...updates } : market
      ),
      priceMap:
        updates.price !== undefined
          ? { ...state.priceMap, [symbol]: updates.price }
          : state.priceMap,
      lastUpdated: new Date(),
    })),

  updatePrice: (symbol, price, change24h) =>
    set((state) => ({
      priceMap: { ...state.priceMap, [symbol]: price },
      markets: state.markets.map((market) =>
        market.symbol === symbol
          ? {
              ...market,
              price,
              priceChange24h: change24h ?? market.priceChange24h,
            }
          : market
      ),
      lastUpdated: new Date(),
    })),

  setSelectedMarket: (market) => set({ selectedMarket: market }),

  addToWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.includes(symbol)
        ? state.watchlist
        : [...state.watchlist, symbol],
    })),

  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== symbol),
    })),

  setCandles: (symbol, candles) =>
    set((state) => ({
      candles: { ...state.candles, [symbol]: candles },
    })),

  clearMarkets: () =>
    set({
      markets: [],
      selectedMarket: null,
      candles: {},
      priceMap: {},
      lastUpdated: null,
    }),
}));
