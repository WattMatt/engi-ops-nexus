/**
 * Offline-First Handover Documents Hook
 * Provides offline-capable access to handover documents and folders
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getRecordsByIndex,
  getAllRecords,
  putRecord,
  deleteRecord as deleteOfflineRecord,
  cacheData,
  getCachedData,
  STORES,
} from '@/lib/offlineStorage';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Use types from Supabase schema
type HandoverDocumentRow = Database['public']['Tables']['handover_documents']['Row'];
type HandoverDocumentInsert = Database['public']['Tables']['handover_documents']['Insert'];
type HandoverFolderRow = Database['public']['Tables']['handover_folders']['Row'];
type HandoverFolderInsert = Database['public']['Tables']['handover_folders']['Insert'];

// Extended types with offline metadata
interface HandoverDocument extends HandoverDocumentRow {
  synced?: boolean;
  localUpdatedAt?: number;
}

interface HandoverFolder extends HandoverFolderRow {
  synced?: boolean;
  localUpdatedAt?: number;
}

interface UseOfflineHandoverOptions {
  projectId: string;
  tenantId?: string;
  enabled?: boolean;
}

interface UseOfflineHandoverReturn {
  // Documents
  documents: HandoverDocument[];
  isLoadingDocuments: boolean;
  getDocumentsByFolder: (folderId?: string | null) => HandoverDocument[];
  updateDocument: (id: string, updates: Partial<HandoverDocumentRow>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  
  // Folders
  folders: HandoverFolder[];
  isLoadingFolders: boolean;
  createFolder: (folder: HandoverFolderInsert) => Promise<HandoverFolder>;
  updateFolder: (id: string, updates: Partial<HandoverFolderRow>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  getFolderPath: (folderId: string) => HandoverFolder[];
  
  // Offline status
  isOnline: boolean;
  pendingChanges: number;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useOfflineHandover({
  projectId,
  tenantId,
  enabled = true,
}: UseOfflineHandoverOptions): UseOfflineHandoverReturn {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch documents with offline fallback
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['handover-documents', projectId, tenantId],
    queryFn: async (): Promise<HandoverDocument[]> => {
      const cacheKey = `handover-docs-${projectId}-${tenantId || 'all'}`;
      
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('handover_documents')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Cache to IndexedDB
          for (const doc of data || []) {
            await putRecord(STORES.HANDOVER_DOCUMENTS, { ...doc, synced: true }, false);
          }

          await cacheData(cacheKey, data, 1000 * 60 * 30);

          return (data || []) as HandoverDocument[];
        } catch (error) {
          console.error('Failed to fetch documents from server:', error);
        }
      }

      // Fallback to IndexedDB
      const cached = await getCachedData<HandoverDocument[]>(cacheKey);
      if (cached) return cached;

      const offlineDocs = await getRecordsByIndex<HandoverDocument>(
        STORES.HANDOVER_DOCUMENTS,
        'project_id',
        projectId
      );

      return offlineDocs.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch folders with offline fallback
  const { data: folders = [], isLoading: isLoadingFolders } = useQuery({
    queryKey: ['handover-folders', projectId, tenantId],
    queryFn: async (): Promise<HandoverFolder[]> => {
      const cacheKey = `handover-folders-${projectId}-${tenantId || 'all'}`;

      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('handover_folders')
            .select('*')
            .eq('project_id', projectId)
            .order('folder_name', { ascending: true });

          if (error) throw error;

          // Cache to IndexedDB
          for (const folder of data || []) {
            await putRecord(STORES.HANDOVER_FOLDERS, { ...folder, synced: true }, false);
          }

          await cacheData(cacheKey, data, 1000 * 60 * 30);

          return (data || []) as HandoverFolder[];
        } catch (error) {
          console.error('Failed to fetch folders from server:', error);
        }
      }

      // Fallback to IndexedDB
      const cached = await getCachedData<HandoverFolder[]>(cacheKey);
      if (cached) return cached;

      const offlineFolders = await getRecordsByIndex<HandoverFolder>(
        STORES.HANDOVER_FOLDERS,
        'project_id',
        projectId
      );

      return offlineFolders.sort((a, b) => a.folder_name.localeCompare(b.folder_name));
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  // Get documents by folder
  const getDocumentsByFolder = useCallback((folderId?: string | null) => {
    return documents.filter(d => d.folder_id === folderId);
  }, [documents]);

  // Get folder path (breadcrumb)
  const getFolderPath = useCallback((folderId: string): HandoverFolder[] => {
    const path: HandoverFolder[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_folder_id;
      } else {
        break;
      }
    }

    return path;
  }, [folders]);

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HandoverDocumentRow> }) => {
      const existing = documents.find(d => d.id === id);
      if (!existing) throw new Error('Document not found');

      const updated: HandoverDocument = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await putRecord(STORES.HANDOVER_DOCUMENTS, updated);

      if (navigator.onLine) {
        const { synced, localUpdatedAt, ...serverData } = updated;
        const { error } = await supabase
          .from('handover_documents')
          .update(serverData)
          .eq('id', id);
          
        if (error) {
          toast.info('Saved offline. Will sync when connected.');
        }
      } else {
        toast.info('Saved offline. Will sync when connected.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-documents', projectId, tenantId] });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteOfflineRecord(STORES.HANDOVER_DOCUMENTS, id);

      if (navigator.onLine) {
        await supabase.from('handover_documents').delete().eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-documents', projectId, tenantId] });
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folder: HandoverFolderInsert): Promise<HandoverFolder> => {
      const newFolder: HandoverFolder = {
        ...folder,
        id: folder.id || crypto.randomUUID(),
        created_at: folder.created_at || new Date().toISOString(),
        updated_at: folder.updated_at || new Date().toISOString(),
        created_by: folder.created_by ?? null,
        folder_path: folder.folder_path ?? null,
        parent_folder_id: folder.parent_folder_id ?? null,
      };

      await putRecord(STORES.HANDOVER_FOLDERS, newFolder);

      if (navigator.onLine) {
        const { synced, localUpdatedAt, ...serverData } = newFolder;
        const { error } = await supabase.from('handover_folders').insert(serverData);
        if (error) {
          toast.info('Saved offline. Will sync when connected.');
        }
      } else {
        toast.info('Saved offline. Will sync when connected.');
      }

      return newFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-folders', projectId, tenantId] });
    },
  });

  // Update folder mutation
  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HandoverFolderRow> }) => {
      const existing = folders.find(f => f.id === id);
      if (!existing) throw new Error('Folder not found');

      const updated: HandoverFolder = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await putRecord(STORES.HANDOVER_FOLDERS, updated);

      if (navigator.onLine) {
        const { synced, localUpdatedAt, ...serverData } = updated;
        const { error } = await supabase
          .from('handover_folders')
          .update(serverData)
          .eq('id', id);
          
        if (error) {
          toast.info('Saved offline. Will sync when connected.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-folders', projectId, tenantId] });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteOfflineRecord(STORES.HANDOVER_FOLDERS, id);

      if (navigator.onLine) {
        await supabase.from('handover_folders').delete().eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-folders', projectId, tenantId] });
    },
  });

  // Count pending changes
  useEffect(() => {
    const countPending = async () => {
      const allDocs = await getAllRecords<HandoverDocument>(STORES.HANDOVER_DOCUMENTS);
      const allFolders = await getAllRecords<HandoverFolder>(STORES.HANDOVER_FOLDERS);
      
      const unsyncedDocs = allDocs.filter(d => d.synced === false).length;
      const unsyncedFolders = allFolders.filter(f => f.synced === false).length;
      
      setPendingChanges(unsyncedDocs + unsyncedFolders);
    };

    countPending();
  }, [documents, folders]);

  // Refresh function
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['handover-documents', projectId, tenantId] });
    await queryClient.invalidateQueries({ queryKey: ['handover-folders', projectId, tenantId] });
  }, [queryClient, projectId, tenantId]);

  return {
    documents,
    isLoadingDocuments,
    getDocumentsByFolder,
    updateDocument: (id, updates) => updateDocumentMutation.mutateAsync({ id, updates }),
    deleteDocument: deleteDocumentMutation.mutateAsync,
    
    folders,
    isLoadingFolders,
    createFolder: createFolderMutation.mutateAsync,
    updateFolder: (id, updates) => updateFolderMutation.mutateAsync({ id, updates }),
    deleteFolder: deleteFolderMutation.mutateAsync,
    getFolderPath,
    
    isOnline,
    pendingChanges,
    refresh,
  };
}
