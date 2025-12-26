/**
 * Bot Store using Zustand
 * Manages AI trading bots state
 */

import { create } from 'zustand';
import { Bot, BotStatus } from '../types';

interface BotState {
  bots: Bot[];
  activeBots: Bot[];
  selectedBot: Bot | null;
  isLoading: boolean;
  filter: 'all' | BotStatus;

  // Statistics
  stats: {
    totalBots: number;
    activeBots: number;
    totalProfit: number;
    totalTrades24h: number;
  };

  // Actions
  setBots: (bots: Bot[]) => void;
  addBot: (bot: Bot) => void;
  updateBot: (botId: string, updates: Partial<Bot>) => void;
  removeBot: (botId: string) => void;
  setSelectedBot: (bot: Bot | null) => void;
  toggleBotStatus: (botId: string) => void;
  setFilter: (filter: 'all' | BotStatus) => void;
  clearBots: () => void;
}

export const useBotStore = create<BotState>((set, get) => ({
  bots: [],
  activeBots: [],
  selectedBot: null,
  isLoading: false,
  filter: 'all',

  stats: {
    totalBots: 0,
    activeBots: 0,
    totalProfit: 0,
    totalTrades24h: 0,
  },

  setBots: (bots) => {
    const activeBots = bots.filter((bot) => bot.status === 'active');
    const stats = {
      totalBots: bots.length,
      activeBots: activeBots.length,
      totalProfit: bots.reduce((sum, bot) => sum + bot.profitLoss, 0),
      totalTrades24h: bots.reduce((sum, bot) => sum + bot.trades24h, 0),
    };
    set({ bots, activeBots, stats });
  },

  addBot: (bot) =>
    set((state) => {
      const newBots = [bot, ...state.bots];
      const activeBots = newBots.filter((b) => b.status === 'active');
      return {
        bots: newBots,
        activeBots,
        stats: {
          ...state.stats,
          totalBots: newBots.length,
          activeBots: activeBots.length,
        },
      };
    }),

  updateBot: (botId, updates) =>
    set((state) => {
      const updatedBots = state.bots.map((bot) =>
        bot.id === botId ? { ...bot, ...updates } : bot
      );
      const activeBots = updatedBots.filter((b) => b.status === 'active');
      const stats = {
        totalBots: updatedBots.length,
        activeBots: activeBots.length,
        totalProfit: updatedBots.reduce((sum, bot) => sum + bot.profitLoss, 0),
        totalTrades24h: updatedBots.reduce((sum, bot) => sum + bot.trades24h, 0),
      };
      return { bots: updatedBots, activeBots, stats };
    }),

  removeBot: (botId) =>
    set((state) => {
      const filteredBots = state.bots.filter((b) => b.id !== botId);
      const activeBots = filteredBots.filter((b) => b.status === 'active');
      return {
        bots: filteredBots,
        activeBots,
        stats: {
          ...state.stats,
          totalBots: filteredBots.length,
          activeBots: activeBots.length,
        },
      };
    }),

  setSelectedBot: (bot) => set({ selectedBot: bot }),

  toggleBotStatus: (botId) =>
    set((state) => {
      const updatedBots = state.bots.map((bot) => {
        if (bot.id === botId) {
          const newStatus: BotStatus =
            bot.status === 'active' ? 'paused' : 'active';
          return { ...bot, status: newStatus };
        }
        return bot;
      });
      const activeBots = updatedBots.filter((b) => b.status === 'active');
      return {
        bots: updatedBots,
        activeBots,
        stats: {
          ...state.stats,
          activeBots: activeBots.length,
        },
      };
    }),

  setFilter: (filter) => set({ filter }),

  clearBots: () =>
    set({
      bots: [],
      activeBots: [],
      selectedBot: null,
      stats: {
        totalBots: 0,
        activeBots: 0,
        totalProfit: 0,
        totalTrades24h: 0,
      },
    }),
}));
