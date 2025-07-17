/**
 * useTokenMonitor Hook
 * 
 * React hook for monitoring token expiration and handling automatic refresh
 */

import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { tokenManager } from '../services/auth/tokenManager';
import type { TokenData } from '../services/auth/tokenManager';

interface TokenMonitorState {
  isTokenValid: boolean;
  expiresAt: number | null;
  timeUntilExpiry: number | null;
  needsRefresh: boolean;
}

export function useTokenMonitor() {
  const [tokenState, setTokenState] = useState<TokenMonitorState>({
    isTokenValid: false,
    expiresAt: null,
    timeUntilExpiry: null,
    needsRefresh: false,
  });

  /**
   * Update token state from token data
   */
  const updateTokenState = useCallback((tokenData: TokenData | null) => {
    if (!tokenData) {
      setTokenState({
        isTokenValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: false,
      });
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = tokenData.expiresAt - now;
    const isValid = timeUntilExpiry > 0;
    const needsRefresh = tokenManager.needsRefresh();

    setTokenState({
      isTokenValid: isValid,
      expiresAt: tokenData.expiresAt,
      timeUntilExpiry: isValid ? timeUntilExpiry : 0,
      needsRefresh,
    });
  }, []);

  /**
   * Check and update token state periodically
   */
  const checkTokenState = useCallback(() => {
    const currentTokens = tokenManager.getCurrentTokens();
    updateTokenState(currentTokens);
  }, [updateTokenState]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, check token state
      checkTokenState();
      
      // Try to refresh token if needed
      if (tokenManager.needsRefresh() && tokenManager.getRefreshToken()) {
        tokenManager.refreshTokens().catch(error => {
          console.error('Token refresh failed on app foreground:', error);
        });
      }
    }
  }, [checkTokenState]);

  /**
   * Set up token listener and periodic checks
   */
  useEffect(() => {
    // Listen for token updates
    const unsubscribeTokens = tokenManager.addTokenListener(updateTokenState);
    
    // Listen for app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initial check
    checkTokenState();
    
    // Set up periodic check (every 30 seconds)
    const interval = setInterval(checkTokenState, 30000);
    
    return () => {
      unsubscribeTokens();
      appStateSubscription?.remove();
      clearInterval(interval);
    };
  }, [updateTokenState, handleAppStateChange, checkTokenState]);

  return {
    ...tokenState,
    refreshToken: tokenManager.refreshTokens.bind(tokenManager),
    clearTokens: tokenManager.clearTokens.bind(tokenManager),
  };
}

/**
 * Hook for token expiration warnings
 */
export function useTokenExpirationWarning(warningThresholdMinutes = 10) {
  const { timeUntilExpiry, isTokenValid } = useTokenMonitor();
  const [hasShownWarning, setHasShownWarning] = useState(false);

  useEffect(() => {
    if (!isTokenValid || !timeUntilExpiry) {
      setHasShownWarning(false);
      return;
    }

    const warningThresholdMs = warningThresholdMinutes * 60 * 1000;
    
    if (timeUntilExpiry <= warningThresholdMs && !hasShownWarning) {
      setHasShownWarning(true);
      
      // Show warning to user
      console.warn(`Token will expire in ${Math.round(timeUntilExpiry / 60000)} minutes`);
      
      // Could show an Alert or notification here
      // Alert.alert(
      //   'Session Expiring',
      //   `Your session will expire in ${Math.round(timeUntilExpiry / 60000)} minutes.`,
      //   [{ text: 'OK' }]
      // );
    }
  }, [timeUntilExpiry, isTokenValid, warningThresholdMinutes, hasShownWarning]);

  return {
    shouldShowWarning: hasShownWarning,
    timeUntilExpiry,
    minutesUntilExpiry: timeUntilExpiry ? Math.round(timeUntilExpiry / 60000) : 0,
  };
}