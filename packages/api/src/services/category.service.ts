import { BaseService } from './base.service';
import { Category, CategoryCreateRequest, CategoryUpdateRequest, CategoryType, ApiError, ErrorCode } from '@nvlp/types';

export class CategoryService extends BaseService {
  async listCategories(budgetId: string): Promise<Category[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as Category[];
  }

  async getCategory(id: string): Promise<Category> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Category not found');
      }
      this.handleError(error);
    }

    await this.verifyBudgetAccess(data.budget_id);
    return data as Category;
  }

  async createCategory(budgetId: string, request: CategoryCreateRequest): Promise<Category> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('categories')
      .insert({
        budget_id: budgetId,
        name: request.name,
        description: request.description,
        category_type: request.category_type,
        parent_category_id: request.parent_category_id,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Category;
  }

  async updateCategory(id: string, updates: CategoryUpdateRequest): Promise<Category> {
    const category = await this.getCategory(id);

    const { data, error } = await this.client
      .from('categories')
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

    return data as Category;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.getCategory(id);

    // Check if category has subcategories
    const { data: subcategories, error: subError } = await this.client
      .from('categories')
      .select('id')
      .eq('parent_category_id', id)
      .limit(1);

    if (subError) {
      this.handleError(subError);
    }

    if (subcategories && subcategories.length > 0) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot delete category with subcategories'
      );
    }

    const { error } = await this.client
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      this.handleError(error);
    }
  }

  async getCategoriesByType(budgetId: string, type: CategoryType): Promise<Category[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('category_type', type)
      .order('name', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as Category[];
  }

  async getCategoryTree(budgetId: string): Promise<Category[]> {
    const categories = await this.listCategories(budgetId);
    
    // Build tree structure
    const categoryMap = new Map<string, Category & { children?: Category[] }>();
    const rootCategories: (Category & { children?: Category[] })[] = [];

    // First pass: create map
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
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