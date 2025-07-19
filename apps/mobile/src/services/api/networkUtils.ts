/**
 * Network Utilities
 * 
 * Utilities for checking network connectivity and handling offline scenarios
 * Updated to use NetInfo v11.4+ API patterns
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean;
}

class NetworkUtils {
  private currentState: NetworkState = {
    isConnected: false,
    type: null,
    isInternetReachable: false,
  };

  private listeners: ((state: NetworkState) => void)[] = [];
  private forceOffline: boolean = false;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    // Configure NetInfo for better reliability in React Native
    NetInfo.configure({
      reachabilityUrl: 'https://clients3.google.com/generate_204',
      reachabilityTest: async (response) => response.status === 204,
      reachabilityLongTimeout: 30 * 1000, // 30s
      reachabilityShortTimeout: 3 * 1000, // 3s
      reachabilityRequestTimeout: 10 * 1000, // 10s
      useNativeReachability: false, // Use custom reachability for better simulator support
    });

    // Get initial network state with retry logic
    await this.initializeWithRetry();
    this.initialized = true;

    // Listen for network changes
    NetInfo.addEventListener(state => {
      this.updateState(this.mapNetInfoState(state));
    });
  }

  /**
   * Initialize network state with retry logic
   */
  private async initializeWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const state = await NetInfo.fetch();
        this.updateState(this.mapNetInfoState(state));
        console.log('[NetworkUtils] Initialized successfully:', this.currentState);
        return;
      } catch (error) {
        console.warn(`[NetworkUtils] Fetch attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          // Final fallback - assume connected
          console.warn('[NetworkUtils] All attempts failed, defaulting to connected state');
          this.updateState({
            isConnected: true,
            type: 'unknown',
            isInternetReachable: true,
          });
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  /**
   * Map NetInfo state to our NetworkState interface
   */
  private mapNetInfoState(state: NetInfoState): NetworkState {
    return {
      isConnected: state.isConnected ?? false,
      type: state.type,
      isInternetReachable: state.isInternetReachable ?? false,
    };
  }

  private updateState(newState: NetworkState) {
    this.currentState = newState;
    this.listeners.forEach(listener => listener(newState));
  }

  /**
   * Get current network state
   */
  getCurrentState(): NetworkState {
    if (this.forceOffline) {
      return {
        isConnected: false,
        type: null,
        isInternetReachable: false,
      };
    }
    return { ...this.currentState };
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Check if NetworkUtils has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if device is connected to internet
   * Updated for NetInfo v11.4+ boolean types
   */
  isConnected(): boolean {
    if (this.forceOffline) {
      return false;
    }
    
    // If not initialized yet, assume we're online to avoid blocking requests
    // This prevents initialization race conditions
    if (!this.initialized) {
      console.log('[NetworkUtils] Not yet initialized, assuming online');
      return true;
    }
    
    // In development/simulator, isInternetReachable is often false even with working internet
    // So we'll trust isConnected if we have a network type
    if (__DEV__ && this.currentState.isConnected && this.currentState.type) {
      return true;
    }
    return this.currentState.isConnected && this.currentState.isInternetReachable;
  }

  /**
   * Check if device is on a cellular connection
   */
  isCellular(): boolean {
    return this.currentState.type === 'cellular';
  }

  /**
   * Check if device is on a wifi connection
   */
  isWifi(): boolean {
    return this.currentState.type === 'wifi';
  }

  /**
   * Add listener for network state changes
   */
  addListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Wait for network connection
   */
  async waitForConnection(timeout = 10000): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.addListener((state) => {
        if (state.isConnected && state.isInternetReachable) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * Force offline mode for testing
   */
  setForceOffline(offline: boolean) {
    this.forceOffline = offline;
    // Notify listeners if forcing offline
    if (offline) {
      this.listeners.forEach(listener => listener({
        isConnected: false,
        type: null,
        isInternetReachable: false,
      }));
    } else {
      // Restore actual state
      this.listeners.forEach(listener => listener(this.currentState));
    }
  }

  /**
   * Check if force offline mode is enabled
   */
  isForceOffline(): boolean {
    return this.forceOffline;
  }
}

export const networkUtils = new NetworkUtils();