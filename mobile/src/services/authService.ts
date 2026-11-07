import { apiClient } from './api';
import { AuthResponse, ProfileUpdateData, User } from '../types/auth';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/api/users/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    return data;
  },

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/api/users', {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    return data;
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<User>('/api/users/profile');
    return data;
  },

  async updateProfile(updates: ProfileUpdateData): Promise<AuthResponse> {
    const { data } = await apiClient.put<AuthResponse>('/api/users/profile', updates);
    return data;
  },
};
