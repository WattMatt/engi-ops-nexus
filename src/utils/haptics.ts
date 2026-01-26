import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '@/utils/platform';

/**
 * Trigger a light impact haptic feedback
 */
export async function lightImpact(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    console.error('Haptics error:', error);
  }
}

/**
 * Trigger a medium impact haptic feedback
 */
export async function mediumImpact(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (error) {
    console.error('Haptics error:', error);
  }
}

/**
 * Trigger a heavy impact haptic feedback
 */
export async function heavyImpact(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.error('Haptics error:', error);
  }
}

/**
 * Trigger a success notification haptic
 */
export async function successHaptic(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    console.error('Haptics error:', error);
  }
}

/**
 * Trigger a warning notification haptic
 */
export async function warningHaptic(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    console.error('Haptics error:', error);
  }
}

/**
 * Trigger an error notification haptic
 */
export async function errorHaptic(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (error) {
    console.error('Haptics error:', error);
  }
}

/**
 * Trigger selection changed haptic (for selections/toggles)
 */
export async function selectionHaptic(): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.selectionChanged();
  } catch (error) {
    console.error('Haptics error:', error);
  }
}

/**
 * Vibrate the device for a given duration
 */
export async function vibrate(duration: number = 300): Promise<void> {
  if (!isNative()) return;
  
  try {
    await Haptics.vibrate({ duration });
  } catch (error) {
    console.error('Haptics error:', error);
  }
}
