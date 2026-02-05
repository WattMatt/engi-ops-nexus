/**
 * Drawing Register Offline Sync Hook
 * Provides offline-first data management for project drawings
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRecordsByIndex,
  getAllRecords,
  putRecord,
  deleteRecord,
  STORES,
} from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
 import { useConflictDetection } from './useConflictDetection';
 import { ConflictResolution } from '@/lib/conflictResolution';

export interface OfflineDrawing {
  id: string;
  project_id: string;
  drawing_number: string;
  drawing_title: string;
  category: string;
  subcategory?: string | null;
  shop_number?: string | null;
  current_revision?: string | null;
  revision_date?: string | null;
  revision_notes?: string | null;
  issue_date?: string | null;
  status?: string | null;
  notes?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  included_in_handover?: boolean | null;
  visible_to_client?: boolean | null;
  visible_to_contractor?: boolean | null;
  sort_order?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Offline metadata
  synced?: boolean;
  localUpdatedAt?: number;
  syncedAt?: number;
  // Pending file upload info
  pendingFileUpload?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileDataUrl?: string; // Base64 for small files, stored temporarily
  };
}

interface PendingDrawingUpload {
  id: string;
  drawing_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_data_url?: string;
  created_at: string;
}

interface UseDrawingOfflineSyncOptions {
  projectId: string;
  enabled?: boolean;
}

interface UseDrawingOfflineSyncReturn {
  /** Drawings (local + remote merged) */
  drawings: OfflineDrawing[];
  /** Loading state */
  isLoading: boolean;
  /** Whether device is online */
  isOnline: boolean;
  /** Count of unsynced local drawings */
  unsyncedCount: number;
  /** Count of pending file uploads */
  pendingUploadsCount: number;
  /** Save a drawing (works offline) */
  saveDrawing: (drawing: Partial<OfflineDrawing> & { id: string }) => Promise<void>;
  /** Delete a drawing (works offline) */
  deleteDrawing: (id: string) => Promise<void>;
  /** Queue a file for upload when online */
  queueFileUpload: (drawingId: string, file: File) => Promise<void>;
  /** Force refresh from server */
  refreshFromServer: () => Promise<void>;
  /** Sync pending changes */
  syncNow: () => Promise<void>;
}

