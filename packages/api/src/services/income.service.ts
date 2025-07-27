import { BaseService } from './base.service';
import { IncomeSource, IncomeSourceCreateRequest, IncomeSourceUpdateRequest, ApiError, ErrorCode } from '@nvlp/types';

export class IncomeService extends BaseService {
  async listIncomeSources(budgetId: string): Promise<IncomeSource[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('income_sources')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as IncomeSource[];
  }

  async getIncomeSource(id: string): Promise<IncomeSource> {
    const { data, error } = await this.client
      .from('income_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Income source not found');
      }
      this.handleError(error);
    }

    await this.verifyBudgetAccess(data.budget_id);
    return data as IncomeSource;
  }

  async createIncomeSource(budgetId: string, request: IncomeSourceCreateRequest): Promise<IncomeSource> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('income_sources')
      .insert({
        budget_id: budgetId,
        name: request.name,
        description: request.description,
        expected_amount: request.expected_amount,
        frequency_days: request.frequency_days,
        next_expected_date: request.next_expected_date,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as IncomeSource;
  }

  async updateIncomeSource(id: string, updates: IncomeSourceUpdateRequest): Promise<IncomeSource> {
    const incomeSource = await this.getIncomeSource(id);

    const { data, error } = await this.client
      .from('income_sources')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as IncomeSource;
  }

  async deleteIncomeSource(id: string): Promise<void> {
    const incomeSource = await this.getIncomeSource(id);

    const { error } = await this.client
      .from('income_sources')
      .delete()
      .eq('id', id);

    if (error) {
      this.handleError(error);
    }
  }

  async getOverdueIncomeSources(budgetId: string): Promise<IncomeSource[]> {
    await this.verifyBudgetAccess(budgetId);

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await this.client
      .from('income_sources')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('is_active', true)
      .not('next_expected_date', 'is', null)
      .lt('next_expected_date', today)
      .order('next_expected_date', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as IncomeSource[];
  }

  async getUpcomingIncomeSources(budgetId: string, days: number = 7): Promise<IncomeSource[]> {
    await this.verifyBudgetAccess(budgetId);

    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const { data, error } = await this.client
      .from('income_sources')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('is_active', true)
      .not('next_expected_date', 'is', null)
      .gte('next_expected_date', today.toISOString().split('T')[0])
      .lte('next_expected_date', futureDate.toISOString().split('T')[0])
      .order('next_expected_date', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as IncomeSource[];
  }

  private async verifyBudgetAccess(budgetId: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.client
      .from('budgets')
      .select('id')
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Budget not found or access denied');
      }
      this.handleError(error);
    }
  }
}