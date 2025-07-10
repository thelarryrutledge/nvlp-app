// Export all type definitions from this file
// This allows for cleaner imports: import { User, Budget, Envelope } from '@/types'

// Re-export types from the NVLP client library
export * from '../../../src/client/types';

// Add mobile-specific types here
export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface ScreenProps extends NavigationProps {
  // Common screen props
}

export interface ComponentProps {
  // Common component props
  testID?: string;
  style?: any;
}