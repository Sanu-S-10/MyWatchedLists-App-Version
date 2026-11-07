import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getDefaultApiUrl } from '../config/env';
import { storage } from './storage';

let cachedApiUrl: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

export const getApiBaseUrl = async (): Promise<string> => {
  if (cachedApiUrl) return cachedApiUrl;
  const custom = await storage.getCustomApiUrl();
  if (custom && custom.trim()) {
    const url = custom.trim().replace(/\/+$/, '');
    cachedApiUrl = url;
    return url;
  }
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    const url = envUrl.trim().replace(/\/+$/, '');
    cachedApiUrl = url;
    return url;
  }
  const defaultUrl = getDefaultApiUrl().replace(/\/+$/, '');
  cachedApiUrl = defaultUrl;
  return defaultUrl;
};

export const updateApiBaseUrl = async (newUrl: string): Promise<void> => {
  await storage.setCustomApiUrl(newUrl);
  cachedApiUrl = newUrl.trim().replace(/\/+$/, '');
  apiClient.defaults.baseURL = cachedApiUrl;
};

export const apiClient: AxiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to attach JWT token and ensure baseURL is set
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (!config.baseURL) {
      config.baseURL = await getApiBaseUrl();
    }

    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and notify auth state
      await storage.removeToken();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);
