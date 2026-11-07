import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CreateWatchItemPayload, UpdateWatchItemPayload, WatchItem, isMediaWatched } from '../types/media';
import { watchService } from '../services/watchService';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';

export interface FormattedTime {
  days: number;
  hours: number;
  minutes: number;
  displayString: string;
}

export interface WatchStats {
  totalMinutes: number;
  movieMinutes: number;
  seriesMinutes: number;
  totalCount: number;
  movieCount: number;
  seriesCount: number;
  favoriteCount: number;
  avgRating: number;
  totalTime: FormattedTime;
  movieTime: FormattedTime;
  seriesTime: FormattedTime;
  genreBreakdown: { name: string; hours: number; count: number }[];
}

interface WatchHistoryContextValue {
  history: WatchItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  stats: WatchStats;
  fetchHistory: (showIndicator?: boolean) => Promise<void>;
  addItem: (payload: CreateWatchItemPayload) => Promise<{ success: boolean; item?: WatchItem; message?: string }>;
  updateItem: (id: string, updates: UpdateWatchItemPayload) => Promise<{ success: boolean; item?: WatchItem; message?: string }>;
  removeItem: (id: string) => Promise<{ success: boolean; message?: string }>;
  clearHistory: (mediaTypes?: string[]) => Promise<{ success: boolean; message?: string }>;
  getHistoryItemByTmdbId: (tmdbId: number, mediaType?: 'movie' | 'series') => WatchItem | undefined;
}

const formatMinutes = (totalMinutes: number): FormattedTime => {
  if (!totalMinutes || totalMinutes <= 0) {
    return { days: 0, hours: 0, minutes: 0, displayString: '0m' };
  }
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0 || days > 0) parts.push(`${remainingHours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return {
    days,
    hours: remainingHours,
    minutes,
    displayString: parts.join(' '),
  };
};

const WatchHistoryContext = createContext<WatchHistoryContextValue | undefined>(undefined);

export const WatchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [history, setHistory] = useState<WatchItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load cached data initially
  useEffect(() => {
    const loadCache = async () => {
      const cached = await storage.getCachedHistory<WatchItem[]>();
      if (cached && Array.isArray(cached)) {
        setHistory(cached);
      }
      setIsLoading(false);
    };
    loadCache();
  }, []);

  const lastFetchTimeRef = useRef<number>(0);

  const fetchHistory = useCallback(async (showIndicator: boolean = false) => {
    if (!isAuthenticated) {
      setHistory([]);
      return;
    }
    try {
      if (showIndicator) {
        setIsRefreshing(true);
      }
      const data = await watchService.getWatchHistory();
      lastFetchTimeRef.current = Date.now();

      // Only update state reference if data actually changed to prevent full app re-renders
      setHistory((prev) => {
        if (
          prev.length === data.length &&
          (prev.length === 0 || (prev[0]?._id === data[0]?._id && prev[0]?.updatedAt === data[0]?.updatedAt))
        ) {
          return prev;
        }
        storage.setCachedHistory(data);
        return data;
      });
    } catch (error) {
      console.warn('Failed to fetch watch history', error);
    } finally {
      setIsLoading(false);
      if (showIndicator) {
        setIsRefreshing(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [isAuthenticated, fetchHistory]);

  // Sync watch history whenever the app comes back to foreground (throttled to at most once per 15s)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        const now = Date.now();
        if (now - lastFetchTimeRef.current > 15000) {
          fetchHistory();
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, fetchHistory]);

  const addItem = async (payload: CreateWatchItemPayload) => {
    try {
      const created = await watchService.addWatchItem(payload);
      const updated = [created, ...history];
      setHistory(updated);
      await storage.setCachedHistory(updated);
      return { success: true, item: created };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to add item' };
    }
  };

  const updateItem = async (id: string, updates: UpdateWatchItemPayload) => {
    try {
      const updatedItem = await watchService.updateWatchItem(id, updates);
      const updated = history.map((item) => (item._id === id ? updatedItem : item));
      setHistory(updated);
      await storage.setCachedHistory(updated);
      return { success: true, item: updatedItem };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update item' };
    }
  };

  const removeItem = async (id: string) => {
    try {
      await watchService.deleteWatchItem(id);
      const updated = history.filter((item) => item._id !== id);
      setHistory(updated);
      await storage.setCachedHistory(updated);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to remove item' };
    }
  };

  const clearHistory = async (mediaTypes?: string[]) => {
    try {
      await watchService.clearWatchHistory(mediaTypes);
      let updated: WatchItem[] = [];
      if (mediaTypes && mediaTypes.length > 0 && mediaTypes.length < 2) {
        updated = history.filter((item) => !mediaTypes.includes(item.mediaType));
      }
      setHistory(updated);
      await storage.setCachedHistory(updated);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to clear history' };
    }
  };

  const getHistoryItemByTmdbId = useCallback(
    (tmdbId: number, mediaType?: 'movie' | 'series'): WatchItem | undefined => {
      return history.find(
        (item) =>
          Number(item.tmdbId) === Number(tmdbId) &&
          (!mediaType || item.mediaType === mediaType)
      );
    },
    [history]
  );

  const stats = useMemo<WatchStats>(() => {
    let totalMinutes = 0;
    let movieMinutes = 0;
    let seriesMinutes = 0;
    let movieCount = 0;
    let seriesCount = 0;
    let favoriteCount = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    const genreMap: { [name: string]: { minutes: number; count: number } } = {};

    history.forEach((item) => {
      const watched = isMediaWatched(item);
      const mins = item.watchTimeMinutes || 0;

      if (watched) {
        totalMinutes += mins;

        if (item.mediaType === 'movie') {
          movieMinutes += mins;
          movieCount++;
        } else {
          seriesMinutes += mins;
          seriesCount++;
        }
      }

      if (item.isFavorite) {
        favoriteCount++;
      }

      if (item.rating > 0) {
        ratingSum += item.rating;
        ratingCount++;
      }

      if (watched && item.genres && Array.isArray(item.genres)) {
        item.genres.forEach((g) => {
          if (!genreMap[g.name]) {
            genreMap[g.name] = { minutes: 0, count: 0 };
          }
          genreMap[g.name].minutes += mins;
          genreMap[g.name].count += 1;
        });
      }
    });

    const genreBreakdown = Object.entries(genreMap)
      .map(([name, data]) => ({
        name,
        hours: Math.round((data.minutes / 60) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);

    const avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    return {
      totalMinutes,
      movieMinutes,
      seriesMinutes,
      totalCount: history.length,
      movieCount,
      seriesCount,
      favoriteCount,
      avgRating,
      totalTime: formatMinutes(totalMinutes),
      movieTime: formatMinutes(movieMinutes),
      seriesTime: formatMinutes(seriesMinutes),
      genreBreakdown,
    };
  }, [history]);

  return (
    <WatchHistoryContext.Provider
      value={{
        history,
        isLoading,
        isRefreshing,
        stats,
        fetchHistory,
        addItem,
        updateItem,
        removeItem,
        clearHistory,
        getHistoryItemByTmdbId,
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
};

export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
};
