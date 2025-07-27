import { BaseService } from './base.service';
import { Budget, BudgetCreateRequest, BudgetUpdateRequest, ApiError, ErrorCode } from '@nvlp/types';

export class BudgetService extends BaseService {
  async listBudgets(): Promise<Budget[]> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error);
    }

    return data as Budget[];
  }

  async getBudget(id: string): Promise<Budget> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Budget not found');
      }
      this.handleError(error);
    }

    return data as Budget;
  }

  async createBudget(request: BudgetCreateRequest): Promise<Budget> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('budgets')
      .insert({
        user_id: userId,
        name: request.name,
        description: request.description,
        is_active: request.is_active ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Budget;
  }

  async updateBudget(id: string, updates: BudgetUpdateRequest): Promise<Budget> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('budgets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Budget not found');
      }
      this.handleError(error);
    }

    return data as Budget;
  }

  async deleteBudget(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.client
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Budget not found');
      }
      this.handleError(error);
    }
  }

  async setDefaultBudget(budgetId: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    // Verify budget exists and belongs to user
    await this.getBudget(budgetId);

    const { error } = await this.client
      .from('user_profiles')
      .update({
        default_budget_id: budgetId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      this.handleError(error);
    }
  }

  async getDefaultBudget(): Promise<Budget | null> {
    const userId = await this.getCurrentUserId();

    const { data: profile, error: profileError } = await this.client
      .from('user_profiles')
      .select('default_budget_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.default_budget_id) {
      return null;
    }

    try {
      return await this.getBudget(profile.default_budget_id);
    } catch (error) {
      if (error instanceof ApiError && error.code === ErrorCode.NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }
}