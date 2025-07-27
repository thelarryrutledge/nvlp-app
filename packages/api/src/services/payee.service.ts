import { BaseService } from './base.service';
import { Payee, PayeeCreateRequest, PayeeUpdateRequest, ApiError, ErrorCode } from '@nvlp/types';

export class PayeeService extends BaseService {
  async listPayees(budgetId: string): Promise<Payee[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('payees')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as Payee[];
  }

  async getPayee(id: string): Promise<Payee> {
    const { data, error } = await this.client
      .from('payees')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Payee not found');
      }
      this.handleError(error);
    }

    await this.verifyBudgetAccess(data.budget_id);
    return data as Payee;
  }

  async createPayee(budgetId: string, request: PayeeCreateRequest): Promise<Payee> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('payees')
      .insert({
        budget_id: budgetId,
        name: request.name,
        description: request.description,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Payee;
  }

  async updatePayee(id: string, updates: PayeeUpdateRequest): Promise<Payee> {
    const payee = await this.getPayee(id);

    const { data, error } = await this.client
      .from('payees')
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

    return data as Payee;
  }

  async deletePayee(id: string): Promise<void> {
    const payee = await this.getPayee(id);

    const { error } = await this.client
      .from('payees')
      .delete()
      .eq('id', id);

    if (error) {
      this.handleError(error);
    }
  }

  async getRecentPayees(budgetId: string, limit: number = 10): Promise<Payee[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('payees')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('is_active', true)
      .not('last_payment_date', 'is', null)
      .order('last_payment_date', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
    }

    return data as Payee[];
  }

  async getTopPayees(budgetId: string, limit: number = 10): Promise<Payee[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('payees')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('is_active', true)
      .order('total_paid', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
    }

    return data as Payee[];
  }

  async searchPayees(budgetId: string, query: string): Promise<Payee[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('payees')
      .select('*')
      .eq('budget_id', budgetId)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as Payee[];
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