import { useState, useCallback, useRef, useEffect } from "react";

interface UseImageLoaderOptions {
  preload?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface ImageLoaderState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error: Error | null;
}

/**
 * Hook for managing image loading state with preloading support
 */
export function useImageLoader(
  src: string | undefined,
  options: UseImageLoaderOptions = {}
) {
  const { preload = false, onLoad, onError } = options;
  const [state, setState] = useState<ImageLoaderState>({
    isLoading: false,
    isLoaded: false,
    hasError: false,
    error: null,
  });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const load = useCallback(() => {
    if (!src) return;

    setState({ isLoading: true, isLoaded: false, hasError: false, error: null });

    const img = new Image();
    imageRef.current = img;

    img.onload = () => {
      setState({ isLoading: false, isLoaded: true, hasError: false, error: null });
      onLoad?.();
    };

    img.onerror = () => {
      const error = new Error(`Failed to load image: ${src}`);
      setState({ isLoading: false, isLoaded: false, hasError: true, error });
      onError?.(error);
    };

    img.src = src;
  }, [src, onLoad, onError]);

  useEffect(() => {
    if (preload && src) {
      load();
    }

    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [preload, src, load]);

  return {
    ...state,
    load,
    reload: load,
  };
}

/**
 * Preload critical images for faster rendering
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
          img.src = url;
        })
    )
  );
}

/**
 * Check if browser supports modern image formats
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width === 1);
    img.onerror = () => resolve(false);
    img.src = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";
  });
}

/**
 * Check if browser supports AVIF format
 */
export function supportsAvif(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width === 1);
    img.onerror = () => resolve(false);
    img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgADlAgIGkyCR/wAABAABAAMBgEA";
  });
}
