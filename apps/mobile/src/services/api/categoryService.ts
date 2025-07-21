/**
 * Category Service
 * 
 * Service layer for category operations using enhanced API client
 */

import { enhancedApiClient } from './clientWrapper';
import { transformError, logError } from './errors';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@nvlp/types';

class CategoryService {
  /**
   * Get all categories for a budget
   */
  async getCategories(budgetId: string): Promise<Category[]> {
    try {
      const categories = await enhancedApiClient.getCategories(budgetId, {
        order: 'sort_order.asc',
      });
      return categories;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'CategoryService.getCategories');
      throw apiError;
    }
  }

  /**
   * Get a single category by ID
   */
  async getCategory(categoryId: string): Promise<Category> {
    try {
      const category = await enhancedApiClient.getCategory(categoryId);
      return category;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'CategoryService.getCategory');
      throw apiError;
    }
  }

  /**
   * Create a new category
   */
  async createCategory(budgetId: string, data: Omit<CreateCategoryInput, 'budget_id'>): Promise<Category> {
    try {
      const category = await enhancedApiClient.createCategory({
        ...data,
        budget_id: budgetId,
      });
      return category;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'CategoryService.createCategory');
      throw apiError;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<Category> {
    try {
      const category = await enhancedApiClient.updateCategory(categoryId, data);
      return category;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'CategoryService.updateCategory');
      throw apiError;
    }
  }

  /**
   * Delete a category (soft delete by marking inactive)
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      await enhancedApiClient.deleteCategory(categoryId);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'CategoryService.deleteCategory');
      throw apiError;
    }
  }

  /**
   * Reorder categories (using bulk update)
   */
  async reorderCategories(budgetId: string, categoryOrders: { id: string; sort_order: number }[]): Promise<void> {
    try {
      // Update each category individually
      const promises = categoryOrders.map(({ id, sort_order }) => 
        enhancedApiClient.updateCategory(id, { sort_order })
      );

      await Promise.all(promises);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'CategoryService.reorderCategories');
      throw apiError;
    }
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
export default categoryService;