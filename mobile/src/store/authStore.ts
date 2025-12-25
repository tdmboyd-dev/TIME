/**
 * Authentication Store using Zustand
 * Manages user authentication state across the app
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => set({ token }),

  login: async (user, token) => {
    try {
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user_data');
      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user_data');

      if (token && userData) {
        const user = JSON.parse(userData);
        set({ user, token, isAuthenticated: true, isLoading: false });
        return true;
      } else {
        set({ isAuthenticated: false, isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
  },
}));
