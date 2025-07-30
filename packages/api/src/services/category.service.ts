import { BaseService } from './base.service';
import { Category, CategoryCreateRequest, CategoryUpdateRequest, CategoryReorderRequest, CategoryType, ApiError, ErrorCode } from '@nvlp/types';

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

    // Validate single-level nesting
    if (request.parent_id) {
      const { data: parentCategory, error: parentError } = await this.client
        .from('categories')
        .select('parent_id')
        .eq('id', request.parent_id)
        .single();

      if (parentError) {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Parent category not found');
      }

      if (parentCategory.parent_id) {
        throw new ApiError(
          ErrorCode.VALIDATION_ERROR,
          'Categories can only have one level of nesting. Parent category already has a parent.'
        );
      }
    }

    // Get next display_order if not provided
    let displayOrder = request.display_order;
    if (displayOrder === undefined) {
      const { data: nextOrder } = await this.client
        .rpc('get_next_category_display_order', { 
          budget_id_param: budgetId, 
          parent_id_param: request.parent_id || null 
        });
      displayOrder = nextOrder || 0;
    }

    const { data, error } = await this.client
      .from('categories')
      .insert({
        budget_id: budgetId,
        name: request.name,
        description: request.description,
        is_income: request.is_income ?? false,
        is_system: request.is_system ?? false,
        display_order: displayOrder,
        parent_id: request.parent_id,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Category;
  }

  async updateCategory(id: string, updates: CategoryUpdateRequest): Promise<Category> {
    await this.getCategory(id); // Verify category exists and access

    // Validate single-level nesting if parent_id is being changed
    if (updates.parent_id) {
      const { data: parentCategory, error: parentError } = await this.client
        .from('categories')
        .select('parent_id')
        .eq('id', updates.parent_id)
        .single();

      if (parentError) {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Parent category not found');
      }

      if (parentCategory.parent_id) {
        throw new ApiError(
          ErrorCode.VALIDATION_ERROR,
          'Categories can only have one level of nesting. Parent category already has a parent.'
        );
      }
    }

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
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
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

  async reorderCategories(budgetId: string, reorders: CategoryReorderRequest[]): Promise<void> {
    await this.verifyBudgetAccess(budgetId);

    // Update each category's display_order
    for (const reorder of reorders) {
      const { error } = await this.client
        .from('categories')
        .update({ 
          display_order: reorder.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reorder.id)
        .eq('budget_id', budgetId); // Extra security check

      if (error) {
        this.handleError(error);
      }
    }

    // Clean up ordering within affected scopes (budget + parent combinations)
    const affectedScopes = new Set<string>();
    
    for (const reorder of reorders) {
      const { data: category } = await this.client
        .from('categories')
        .select('parent_id')
        .eq('id', reorder.id)
        .single();
      
      const scopeKey = `${budgetId}:${category?.parent_id || 'null'}`;
      affectedScopes.add(scopeKey);
    }

    // Reorder each affected scope to eliminate gaps
    for (const scopeKey of affectedScopes) {
      const [_, parentIdStr] = scopeKey.split(':');
      const parentId = parentIdStr === 'null' ? null : parentIdStr;
      
      await this.client.rpc('reorder_categories_in_scope', { 
        budget_id_param: budgetId,
        parent_id_param: parentId
      });
    }
  }
}