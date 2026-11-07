import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthResponse, ProfileUpdateData, User } from '../types/auth';
import { authService } from '../services/authService';
import { storage } from '../services/storage';
import { getApiBaseUrl, setOnUnauthorized, updateApiBaseUrl } from '../services/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiUrl: string;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (username: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<AuthResponse>;
  setApiUrl: (newUrl: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiUrl, setApiUrlState] = useState<string>('');

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await storage.clearAllSession();
  }, []);

  const initAuth = useCallback(async () => {
    try {
      const currentUrl = await getApiBaseUrl();
      setApiUrlState(currentUrl);

      const savedToken = await storage.getToken();
      const savedUser = await storage.getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);

        // Background profile validation
        try {
          const freshProfile = await authService.getProfile();
          setUser((prev) => (prev ? { ...prev, ...freshProfile } : freshProfile));
          await storage.setUser({ ...savedUser, ...freshProfile });
        } catch {
          // If network is offline, keep cached user; if 401, interceptor triggers logout
        }
      }
    } catch (e) {
      console.warn('Auth initialization error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
    setOnUnauthorized(() => {
      logout();
    });
  }, [initAuth, logout]);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const data = await authService.login(email, password);
    setToken(data.token);
    const userInfo: User = {
      _id: data._id,
      username: data.username,
      email: data.email,
      preferences: data.preferences,
      token: data.token,
    };
    setUser(userInfo);
    await storage.setToken(data.token);
    await storage.setUser(userInfo);
    return data;
  };

  const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const data = await authService.register(username, email, password);
    setToken(data.token);
    const userInfo: User = {
      _id: data._id,
      username: data.username,
      email: data.email,
      preferences: data.preferences,
      token: data.token,
    };
    setUser(userInfo);
    await storage.setToken(data.token);
    await storage.setUser(userInfo);
    return data;
  };

  const updateProfile = async (updates: ProfileUpdateData): Promise<AuthResponse> => {
    const updated = await authService.updateProfile(updates);
    const updatedUser: User = {
      _id: updated._id,
      username: updated.username,
      email: updated.email,
      preferences: updated.preferences,
      token: updated.token || token || undefined,
    };
    setUser(updatedUser);
    if (updated.token) {
      setToken(updated.token);
      await storage.setToken(updated.token);
    }
    await storage.setUser(updatedUser);
    return updated;
  };

  const refreshProfile = async (): Promise<void> => {
    if (!token) return;
    const fresh = await authService.getProfile();
    setUser((prev) => (prev ? { ...prev, ...fresh } : fresh));
    if (user) {
      await storage.setUser({ ...user, ...fresh });
    }
  };

  const setApiUrl = async (newUrl: string): Promise<void> => {
    await updateApiBaseUrl(newUrl);
    setApiUrlState(newUrl);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        apiUrl,
        login,
        register,
        logout,
        updateProfile,
        setApiUrl,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
