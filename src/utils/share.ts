import { Share as CapacitorShare } from '@capacitor/share';
import { isNative, isPluginAvailable } from '@/utils/platform';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  files?: string[];
}

/**
 * Share content using native share dialog or Web Share API
 */
export async function share(options: ShareOptions): Promise<boolean> {
  // Try native share on mobile
  if (isNative() && isPluginAvailable('Share')) {
    try {
      await CapacitorShare.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle,
        files: options.files,
      });
      return true;
    } catch (error) {
      console.error('Native share error:', error);
      return false;
    }
  }
  
  // Try Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        console.error('Web share error:', error);
      }
      return false;
    }
  }
  
  // Fallback: Copy to clipboard
  const textToCopy = options.url || options.text || options.title || '';
  if (textToCopy) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } catch (error) {
      console.error('Clipboard error:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Check if sharing is available on this device
 */
export async function canShare(): Promise<boolean> {
  if (isNative() && isPluginAvailable('Share')) {
    try {
      const result = await CapacitorShare.canShare();
      return result.value;
    } catch {
      return false;
    }
  }
  
  return !!navigator.share || !!navigator.clipboard;
}
