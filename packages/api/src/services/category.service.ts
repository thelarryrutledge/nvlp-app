import { CachedBaseService } from './cached-base.service';
import { Category, CategoryCreateRequest, CategoryUpdateRequest, CategoryReorderRequest, CategoryType, ApiError, ErrorCode } from '@nvlp/types';
import { CACHE_NAMESPACE, CACHE_TTL, CACHE_INVALIDATION_GROUPS } from '../utils/cache';

export class CategoryService extends CachedBaseService {
  async listCategories(budgetId: string): Promise<Category[]> {
    await this.verifyBudgetAccess(budgetId);
    const userId = await this.getCurrentUserId();
    const cacheKey = this.buildCacheKey(userId, budgetId);

    return this.withCache(
      CACHE_NAMESPACE.CATEGORIES,
      cacheKey,
      { ttl: CACHE_TTL.CATEGORIES },
      async () => {
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
    );
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

    // The database trigger will handle display_order assignment and shifting
    // If display_order is not provided, the trigger will assign the next available value
    // If display_order is provided and conflicts exist, the trigger will shift existing categories

    const { data, error } = await this.client
      .from('categories')
      .insert({
        budget_id: budgetId,
        name: request.name,
        description: request.description,
        is_income: request.is_income ?? false,
        is_system: request.is_system ?? false,
        display_order: request.display_order, // Let the database trigger handle auto-assignment and shifting
        parent_id: request.parent_id,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    // Invalidate category cache after creation
    this.invalidateRelatedCaches([...CACHE_INVALIDATION_GROUPS.CATEGORY_CHANGE]);

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

    // The database trigger will handle display_order shifting when needed

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

    // Invalidate category cache after update
    this.invalidateRelatedCaches([...CACHE_INVALIDATION_GROUPS.CATEGORY_CHANGE]);

    return data as Category;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.getCategory(id); // Verify category exists and access

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

    // Invalidate category cache after deletion
    this.invalidateRelatedCaches([...CACHE_INVALIDATION_GROUPS.CATEGORY_CHANGE]);
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

    // Update all categories' display_order in parallel to reduce latency
    const updatePromises = reorders.map(reorder => 
      this.client
        .from('categories')
        .update({ 
          display_order: reorder.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reorder.id)
        .eq('budget_id', budgetId) // Extra security check
    );

    const updateResults = await Promise.all(updatePromises);
    
    // Check for errors
    updateResults.forEach(result => {
      if (result.error) {
        this.handleError(result.error);
      }
    });

    // Clean up ordering within affected scopes (budget + parent combinations)
    const affectedScopes = new Set<string>();
    
    // Batch fetch parent_ids for all reordered categories to avoid N+1 queries
    const categoryIds = reorders.map(r => r.id);
    const { data: categories, error: fetchError } = await this.client
      .from('categories')
      .select('id, parent_id')
      .in('id', categoryIds);
    
    if (fetchError) {
      this.handleError(fetchError);
    }
    
    // Create parent_id lookup map
    const parentIdMap = new Map<string, string | null>();
    categories?.forEach(cat => {
      parentIdMap.set(cat.id, cat.parent_id);
    });
    
    // Determine affected scopes using the batched data
    for (const reorder of reorders) {
      const parentId = parentIdMap.get(reorder.id);
      const scopeKey = `${budgetId}:${parentId || 'null'}`;
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