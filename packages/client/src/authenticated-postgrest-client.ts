import { Session } from '@supabase/supabase-js';
import { PostgRESTClient, PostgRESTConfig, createPostgRESTClient } from './postgrest-client';
import { ClientConfig } from './config';

/**
 * Session provider interface for authentication
 */
export interface SessionProvider {
  getSession(): Promise<Session | null>;
  ensureValidSession(): Promise<Session>;
  onSessionChange(handler: (session: Session | null) => void): () => void;
}

/**
 * Authenticated PostgREST client that automatically handles JWT tokens
 */
export class AuthenticatedPostgRESTClient {
  private client: PostgRESTClient;
  private sessionProvider: SessionProvider;
  private unsubscribeFromSession?: () => void;

  constructor(config: ClientConfig, sessionProvider: SessionProvider) {
    this.sessionProvider = sessionProvider;
    
    // Create initial client without token
    const postgrestConfig: PostgRESTConfig = {
      url: config.customDomain || config.supabaseUrl || process.env.SUPABASE_URL!,
      anonKey: config.supabaseAnonKey || process.env.SUPABASE_ANON_KEY!,
      schema: config.schema || 'public',
      headers: config.headers,
    };

    this.client = createPostgRESTClient(postgrestConfig);

    // Set up session change listener to update token
    this.unsubscribeFromSession = this.sessionProvider.onSessionChange(
      (session) => {
        if (session?.access_token) {
          this.client.setToken(session.access_token);
        } else {
          this.client.clearToken();
        }
      }
    );

    // Initialize with current session
    this.initializeToken();
  }

  private async initializeToken(): Promise<void> {
    try {
      const session = await this.sessionProvider.getSession();
      if (session?.access_token) {
        this.client.setToken(session.access_token);
      }
    } catch (error) {
      // Ignore initialization errors
      console.warn('Failed to initialize PostgREST token:', error);
    }
  }

  /**
   * Get the underlying PostgREST client (with current auth token)
   */
  getClient(): PostgRESTClient {
    return this.client;
  }

  /**
   * Execute a request with automatic token refresh
   */
  async withAuth<T>(operation: (client: PostgRESTClient) => Promise<T>): Promise<T> {
    try {
      // Ensure we have a valid session before making the request
      const session = await this.sessionProvider.ensureValidSession();
      this.client.setToken(session.access_token);
      
      return await operation(this.client);
    } catch (error) {
      // If the request fails due to auth, try to refresh and retry once
      if (this.isAuthError(error)) {
        try {
          const session = await this.sessionProvider.ensureValidSession();
          this.client.setToken(session.access_token);
          return await operation(this.client);
        } catch (retryError) {
          throw retryError;
        }
      }
      throw error;
    }
  }

