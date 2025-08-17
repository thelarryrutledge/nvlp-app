import { ErrorInfo } from 'react';
import { env } from '../config/env';
import LocalStorageService from './localStorage';
import reactotron from '../config/reactotron';

export interface ErrorReport {
  id: string;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  errorInfo?: {
    componentStack?: string;
  };
  context: {
    timestamp: string;
    appVersion: string;
    environment: string;
    userId?: string;
    route?: string;
    deviceInfo?: {
      platform: string;
      version: string;
    };
  };
  isFatal: boolean;
  isHandled: boolean;
}

export interface ErrorHandlingConfig {
  enableCrashReporting: boolean;
  enableLocalLogging: boolean;
  maxLocalErrors: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private config: ErrorHandlingConfig;
  private errorQueue: ErrorReport[] = [];

  private constructor() {
    this.config = {
      enableCrashReporting: env.NODE_ENV === 'production',
      enableLocalLogging: true,
      maxLocalErrors: 50,
      logLevel: env.NODE_ENV === 'development' ? 'debug' : 'error',
    };

    this.loadStoredErrors();
  }

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Configure error handling behavior
   */
  configure(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Report a React component error from ErrorBoundary
   */
  reportComponentError(error: Error, errorInfo: ErrorInfo): string {
    const report = this.createErrorReport(error, {
      componentStack: errorInfo.componentStack,
      isFatal: false,
      isHandled: true,
    });

    this.processErrorReport(report);
    return report.id;
  }

  /**
   * Report a global JavaScript error
   */
  reportGlobalError(error: Error, isFatal: boolean = false): string {
    const report = this.createErrorReport(error, {
      isFatal,
      isHandled: false,
    });

    this.processErrorReport(report);
    return report.id;
  }

  /**
   * Report a custom error with context
   */
  reportError(error: Error, context?: Partial<ErrorReport['context']>): string {
    const report = this.createErrorReport(error, {
      isFatal: false,
      isHandled: true,
      customContext: context,
    });

    this.processErrorReport(report);
    return report.id;
  }

  /**
   * Get stored error reports (for debugging or sending to support)
   */
  async getStoredErrors(): Promise<ErrorReport[]> {
    try {
      const errors = await LocalStorageService.getCachedData<ErrorReport[]>('error_reports');
      return errors || [];
    } catch (error) {
      console.warn('Failed to load stored errors:', error);
      return [];
    }
  }

  /**
   * Clear stored error reports
   */
  async clearStoredErrors(): Promise<void> {
    try {
      await LocalStorageService.removeCachedData('error_reports');
      this.errorQueue = [];
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(): Promise<{
    totalErrors: number;
    fatalErrors: number;
    recentErrors: number;
    lastErrorTime?: string;
  }> {
    const errors = await this.getStoredErrors();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const fatalErrors = errors.filter(e => e.isFatal).length;
    const recentErrors = errors.filter(e => 
      new Date(e.context.timestamp) > oneHourAgo
    ).length;
    const lastError = errors[errors.length - 1];

    return {
      totalErrors: errors.length,
      fatalErrors,
      recentErrors,
      lastErrorTime: lastError?.context.timestamp,
    };
  }

  /**
   * Create an error report with full context
   */
  private createErrorReport(
    error: Error, 
    options: {
      componentStack?: string;
      isFatal: boolean;
      isHandled: boolean;
      customContext?: Partial<ErrorReport['context']>;
    }
  ): ErrorReport {
    return {
      id: this.generateErrorId(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: options.componentStack ? {
        componentStack: options.componentStack,
      } : undefined,
      context: {
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0', // This would come from app config
        environment: env.NODE_ENV,
        ...options.customContext,
      },
      isFatal: options.isFatal,
      isHandled: options.isHandled,
    };
  }

  /**
   * Process and store error report
   */
  private async processErrorReport(report: ErrorReport): Promise<void> {
    // Log to console based on config
    if (this.shouldLog('error')) {
      console.error(`[ErrorHandling] ${report.isFatal ? 'FATAL' : 'ERROR'}:`, report);
    }

    // Log to Reactotron in development
    if (reactotron.isAvailable()) {
      reactotron.error(
        `${report.isFatal ? '💀 FATAL ERROR' : '🐛 ERROR'}: ${report.error.message}`,
        new Error(report.error.message)
      );
      reactotron.display({
        name: '🚨 Error Report',
        value: report,
        preview: `${report.isFatal ? 'FATAL' : 'ERROR'}: ${report.error.message}`,
      });
    }

    // Add to local queue
    this.errorQueue.push(report);

    // Store locally if enabled
    if (this.config.enableLocalLogging) {
      await this.storeErrorLocally(report);
    }

    // Send to crash reporting service if enabled
    if (this.config.enableCrashReporting) {
      await this.sendToCrashReporting(report);
    }
  }

  /**
   * Store error report locally
   */
  private async storeErrorLocally(report: ErrorReport): Promise<void> {
    try {
      const existingErrors = await this.getStoredErrors();
      const updatedErrors = [...existingErrors, report];

      // Keep only the most recent errors based on maxLocalErrors
      if (updatedErrors.length > this.config.maxLocalErrors) {
        updatedErrors.splice(0, updatedErrors.length - this.config.maxLocalErrors);
      }

      await LocalStorageService.setCachedData(
        'error_reports',
        updatedErrors,
        30 * 24 * 60 * 60 * 1000 // 30 days TTL
      );
    } catch (error) {
      console.warn('Failed to store error locally:', error);
    }
  }

  /**
   * Send error to crash reporting service
   */
  private async sendToCrashReporting(report: ErrorReport): Promise<void> {
    // In a production app, integrate with services like:
    // - Sentry: Sentry.captureException(new Error(report.error.message), { extra: report });
    // - Bugsnag: Bugsnag.notify(new Error(report.error.message), { metaData: report });
    // - Firebase Crashlytics: crashlytics().recordError(new Error(report.error.message));
    
    if (env.NODE_ENV === 'development') {
      console.log('[ErrorHandling] Would send to crash reporting service:', report.id);
    }
  }

  /**
   * Load stored errors on initialization
   */
  private async loadStoredErrors(): Promise<void> {
    try {
      const errors = await this.getStoredErrors();
      this.errorQueue = errors;
    } catch (error) {
      console.warn('Failed to load stored errors on init:', error);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `error_${timestamp}_${random}`;
  }

  /**
   * Check if we should log based on log level
   */
  private shouldLog(level: ErrorHandlingConfig['logLevel']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }
}

// Export singleton instance
export default ErrorHandlingService.getInstance();