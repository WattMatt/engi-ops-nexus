/**
 * Shared Hooks Index
 * Central export for commonly used hooks
 */

// Project management
export { useProject, useProjects } from './useProject';
export type { Project } from './useProject';

// State management
export { useLocalStorage, useSessionStorage } from './useLocalStorage';
export { useDebounce, useDebouncedCallback, useThrottledCallback } from './useDebounce';

// Async operations
export { useAsyncAction, useMutationAction, useFormSubmit } from './useAsyncAction';

// Offline support
export { useOfflineSync } from './useOfflineSync';
export { useNetworkStatus } from './useNetworkStatus';
export { useCableOfflineSync } from './useCableOfflineSync';
export type { OfflineCableEntry } from './useCableOfflineSync';
export { useBudgetOfflineSync } from './useBudgetOfflineSync';
export type { OfflineBudgetLineItem } from './useBudgetOfflineSync';
export { useDrawingOfflineSync } from './useDrawingOfflineSync';
export type { OfflineDrawing } from './useDrawingOfflineSync';

// Image loading
export { useImageLoader, preloadImages, supportsWebP, supportsAvif } from './useImageLoader';
 
 // Storage monitoring
 export { useStorageQuota } from './useStorageQuota';
