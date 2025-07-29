import { InMemoryTokenStorage, FileTokenStorage } from '../../client/token-storage';
import { ReactNativeTokenStorage } from '../../client/react-native-token-storage';
import { Session } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
jest.mock('path');

describe('Token Storage Implementations', () => {
  const mockSession: Session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  };

  describe('InMemoryTokenStorage', () => {
    let storage: InMemoryTokenStorage;

    beforeEach(() => {
      storage = new InMemoryTokenStorage();
    });

    it('should store and retrieve session', async () => {
      await storage.setSession('test-key', mockSession);
      const retrieved = await storage.getSession('test-key');
      
      expect(retrieved).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await storage.getSession('non-existent');
      
      expect(retrieved).toBeNull();
    });

    it('should remove session', async () => {
      await storage.setSession('test-key', mockSession);
      await storage.removeSession('test-key');
      
      const retrieved = await storage.getSession('test-key');
      expect(retrieved).toBeNull();
    });

    it('should handle multiple sessions with different keys', async () => {
      const session2 = { ...mockSession, access_token: 'token-2' };
      
      await storage.setSession('key1', mockSession);
      await storage.setSession('key2', session2);
      
      expect(await storage.getSession('key1')).toEqual(mockSession);
      expect(await storage.getSession('key2')).toEqual(session2);
    });
  });

  describe('FileTokenStorage', () => {
    let storage: FileTokenStorage;
    const storagePath = '/tmp/token-storage';

    beforeEach(() => {
      jest.clearAllMocks();
      storage = new FileTokenStorage(storagePath);
      
      // Mock path.dirname
      (path.dirname as jest.Mock).mockImplementation((filepath: string) => {
        const lastSlash = filepath.lastIndexOf('/');
        return filepath.substring(0, lastSlash);
      });
    });

    it('should store session to file', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await storage.setSession('test-user', mockSession);
      
      expect(fs.mkdir).toHaveBeenCalledWith(storagePath, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/token-storage/test-user.json',
        JSON.stringify(mockSession, null, 2),
        'utf-8'
      );
    });

    it('should retrieve session from file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSession));

      const retrieved = await storage.getSession('test-user');
      
      expect(fs.readFile).toHaveBeenCalledWith('/tmp/token-storage/test-user.json', 'utf-8');
      expect(retrieved).toEqual(mockSession);
    });

    it('should return null when file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const retrieved = await storage.getSession('non-existent');
      
      expect(retrieved).toBeNull();
    });

    it('should sanitize file names', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await storage.setSession('user@example.com', mockSession);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/token-storage/user_example_com.json',
        expect.any(String),
        'utf-8'
      );
    });

    it('should remove session file', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await storage.removeSession('test-user');
      
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/token-storage/test-user.json');
    });

    it('should ignore errors when removing non-existent file', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      // Should not throw
      await expect(storage.removeSession('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('ReactNativeTokenStorage', () => {
    let storage: ReactNativeTokenStorage;
    let mockAsyncStorage: any;

    beforeEach(() => {
      mockAsyncStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      
      storage = new ReactNativeTokenStorage(mockAsyncStorage);
    });

    it('should store session in AsyncStorage', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      await storage.setSession('session-key', mockSession);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'session-key',
        JSON.stringify(mockSession)
      );
    });

    it('should retrieve session from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockSession));

      const retrieved = await storage.getSession('session-key');
      
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('session-key');
      expect(retrieved).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const retrieved = await storage.getSession('non-existent');
      
      expect(retrieved).toBeNull();
    });

    it('should handle corrupted data gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const retrieved = await storage.getSession('corrupted');
      
      expect(retrieved).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to retrieve session:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should remove session from AsyncStorage', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      await storage.removeSession('session-key');
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('session-key');
    });

    it('should not throw on removal errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(storage.removeSession('session-key')).resolves.toBeUndefined();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to remove session:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should throw on storage errors during setSession', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      await expect(storage.setSession('key', mockSession))
        .rejects.toThrow('Storage full');
      
      consoleErrorSpy.mockRestore();
    });
  });
});