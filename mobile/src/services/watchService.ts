import { apiClient } from './api';
import { CreateWatchItemPayload, UpdateWatchItemPayload, WatchItem } from '../types/media';

export interface AIFilterResult {
  items: WatchItem[];
  mode: 'ai' | 'tmdb-person' | 'basic';
}

export const watchService = {
  async getWatchHistory(): Promise<WatchItem[]> {
    const { data } = await apiClient.get<WatchItem[]>('/api/watch-history');
    return data;
  },

  async addWatchItem(item: CreateWatchItemPayload): Promise<WatchItem> {
    const { data } = await apiClient.post<WatchItem>('/api/watch-history', item);
    return data;
  },

  async updateWatchItem(id: string, updates: UpdateWatchItemPayload): Promise<WatchItem> {
    const { data } = await apiClient.put<WatchItem>(`/api/watch-history/${id}`, updates);
    return data;
  },

  async deleteWatchItem(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/api/watch-history/${id}`);
    return data;
  },

  async clearWatchHistory(mediaTypes?: string[]): Promise<{ message: string; deletedCount: number }> {
    let url = '/api/watch-history';
    if (mediaTypes && mediaTypes.length > 0) {
      url += `?mediaType=${encodeURIComponent(mediaTypes.join(','))}`;
    }
    const { data } = await apiClient.delete<{ message: string; deletedCount: number }>(url);
    return data;
  },

  async aiFilter(prompt: string): Promise<AIFilterResult> {
    const response = await apiClient.post<WatchItem[]>('/api/watch-history/ai-filter', { prompt });
    const modeHeader = response.headers['x-ai-filter-mode'];
    const mode: 'ai' | 'tmdb-person' | 'basic' =
      modeHeader === 'ai' ? 'ai' : modeHeader === 'tmdb-person' ? 'tmdb-person' : 'basic';
    return {
      items: Array.isArray(response.data) ? response.data : [],
      mode,
    };
  },
};
