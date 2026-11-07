import { apiClient } from './api';
import { CreateCustomListPayload, CustomList, SharedCustomList } from '../types/customList';

export const customListService = {
  async getCustomLists(): Promise<CustomList[]> {
    const { data } = await apiClient.get<CustomList[]>('/api/custom-lists');
    return data;
  },

  async createCustomList(payload: CreateCustomListPayload): Promise<CustomList> {
    const { data } = await apiClient.post<CustomList>('/api/custom-lists', payload);
    return data;
  },

  async updateCustomList(id: string, payload: Partial<CreateCustomListPayload>): Promise<CustomList> {
    const { data } = await apiClient.put<CustomList>(`/api/custom-lists/${id}`, payload);
    return data;
  },

  async deleteCustomList(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`/api/custom-lists/${id}`);
    return data;
  },

  async getSharedCustomList(shareId: string): Promise<SharedCustomList> {
    const { data } = await apiClient.get<SharedCustomList>(`/api/custom-lists/shared/${shareId}`);
    return data;
  },
};
