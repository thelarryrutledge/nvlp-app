// Core store types for NVLP mobile app state management

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface UserState {
  profile: User | null;
  preferences: {
    currency: string;
    dateFormat: string;
    notifications: boolean;
    biometricAuth: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

export interface BudgetState {
  activeBudget: Budget | null;
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
}

export interface CacheState {
  lastSync: string | null;
  pendingActions: Array<{
    id: string;
    action: string;
    data: any;
    timestamp: string;
  }>;
  isOnline: boolean;
  syncInProgress: boolean;
}

// Store action types
export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export interface UserActions {
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserState['preferences']>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface BudgetActions {
  loadBudgets: () => Promise<void>;
  setActiveBudget: (budget: Budget) => Promise<void>;
  createBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface CacheActions {
  addPendingAction: (action: string, data: any) => void;
  removePendingAction: (id: string) => void;
  clearPendingActions: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setSyncStatus: (syncing: boolean) => void;
  updateLastSync: () => void;
}

// Combined store types
export type AuthStore = AuthState & AuthActions;
export type UserStore = UserState & UserActions;  
export type BudgetStore = BudgetState & BudgetActions;
export type CacheStore = CacheState & CacheActions;