export function useDrawingOfflineSync({
  projectId,
  enabled = true,
}: UseDrawingOfflineSyncOptions): UseDrawingOfflineSyncReturn {
  const { isConnected } = useNetworkStatus();
  const queryClient = useQueryClient();
   const { syncWithConflictDetection } = useConflictDetection({
     storeName: STORES.PROJECT_DRAWINGS,
     tableName: 'project_drawings',
   });
  
  const [localDrawings, setLocalDrawings] = useState<OfflineDrawing[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [pendingUploadsCount, setPendingUploadsCount] = useState(0);

  // Load local drawings from IndexedDB
  const loadLocalDrawings = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoadingLocal(true);
    try {
      const drawings = await getRecordsByIndex<OfflineDrawing>(
        STORES.PROJECT_DRAWINGS,
        'project_id',
        projectId
      );
      setLocalDrawings(drawings);
      
      // Count unsynced
      const unsynced = drawings.filter(d => !d.synced).length;
      setUnsyncedCount(unsynced);

      // Count pending uploads
      const pendingUploads = await getAllRecords<PendingDrawingUpload>(
        STORES.PENDING_DRAWING_UPLOADS
      );
      setPendingUploadsCount(pendingUploads.length);
    } catch (error) {
      console.error('Failed to load local drawings:', error);
    } finally {
      setIsLoadingLocal(false);
    }
  }, [projectId]);

  // Fetch remote drawings (only when online)
  const { data: remoteDrawings = [], isLoading: isLoadingRemote, refetch: refetchRemote } = useQuery({
    queryKey: ['project-drawings-offline', projectId],
    queryFn: async (): Promise<OfflineDrawing[]> => {
      if (!isConnected) return [];
      
      const { data, error } = await supabase
        .from('project_drawings')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('drawing_number');

      if (error) throw error;
      
      return (data || []).map(drawing => ({
        ...drawing,
        synced: true,
      })) as OfflineDrawing[];
    },
    enabled: enabled && !!projectId && isConnected,
    staleTime: 30000,
  });

  // Merge local and remote drawings
  const mergedDrawings = useMemo((): OfflineDrawing[] => {
    if (!isConnected) {
      return localDrawings;
    }

    const merged = new Map<string, OfflineDrawing>();
    
    // Start with remote
    for (const remote of remoteDrawings) {
      merged.set(remote.id, remote);
    }

    // Overlay local unsynced changes
    for (const local of localDrawings) {
      if (!local.synced) {
        merged.set(local.id, local);
      }
    }

    return Array.from(merged.values());
  }, [localDrawings, remoteDrawings, isConnected]);

  // Save a drawing (offline-first)
  const saveDrawing = useCallback(async (
    drawing: Partial<OfflineDrawing> & { id: string }
  ) => {
    const fullDrawing: OfflineDrawing = {
      project_id: projectId,
      drawing_number: drawing.drawing_number || 'NEW',
      drawing_title: drawing.drawing_title || 'Untitled',
      category: drawing.category || 'other',
      ...drawing,
      updated_at: new Date().toISOString(),
    };

    // Always save locally first
    await putRecord(STORES.PROJECT_DRAWINGS, fullDrawing, true);
    await loadLocalDrawings();

    // If online, also try to sync immediately
    if (isConnected) {
      try {
        const { synced, localUpdatedAt, syncedAt, pendingFileUpload, ...cleanData } = fullDrawing;
        
        const { error } = await supabase
          .from('project_drawings')
          .upsert(cleanData as never);

        if (error) throw error;

        // Mark as synced
        await putRecord(STORES.PROJECT_DRAWINGS, { ...fullDrawing, synced: true }, false);
        await loadLocalDrawings();
        
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ['project-drawings'] });
      } catch (error) {
        console.error('Failed to sync drawing:', error);
        toast.warning('Saved locally - will sync when online');
      }
    } else {
      toast.info('Saved offline - will sync when back online');
    }
  }, [projectId, isConnected, loadLocalDrawings, queryClient]);

  // Delete a drawing (offline-first)
  const deleteDrawing = useCallback(async (id: string) => {
    await deleteRecord(STORES.PROJECT_DRAWINGS, id, true);
    await loadLocalDrawings();

    if (isConnected) {
      try {
        const { error } = await supabase
          .from('project_drawings')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['project-drawings'] });
      } catch (error) {
        console.error('Failed to delete drawing from server:', error);
        toast.warning('Deleted locally - will sync when online');
      }
    } else {
      toast.info('Deleted offline - will sync when back online');
    }
  }, [isConnected, loadLocalDrawings, queryClient]);

  // Queue a file for upload when online
  const queueFileUpload = useCallback(async (drawingId: string, file: File) => {
    // For small files (< 5MB), store as base64 for offline access
    let fileDataUrl: string | undefined;
    if (file.size < 5 * 1024 * 1024) {
      fileDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const pendingUpload: PendingDrawingUpload = {
      id: `pending_${drawingId}_${Date.now()}`,
      drawing_id: drawingId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_data_url: fileDataUrl,
      created_at: new Date().toISOString(),
    };

    await putRecord(STORES.PENDING_DRAWING_UPLOADS, pendingUpload, false);
    await loadLocalDrawings();

    if (!isConnected) {
      toast.info('File queued - will upload when back online');
    }
  }, [isConnected, loadLocalDrawings]);

  // Force refresh from server
  const refreshFromServer = useCallback(async () => {
    if (!isConnected) {
      toast.error('Cannot refresh while offline');
      return;
    }

    await refetchRemote();
    toast.success('Refreshed from server');
  }, [isConnected, refetchRemote]);

  // Sync all pending changes
  const syncNow = useCallback(async () => {
    if (!isConnected) {
      toast.error('Cannot sync while offline');
      return;
    }

    const unsynced = localDrawings.filter(d => !d.synced);
    if (unsynced.length === 0 && pendingUploadsCount === 0) {
      toast.info('No pending changes to sync');
      return;
    }

    let successCount = 0;
    let failCount = 0;
     let conflictCount = 0;

    // Sync drawing metadata
    for (const drawing of unsynced) {
      try {
         // Check for conflicts before syncing
         const result = await syncWithConflictDetection(
           drawing as unknown as { id: string; [key: string]: unknown },
           async (resolution, mergedRecord) => {
             const recordToUpsert = mergedRecord || drawing;
             const { synced, localUpdatedAt, syncedAt, pendingFileUpload, ...cleanData } = recordToUpsert as OfflineDrawing;
             
             const { error } = await supabase
               .from('project_drawings')
               .upsert(cleanData as never);
 
             if (error) throw error;
 
             await putRecord(STORES.PROJECT_DRAWINGS, { ...drawing, synced: true }, false);
           }
         );
 
         if (result.hadConflict) {
           conflictCount++;
         } else if (result.success) {
           // No conflict, proceed with normal sync
           const { synced, localUpdatedAt, syncedAt, pendingFileUpload, ...cleanData } = drawing;
           
           const { error } = await supabase
             .from('project_drawings')
             .upsert(cleanData as never);
 
           if (error) throw error;
 
           await putRecord(STORES.PROJECT_DRAWINGS, { ...drawing, synced: true }, false);
           successCount++;
         }
      } catch (error) {
        console.error('Failed to sync drawing:', drawing.id, error);
        failCount++;
      }
    }

    // Process pending file uploads
    const pendingUploads = await getAllRecords<PendingDrawingUpload>(
      STORES.PENDING_DRAWING_UPLOADS
    );

    for (const upload of pendingUploads) {
      try {
        if (upload.file_data_url) {
          // Convert base64 back to file and upload
          const response = await fetch(upload.file_data_url);
          const blob = await response.blob();
          const file = new File([blob], upload.file_name, { type: upload.file_type });

          // Upload to storage
          const filePath = `${projectId}/${upload.drawing_id}/${Date.now()}_${upload.file_name}`;
          const { error: uploadError } = await supabase.storage
            .from('project-drawings')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('project-drawings')
            .getPublicUrl(filePath);

          // Update drawing record
          await supabase
            .from('project_drawings')
            .update({
              file_url: urlData.publicUrl,
              file_path: filePath,
              file_name: upload.file_name,
              file_size: upload.file_size,
              file_type: upload.file_type,
            })
            .eq('id', upload.drawing_id);

          // Remove from pending queue
          await deleteRecord(STORES.PENDING_DRAWING_UPLOADS, upload.id, false);
          successCount++;
        }
      } catch (error) {
        console.error('Failed to upload file:', upload.id, error);
        failCount++;
      }
    }

    await loadLocalDrawings();
    queryClient.invalidateQueries({ queryKey: ['project-drawings'] });

    if (successCount > 0) {
      toast.success(`Synced ${successCount} item${successCount === 1 ? '' : 's'}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} item${failCount === 1 ? '' : 's'}`);
    }
     if (conflictCount > 0) {
       toast.warning(`${conflictCount} conflict${conflictCount === 1 ? '' : 's'} detected - review required`);
     }
   }, [isConnected, localDrawings, pendingUploadsCount, projectId, loadLocalDrawings, queryClient, syncWithConflictDetection]);

  // Initial load
  useEffect(() => {
    if (projectId) {
      loadLocalDrawings();
    }
  }, [projectId, loadLocalDrawings]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isConnected && (unsyncedCount > 0 || pendingUploadsCount > 0)) {
      syncNow();
    }
  }, [isConnected, unsyncedCount, pendingUploadsCount, syncNow]);

  return {
    drawings: mergedDrawings,
    isLoading: isLoadingLocal || isLoadingRemote,
    isOnline: isConnected,
    unsyncedCount,
    pendingUploadsCount,
    saveDrawing,
    deleteDrawing,
    queueFileUpload,
    refreshFromServer,
    syncNow,
  };
}
