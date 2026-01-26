import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { isNative, isPluginAvailable, isWeb } from '@/utils/platform';
import { Share } from '@capacitor/share';

export interface SaveFileOptions {
  fileName: string;
  data: string | Blob;
  mimeType?: string;
  directory?: 'documents' | 'downloads' | 'cache';
}

/**
 * Save a file to the device
 * - On native: Uses Capacitor Filesystem
 * - On web: Uses download link
 */
export async function saveFile(options: SaveFileOptions): Promise<{ success: boolean; path?: string }> {
  const { fileName, data, mimeType = 'application/octet-stream', directory = 'documents' } = options;

  // Web fallback
  if (isWeb() || !isPluginAvailable('Filesystem')) {
    try {
      let blob: Blob;
      if (typeof data === 'string') {
        blob = new Blob([data], { type: mimeType });
      } else {
        blob = data;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error saving file on web:', error);
      return { success: false };
    }
  }

  // Native implementation
  try {
    const dir = directory === 'documents' ? Directory.Documents :
                directory === 'downloads' ? Directory.External :
                Directory.Cache;

    let fileData: string;
    if (typeof data === 'string') {
      fileData = data;
    } else {
      // Convert Blob to base64
      fileData = await blobToBase64(data);
    }

    const result = await Filesystem.writeFile({
      path: fileName,
      data: fileData,
      directory: dir,
      encoding: typeof data === 'string' ? Encoding.UTF8 : undefined,
    });

    return { success: true, path: result.uri };
  } catch (error) {
    console.error('Error saving file on native:', error);
    return { success: false };
  }
}

/**
 * Read a file from the device
 */
export async function readFile(path: string, directory: 'documents' | 'downloads' | 'cache' = 'documents'): Promise<string | null> {
  if (isWeb() || !isPluginAvailable('Filesystem')) {
    console.warn('Filesystem not available on web');
    return null;
  }

  try {
    const dir = directory === 'documents' ? Directory.Documents :
                directory === 'downloads' ? Directory.External :
                Directory.Cache;

    const result = await Filesystem.readFile({
      path,
      directory: dir,
      encoding: Encoding.UTF8,
    });

    return result.data as string;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}

/**
 * Delete a file from the device
 */
export async function deleteFile(path: string, directory: 'documents' | 'downloads' | 'cache' = 'documents'): Promise<boolean> {
  if (isWeb() || !isPluginAvailable('Filesystem')) {
    return false;
  }

  try {
    const dir = directory === 'documents' ? Directory.Documents :
                directory === 'downloads' ? Directory.External :
                Directory.Cache;

    await Filesystem.deleteFile({
      path,
      directory: dir,
    });

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * List files in a directory
 */
export async function listFiles(path: string = '', directory: 'documents' | 'downloads' | 'cache' = 'documents'): Promise<string[]> {
  if (isWeb() || !isPluginAvailable('Filesystem')) {
    return [];
  }

  try {
    const dir = directory === 'documents' ? Directory.Documents :
                directory === 'downloads' ? Directory.External :
                Directory.Cache;

    const result = await Filesystem.readdir({
      path,
      directory: dir,
    });

    return result.files.map(f => f.name);
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

/**
 * Share a file using native share dialog
 */
export async function shareFile(path: string, title?: string): Promise<boolean> {
  if (!isNative() || !isPluginAvailable('Share')) {
    return false;
  }

  try {
    await Share.share({
      title: title || 'Share File',
      files: [path],
    });
    return true;
  } catch (error) {
    console.error('Error sharing file:', error);
    return false;
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
