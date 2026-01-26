import { useState, useEffect, useCallback } from 'react';
import { Keyboard, KeyboardInfo, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';
import { isNative, isPluginAvailable, isNativeIOS } from '@/utils/platform';

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to manage native keyboard behavior
 */
export function useNativeKeyboard() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    if (!isNative() || !isPluginAvailable('Keyboard')) return;

    const showListener = Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
      setKeyboardState({
        isVisible: true,
        keyboardHeight: info.keyboardHeight,
      });
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardState({
        isVisible: false,
        keyboardHeight: 0,
      });
    });

    return () => {
      showListener.then((l) => l.remove());
      hideListener.then((l) => l.remove());
    };
  }, []);

  const hideKeyboard = useCallback(async () => {
    if (isNative() && isPluginAvailable('Keyboard')) {
      await Keyboard.hide();
    }
  }, []);

  const showKeyboard = useCallback(async () => {
    if (isNative() && isPluginAvailable('Keyboard')) {
      await Keyboard.show();
    }
  }, []);

  const setAccessoryBarVisible = useCallback(async (visible: boolean) => {
    if (isNativeIOS() && isPluginAvailable('Keyboard')) {
      await Keyboard.setAccessoryBarVisible({ isVisible: visible });
    }
  }, []);

  const setScroll = useCallback(async (disabled: boolean) => {
    if (isNativeIOS() && isPluginAvailable('Keyboard')) {
      await Keyboard.setScroll({ isDisabled: disabled });
    }
  }, []);

  const setStyle = useCallback(async (style: 'DARK' | 'LIGHT' | 'DEFAULT') => {
    if (isNative() && isPluginAvailable('Keyboard')) {
      const keyboardStyle = style === 'DARK' ? KeyboardStyle.Dark : 
                            style === 'LIGHT' ? KeyboardStyle.Light : 
                            KeyboardStyle.Default;
      await Keyboard.setStyle({ style: keyboardStyle });
    }
  }, []);

  const setResizeMode = useCallback(async (mode: 'body' | 'ionic' | 'native' | 'none') => {
    if (isNative() && isPluginAvailable('Keyboard')) {
      const resizeMode = mode === 'body' ? KeyboardResize.Body :
                         mode === 'ionic' ? KeyboardResize.Ionic :
                         mode === 'native' ? KeyboardResize.Native :
                         KeyboardResize.None;
      await Keyboard.setResizeMode({ mode: resizeMode });
    }
  }, []);

  return {
    ...keyboardState,
    hideKeyboard,
    showKeyboard,
    setAccessoryBarVisible,
    setScroll,
    setStyle,
    setResizeMode,
    isNative: isNative() && isPluginAvailable('Keyboard'),
  };
}
