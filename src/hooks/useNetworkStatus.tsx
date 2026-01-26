import { useState, useEffect, useCallback } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { isNative, isPluginAvailable } from '@/utils/platform';

interface NetworkState {
  connected: boolean;
  connectionType: string;
}

/**
 * Hook to monitor network connectivity status
 */
export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    connected: navigator.onLine,
    connectionType: 'unknown',
  });

  // Get initial status
  useEffect(() => {
    const getInitialStatus = async () => {
      if (isNative() && isPluginAvailable('Network')) {
        try {
          const status = await Network.getStatus();
          setNetworkState({
            connected: status.connected,
            connectionType: status.connectionType,
          });
        } catch (error) {
          console.error('Error getting network status:', error);
        }
      } else {
        setNetworkState({
          connected: navigator.onLine,
          connectionType: navigator.onLine ? 'wifi' : 'none',
        });
      }
    };

    getInitialStatus();
  }, []);

  // Listen for network changes
  useEffect(() => {
    if (isNative() && isPluginAvailable('Network')) {
      const listener = Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        setNetworkState({
          connected: status.connected,
          connectionType: status.connectionType,
        });
      });

      return () => {
        listener.then((l) => l.remove());
      };
    } else {
      // Web fallback
      const handleOnline = () => {
        setNetworkState({
          connected: true,
          connectionType: 'wifi',
        });
      };

      const handleOffline = () => {
        setNetworkState({
          connected: false,
          connectionType: 'none',
        });
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (isNative() && isPluginAvailable('Network')) {
      const status = await Network.getStatus();
      setNetworkState({
        connected: status.connected,
        connectionType: status.connectionType,
      });
      return status;
    }
    
    return {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none',
    };
  }, []);

  return {
    isConnected: networkState.connected,
    connectionType: networkState.connectionType,
    isWifi: networkState.connectionType === 'wifi',
    isCellular: networkState.connectionType === 'cellular',
    refreshStatus,
  };
}
