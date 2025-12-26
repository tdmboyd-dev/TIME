/**
 * Trade Store using Zustand
 * Manages trade orders and history
 */

import { create } from 'zustand';
import { Order, Trade, OrderSide, OrderType } from '../types';

interface TradeState {
  orders: Order[];
  trades: Trade[];
  pendingOrders: Order[];
  isLoading: boolean;
  currentOrder: Partial<Order> | null;

  // Actions
  setOrders: (orders: Order[]) => void;
  setTrades: (trades: Trade[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  removeOrder: (orderId: string) => void;
  setCurrentOrder: (order: Partial<Order> | null) => void;
  clearTrades: () => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  orders: [],
  trades: [],
  pendingOrders: [],
  isLoading: false,
  currentOrder: null,

  setOrders: (orders) =>
    set({
      orders,
      pendingOrders: orders.filter((o) => o.status === 'pending'),
    }),

  setTrades: (trades) => set({ trades }),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
      pendingOrders:
        order.status === 'pending'
          ? [order, ...state.pendingOrders]
          : state.pendingOrders,
    })),

  updateOrder: (orderId, updates) =>
    set((state) => {
      const updatedOrders = state.orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      );
      return {
        orders: updatedOrders,
        pendingOrders: updatedOrders.filter((o) => o.status === 'pending'),
      };
    }),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
      pendingOrders: state.pendingOrders.filter((o) => o.id !== orderId),
    })),

  setCurrentOrder: (order) => set({ currentOrder: order }),

  clearTrades: () =>
    set({
      orders: [],
      trades: [],
      pendingOrders: [],
      currentOrder: null,
    }),
}));
