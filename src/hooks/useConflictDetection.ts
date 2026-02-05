 /**
  * Conflict Detection Hook
  * Wraps sync operations to detect conflicts before upserting
  */
 
 import { useCallback } from 'react';
 import { useConflictContext } from '@/contexts/ConflictContext';
 import {
   ConflictRecord,
   ConflictResolution,
   detectConflict,
   calculateFieldDiffs,
   mergeRecords,
 } from '@/lib/conflictResolution';
 import { StoreName } from '@/lib/offlineStorage';
 import { supabase } from '@/integrations/supabase/client';
 
 type TableName = 'cable_entries' | 'budget_line_items' | 'project_drawings';
 
 interface UseConflictDetectionOptions {
   storeName: StoreName;
   tableName: TableName;
 }
 
 interface SyncResult {
   success: boolean;
   hadConflict: boolean;
   error?: Error;
 }
 
 interface LocalRecord {
   id: string;
   updated_at?: string;
   localUpdatedAt?: number;
   [key: string]: unknown;
 }
 
 interface ServerRecord {
   id: string;
   updated_at: string;
   [key: string]: unknown;
 }
 
 export function useConflictDetection({ storeName, tableName }: UseConflictDetectionOptions) {
   const { addConflict, setResolutionCallback } = useConflictContext();
 
   /**
    * Check for conflicts and sync a record
    * Returns a promise that resolves when sync is complete (including after conflict resolution)
    */
   const syncWithConflictDetection = useCallback(
     async (
       localRecord: LocalRecord,
       onResolved?: (resolution: ConflictResolution, mergedRecord?: LocalRecord) => Promise<void>
     ): Promise<SyncResult> => {
       try {
         // Fetch server version
         const { data: serverData, error: fetchError } = await supabase
           .from(tableName)
           .select('*')
           .eq('id', localRecord.id)
           .single();
 
         // If record doesn't exist on server, no conflict possible
         if (fetchError?.code === 'PGRST116' || !serverData) {
           return { success: true, hadConflict: false };
         }
 
         if (fetchError) {
           throw fetchError;
         }
 
         const serverRecord = serverData as ServerRecord;
 
         // Check for conflict
         const hasConflict = detectConflict(localRecord, serverRecord);
 
         if (!hasConflict) {
           return { success: true, hadConflict: false };
         }
 
         // Calculate field differences
         const fieldDiffs = calculateFieldDiffs(localRecord, serverRecord);
 
         // If no actual differences, no conflict
         if (fieldDiffs.length === 0) {
           return { success: true, hadConflict: false };
         }
 
         // Create conflict record
         const conflict: ConflictRecord = {
           id: localRecord.id,
           storeName,
           localVersion: localRecord,
           serverVersion: serverRecord,
           fieldDiffs,
           detectedAt: Date.now(),
         };
 
         // Set up resolution callback
         setResolutionCallback(
           async (id: string, resolution: ConflictResolution, mergedFields?: string[]) => {
             if (id !== localRecord.id) return;
 
             let finalRecord: LocalRecord;
 
             switch (resolution) {
               case ConflictResolution.USE_LOCAL:
                 finalRecord = localRecord;
                 break;
 
               case ConflictResolution.USE_SERVER:
                 finalRecord = serverRecord;
                 break;
 
               case ConflictResolution.MERGE:
                 finalRecord = mergeRecords(
                   localRecord,
                   serverRecord,
                   mergedFields || []
                 );
                 break;
 
               default:
                 finalRecord = localRecord;
             }
 
             // Call the resolution handler
             if (onResolved) {
               await onResolved(resolution, finalRecord);
             }
           }
         );
 
         // Add conflict to queue (will show dialog)
         addConflict(conflict);
 
         return { success: false, hadConflict: true };
       } catch (error) {
         console.error('Error during conflict detection:', error);
         return {
           success: false,
           hadConflict: false,
           error: error instanceof Error ? error : new Error(String(error)),
         };
       }
     },
     [storeName, tableName, addConflict, setResolutionCallback]
   );
 
   return {
     syncWithConflictDetection,
   };
 }