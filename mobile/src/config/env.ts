import { Platform } from 'react-native';

// Live Render backend URL (Production)
export const PRODUCTION_API_URL = 'https://mywatchedlist-backend.onrender.com';

// Local IP for testing with local server if desired
export const DEFAULT_LAN_IP = '192.168.182.244';
export const DEFAULT_PORT = '5000';

export const getDefaultApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim()) {
    return process.env.EXPO_PUBLIC_API_URL.trim();
  }
  return PRODUCTION_API_URL;
};

export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
export const TMDB_IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';
export const TMDB_IMAGE_BASE_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
export const TMDB_IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_BASE_W300 = 'https://image.tmdb.org/t/p/w300';
export const TMDB_IMAGE_BASE_W185 = 'https://image.tmdb.org/t/p/w185';
export const TMDB_IMAGE_BASE_W92 = 'https://image.tmdb.org/t/p/w92';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'mwl_auth_token',
  USER_INFO: 'mwl_user_info',
  API_URL_OVERRIDE: 'mwl_custom_api_url',
  WATCH_HISTORY_CACHE: 'mwl_cached_history',
  CUSTOM_LISTS_CACHE: 'mwl_cached_custom_lists',
  THEME_PREFERENCE: 'mwl_theme_pref',
} as const;
