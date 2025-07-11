import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BudgetStore, Budget } from '@/types/store';
import { useAuthStore } from './authStore';

// Initial state
const initialState = {
  activeBudget: null,
  budgets: [],
  isLoading: false,
  error: null,
};

// Create the budget store with persistence
export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Budget loading actions
      loadBudgets: async () => {
        set({ isLoading: true, error: null });

        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No authentication token available');
          }

          // TODO: Replace with actual NVLP API call
          const response = await fetch('https://db-api.nvlp.app/budgets', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': process.env.SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load budgets');
          }

          const budgets = await response.json();
          
          // Find the active budget or use the first one
          const activeBudget = budgets.find((b: Budget) => b.isActive) || budgets[0] || null;
          
          set({
            budgets,
            activeBudget,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load budgets',
          });
          throw error;
        }
      },

      setActiveBudget: async (budget: Budget) => {
        const { activeBudget } = get();
        
        // If it's already the active budget, no need to do anything
        if (activeBudget && activeBudget.id === budget.id) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No authentication token available');
          }

          // Update the budget to be active on the server
          const response = await fetch(`https://db-api.nvlp.app/budgets?id=eq.${budget.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': process.env.SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({ isActive: true }),
          });

          if (!response.ok) {
            throw new Error('Failed to set active budget');
          }

          // If there was a previous active budget, deactivate it
          if (activeBudget) {
            await fetch(`https://db-api.nvlp.app/budgets?id=eq.${activeBudget.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': process.env.SUPABASE_ANON_KEY || '',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ isActive: false }),
            });
          }

          // Update local state
          const updatedBudgets = get().budgets.map(b => ({
            ...b,
            isActive: b.id === budget.id,
          }));

          set({
            activeBudget: { ...budget, isActive: true },
            budgets: updatedBudgets,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to set active budget',
          });
          throw error;
        }
      },

      createBudget: async (budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
        set({ isLoading: true, error: null });

        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No authentication token available');
          }

          const response = await fetch('https://db-api.nvlp.app/budgets', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': process.env.SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(budgetData),
          });

          if (!response.ok) {
            throw new Error('Failed to create budget');
          }

          const [newBudget] = await response.json();
          const { budgets, activeBudget } = get();

          set({
            budgets: [...budgets, newBudget],
            // Set as active if it's the first budget or explicitly marked as active
            activeBudget: budgets.length === 0 || newBudget.isActive ? newBudget : activeBudget,
            isLoading: false,
            error: null,
          });

          return newBudget;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create budget',
          });
          throw error;
        }
      },

      updateBudget: async (id: string, updates: Partial<Budget>) => {
        set({ isLoading: true, error: null });

        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No authentication token available');
          }

          const response = await fetch(`https://db-api.nvlp.app/budgets?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': process.env.SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error('Failed to update budget');
          }

          const [updatedBudget] = await response.json();
          const { budgets, activeBudget } = get();

          const updatedBudgets = budgets.map(budget =>
            budget.id === id ? updatedBudget : budget
          );

          set({
            budgets: updatedBudgets,
            activeBudget: activeBudget && activeBudget.id === id ? updatedBudget : activeBudget,
            isLoading: false,
            error: null,
          });

          return updatedBudget;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update budget',
          });
          throw error;
        }
      },

      deleteBudget: async (id: string) => {
        const { activeBudget } = get();
        
        // Prevent deleting the active budget if it's the only one
        if (activeBudget && activeBudget.id === id && get().budgets.length === 1) {
          throw new Error('Cannot delete the only budget');
        }

        set({ isLoading: true, error: null });

        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No authentication token available');
          }

          const response = await fetch(`https://db-api.nvlp.app/budgets?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': process.env.SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to delete budget');
          }

          const { budgets } = get();
          const remainingBudgets = budgets.filter(budget => budget.id !== id);
          
          // If we deleted the active budget, set the first remaining budget as active
          let newActiveBudget = activeBudget;
          if (activeBudget && activeBudget.id === id) {
            newActiveBudget = remainingBudgets[0] || null;
            if (newActiveBudget) {
              // Update the new active budget on the server
              await get().setActiveBudget(newActiveBudget);
              return; // setActiveBudget will handle the state update
            }
          }

          set({
            budgets: remainingBudgets,
            activeBudget: newActiveBudget,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to delete budget',
          });
          throw error;
        }
      },

      // State setters
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'nvlp-budget-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist budget data
      partialize: (state) => ({
        activeBudget: state.activeBudget,
        budgets: state.budgets,
      }),
    }
  )
);

// Selectors for common use cases
export const budgetSelectors = {
  activeBudget: () => useBudgetStore((state) => state.activeBudget),
  budgets: () => useBudgetStore((state) => state.budgets),
  activeBudgetId: () => useBudgetStore((state) => state.activeBudget?.id),
  activeBudgetName: () => useBudgetStore((state) => state.activeBudget?.name),
  budgetCount: () => useBudgetStore((state) => state.budgets.length),
  isLoading: () => useBudgetStore((state) => state.isLoading),
  error: () => useBudgetStore((state) => state.error),
};

// Computed selectors
export const budgetComputedSelectors = {
  getBudgetById: (id: string) => useBudgetStore((state) => 
    state.budgets.find(budget => budget.id === id)
  ),
  
  hasMultipleBudgets: () => useBudgetStore((state) => state.budgets.length > 1),
  
  inactiveBudgets: () => useBudgetStore((state) => 
    state.budgets.filter(budget => !budget.isActive)
  ),
};