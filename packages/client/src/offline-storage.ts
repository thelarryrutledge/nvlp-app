/**
 * Storage implementations for offline queue
 */

import { OfflineStorage } from './http-client';

// Type declarations for browser globals
declare const window: any;
declare const process: any;

/**
 * Browser localStorage implementation
 */
export class LocalStorage implements OfflineStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available');
    }
    return window.localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available');
    }
    window.localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available');
    }
    window.localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available');
    }
    window.localStorage.clear();
  }
}

/**
 * React Native AsyncStorage implementation
 * Note: Requires @react-native-async-storage/async-storage to be installed
 */
export class AsyncStorageImpl implements OfflineStorage {
  private asyncStorage: any;

  constructor(asyncStorage: any) {
    this.asyncStorage = asyncStorage;
  }

  async getItem(key: string): Promise<string | null> {
    return this.asyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.asyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.asyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    return this.asyncStorage.clear();
  }
}

/**
 * Node.js file system implementation
 */
export class FileSystemStorage implements OfflineStorage {
  private fs: any;
  private path: any;
  private storageDir: string;

  constructor(storageDir: string = './nvlp-storage') {
    this.storageDir = storageDir;
    
    try {
      this.fs = require('fs').promises;
      this.path = require('path');
      
      // Ensure storage directory exists
      this.ensureStorageDir();
    } catch (error) {
      throw new Error('FileSystemStorage requires Node.js fs module');
    }
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await this.fs.access(this.storageDir);
    } catch {
      await this.fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    return this.path.join(this.storageDir, `${key}.json`);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(key);
      const data = await this.fs.readFile(filePath, 'utf-8');
      return data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.ensureStorageDir();
    const filePath = this.getFilePath(key);
    await this.fs.writeFile(filePath, value, 'utf-8');
  }

  async removeItem(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await this.fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await this.fs.readdir(this.storageDir);
      await Promise.all(
        files
          .filter((file: string) => file.endsWith('.json'))
          .map((file: string) => this.fs.unlink(this.path.join(this.storageDir, file)))
      );
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

/**
 * Auto-detect and create appropriate storage for the current environment
 */
export function createDefaultStorage(): OfflineStorage {
  // Browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    return new LocalStorage();
  }
  
  // Node.js environment
  if (typeof process !== 'undefined' && process.versions?.node) {
    return new FileSystemStorage();
  }
  
  // Fallback to in-memory storage
  console.warn('No persistent storage available, using in-memory storage. Data will be lost on restart.');
  return new (class MemoryStorage implements OfflineStorage {
    private storage = new Map<string, string>();

    async getItem(key: string): Promise<string | null> {
      return this.storage.get(key) || null;
    }

    async setItem(key: string, value: string): Promise<void> {
      this.storage.set(key, value);
    }

    async removeItem(key: string): Promise<void> {
      this.storage.delete(key);
    }

    async clear(): Promise<void> {
      this.storage.clear();
    }
  })();
}