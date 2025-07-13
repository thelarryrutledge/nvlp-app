// Export all type definitions from this file
// This allows for cleaner imports: import { User, Budget, Envelope } from '@/types'

// Re-export types from the NVLP client library
// Note: This will be updated to use @nvlp/types package in Phase 5 (mobile app migration)
export * from '../../../packages/client/src/types';

// Add mobile-specific types here
export interface NavigationProps {
  navigation: {
    navigate: (name: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
    replace: (name: string, params?: Record<string, unknown>) => void;
    reset: (state: Record<string, unknown>) => void;
  };
  route: {
    params?: Record<string, unknown>;
    name: string;
    key: string;
  };
}

export interface ScreenProps extends NavigationProps {
  // Common screen props
}

export interface ComponentProps {
  // Common component props
  testID?: string;
  style?: Record<string, unknown> | Array<Record<string, unknown>>;
}
