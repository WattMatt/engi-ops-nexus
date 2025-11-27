import { useCallback, useState } from 'react';
import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

interface UseImageCompressionReturn {
  compressImage: (file: File, options?: CompressionOptions) => Promise<File>;
  isCompressing: boolean;
  compressionProgress: number;
  error: string | null;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

/**
 * Hook for compressing images before upload to reduce bandwidth and storage costs.
 * Uses browser-image-compression library for efficient client-side compression.
 */
export function useImageCompression(): UseImageCompressionReturn {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const compressImage = useCallback(async (
    file: File,
    options: CompressionOptions = {}
  ): Promise<File> => {
    // Skip compression for non-image files
    if (!file.type.startsWith('image/')) {
      return file;
    }

    // Skip compression for already small files (under 100KB)
    if (file.size < 100 * 1024) {
      return file;
    }

    setIsCompressing(true);
    setError(null);
    setCompressionProgress(0);

    try {
      const mergedOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
        onProgress: (progress: number) => {
          setCompressionProgress(Math.round(progress));
        },
      };

      const compressedFile = await imageCompression(file, mergedOptions);
      
      // Log compression results for debugging
      const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
      console.log(`Image compressed: ${file.name} - ${compressionRatio}% reduction (${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB)`);
      
      setCompressionProgress(100);
      return compressedFile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to compress image';
      setError(message);
      console.error('Image compression error:', err);
      // Return original file if compression fails
      return file;
    } finally {
      setIsCompressing(false);
    }
  }, []);

  return {
    compressImage,
    isCompressing,
    compressionProgress,
    error,
  };
}

/**
 * Utility function to compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = DEFAULT_OPTIONS
): Promise<File[]> {
  const compressedFiles = await Promise.all(
    files.map(async (file) => {
      if (!file.type.startsWith('image/') || file.size < 100 * 1024) {
        return file;
      }
      try {
        return await imageCompression(file, options);
      } catch {
        return file;
      }
    })
  );
  return compressedFiles;
}
