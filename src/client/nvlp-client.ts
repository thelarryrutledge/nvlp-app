/**
 * NVLP Client - Main client class providing unified API access
 */

import {
  NVLPClientConfig,
  Transport,
  ApiResponse,
  AuthState,
  UserProfile,
  Budget,
  IncomeSource,
  Category,
  Envelope,
  Payee,
  CreateBudgetInput,
  UpdateBudgetInput,
  CreateIncomeSourceInput,
  UpdateIncomeSourceInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateEnvelopeInput,
  UpdateEnvelopeInput,
  CreatePayeeInput,
  UpdatePayeeInput,
  QueryParams,
  PersistedAuthData
} from './types';

import { PostgRESTTransport } from './transports/postgrest-transport';
import { EdgeFunctionTransport } from './transports/edge-function-transport';
import { AuthenticationError } from './errors';
import { TokenManager } from './token-manager';

export class NVLPClient {
  private postgrestTransport: PostgRESTTransport;
  private edgeFunctionTransport: EdgeFunctionTransport;
  private primaryTransport: Transport;
  private tokenManager: TokenManager;
  private authState: AuthState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null
  };

  constructor(config: NVLPClientConfig) {
    this.postgrestTransport = new PostgRESTTransport(config);
    this.edgeFunctionTransport = new EdgeFunctionTransport(config);
    
    // Initialize token manager
    this.tokenManager = new TokenManager(
      config.tokenStorageKey,
      config.persistTokens !== false, // Default true
      config.autoRefresh !== false    // Default true
    );
    
    // Default to PostgREST for CRUD operations
    this.primaryTransport = this.postgrestTransport;
    
    // Try to restore session on initialization
    this.restoreSession();
  }

  // ===========================================
  // Authentication Methods
  // ===========================================

  /**
   * Restore session from persisted tokens
   */
  private restoreSession(): void {
    const persistedAuth = this.tokenManager.loadTokens();
    if (persistedAuth) {
      this.setAuthFromPersisted(persistedAuth);
    }
  }

  /**
   * Set authentication state from persisted data
   */
  private setAuthFromPersisted(persistedAuth: PersistedAuthData): void {
    this.authState.accessToken = persistedAuth.accessToken;
    this.authState.refreshToken = persistedAuth.refreshToken;
    this.authState.expiresAt = persistedAuth.expiresAt;
    this.authState.user = persistedAuth.user;

    // Update transport authentication
    this.postgrestTransport.setAuth(persistedAuth.accessToken);
    this.edgeFunctionTransport.setAuth(persistedAuth.accessToken);
  }

  /**
   * Set authentication state and persist tokens
   */
  setAuth(accessToken: string, refreshToken?: string, user?: any, expiresIn?: number): void {
    // Parse expiration from JWT if not provided
    let actualExpiresIn = expiresIn;
    if (!actualExpiresIn) {
      const jwtExpiration = this.tokenManager.parseJWTExpiration(accessToken);
      actualExpiresIn = jwtExpiration ? Math.floor((jwtExpiration - Date.now()) / 1000) : 3600;
    }

    this.authState.accessToken = accessToken;
    this.authState.refreshToken = refreshToken || null;
    this.authState.user = user || null;
    this.authState.expiresAt = Date.now() + (actualExpiresIn * 1000);
    this.authState.expiresIn = actualExpiresIn;

    // Update transport authentication
    this.postgrestTransport.setAuth(accessToken);
    this.edgeFunctionTransport.setAuth(accessToken);

    // Persist tokens if user provided
    if (user) {
      this.tokenManager.saveTokens(accessToken, refreshToken || null, actualExpiresIn, user);
    }
  }

  /**
   * Clear authentication state and remove persisted tokens
   */
  clearAuth(): void {
    this.authState = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null
    };

    this.postgrestTransport.setAuth(null);
    this.edgeFunctionTransport.setAuth(null);
    this.tokenManager.clearTokens();
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.authState.accessToken && 
              this.authState.expiresAt && 
              this.authState.expiresAt > Date.now());
  }

  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): boolean {
    return !!(this.authState.expiresAt && 
              this.tokenManager.needsRefresh(this.authState.expiresAt));
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Ensure authentication or throw error
   */
  private async requireAuth(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('Authentication required');
    }

    // Auto-refresh token if needed
    if (this.needsTokenRefresh() && this.authState.refreshToken) {
      try {
        await this.refreshToken();
      } catch (error) {
        // If refresh fails, clear auth and throw
        this.clearAuth();
        throw new AuthenticationError('Token refresh failed - please login again');
      }
    }
  }

  // ===========================================
  // Profile Methods (PostgREST)
  // ===========================================

  async getProfile(): Promise<UserProfile> {
    await this.requireAuth();
    const response = await this.postgrestTransport.get<UserProfile[]>('user_profiles', {
      select: '*'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Profile not found');
    }
    
    return response.data[0];
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await this.requireAuth();
    const response = await this.postgrestTransport.patch<UserProfile[]>(
      'user_profiles',
      updates
    );
    
    if (!response.data || response.data.length === 0) {
      // PATCH returns empty for 204, get updated profile
      return this.getProfile();
    }
    
    return response.data[0];
  }

  // ===========================================
  // Budget Methods (PostgREST)
  // ===========================================

  async getBudgets(params?: QueryParams): Promise<Budget[]> {
    await this.requireAuth();
    const response = await this.postgrestTransport.get<Budget[]>('budgets', {
      select: '*',
      ...params
    });
    return response.data || [];
  }

  async getBudget(id: string): Promise<Budget> {
    await this.requireAuth();
    const response = await this.postgrestTransport.get<Budget[]>('budgets', {
      id: `eq.${id}`,
      select: '*'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Budget not found');
    }
    
    return response.data[0];
  }

  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    await this.requireAuth();
    const response = await this.postgrestTransport.post<Budget[]>('budgets', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create budget');
    }
    
    return response.data[0];
  }

  async updateBudget(id: string, updates: UpdateBudgetInput): Promise<Budget> {
    await this.requireAuth();
    await this.postgrestTransport.patch(`budgets?id=eq.${id}`, updates);
    return this.getBudget(id);
  }

  async deleteBudget(id: string): Promise<void> {
    await this.requireAuth();
    await this.postgrestTransport.delete(`budgets?id=eq.${id}`);
  }

  // ===========================================
  // Income Source Methods (PostgREST)
  // ===========================================

  async getIncomeSources(budgetId?: string, params?: QueryParams): Promise<IncomeSource[]> {
    await this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<IncomeSource[]>('income_sources', filters);
    return response.data || [];
  }

  async getIncomeSource(id: string): Promise<IncomeSource> {
    await this.requireAuth();
    const response = await this.postgrestTransport.get<IncomeSource[]>('income_sources', {
      id: `eq.${id}`,
      select: '*'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Income source not found');
    }
    
    return response.data[0];
  }

  async createIncomeSource(input: CreateIncomeSourceInput): Promise<IncomeSource> {
    await this.requireAuth();
    const response = await this.postgrestTransport.post<IncomeSource[]>('income_sources', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create income source');
    }
    
    return response.data[0];
  }

  async updateIncomeSource(id: string, updates: UpdateIncomeSourceInput): Promise<IncomeSource> {
    await this.requireAuth();
    await this.postgrestTransport.patch(`income_sources?id=eq.${id}`, updates);
    return this.getIncomeSource(id);
  }

  async deleteIncomeSource(id: string): Promise<void> {
    await this.requireAuth();
    await this.postgrestTransport.delete(`income_sources?id=eq.${id}`);
  }

  // ===========================================
  // Category Methods (PostgREST)
  // ===========================================

  async getCategories(budgetId?: string, params?: QueryParams): Promise<Category[]> {
    await this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<Category[]>('categories', filters);
    return response.data || [];
  }

  async getCategory(id: string): Promise<Category> {
    await this.requireAuth();
    const response = await this.postgrestTransport.get<Category[]>('categories', {
      id: `eq.${id}`,
      select: '*'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Category not found');
    }
    
    return response.data[0];
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    await this.requireAuth();
    const response = await this.postgrestTransport.post<Category[]>('categories', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create category');
    }
    
    return response.data[0];
  }

  async updateCategory(id: string, updates: UpdateCategoryInput): Promise<Category> {
    await this.requireAuth();
    await this.postgrestTransport.patch(`categories?id=eq.${id}`, updates);
    return this.getCategory(id);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.requireAuth();
    await this.postgrestTransport.delete(`categories?id=eq.${id}`);
  }

  // ===========================================
  // Envelope Methods (PostgREST)
  // ===========================================

  async getEnvelopes(budgetId?: string, params?: QueryParams): Promise<Envelope[]> {
    await this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<Envelope[]>('envelopes', filters);
    return response.data || [];
  }

  async getEnvelope(id: string): Promise<Envelope> {
    await this.requireAuth();
    const response = await this.postgrestTransport.get<Envelope[]>('envelopes', {
      id: `eq.${id}`,
      select: '*'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Envelope not found');
    }
    
    return response.data[0];
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<Envelope> {
    await this.requireAuth();
    const response = await this.postgrestTransport.post<Envelope[]>('envelopes', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create envelope');
    }
    
    return response.data[0];
  }

  async updateEnvelope(id: string, updates: UpdateEnvelopeInput): Promise<Envelope> {
    await this.requireAuth();
    await this.postgrestTransport.patch(`envelopes?id=eq.${id}`, updates);
    return this.getEnvelope(id);
  }

  async deleteEnvelope(id: string): Promise<void> {
    await this.requireAuth();
    await this.postgrestTransport.delete(`envelopes?id=eq.${id}`);
  }

  // ===========================================
  // Payee Methods (PostgREST)
  // ===========================================

  async getPayees(budgetId?: string, params?: QueryParams): Promise<Payee[]> {
    await this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<Payee[]>('payees', filters);
    return response.data || [];
  }

  async getPayee(id: string): Promise<Payee> {
    await this.requireAuth();
    const response = await this.postgrestTransport.get<Payee[]>('payees', {
      id: `eq.${id}`,
      select: '*'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Payee not found');
    }
    
    return response.data[0];
  }

  async createPayee(input: CreatePayeeInput): Promise<Payee> {
    await this.requireAuth();
    const response = await this.postgrestTransport.post<Payee[]>('payees', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create payee');
    }
    
    return response.data[0];
  }

  async updatePayee(id: string, updates: UpdatePayeeInput): Promise<Payee> {
    await this.requireAuth();
    await this.postgrestTransport.patch(`payees?id=eq.${id}`, updates);
    return this.getPayee(id);
  }

  async deletePayee(id: string): Promise<void> {
    await this.requireAuth();
    await this.postgrestTransport.delete(`payees?id=eq.${id}`);
  }

  // ===========================================
  // Authentication Methods (Edge Functions)
  // ===========================================

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ user: any, session: any }> {
    const response = await this.edgeFunctionTransport.auth('login', {
      email,
      password
    });

    if (response.data && response.data.session) {
      this.setAuth(
        response.data.session.access_token,
        response.data.session.refresh_token,
        response.data.user,
        response.data.session.expires_in
      );
    }

    return response.data;
  }

  /**
   * Logout and clear all authentication state
   */
  async logout(): Promise<void> {
    // Store the token before clearing (needed for server logout call)
    const currentToken = this.authState.accessToken;
    
    if (currentToken) {
      try {
        // Logout from server first
        await this.edgeFunctionTransport.auth('logout', {});
      } catch (error) {
        // Continue with local logout even if server call fails
        console.warn('Logout server call failed:', error);
      }
    }
    
    // Clear local authentication state
    this.clearAuth();
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, displayName?: string): Promise<{ user: any }> {
    const response = await this.edgeFunctionTransport.auth('register', {
      email,
      password,
      display_name: displayName
    });

    return response.data;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<{ session: any }> {
    if (!this.authState.refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    const response = await this.edgeFunctionTransport.auth('refresh', {
      refresh_token: this.authState.refreshToken
    });

    if (response.data && response.data.session) {
      this.setAuth(
        response.data.session.access_token,
        response.data.session.refresh_token || this.authState.refreshToken,
        this.authState.user,
        response.data.session.expires_in
      );
    }

    return response.data;
  }

  /**
   * Reset password via email
   */
  async resetPassword(email: string): Promise<void> {
    await this.edgeFunctionTransport.auth('reset', { email });
  }

  /**
   * Update password (requires current authentication)
   */
  async updatePassword(newPassword: string): Promise<void> {
    await this.requireAuth();
    await this.edgeFunctionTransport.auth('update-password', {
      password: newPassword
    });
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Get direct access to PostgREST transport for advanced queries
   */
  getPostgRESTTransport(): PostgRESTTransport {
    return this.postgrestTransport;
  }

  /**
   * Get direct access to Edge Function transport for complex operations
   */
  getEdgeFunctionTransport(): EdgeFunctionTransport {
    return this.edgeFunctionTransport;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string, timestamp: string }> {
    try {
      // Try a simple request to verify connectivity
      await this.postgrestTransport.get('user_profiles', { limit: 1 });
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }
}