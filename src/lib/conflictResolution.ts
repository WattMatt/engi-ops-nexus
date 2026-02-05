 /**
  * Conflict Resolution Utilities
  * Types and helpers for detecting and resolving sync conflicts
  */
 
 import { StoreName } from './offlineStorage';
 
 /**
  * Resolution strategy for conflicts
  */
 export enum ConflictResolution {
   USE_LOCAL = 'use_local',
   USE_SERVER = 'use_server',
   MERGE = 'merge',
 }
 
 /**
  * A conflict record containing both versions for comparison
  */
 export interface ConflictRecord<T extends Record<string, unknown> = Record<string, unknown>> {
   id: string;
   storeName: StoreName;
   localVersion: T & { localUpdatedAt?: number };
   serverVersion: T & { updated_at: string };
   fieldDiffs: string[];
   detectedAt: number;
 }
 
 /**
  * Field diff information for UI display
  */
 export interface FieldDiff {
   field: string;
   localValue: unknown;
   serverValue: unknown;
 }
 
 /**
  * Ignored fields for diff calculation (metadata fields)
  */
 const IGNORED_FIELDS = [
   'synced',
   'localUpdatedAt',
   'syncedAt',
   'updated_at',
   'created_at',
   'pendingFileUpload',
 ];
 
 /**
  * Detect if there's a conflict between local and server versions
  * Conflict exists if server was updated AFTER the local edit was made
  */
 export function detectConflict(
   localRecord: { localUpdatedAt?: number; [key: string]: unknown },
   serverRecord: { updated_at: string; [key: string]: unknown }
 ): boolean {
   // No conflict if we don't have local timestamp
   if (!localRecord.localUpdatedAt) return false;
 
   const serverUpdatedAt = new Date(serverRecord.updated_at).getTime();
 
   // Conflict if server was updated AFTER we made our local edit
   return serverUpdatedAt > localRecord.localUpdatedAt;
 }
 
 /**
  * Calculate which fields differ between local and server versions
  */
 export function calculateFieldDiffs<T extends Record<string, unknown>>(
   local: T,
   server: T
 ): string[] {
   const diffs: string[] = [];
 
   const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
 
   for (const key of allKeys) {
     if (IGNORED_FIELDS.includes(key)) continue;
 
     const localValue = local[key];
     const serverValue = server[key];
 
     // Compare values (handle objects/arrays)
     if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
       diffs.push(key);
     }
   }
 
   return diffs;
 }
 
 /**
  * Get detailed diff information for UI display
  */
 export function getDetailedDiffs<T extends Record<string, unknown>>(
   local: T,
   server: T
 ): FieldDiff[] {
   const diffFields = calculateFieldDiffs(local, server);
 
   return diffFields.map((field) => ({
     field,
     localValue: local[field],
     serverValue: server[field],
   }));
 }
 
 /**
  * Format a field name for display (snake_case to Title Case)
  */
 export function formatFieldName(field: string): string {
   return field
     .split('_')
     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
     .join(' ');
 }
 
 /**
  * Format a value for display in the comparison UI
  */
 export function formatValueForDisplay(value: unknown): string {
   if (value === null || value === undefined) return '—';
   if (typeof value === 'boolean') return value ? 'Yes' : 'No';
   if (typeof value === 'number') return value.toLocaleString();
   if (typeof value === 'string') {
     // Truncate long strings
     if (value.length > 100) return value.substring(0, 100) + '...';
     return value;
   }
   if (Array.isArray(value)) return `[${value.length} items]`;
   if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
   return String(value);
 }
 
 /**
  * Merge two records, preferring specific field values from either version
  */
 export function mergeRecords<T extends Record<string, unknown>>(
   local: T,
   server: T,
   preferLocal: string[]
 ): T {
   const merged = { ...server } as T;
 
   for (const field of preferLocal) {
     if (field in local) {
       (merged as Record<string, unknown>)[field] = local[field];
     }
   }
 
   // Always use latest timestamp
   (merged as Record<string, unknown>).updated_at = new Date().toISOString();
 
   return merged;
 }