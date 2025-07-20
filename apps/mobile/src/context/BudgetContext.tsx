/**
 * Budget Context
 * 
 * Manages the currently selected budget across the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { budgetService } from '../services/api/budgetService';
import type { Budget } from '@nvlp/types';

export interface BudgetState {
  budgets: Budget[];
  selectedBudget: Budget | null;
  isLoading: boolean;
  error: string | null;
}

export interface BudgetContextType extends BudgetState {
  // Actions
  loadBudgets: () => Promise<void>;
  selectBudget: (budget: Budget) => void;
  refreshBudgets: () => Promise<void>;
  clearError: () => void;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export interface BudgetProviderProps {
  children: React.ReactNode;
}

export const BudgetProvider: React.FC<BudgetProviderProps> = ({ children }) => {
  const [state, setState] = useState<BudgetState>({
    budgets: [],
    selectedBudget: null,
    isLoading: false,
    error: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const loadBudgets = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const fetchedBudgets = await budgetService.getBudgets();
      
      // Sort budgets: default first, then active, then inactive
      const sortedBudgets = fetchedBudgets.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return a.name.localeCompare(b.name);
      });

      // Find default budget or use first active budget
      const defaultBudget = sortedBudgets.find(b => b.is_default) || 
                           sortedBudgets.find(b => b.is_active) || 
                           sortedBudgets[0] || null;

      setState(prev => ({
        ...prev,
        budgets: sortedBudgets,
        selectedBudget: prev.selectedBudget || defaultBudget,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load budgets',
        isLoading: false,
      }));
    }
  }, []);

  const refreshBudgets = useCallback(async () => {
    await loadBudgets();
  }, [loadBudgets]);

  const selectBudget = useCallback((budget: Budget) => {
    // Only allow selection of active budgets
    if (!budget.is_active) {
      console.warn('Cannot select inactive budget:', budget.name);
      return;
    }
    
    setState(prev => ({
      ...prev,
      selectedBudget: budget,
    }));
  }, []);

  // Load budgets on mount
  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const contextValue: BudgetContextType = {
    ...state,
    loadBudgets,
    selectBudget,
    refreshBudgets,
    clearError,
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

export const useBudgetState = (): BudgetState => {
  const { budgets, selectedBudget, isLoading, error } = useBudget();
  return { budgets, selectedBudget, isLoading, error };
};

// HOC for components that need budget context
export const withBudget = <T extends object>(
  Component: React.ComponentType<T>
): React.FC<T> => {
  return (props: T) => {
    const budgetContext = useBudget();
    return <Component {...props} {...budgetContext} />;
  };
};

export default BudgetContext;