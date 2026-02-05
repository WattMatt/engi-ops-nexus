 /**
  * Storage Quota Monitoring Utilities
  * Tracks IndexedDB and Cache storage usage with threshold warnings
  */
 
 import { getStorageStats, STORES } from './offlineStorage';
 
 // Threshold constants
 export const STORAGE_THRESHOLDS = {
   WARNING: 0.80,    // 80% - Show toast notification
   CRITICAL: 0.90,   // 90% - Show persistent banner
   DANGER: 0.95,     // 95% - Block new offline saves
 } as const;
 
 export type StorageLevel = 'healthy' | 'warning' | 'critical' | 'danger';
 
 export interface StorageBreakdown {
   indexedDB: number;
   caches: number;
   total: number;
   byStore: Record<string, { count: number; estimatedSize: number }>;
 }
 
 export interface StorageQuotaInfo {
   usage: number;
   quota: number;
   percentage: number;
   level: StorageLevel;
   breakdown: StorageBreakdown;
   isPersisted: boolean;
 }
 
 // Average bytes per record type (estimated from typical data)
 const BYTES_PER_RECORD: Record<string, number> = {
   [STORES.SITE_DIARY_ENTRIES]: 2000,
   [STORES.SITE_DIARY_TASKS]: 500,
   [STORES.HANDOVER_DOCUMENTS]: 1500,
   [STORES.HANDOVER_FOLDERS]: 300,
   [STORES.PENDING_UPLOADS]: 50000, // Includes file data
   [STORES.SYNC_QUEUE]: 1000,
   [STORES.CACHED_DATA]: 5000,
   [STORES.CABLE_ENTRIES]: 600,
   [STORES.CABLE_SCHEDULES]: 400,
   [STORES.BUDGET_SECTIONS]: 500,
   [STORES.BUDGET_LINE_ITEMS]: 400,
   [STORES.PROJECT_DRAWINGS]: 800,
   [STORES.PENDING_DRAWING_UPLOADS]: 100000, // Large - includes base64 file data
 };
 
 /**
  * Format bytes to human-readable string
  */
 export function formatStorageSize(bytes: number): string {
   if (bytes === 0) return '0 B';
   const k = 1024;
   const sizes = ['B', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
 }
 
 /**
  * Get storage level based on percentage
  */
 export function getStorageLevel(percentage: number): StorageLevel {
   if (percentage >= STORAGE_THRESHOLDS.DANGER * 100) return 'danger';
   if (percentage >= STORAGE_THRESHOLDS.CRITICAL * 100) return 'critical';
   if (percentage >= STORAGE_THRESHOLDS.WARNING * 100) return 'warning';
   return 'healthy';
 }
 
 /**
  * Get color class for storage level
  */
 export function getStorageLevelColor(level: StorageLevel): string {
   switch (level) {
     case 'danger': return 'text-destructive';
     case 'critical': return 'text-orange-500';
     case 'warning': return 'text-yellow-500';
     default: return 'text-green-500';
   }
 }
 
 /**
  * Get background color class for storage level
  */
 export function getStorageLevelBgColor(level: StorageLevel): string {
   switch (level) {
     case 'danger': return 'bg-destructive/10 border-destructive';
     case 'critical': return 'bg-orange-500/10 border-orange-500';
     case 'warning': return 'bg-yellow-500/10 border-yellow-500';
     default: return 'bg-green-500/10 border-green-500';
   }
 }
 
 /**
  * Get storage quota estimate from browser
  */
 export async function getStorageQuota(): Promise<StorageQuotaInfo> {
   let usage = 0;
   let quota = 0;
   let isPersisted = false;
 
   // Get browser storage estimate
   if ('storage' in navigator && 'estimate' in navigator.storage) {
     try {
       const estimate = await navigator.storage.estimate();
       usage = estimate.usage || 0;
       quota = estimate.quota || 0;
     } catch (error) {
       console.warn('Failed to get storage estimate:', error);
     }
   }
 
   // Check if storage is persisted
   if ('storage' in navigator && 'persisted' in navigator.storage) {
     try {
       isPersisted = await navigator.storage.persisted();
     } catch {
       // Ignore
     }
   }
 
   // Get breakdown by store
   const breakdown = await getStorageBreakdown();
 
   // Calculate percentage
   const percentage = quota > 0 ? (usage / quota) * 100 : 0;
   const level = getStorageLevel(percentage);
 
   return {
     usage,
     quota,
     percentage,
     level,
     breakdown,
     isPersisted,
   };
 }
 
 /**
  * Get detailed storage breakdown by store
  */
 export async function getStorageBreakdown(): Promise<StorageBreakdown> {
   const byStore: Record<string, { count: number; estimatedSize: number }> = {};
   let indexedDBTotal = 0;
   let cachesTotal = 0;
 
   try {
     // Get IndexedDB stats
     const stats = await getStorageStats();
     
     for (const [storeName, count] of Object.entries(stats.storeStats)) {
       const bytesPerRecord = BYTES_PER_RECORD[storeName] || 500;
       const estimatedSize = count * bytesPerRecord;
       byStore[storeName] = { count, estimatedSize };
       indexedDBTotal += estimatedSize;
     }
   } catch (error) {
     console.warn('Failed to get IndexedDB stats:', error);
   }
 
   // Estimate cache storage
   if ('caches' in window) {
     try {
       const cacheNames = await caches.keys();
       // Rough estimate: 50KB per cached resource, assume 50 resources per cache
       cachesTotal = cacheNames.length * 50 * 50000;
     } catch {
       // Ignore
     }
   }
 
   return {
     indexedDB: indexedDBTotal,
     caches: cachesTotal,
     total: indexedDBTotal + cachesTotal,
     byStore,
   };
 }
 
 /**
  * Request persistent storage from browser
  */
 export async function requestPersistentStorage(): Promise<boolean> {
   if ('storage' in navigator && 'persist' in navigator.storage) {
     try {
       return await navigator.storage.persist();
     } catch {
       return false;
     }
   }
   return false;
 }
 
 /**
  * Check if we should block new offline saves (at danger level)
  */
 export function shouldBlockOfflineSaves(level: StorageLevel): boolean {
   return level === 'danger';
 }
 
 /**
  * Get warning key for localStorage (to track shown warnings)
  */
 function getWarningKey(level: StorageLevel): string {
   return `storage-warning-shown-${level}-${new Date().toDateString()}`;
 }
 
 /**
  * Check if warning has been shown today for this level
  */
 export function hasShownWarningToday(level: StorageLevel): boolean {
   return localStorage.getItem(getWarningKey(level)) === 'true';
 }
 
 /**
  * Mark warning as shown for today
  */
 export function markWarningShown(level: StorageLevel): void {
   localStorage.setItem(getWarningKey(level), 'true');
 }
 
 /**
  * Get human-readable store name
  */
 export function getStoreDisplayName(storeName: string): string {
   const displayNames: Record<string, string> = {
     [STORES.SITE_DIARY_ENTRIES]: 'Site Diaries',
     [STORES.SITE_DIARY_TASKS]: 'Diary Tasks',
     [STORES.HANDOVER_DOCUMENTS]: 'Handover Docs',
     [STORES.HANDOVER_FOLDERS]: 'Handover Folders',
     [STORES.PENDING_UPLOADS]: 'Pending Uploads',
     [STORES.SYNC_QUEUE]: 'Sync Queue',
     [STORES.CACHED_DATA]: 'Cached Data',
     [STORES.CABLE_ENTRIES]: 'Cable Entries',
     [STORES.CABLE_SCHEDULES]: 'Cable Schedules',
     [STORES.BUDGET_SECTIONS]: 'Budget Sections',
     [STORES.BUDGET_LINE_ITEMS]: 'Budget Items',
     [STORES.PROJECT_DRAWINGS]: 'Drawings',
     [STORES.PENDING_DRAWING_UPLOADS]: 'Pending Drawing Uploads',
   };
   return displayNames[storeName] || storeName;
 }