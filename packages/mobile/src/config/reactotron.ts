import Reactotron from 'reactotron-react-native';
import { env } from './env';

/**
 * Reactotron Configuration for React Native
 * 
 * Provides debugging capabilities including:
 * - State inspection and modification
 * - API request/response monitoring
 * - Custom logging
 * - Performance benchmarking
 * - Storage inspection
 */

interface ReactotronConfig {
  host?: string;
  port?: number;
  name?: string;
  enabled: boolean;
}

class ReactotronService {
  private static instance: ReactotronService;
  private isConfigured = false;

  private constructor() {}

  static getInstance(): ReactotronService {
    if (!ReactotronService.instance) {
      ReactotronService.instance = new ReactotronService();
    }
    return ReactotronService.instance;
  }

  /**
   * Configure and start Reactotron
   * Only runs in development mode
   */
  configure(config: Partial<ReactotronConfig> = {}): void {
    // Only enable in development
    if (env.NODE_ENV !== 'development' || this.isConfigured) {
      return;
    }

    const defaultConfig: ReactotronConfig = {
      host: 'localhost', // Change to your machine's IP if testing on device
      port: 9090,
      name: 'NVLP Mobile',
      enabled: true,
      ...config,
    };

    if (!defaultConfig.enabled) {
      return;
    }

    try {
      // Clear Reactotron on startup
      Reactotron.clear?.();

      // Configure Reactotron
      Reactotron
        .configure({
          name: defaultConfig.name,
          host: defaultConfig.host,
          port: defaultConfig.port,
        })
        .useReactNative({
          asyncStorage: true, // Track AsyncStorage
          networking: {
            ignoreUrls: /symbolicate|127\.0\.0\.1|localhost/, // Ignore metro bundler requests
          },
          editor: false, // Set to true if you have VS Code running
          errors: { veto: () => false }, // Don't ignore any errors
          overlay: false, // Disable overlay to prevent conflicts with error boundary
        })
        .connect();

      // Add custom commands for debugging
      this.addCustomCommands();

      this.isConfigured = true;

      // Log successful setup
      console.log('🔧 Reactotron configured successfully');
      Reactotron.log?.('🚀 NVLP Mobile app connected to Reactotron');
    } catch (error) {
      console.warn('Failed to configure Reactotron:', error);
    }
  }

  /**
   * Add custom Reactotron commands for debugging
   */
  private addCustomCommands(): void {
    // Command to clear AsyncStorage
    Reactotron.onCustomCommand?.({
      command: 'Clear AsyncStorage',
      handler: async () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.clear();
          Reactotron.log?.('✅ AsyncStorage cleared');
        } catch (error) {
          Reactotron.log?.('❌ Failed to clear AsyncStorage:', error);
        }
      },
      title: 'Clear AsyncStorage',
      description: 'Clear all AsyncStorage data',
    });

    // Command to clear secure storage
    Reactotron.onCustomCommand?.({
      command: 'Clear Secure Storage',
      handler: async () => {
        try {
          const { clearAllData } = require('../services/secureStorage');
          await clearAllData();
          Reactotron.log?.('✅ Secure storage cleared');
        } catch (error) {
          Reactotron.log?.('❌ Failed to clear secure storage:', error);
        }
      },
      title: 'Clear Secure Storage',
      description: 'Clear all keychain/secure storage data',
    });

    // Command to show error reports
    Reactotron.onCustomCommand?.({
      command: 'Show Error Reports',
      handler: async () => {
        try {
          const ErrorHandlingService = require('../services/errorHandlingService').default;
          const errors = await ErrorHandlingService.getStoredErrors();
          Reactotron.log?.('📊 Error Reports:', errors);
          Reactotron.display?.({
            name: '🐛 Error Reports',
            value: errors,
            preview: `${errors.length} error(s) found`,
          });
        } catch (error) {
          Reactotron.log?.('❌ Failed to get error reports:', error);
        }
      },
      title: 'Show Error Reports',
      description: 'Display stored error reports',
    });

    // Command to trigger test error
    Reactotron.onCustomCommand?.({
      command: 'Trigger Test Error',
      handler: () => {
        Reactotron.log?.('🧪 Triggering test error...');
        setTimeout(() => {
          throw new Error('Test error triggered from Reactotron');
        }, 100);
      },
      title: 'Trigger Test Error',
      description: 'Trigger a test error for debugging',
    });

    // Command to show environment variables
    Reactotron.onCustomCommand?.({
      command: 'Show Environment',
      handler: () => {
        const safeEnv = {
          NODE_ENV: env.NODE_ENV,
          APP_ENV: env.APP_ENV,
          API_URL: env.API_URL,
          DEEP_LINK_SCHEME: env.DEEP_LINK_SCHEME,
          SUPABASE_URL: env.SUPABASE_URL ? '***SET***' : '***NOT_SET***',
          SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ? '***SET***' : '***NOT_SET***',
        };
        Reactotron.display?.({
          name: '🌐 Environment Config',
          value: safeEnv,
          preview: `Environment: ${env.NODE_ENV}`,
        });
      },
      title: 'Show Environment',
      description: 'Display current environment configuration',
    });
  }

  /**
   * Log a message to Reactotron (only in development)
   */
  log(message: string, ...args: any[]): void {
    if (env.NODE_ENV === 'development' && this.isConfigured) {
      Reactotron.log?.(message, ...args);
    }
  }

  /**
   * Log an error to Reactotron (only in development)
   */
  error(message: string, error?: Error): void {
    if (env.NODE_ENV === 'development' && this.isConfigured) {
      Reactotron.error?.(message, error);
    }
  }

  /**
   * Log a warning to Reactotron (only in development)
   */
  warn(message: string, ...args: any[]): void {
    if (env.NODE_ENV === 'development' && this.isConfigured) {
      Reactotron.warn?.(message, ...args);
    }
  }

  /**
   * Display data in Reactotron (only in development)
   */
  display(config: { name: string; value: any; preview?: string }): void {
    if (env.NODE_ENV === 'development' && this.isConfigured) {
      Reactotron.display?.(config);
    }
  }

  /**
   * Benchmark performance in Reactotron (only in development)
   */
  benchmark(name: string): () => void {
    if (env.NODE_ENV === 'development' && this.isConfigured) {
      return Reactotron.benchmark?.(name) || (() => {});
    }
    return () => {};
  }

  /**
   * Check if Reactotron is configured and available
   */
  isAvailable(): boolean {
    return env.NODE_ENV === 'development' && this.isConfigured;
  }

  /**
   * Get the Reactotron instance for advanced usage
   */
  getInstance() {
    return this.isConfigured ? Reactotron : null;
  }
}

// Export singleton instance
const reactotron = ReactotronService.getInstance();

// Auto-configure in development
if (env.NODE_ENV === 'development') {
  reactotron.configure();
}

export default reactotron;

// Also export the class for testing
export { ReactotronService };