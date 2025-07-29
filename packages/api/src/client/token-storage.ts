import { Session } from '@supabase/supabase-js';

export interface TokenStorage {
  getSession(key: string): Promise<Session | null>;
  setSession(key: string, session: Session): Promise<void>;
  removeSession(key: string): Promise<void>;
}

export class InMemoryTokenStorage implements TokenStorage {
  private sessions = new Map<string, Session>();

  async getSession(key: string): Promise<Session | null> {
    return this.sessions.get(key) || null;
  }

  async setSession(key: string, session: Session): Promise<void> {
    this.sessions.set(key, session);
  }

  async removeSession(key: string): Promise<void> {
    this.sessions.delete(key);
  }
}

export class FileTokenStorage implements TokenStorage {
  constructor(private storagePath: string) {}

  private getFilePath(key: string): string {
    // Sanitize key to be filesystem-safe
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${this.storagePath}/${safeKey}.json`;
  }

  async getSession(key: string): Promise<Session | null> {
    try {
      const fs = await import('fs/promises');
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as Session;
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }

  async setSession(key: string, session: Session): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = this.getFilePath(key);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write session data
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }

  async removeSession(key: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }
}