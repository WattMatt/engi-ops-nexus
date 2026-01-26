import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative, isPluginAvailable } from '@/utils/platform';

interface StatusBarOptions {
  style?: 'DARK' | 'LIGHT' | 'DEFAULT';
  backgroundColor?: string;
  overlay?: boolean;
}

/**
 * Hook to manage native status bar and splash screen
 */
export function useNativeUI(options: StatusBarOptions = {}) {
  const {
    style = 'DARK',
    backgroundColor = '#1e293b',
    overlay = false,
  } = options;

  // Configure status bar on mount
  useEffect(() => {
    const configureStatusBar = async () => {
      if (!isNative() || !isPluginAvailable('StatusBar')) return;

      try {
        // Set style
        const barStyle = style === 'DARK' ? Style.Dark : 
                        style === 'LIGHT' ? Style.Light : 
                        Style.Default;
        await StatusBar.setStyle({ style: barStyle });

        // Set background color (Android only)
        await StatusBar.setBackgroundColor({ color: backgroundColor });

        // Set overlay (Android only)
        await StatusBar.setOverlaysWebView({ overlay });
      } catch (error) {
        console.error('Error configuring status bar:', error);
      }
    };

    configureStatusBar();
  }, [style, backgroundColor, overlay]);

  // Hide splash screen when app is ready
  useEffect(() => {
    const hideSplash = async () => {
      if (!isNative() || !isPluginAvailable('SplashScreen')) return;

      try {
        // Small delay to ensure app is rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        await SplashScreen.hide();
      } catch (error) {
        console.error('Error hiding splash screen:', error);
      }
    };

    hideSplash();
  }, []);

  const showStatusBar = async () => {
    if (isNative() && isPluginAvailable('StatusBar')) {
      await StatusBar.show();
    }
  };

  const hideStatusBar = async () => {
    if (isNative() && isPluginAvailable('StatusBar')) {
      await StatusBar.hide();
    }
  };

  const setStatusBarStyle = async (newStyle: 'DARK' | 'LIGHT' | 'DEFAULT') => {
    if (isNative() && isPluginAvailable('StatusBar')) {
      const barStyle = newStyle === 'DARK' ? Style.Dark : 
                      newStyle === 'LIGHT' ? Style.Light : 
                      Style.Default;
      await StatusBar.setStyle({ style: barStyle });
    }
  };

  const setStatusBarColor = async (color: string) => {
    if (isNative() && isPluginAvailable('StatusBar')) {
      await StatusBar.setBackgroundColor({ color });
    }
  };

  const showSplash = async () => {
    if (isNative() && isPluginAvailable('SplashScreen')) {
      await SplashScreen.show();
    }
  };

  const hideSplash = async () => {
    if (isNative() && isPluginAvailable('SplashScreen')) {
      await SplashScreen.hide();
    }
  };

  return {
    showStatusBar,
    hideStatusBar,
    setStatusBarStyle,
    setStatusBarColor,
    showSplash,
    hideSplash,
    isNative: isNative(),
  };
}
