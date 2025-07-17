/**
 * useNetworkStatus Hook
 * 
 * Modern hook using NetInfo v11.4+ recommended patterns
 * More reliable than manual state management for network detection
 */

import { useNetInfo } from '@react-native-community/netinfo';
import { useMemo } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
  isOnline: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
}

export function useNetworkStatus(): NetworkStatus {
  const netInfo = useNetInfo();

  const networkStatus = useMemo(() => {
    const isConnected = netInfo.isConnected ?? false;
    const isInternetReachable = netInfo.isInternetReachable ?? false;
    const isOnline = isConnected && isInternetReachable;

    // Determine connection quality based on type and speed
    let connectionQuality: NetworkStatus['connectionQuality'] = 'unknown';
    
    if (isOnline) {
      switch (netInfo.type) {
        case 'wifi':
          connectionQuality = 'excellent';
          break;
        case 'cellular':
          // Check cellular generation if available
          if ('cellularGeneration' in netInfo.details && netInfo.details.cellularGeneration) {
            const generation = netInfo.details.cellularGeneration;
            if (generation === '5g') {
              connectionQuality = 'excellent';
            } else if (generation === '4g') {
              connectionQuality = 'good';
            } else {
              connectionQuality = 'poor';
            }
          } else {
            connectionQuality = 'good'; // Default for cellular
          }
          break;
        case 'ethernet':
          connectionQuality = 'excellent';
          break;
        default:
          connectionQuality = isOnline ? 'good' : 'unknown';
      }
    }

    return {
      isConnected,
      isInternetReachable,
      type: netInfo.type,
      isOnline,
      connectionQuality,
    };
  }, [netInfo]);

  return networkStatus;
}

/**
 * Hook specifically for checking if requests should be allowed
 */
export function useNetworkGuard() {
  const networkStatus = useNetworkStatus();
  
  return {
    ...networkStatus,
    canMakeRequests: networkStatus.isOnline,
    shouldShowOfflineWarning: !networkStatus.isConnected,
    shouldRetryRequest: networkStatus.isConnected && !networkStatus.isInternetReachable,
  };
}