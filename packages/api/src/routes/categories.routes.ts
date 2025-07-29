import { CategoryService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Category, CategoryCreateRequest, CategoryUpdateRequest, CategoryType } from '@nvlp/types';

export interface CategoryRouteHandlers {
  listCategories: (budgetId: string) => Promise<Category[]>;
  getCategory: (id: string) => Promise<Category>;
  createCategory: (budgetId: string, request: CategoryCreateRequest) => Promise<Category>;
  updateCategory: (id: string, updates: CategoryUpdateRequest) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryTree: (budgetId: string) => Promise<Category[]>;
}

export function createCategoryRoutes(client: SupabaseClient<Database>): CategoryRouteHandlers {
  const categoryService = new CategoryService(client);

  return {
    listCategories: async (budgetId: string) => {
      return await categoryService.listCategories(budgetId);
    },

    getCategory: async (id: string) => {
      return await categoryService.getCategory(id);
    },

    createCategory: async (budgetId: string, request: CategoryCreateRequest) => {
      return await categoryService.createCategory(budgetId, request);
    },

    updateCategory: async (id: string, updates: CategoryUpdateRequest) => {
      return await categoryService.updateCategory(id, updates);
    },

    deleteCategory: async (id: string) => {
      await categoryService.deleteCategory(id);
    },

    getCategoryTree: async (budgetId: string) => {
      return await categoryService.getCategoryTree(budgetId);
    }
  };
}