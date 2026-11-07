import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../config/env';
import { User } from '../types/auth';

const isSecureStoreAvailable = Platform.OS === 'android' || Platform.OS === 'ios';

export const storage = {
  // Token (Secure Storage)
  async setToken(token: string): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      }
    } catch (e) {
      console.warn('Failed to save auth token securely', e);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (isSecureStoreAvailable) {
        const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        if (token) return token;
      }
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (e) {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (isSecureStoreAvailable) {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      }
    } catch {}
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  // User Info (AsyncStorage)
  async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_INFO);
  },

  // Custom API URL Override
  async getCustomApiUrl(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.API_URL_OVERRIDE);
    } catch {
      return null;
    }
  },

  async setCustomApiUrl(url: string): Promise<void> {
    if (!url.trim()) {
      await AsyncStorage.removeItem(STORAGE_KEYS.API_URL_OVERRIDE);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.API_URL_OVERRIDE, url.trim());
    }
  },

  // Cached Watch History
  async getCachedHistory<T = unknown>(): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WATCH_HISTORY_CACHE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setCachedHistory<T = unknown>(history: T): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WATCH_HISTORY_CACHE, JSON.stringify(history));
    } catch {}
  },

  async clearCachedHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY_CACHE);
  },

  // Theme Preference
  async getTheme(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
    } catch {
      return null;
    }
  },

  async setTheme(theme: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  },

  // Clear all stored session data
  async clearAllSession(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
    await this.clearCachedHistory();
  },
};
