import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  return Capacitor.getPlatform() as Platform;
}

/**
 * Check if running on native iOS
 */
export function isNativeIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on native Android
 */
export function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if running on web (browser)
 */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/**
 * Check if running on any native platform
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if a plugin is available on the current platform
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Get device info for platform-specific adjustments
 */
export function getDeviceInfo() {
  return {
    platform: getPlatform(),
    isNative: isNative(),
    isIOS: isNativeIOS(),
    isAndroid: isNativeAndroid(),
    isWeb: isWeb(),
  };
}
