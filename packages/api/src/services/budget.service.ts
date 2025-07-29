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

  async setupDefaults(budgetId: string): Promise<void> {
    // Verify budget access
    await this.getBudget(budgetId);

    // Create default expense categories
    const expenseCategories = [
      { name: 'Housing', description: 'Rent, mortgage, utilities' },
      { name: 'Transportation', description: 'Gas, car payment, insurance' },
      { name: 'Food', description: 'Groceries, dining out' },
      { name: 'Healthcare', description: 'Medical, dental, prescriptions' },
      { name: 'Personal', description: 'Clothing, haircuts, personal care' },
      { name: 'Entertainment', description: 'Movies, games, hobbies' },
      { name: 'Savings', description: 'Emergency fund, investments' },
      { name: 'Debt Payments', description: 'Credit cards, loans' },
    ];

    // Create default income categories
    const incomeCategories = [
      { name: 'Salary', description: 'Regular employment income' },
      { name: 'Freelance', description: 'Contract or gig work' },
      { name: 'Investment', description: 'Dividends, interest, capital gains' },
      { name: 'Other Income', description: 'Gifts, refunds, misc income' },
    ];

    // Insert expense categories
    for (const category of expenseCategories) {
      const { error } = await this.client
        .from('categories')
        .insert({
          budget_id: budgetId,
          name: category.name,
          description: category.description,
          type: 'EXPENSE',
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        this.handleError(error);
      }
    }

    // Insert income categories
    for (const category of incomeCategories) {
      const { error } = await this.client
        .from('categories')
        .insert({
          budget_id: budgetId,
          name: category.name,
          description: category.description,
          type: 'INCOME',
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        this.handleError(error);
      }
    }

    // Create default envelopes
    const defaultEnvelopes = [
      { name: 'Emergency Fund', target_amount: 1000 },
      { name: 'Groceries', target_amount: 400 },
      { name: 'Gas', target_amount: 150 },
      { name: 'Utilities', target_amount: 200 },
      { name: 'Entertainment', target_amount: 100 },
      { name: 'Miscellaneous', target_amount: 100 },
    ];

    // Get expense category IDs for envelope creation
    const { data: categories } = await this.client
      .from('categories')
      .select('id, name')
      .eq('budget_id', budgetId)
      .eq('type', 'EXPENSE');

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

    // Insert envelopes
    for (const envelope of defaultEnvelopes) {
      // Try to match envelope to category
      let categoryId = null;
      if (envelope.name === 'Groceries') categoryId = categoryMap.get('Food');
      else if (envelope.name === 'Gas') categoryId = categoryMap.get('Transportation');
      else if (envelope.name === 'Utilities') categoryId = categoryMap.get('Housing');
      else if (envelope.name === 'Entertainment') categoryId = categoryMap.get('Entertainment');
      else if (envelope.name === 'Emergency Fund') categoryId = categoryMap.get('Savings');

      const { error } = await this.client
        .from('envelopes')
        .insert({
          budget_id: budgetId,
          category_id: categoryId,
          name: envelope.name,
          target_amount: envelope.target_amount,
          current_balance: 0,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        this.handleError(error);
      }
    }

    // Create default payees
    const defaultPayees = [
      { name: 'Grocery Store', description: 'Local grocery stores' },
      { name: 'Gas Station', description: 'Fuel purchases' },
      { name: 'Electric Company', description: 'Electricity provider' },
      { name: 'Internet Provider', description: 'Internet service' },
      { name: 'Landlord/Mortgage', description: 'Housing payment' },
    ];

    for (const payee of defaultPayees) {
      const { error } = await this.client
        .from('payees')
        .insert({
          budget_id: budgetId,
          name: payee.name,
          description: payee.description,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        this.handleError(error);
      }
    }
  }
}