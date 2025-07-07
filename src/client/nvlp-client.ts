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
  QueryParams
} from './types';

import { PostgRESTTransport } from './transports/postgrest-transport';
import { EdgeFunctionTransport } from './transports/edge-function-transport';
import { AuthenticationError } from './errors';

export class NVLPClient {
  private postgrestTransport: PostgRESTTransport;
  private edgeFunctionTransport: EdgeFunctionTransport;
  private primaryTransport: Transport;
  private authState: AuthState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null
  };

  constructor(config: NVLPClientConfig) {
    this.postgrestTransport = new PostgRESTTransport(config);
    this.edgeFunctionTransport = new EdgeFunctionTransport(config);
    
    // Default to PostgREST for CRUD operations
    this.primaryTransport = this.postgrestTransport;
  }

  // ===========================================
  // Authentication Methods
  // ===========================================

  /**
   * Set authentication state
   */
  setAuth(accessToken: string, refreshToken?: string, user?: any): void {
    this.authState.accessToken = accessToken;
    this.authState.refreshToken = refreshToken || null;
    this.authState.user = user || null;
    
    // Set token expiration (default 1 hour if not provided)
    this.authState.expiresAt = Date.now() + (60 * 60 * 1000);

    // Update transport authentication
    this.postgrestTransport.setAuth(accessToken);
    this.edgeFunctionTransport.setAuth(accessToken);
  }

  /**
   * Clear authentication state
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
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Ensure authentication or throw error
   */
  private requireAuth(): void {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('Authentication required');
    }
  }

  // ===========================================
  // Profile Methods (PostgREST)
  // ===========================================

  async getProfile(): Promise<UserProfile> {
    this.requireAuth();
    const response = await this.postgrestTransport.get<UserProfile[]>('user_profiles', {
      select: '*'
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Profile not found');
    }
    
    return response.data[0];
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    this.requireAuth();
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
    this.requireAuth();
    const response = await this.postgrestTransport.get<Budget[]>('budgets', {
      select: '*',
      ...params
    });
    return response.data || [];
  }

  async getBudget(id: string): Promise<Budget> {
    this.requireAuth();
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
    this.requireAuth();
    const response = await this.postgrestTransport.post<Budget[]>('budgets', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create budget');
    }
    
    return response.data[0];
  }

  async updateBudget(id: string, updates: UpdateBudgetInput): Promise<Budget> {
    this.requireAuth();
    await this.postgrestTransport.patch(`budgets?id=eq.${id}`, updates);
    return this.getBudget(id);
  }

  async deleteBudget(id: string): Promise<void> {
    this.requireAuth();
    await this.postgrestTransport.delete(`budgets?id=eq.${id}`);
  }

  // ===========================================
  // Income Source Methods (PostgREST)
  // ===========================================

  async getIncomeSources(budgetId?: string, params?: QueryParams): Promise<IncomeSource[]> {
    this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<IncomeSource[]>('income_sources', filters);
    return response.data || [];
  }

  async getIncomeSource(id: string): Promise<IncomeSource> {
    this.requireAuth();
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
    this.requireAuth();
    const response = await this.postgrestTransport.post<IncomeSource[]>('income_sources', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create income source');
    }
    
    return response.data[0];
  }

  async updateIncomeSource(id: string, updates: UpdateIncomeSourceInput): Promise<IncomeSource> {
    this.requireAuth();
    await this.postgrestTransport.patch(`income_sources?id=eq.${id}`, updates);
    return this.getIncomeSource(id);
  }

  async deleteIncomeSource(id: string): Promise<void> {
    this.requireAuth();
    await this.postgrestTransport.delete(`income_sources?id=eq.${id}`);
  }

  // ===========================================
  // Category Methods (PostgREST)
  // ===========================================

  async getCategories(budgetId?: string, params?: QueryParams): Promise<Category[]> {
    this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<Category[]>('categories', filters);
    return response.data || [];
  }

  async getCategory(id: string): Promise<Category> {
    this.requireAuth();
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
    this.requireAuth();
    const response = await this.postgrestTransport.post<Category[]>('categories', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create category');
    }
    
    return response.data[0];
  }

  async updateCategory(id: string, updates: UpdateCategoryInput): Promise<Category> {
    this.requireAuth();
    await this.postgrestTransport.patch(`categories?id=eq.${id}`, updates);
    return this.getCategory(id);
  }

  async deleteCategory(id: string): Promise<void> {
    this.requireAuth();
    await this.postgrestTransport.delete(`categories?id=eq.${id}`);
  }

  // ===========================================
  // Envelope Methods (PostgREST)
  // ===========================================

  async getEnvelopes(budgetId?: string, params?: QueryParams): Promise<Envelope[]> {
    this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<Envelope[]>('envelopes', filters);
    return response.data || [];
  }

  async getEnvelope(id: string): Promise<Envelope> {
    this.requireAuth();
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
    this.requireAuth();
    const response = await this.postgrestTransport.post<Envelope[]>('envelopes', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create envelope');
    }
    
    return response.data[0];
  }

  async updateEnvelope(id: string, updates: UpdateEnvelopeInput): Promise<Envelope> {
    this.requireAuth();
    await this.postgrestTransport.patch(`envelopes?id=eq.${id}`, updates);
    return this.getEnvelope(id);
  }

  async deleteEnvelope(id: string): Promise<void> {
    this.requireAuth();
    await this.postgrestTransport.delete(`envelopes?id=eq.${id}`);
  }

  // ===========================================
  // Payee Methods (PostgREST)
  // ===========================================

  async getPayees(budgetId?: string, params?: QueryParams): Promise<Payee[]> {
    this.requireAuth();
    const filters: any = { select: '*', ...params };
    if (budgetId) {
      filters.budget_id = `eq.${budgetId}`;
    }
    
    const response = await this.postgrestTransport.get<Payee[]>('payees', filters);
    return response.data || [];
  }

  async getPayee(id: string): Promise<Payee> {
    this.requireAuth();
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
    this.requireAuth();
    const response = await this.postgrestTransport.post<Payee[]>('payees', input);
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to create payee');
    }
    
    return response.data[0];
  }

  async updatePayee(id: string, updates: UpdatePayeeInput): Promise<Payee> {
    this.requireAuth();
    await this.postgrestTransport.patch(`payees?id=eq.${id}`, updates);
    return this.getPayee(id);
  }

  async deletePayee(id: string): Promise<void> {
    this.requireAuth();
    await this.postgrestTransport.delete(`payees?id=eq.${id}`);
  }

  // ===========================================
  // Authentication Methods (Edge Functions)
  // ===========================================

  async login(email: string, password: string): Promise<{ user: any, session: any }> {
    const response = await this.edgeFunctionTransport.auth('login', {
      email,
      password
    });

    if (response.data && response.data.session) {
      this.setAuth(
        response.data.session.access_token,
        response.data.session.refresh_token,
        response.data.user
      );
    }

    return response.data;
  }

  async logout(): Promise<void> {
    if (this.authState.accessToken) {
      await this.edgeFunctionTransport.auth('logout', {});
    }
    this.clearAuth();
  }

  async register(email: string, password: string, displayName?: string): Promise<{ user: any }> {
    const response = await this.edgeFunctionTransport.auth('register', {
      email,
      password,
      display_name: displayName
    });

    return response.data;
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