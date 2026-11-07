export interface UserPreferences {
  theme?: 'dark' | 'light' | 'blue' | 'green' | 'purple' | 'red' | 'neon' | 'noir';
}

export interface User {
  _id: string;
  username: string;
  email: string;
  preferences?: UserPreferences;
  token?: string;
}

export interface AuthResponse {
  _id: string;
  username: string;
  email: string;
  preferences?: UserPreferences;
  token: string;
}

export interface ProfileUpdateData {
  username?: string;
  email?: string;
  password?: string;
}
