/**
 * Network Utilities
 * 
 * Utilities for checking network connectivity and handling offline scenarios
 */

import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

class NetworkUtils {
  private currentState: NetworkState = {
    isConnected: false,
    type: null,
    isInternetReachable: null,
  };

  private listeners: ((state: NetworkState) => void)[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Get initial network state
    NetInfo.fetch().then(state => {
      this.updateState({
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });

    // Listen for network changes
    NetInfo.addEventListener(state => {
      this.updateState({
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });
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
   */
  isConnected(): boolean {
    return this.currentState.isConnected && 
           this.currentState.isInternetReachable !== false;
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
        if (state.isConnected && state.isInternetReachable !== false) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
}

export const networkUtils = new NetworkUtils();