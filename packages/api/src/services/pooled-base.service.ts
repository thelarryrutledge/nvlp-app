import { SupabaseClient } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';
import { SupabaseConnectionPool } from '../config/connection-pool';

export abstract class PooledBaseService {
  protected pool: SupabaseConnectionPool;

  constructor(pool: SupabaseConnectionPool) {
    this.pool = pool;
  }

  /**
   * Execute an operation with a pooled connection
   */
  protected async withPooledClient<T>(
    operation: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.acquire();
    
    try {
      return await operation(client);
    } finally {
      this.pool.release(client);
    }
  }

  /**
   * Execute an operation with retry logic and connection pooling
   */
  protected async withRetry<T>(
    operation: (client: SupabaseClient<Database>) => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 100
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.withPooledClient(operation);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof ApiError) {
          if (error.code === ErrorCode.NOT_FOUND || 
              error.code === ErrorCode.VALIDATION_ERROR ||
              error.code === ErrorCode.FORBIDDEN) {
            throw error;
          }
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    throw lastError!;
  }

  /**
   * Get current user ID from the client
   */
  protected async getCurrentUserId(): Promise<string> {
    return this.withPooledClient(async (client) => {
      const { data: { user }, error } = await client.auth.getUser();
      
      if (error || !user) {
        throw new ApiError(ErrorCode.UNAUTHORIZED, 'User not authenticated');
      }
      
      return user.id;
    });
  }

  /**
   * Verify user has access to a budget
   */
  protected async verifyBudgetAccess(budgetId: string): Promise<void> {
    await this.withPooledClient(async (client) => {
      const userId = await this.getCurrentUserId();
      
      const { data: budget, error } = await client
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();

      if (error || !budget) {
        if (error?.code === 'PGRST116') {
          throw new ApiError(ErrorCode.NOT_FOUND, 'Budget not found');
        }
        throw new ApiError(ErrorCode.FORBIDDEN, 'Access denied to budget');
      }
    });
  }

  /**
   * Handle database errors consistently
   */
  protected handleError(error: any): never {
    if (error.code === 'PGRST116') {
      throw new ApiError(ErrorCode.NOT_FOUND, 'Resource not found');
    }
    
    if (error.code === '23505') {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Duplicate entry');
    }
    
    if (error.code === '23503') {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Foreign key constraint violation');
    }
    
    if (error.code === '42501') {
      throw new ApiError(ErrorCode.FORBIDDEN, 'Insufficient permissions');
    }
    
    console.error('Database error:', error);
    throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Database operation failed');
  }

  /**
   * Execute multiple operations in a transaction
   */
  protected async withTransaction<T>(
    operations: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    return this.withPooledClient(async (client) => {
      // Note: Supabase doesn't support manual transactions in the JS client
      // This is a placeholder for when/if that feature becomes available
      // For now, we just execute with a single connection to maintain consistency
      return await operations(client);
    });
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return this.pool.getStats();
  }

  /**
   * Perform health check on the connection pool
   */
  async healthCheck() {
    return this.pool.healthCheck();
  }
}