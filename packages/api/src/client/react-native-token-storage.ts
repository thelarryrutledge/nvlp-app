import { Session } from '@supabase/supabase-js';
import { TokenStorage } from './token-storage';

export interface AsyncStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class ReactNativeTokenStorage implements TokenStorage {
  constructor(private asyncStorage: AsyncStorageInterface) {}

  async getSession(key: string): Promise<Session | null> {
    try {
      const data = await this.asyncStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as Session;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  async setSession(key: string, session: Session): Promise<void> {
    try {
      await this.asyncStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to store session:', error);
      throw error;
    }
  }

  async removeSession(key: string): Promise<void> {
    try {
      await this.asyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove session:', error);
      // Don't throw, session removal failure is not critical
    }
  }
}