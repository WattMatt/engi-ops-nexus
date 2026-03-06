/**
 * Hook for managing the offline photo upload queue.
 * Queues photos locally when offline, flushes when connectivity returns.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useImageCompression } from '@/hooks/useImageCompression';
import { toast } from 'sonner';
import {
  queuePhoto,
  getQueuedPhotosForPin,
  getAllQueuedPhotos,
  getPendingPhotoCount,
  updateQueuedPhoto,
  removeQueuedPhoto,
  resolveQueuedPhotoBlob,
  type QueuedPhoto,
} from '@/utils/offlinePhotoQueue';

interface UseOfflinePhotoQueueOptions {
  pinId: string;
  projectId: string;
  uploaderName: string;
}

export function useOfflinePhotoQueue({ pinId, projectId, uploaderName }: UseOfflinePhotoQueueOptions) {
  const { isConnected } = useNetworkStatus();
  const { compressImage, isCompressing } = useImageCompression();
  const queryClient = useQueryClient();

  const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // Load queued photos for this pin
  const refreshQueue = useCallback(async () => {
    try {
      const photos = await getQueuedPhotosForPin(pinId);
      setQueuedPhotos(photos.filter(p => p.status !== 'synced'));
      const count = await getPendingPhotoCount();
      setPendingCount(count);
    } catch (err) {
      console.warn('Failed to load photo queue:', err);
    }
  }, [pinId]);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Add a photo — queue if offline, upload directly if online
  const addPhoto = useCallback(async (file: File): Promise<'queued' | 'uploaded'> => {
    const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });

    if (!isConnected) {
      await queuePhoto(compressed, {
        pinId,
        projectId,
        uploaderName,
        fileName: file.name,
      });
      await refreshQueue();
      toast.info('Photo saved offline — will sync when connected');
      return 'queued';
    }

    // Online — upload directly
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${projectId}/${pinId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('defect-photos')
      .upload(path, compressed);
    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase.from('defect_photos').insert({
      pin_id: pinId,
      storage_path: path,
      file_name: file.name,
      file_size: compressed.size,
      uploaded_by_name: uploaderName,
    });
    if (dbError) throw dbError;

    queryClient.invalidateQueries({ queryKey: ['defect-photos', pinId] });
    toast.success('Photo uploaded');
    return 'uploaded';
  }, [isConnected, pinId, projectId, uploaderName, compressImage, queryClient, refreshQueue]);

  // Flush queue — upload all pending photos
  const flushQueue = useCallback(async () => {
    if (syncingRef.current || !isConnected) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const allPending = await getAllQueuedPhotos();
      const pending = allPending.filter(p => p.status === 'pending' || p.status === 'failed');

      if (pending.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return;
      }

      let successCount = 0;

      for (const entry of pending) {
        try {
          await updateQueuedPhoto(entry.id, { status: 'uploading' });

          const blob = await resolveQueuedPhotoBlob(entry);
          const ext = entry.file_name.split('.').pop() || 'jpg';
          const path = `${entry.project_id}/${entry.pin_id}/${Date.now()}_${Math.random().toString(36).substr(2, 4)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('defect-photos')
            .upload(path, blob);
          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase.from('defect_photos').insert({
            pin_id: entry.pin_id,
            storage_path: path,
            file_name: entry.file_name,
            file_size: entry.file_size,
            uploaded_by_name: entry.uploader_name,
            annotation_json: entry.annotation_json || null,
          });
          if (dbError) throw dbError;

          await removeQueuedPhoto(entry.id);
          successCount++;

          // Invalidate per-pin cache
          queryClient.invalidateQueries({ queryKey: ['defect-photos', entry.pin_id] });
        } catch (err: any) {
          console.error(`Failed to sync photo ${entry.id}:`, err);
          await updateQueuedPhoto(entry.id, {
            status: 'failed',
            retry_count: entry.retry_count + 1,
            last_error: err.message,
          });
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} offline photo${successCount > 1 ? 's' : ''} synced`);
      }
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
      await refreshQueue();
    }
  }, [isConnected, queryClient, refreshQueue]);

  // Auto-flush when connectivity returns
  useEffect(() => {
    if (isConnected && pendingCount > 0) {
      flushQueue();
    }
  }, [isConnected, pendingCount, flushQueue]);

  return {
    addPhoto,
    flushQueue,
    queuedPhotos,
    pendingCount,
    isSyncing,
    isCompressing,
    isConnected,
  };
}
