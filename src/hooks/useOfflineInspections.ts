import { useCallback } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { offlineDB } from '@/services/db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InspectionData {
  title: string;
  description?: string | null;
  status: string;
  inspection_date?: string | null;
  site_id: string;
  inspector_id?: string;
}

export interface OfflineInspection extends InspectionData {
  id: string;
  created_at: string;
  synced: boolean;
  [key: string]: any;
}

// File limits (20MB for images)
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; 

const validateFile = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`File size exceeds limit of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
        return false;
    }
    if (!file.type.startsWith('image/')) {
        toast.error("Only image files are allowed");
        return false;
    }
    return true;
};

const checkStorageAvailable = async (bytesToAdd: number) => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const { usage, quota } = await navigator.storage.estimate();
            if (usage && quota) {
                if (usage + bytesToAdd > quota) {
                    toast.error("Not enough storage space available on device");
                    return false;
                }
            }
        } catch (e) {
            console.warn("Storage estimate failed", e);
        }
    }
    return true;
};

export function useOfflineInspections() {
  const { isOnline, queueMutation } = useOfflineSync();

  const createInspection = useCallback(async (data: InspectionData) => {
    const inspectionId = `offline_${Date.now()}_${Math.random()}`;
    const inspectionData = {
      id: inspectionId,
      ...data,
      created_at: new Date().toISOString(),
      synced: false
    };

    if (isOnline) {
      // Try online creation first
      try {
        const { data: created, error } = await (supabase
          .from('inspections' as any) as any)
          .insert([inspectionData])
          .select()
          .single();

        if (error) throw error;
        toast.success('Inspection created successfully');
        return created;
      } catch (error) {
        console.error('Online creation failed, falling back to offline:', error);
        // Fall through to offline mode
      }
    }

    // Offline mode
    await offlineDB.saveInspection(inspectionData as any);

    queueMutation('CREATE_INSPECTION', inspectionData);
    toast.success('Inspection saved offline. Will sync when online.');
    return inspectionData;
  }, [isOnline, queueMutation]);

  const updateInspection = useCallback(async (id: string, updates: Partial<InspectionData>) => {
    if (isOnline) {
      try {
        const { error } = await (supabase
          .from('inspections' as any) as any)
          .update(updates)
          .eq('id', id);

        if (error) throw error;
        toast.success('Inspection updated successfully');
        return;
      } catch (error) {
        console.error('Online update failed, falling back to offline:', error);
      }
    }

    // Offline mode - update IDB
    const existing = await offlineDB.getInspection(id);
    if (existing) {
        await offlineDB.saveInspection({ ...existing, ...updates, synced: false });
    }

    queueMutation('UPDATE_INSPECTION', { id, ...updates });
    toast.success('Changes saved offline. Will sync when online.');
  }, [isOnline, queueMutation]);

  const deleteInspection = useCallback(async (id: string) => {
    if (isOnline) {
      try {
        const { error } = await (supabase
          .from('inspections' as any) as any)
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Inspection deleted successfully');
        return;
      } catch (error) {
        console.error('Online deletion failed, falling back to offline:', error);
      }
    }

    // Offline mode
    await offlineDB.deleteInspection(id);
    queueMutation('DELETE_INSPECTION', { id });
    toast.success('Deletion queued. Will sync when online.');
  }, [isOnline, queueMutation]);

  const uploadImage = useCallback(async (
    bucket: string,
    path: string,
    file: File,
    inspectionId?: string
  ) => {
    
    if (!validateFile(file)) return;

    const hasSpace = await checkStorageAvailable(file.size);
    if (!hasSpace) return;

    if (isOnline) {
      try {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file);

        if (error) throw error;
        toast.success('Image uploaded successfully');
        return;
      } catch (error) {
        console.error('Online upload failed, falling back to offline:', error);
      }
    }

    // Offline mode - save to IndexedDB
    const imageId = `offline_img_${Date.now()}_${Math.random()}`;
    await offlineDB.saveImage({
      id: imageId,
      inspection_id: inspectionId || '',
      blob: file,
      file_name: file.name,
      created_at: new Date().toISOString(),
      synced: false,
    });

    // Queue with the ID so sync can retrieve the blob
    queueMutation('UPLOAD_IMAGE', { bucket, path, inspectionId, imageId });
    toast.success('Image saved offline. Will upload when online.');
  }, [isOnline, queueMutation]);

  return {
    createInspection,
    updateInspection,
    deleteInspection,
    uploadImage,
    isOnline,
  };
}
