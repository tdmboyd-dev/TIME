import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../utils/logger';

class StorageService {
  // Secure storage (for sensitive data like tokens, passwords)
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error(`Error setting secure item ${key}`, error);
      throw error;
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.error(`Error getting secure item ${key}`, error);
      return null;
    }
  }

  async deleteSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error(`Error deleting secure item ${key}`, error);
      throw error;
    }
  }

  // Regular storage (for non-sensitive data)
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      logger.error(`Error setting item ${key}`, error);
      throw error;
    }
  }

  async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      logger.error(`Error getting item ${key}`, error);
      return null;
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error(`Error deleting item ${key}`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      logger.error('Error clearing storage', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      logger.error('Error getting all keys', error);
      return [];
    }
  }

  // Multi-get (get multiple items at once)
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};

      pairs.forEach(([key, value]) => {
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });

      return result;
    } catch (error) {
      logger.error('Error in multiGet', error);
      return {};
    }
  }

  // Multi-set (set multiple items at once)
  async multiSet(keyValuePairs: Array<[string, any]>): Promise<void> {
    try {
      const jsonPairs: Array<[string, string]> = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);
      await AsyncStorage.multiSet(jsonPairs);
    } catch (error) {
      logger.error('Error in multiSet', error);
      throw error;
    }
  }

  // Multi-remove (remove multiple items at once)
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      logger.error('Error in multiRemove', error);
      throw error;
    }
  }

  // App preferences
  async setPreference(key: string, value: any): Promise<void> {
    await this.setItem(`pref_${key}`, value);
  }

  async getPreference<T = any>(key: string, defaultValue?: T): Promise<T> {
    const value = await this.getItem<T>(`pref_${key}`);
    return value !== null ? value : (defaultValue as T);
  }

  // Cache management
  async setCache(key: string, value: any, expiryMinutes?: number): Promise<void> {
    const cacheData = {
      value,
      timestamp: Date.now(),
      expiryMinutes,
    };
    await this.setItem(`cache_${key}`, cacheData);
  }

  async getCache<T = any>(key: string): Promise<T | null> {
    const cacheData = await this.getItem<{
      value: T;
      timestamp: number;
      expiryMinutes?: number;
    }>(`cache_${key}`);

    if (!cacheData) {
      return null;
    }

    // Check if cache has expired
    if (cacheData.expiryMinutes) {
      const expiryTime = cacheData.timestamp + cacheData.expiryMinutes * 60 * 1000;
      if (Date.now() > expiryTime) {
        await this.deleteItem(`cache_${key}`);
        return null;
      }
    }

    return cacheData.value;
  }

  async clearCache(): Promise<void> {
    const keys = await this.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
    await this.multiRemove(cacheKeys);
  }

  // User settings
  async getUserSettings(): Promise<any> {
    return await this.getItem('user_settings') || {};
  }

  async setUserSettings(settings: any): Promise<void> {
    await this.setItem('user_settings', settings);
  }

  async updateUserSettings(updates: any): Promise<void> {
    const currentSettings = await this.getUserSettings();
    const newSettings = { ...currentSettings, ...updates };
    await this.setUserSettings(newSettings);
  }

  // App state
  async saveAppState(state: any): Promise<void> {
    await this.setItem('app_state', state);
  }

  async loadAppState(): Promise<any> {
    return await this.getItem('app_state');
  }

  // Recently viewed
  async addRecentlyViewed(type: string, item: any, maxItems: number = 10): Promise<void> {
    const key = `recently_viewed_${type}`;
    const recent = (await this.getItem<any[]>(key)) || [];

    // Remove if already exists
    const filtered = recent.filter((i) => i.id !== item.id);

    // Add to beginning
    filtered.unshift(item);

    // Limit to max items
    const limited = filtered.slice(0, maxItems);

    await this.setItem(key, limited);
  }

  async getRecentlyViewed(type: string): Promise<any[]> {
    return (await this.getItem<any[]>(`recently_viewed_${type}`)) || [];
  }
}

// Note: AsyncStorage is not included in the dependencies yet
// You'll need to add it: npm install @react-native-async-storage/async-storage

export default new StorageService();
