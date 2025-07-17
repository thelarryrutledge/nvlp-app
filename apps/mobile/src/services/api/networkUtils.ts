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

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Configure NetInfo for better reliability
    NetInfo.configure({
      reachabilityUrl: 'https://clients3.google.com/generate_204',
      reachabilityTest: async (response) => response.status === 204,
      reachabilityLongTimeout: 60 * 1000, // 60s
      reachabilityShortTimeout: 5 * 1000, // 5s
      reachabilityRequestTimeout: 15 * 1000, // 15s
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      this.updateState(this.mapNetInfoState(state));
    }).catch(error => {
      console.warn('NetInfo fetch failed:', error);
      // Default to allowing network requests if NetInfo fails
      this.updateState({
        isConnected: true,
        type: 'unknown',
        isInternetReachable: true,
      });
    });

    // Listen for network changes
    NetInfo.addEventListener(state => {
      this.updateState(this.mapNetInfoState(state));
    });
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
    return { ...this.currentState };
  }

  /**
   * Check if device is connected to internet
   * Updated for NetInfo v11.4+ boolean types
   */
  isConnected(): boolean {
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
}

export const networkUtils = new NetworkUtils();