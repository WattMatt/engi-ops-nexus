import { useState, useEffect, useCallback } from 'react';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { isNative } from '@/utils/platform';
import { useNavigate } from 'react-router-dom';

interface AppState {
  isActive: boolean;
  lastStateChange: Date | null;
}

/**
 * Hook to manage native app lifecycle and deep linking
 */
export function useNativeApp() {
  const [appState, setAppState] = useState<AppState>({
    isActive: true,
    lastStateChange: null,
  });
  const navigate = useNavigate();

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!isNative()) return;

    const handleStateChange = App.addListener('appStateChange', ({ isActive }) => {
      setAppState({
        isActive,
        lastStateChange: new Date(),
      });
      
      console.log('App state changed:', isActive ? 'active' : 'background');
    });

    return () => {
      handleStateChange.then((listener) => listener.remove());
    };
  }, []);

  // Handle deep links
  useEffect(() => {
    if (!isNative()) return;

    const handleUrlOpen = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('Deep link received:', event.url);
      
      // Parse the URL and navigate
      try {
        const url = new URL(event.url);
        const path = url.pathname + url.search;
        
        // Navigate to the path within the app
        if (path && path !== '/') {
          navigate(path);
        }
      } catch (error) {
        console.error('Error parsing deep link:', error);
      }
    });

    return () => {
      handleUrlOpen.then((listener) => listener.remove());
    };
  }, [navigate]);

  // Handle back button (Android)
  useEffect(() => {
    if (!isNative()) return;

    const handleBackButton = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // Optionally minimize the app instead of closing
        App.minimizeApp();
      }
    });

    return () => {
      handleBackButton.then((listener) => listener.remove());
    };
  }, []);

  const exitApp = useCallback(async () => {
    if (isNative()) {
      await App.exitApp();
    }
  }, []);

  const minimizeApp = useCallback(async () => {
    if (isNative()) {
      await App.minimizeApp();
    }
  }, []);

  const getAppInfo = useCallback(async () => {
    if (isNative()) {
      return await App.getInfo();
    }
    return null;
  }, []);

  const getAppState = useCallback(async () => {
    if (isNative()) {
      return await App.getState();
    }
    return { isActive: true };
  }, []);

  return {
    appState,
    exitApp,
    minimizeApp,
    getAppInfo,
    getAppState,
    isNative: isNative(),
  };
}
