/**
 * User and authentication related types
 */

export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

export interface UserProfile {
  id: string;
  display_name: string;
  profile_image_url: string | null;
  profile_image_thumbnail_url: string | null;
  timezone: string;
  currency_code: string;
  date_format: string;
  default_budget_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: User | null;
  expiresIn?: number; // seconds until expiration
}

export interface PersistedAuthData {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  user: User;
  createdAt: number;
}