  private isAuthError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('401') || 
             message.includes('unauthorized') || 
             message.includes('forbidden') ||
             message.includes('403');
    }
    return false;
  }

  // Convenience methods that ensure authentication

  /**
   * User profiles table (authenticated)
   */
  get userProfiles() {
    return {
      select: (columns?: string) => this.withAuth(client => client.userProfiles.select(columns).get()),
      get: (id: string) => this.withAuth(client => client.userProfiles.eq('id', id).single()),
      update: (id: string, data: any) => this.withAuth(client => client.userProfiles.eq('id', id).patch(data)),
    };
  }

  /**
   * Budgets table (authenticated)
   */
  get budgets() {
    return {
      list: () => this.withAuth(client => client.budgets.eq('is_active', true).order('created_at', false).get()),
      get: (id: string) => this.withAuth(client => client.budgets.eq('id', id).single()),
      create: (data: any) => this.withAuth(client => client.budgets.post(data)),
      update: (id: string, data: any) => this.withAuth(client => client.budgets.eq('id', id).patch(data)),
      delete: (id: string) => this.withAuth(client => client.budgets.eq('id', id).delete()),
    };
  }

  /**
   * Categories table (authenticated)
   */
  get categories() {
    return {
      listByBudget: (budgetId: string) => this.withAuth(client => 
        client.categories
          .eq('budget_id', budgetId)
          .order('display_order')
          .get()
      ),
      get: (id: string) => this.withAuth(client => client.categories.eq('id', id).single()),
      create: (data: any) => this.withAuth(client => client.categories.post(data)),
      update: (id: string, data: any) => this.withAuth(client => client.categories.eq('id', id).patch(data)),
      delete: (id: string) => this.withAuth(client => client.categories.eq('id', id).delete()),
      getTree: (budgetId: string) => this.withAuth(client =>
        client.categories
          .eq('budget_id', budgetId)
          .select('*,children:categories(*)')
          .isNull('parent_id')
          .order('display_order')
          .get()
      ),
    };
  }

  /**
   * Income sources table (authenticated)
   */
  get incomeSources() {
    return {
      listByBudget: (budgetId: string) => this.withAuth(client =>
        client.incomeSources
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .order('next_expected_date')
          .get()
      ),
      get: (id: string) => this.withAuth(client => client.incomeSources.eq('id', id).single()),
      create: (data: any) => this.withAuth(client => client.incomeSources.post(data)),
      update: (id: string, data: any) => this.withAuth(client => client.incomeSources.eq('id', id).patch(data)),
      delete: (id: string) => this.withAuth(client => client.incomeSources.eq('id', id).delete()),
      getUpcoming: (budgetId: string, date: string) => this.withAuth(client =>
        client.incomeSources
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .gte('next_expected_date', date)
          .order('next_expected_date')
          .get()
      ),
    };
  }

  /**
   * Payees table (authenticated)
   */
  get payees() {
    return {
      listByBudget: (budgetId: string) => this.withAuth(client =>
        client.payees
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .order('name')
          .get()
      ),
      get: (id: string) => this.withAuth(client => client.payees.eq('id', id).single()),
      create: (data: any) => this.withAuth(client => client.payees.post(data)),
      update: (id: string, data: any) => this.withAuth(client => client.payees.eq('id', id).patch(data)),
      delete: (id: string) => this.withAuth(client => client.payees.eq('id', id).delete()),
      search: (budgetId: string, query: string) => this.withAuth(client =>
        client.payees
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .ilike('name', `*${query}*`)
          .order('name')
          .get()
      ),
    };
  }

  /**
   * Envelopes table (authenticated)
   */
  get envelopes() {
    return {
      listByBudget: (budgetId: string) => this.withAuth(client =>
        client.envelopes
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .order('display_order')
          .get()
      ),
      get: (id: string) => this.withAuth(client => client.envelopes.eq('id', id).single()),
      create: (data: any) => this.withAuth(client => client.envelopes.post(data)),
      update: (id: string, data: any) => this.withAuth(client => client.envelopes.eq('id', id).patch(data)),
      delete: (id: string) => this.withAuth(client => client.envelopes.eq('id', id).delete()),
      getNegativeBalance: (budgetId: string) => this.withAuth(client =>
        client.envelopes
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .lt('current_balance', 0)
          .order('current_balance')
          .get()
      ),
      getByType: (budgetId: string, envelopeType: string) => this.withAuth(client =>
        client.envelopes
          .eq('budget_id', budgetId)
          .eq('envelope_type', envelopeType)
          .eq('is_active', true)
          .order('display_order')
          .get()
      ),
    };
  }

  /**
   * Transactions table (authenticated)
   */
  get transactions() {
    return {
      listByBudget: (budgetId: string, limit = 50) => this.withAuth(client =>
        client.transactions
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .order('transaction_date', false)
          .limit(limit)
          .get()
      ),
      get: (id: string) => this.withAuth(client => 
        client.transactions
          .eq('id', id)
          .select('*,from_envelope:envelopes!from_envelope_id(*),to_envelope:envelopes!to_envelope_id(*),payee:payees(*),income_source:income_sources(*)')
          .single()
      ),
      create: (data: any) => this.withAuth(client => client.transactions.post(data)),
      update: (id: string, data: any) => this.withAuth(client => client.transactions.eq('id', id).patch(data)),
      softDelete: (id: string) => this.withAuth(client => 
        client.transactions.eq('id', id).patch({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
      ),
      restore: (id: string) => this.withAuth(client =>
        client.transactions.eq('id', id).patch({
          is_deleted: false,
          deleted_at: null
        })
      ),
      getByEnvelope: (envelopeId: string) => this.withAuth(client =>
        client.transactions
          .or(`from_envelope_id.eq.${envelopeId},to_envelope_id.eq.${envelopeId}`)
          .eq('is_deleted', false)
          .order('transaction_date', false)
          .get()
      ),
      getByPayee: (payeeId: string) => this.withAuth(client =>
        client.transactions
          .eq('payee_id', payeeId)
          .eq('is_deleted', false)
          .order('transaction_date', false)
          .get()
      ),
      getUncleared: (budgetId: string) => this.withAuth(client =>
        client.transactions
          .eq('budget_id', budgetId)
          .eq('is_cleared', false)
          .eq('is_deleted', false)
          .order('transaction_date', false)
          .get()
      ),
    };
  }

  /**
   * Transaction events table (authenticated)
   */
  get transactionEvents() {
    return {
      getByTransaction: (transactionId: string) => this.withAuth(client =>
        client.transactionEvents
          .eq('transaction_id', transactionId)
          .order('event_timestamp', false)
          .get()
      ),
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.unsubscribeFromSession) {
      this.unsubscribeFromSession();
      this.unsubscribeFromSession = undefined;
    }
  }
}

/**
 * Create an authenticated PostgREST client
 */
export function createAuthenticatedPostgRESTClient(
  config: ClientConfig,
  sessionProvider: SessionProvider
): AuthenticatedPostgRESTClient {
  return new AuthenticatedPostgRESTClient(config, sessionProvider);
}