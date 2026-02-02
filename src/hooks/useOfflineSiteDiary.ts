/**
 * Offline-First Site Diary Hook
 * Provides offline-capable CRUD operations for site diary entries
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
type SiteDiaryEntryRow = Database['public']['Tables']['site_diary_entries']['Row'];
type SiteDiaryEntryInsert = Database['public']['Tables']['site_diary_entries']['Insert'];
type SiteDiaryTaskRow = Database['public']['Tables']['site_diary_tasks']['Row'];
type SiteDiaryTaskInsert = Database['public']['Tables']['site_diary_tasks']['Insert'];

// Extended types with offline metadata
interface SiteDiaryEntry extends SiteDiaryEntryRow {
  synced?: boolean;
  localUpdatedAt?: number;
}

interface SiteDiaryTask extends SiteDiaryTaskRow {
  synced?: boolean;
  localUpdatedAt?: number;
}

interface UseOfflineSiteDiaryOptions {
  projectId: string;
  enabled?: boolean;
}

interface UseOfflineSiteDiaryReturn {
  // Entries
  entries: SiteDiaryEntry[];
  isLoadingEntries: boolean;
  createEntry: (entry: SiteDiaryEntryInsert) => Promise<SiteDiaryEntry>;
  updateEntry: (id: string, updates: Partial<SiteDiaryEntryRow>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  
  // Tasks
  tasks: SiteDiaryTask[];
  isLoadingTasks: boolean;
  createTask: (task: SiteDiaryTaskInsert) => Promise<SiteDiaryTask>;
  updateTask: (id: string, updates: Partial<SiteDiaryTaskRow>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Offline status
  isOnline: boolean;
  pendingChanges: number;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useOfflineSiteDiary({
  projectId,
  enabled = true,
}: UseOfflineSiteDiaryOptions): UseOfflineSiteDiaryReturn {
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

  // Fetch entries with offline fallback
  const { data: entries = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ['site-diary-entries', projectId],
    queryFn: async (): Promise<SiteDiaryEntry[]> => {
      // Try to fetch from server first
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('site_diary_entries')
            .select('*')
            .eq('project_id', projectId)
            .order('entry_date', { ascending: false });

          if (error) throw error;

          // Cache to IndexedDB
          for (const entry of data || []) {
            await putRecord(STORES.SITE_DIARY_ENTRIES, { ...entry, synced: true }, false);
          }

          // Also cache the query result
          await cacheData(`site-diary-entries-${projectId}`, data, 1000 * 60 * 30); // 30 min

          return (data || []) as SiteDiaryEntry[];
        } catch (error) {
          console.error('Failed to fetch entries from server:', error);
        }
      }

      // Fallback to IndexedDB
      const cached = await getCachedData<SiteDiaryEntry[]>(`site-diary-entries-${projectId}`);
      if (cached) return cached;

      // Get from IndexedDB directly
      const offlineEntries = await getRecordsByIndex<SiteDiaryEntry>(
        STORES.SITE_DIARY_ENTRIES,
        'project_id',
        projectId
      );
      
      return offlineEntries.sort((a, b) => 
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch tasks with offline fallback
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['site-diary-tasks', projectId],
    queryFn: async (): Promise<SiteDiaryTask[]> => {
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('site_diary_tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Cache to IndexedDB
          for (const task of data || []) {
            await putRecord(STORES.SITE_DIARY_TASKS, { ...task, synced: true }, false);
          }

          await cacheData(`site-diary-tasks-${projectId}`, data, 1000 * 60 * 30);

          return (data || []) as SiteDiaryTask[];
        } catch (error) {
          console.error('Failed to fetch tasks from server:', error);
        }
      }

      // Fallback to IndexedDB
      const cached = await getCachedData<SiteDiaryTask[]>(`site-diary-tasks-${projectId}`);
      if (cached) return cached;

      return getRecordsByIndex<SiteDiaryTask>(
        STORES.SITE_DIARY_TASKS,
        'project_id',
        projectId
      );
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (entry: SiteDiaryEntryInsert): Promise<SiteDiaryEntry> => {
      const newEntry: SiteDiaryEntry = {
        ...entry,
        id: entry.id || crypto.randomUUID(),
        created_at: entry.created_at || new Date().toISOString(),
        updated_at: entry.updated_at || new Date().toISOString(),
        attachments: entry.attachments ?? null,
        attendees: entry.attendees ?? null,
        delays_disruptions: entry.delays_disruptions ?? null,
        deliveries: entry.deliveries ?? null,
        design_decisions: entry.design_decisions ?? null,
        entry_type: entry.entry_type ?? null,
        instructions_issued: entry.instructions_issued ?? null,
        instructions_received: entry.instructions_received ?? null,
        linked_documents: entry.linked_documents ?? null,
        meeting_minutes: entry.meeting_minutes ?? null,
        notes: entry.notes ?? null,
        photos: entry.photos ?? null,
        plant_equipment: entry.plant_equipment ?? null,
        quality_issues: entry.quality_issues ?? null,
        queries: entry.queries ?? null,
        safety_observations: entry.safety_observations ?? null,
        shift_type: entry.shift_type ?? null,
        site_progress: entry.site_progress ?? null,
        sub_entries: entry.sub_entries ?? null,
        visitors: entry.visitors ?? null,
        weather_conditions: entry.weather_conditions ?? null,
        workforce_details: entry.workforce_details ?? null,
      };

      // Save to IndexedDB (will be synced later if offline)
      await putRecord(STORES.SITE_DIARY_ENTRIES, newEntry);

      // Try to save to server if online
      if (navigator.onLine) {
        const { synced, localUpdatedAt, ...serverData } = newEntry;
        const { error } = await supabase.from('site_diary_entries').insert(serverData);
        if (error) {
          console.error('Failed to save to server:', error);
          toast.info('Saved offline. Will sync when connected.');
        }
      } else {
        toast.info('Saved offline. Will sync when connected.');
      }

      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diary-entries', projectId] });
    },
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SiteDiaryEntryRow> }) => {
      const existing = entries.find(e => e.id === id);
      if (!existing) throw new Error('Entry not found');

      const updated: SiteDiaryEntry = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await putRecord(STORES.SITE_DIARY_ENTRIES, updated);

      if (navigator.onLine) {
        const { synced, localUpdatedAt, ...serverData } = updated;
        const { error } = await supabase
          .from('site_diary_entries')
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
      queryClient.invalidateQueries({ queryKey: ['site-diary-entries', projectId] });
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteOfflineRecord(STORES.SITE_DIARY_ENTRIES, id);

      if (navigator.onLine) {
        const { error } = await supabase
          .from('site_diary_entries')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.error('Failed to delete on server:', error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diary-entries', projectId] });
    },
  });

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: async (task: SiteDiaryTaskInsert): Promise<SiteDiaryTask> => {
      const newTask: SiteDiaryTask = {
        ...task,
        id: task.id || crypto.randomUUID(),
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString(),
        actual_hours: task.actual_hours ?? null,
        assigned_to: task.assigned_to ?? null,
        completion_date: task.completion_date ?? null,
        dependencies: task.dependencies ?? null,
        description: task.description ?? null,
        diary_entry_id: task.diary_entry_id ?? null,
        due_date: task.due_date ?? null,
        estimated_hours: task.estimated_hours ?? null,
        group_id: task.group_id ?? null,
        position: task.position ?? null,
        priority: task.priority ?? 'medium',
        progress: task.progress ?? null,
        roadmap_item_id: task.roadmap_item_id ?? null,
        start_date: task.start_date ?? null,
        status: task.status ?? 'pending',
        time_tracked_hours: task.time_tracked_hours ?? null,
        view_type: task.view_type ?? null,
      };

      await putRecord(STORES.SITE_DIARY_TASKS, newTask);

      if (navigator.onLine) {
        const { synced, localUpdatedAt, ...serverData } = newTask;
        const { error } = await supabase.from('site_diary_tasks').insert(serverData);
        if (error) {
          toast.info('Saved offline. Will sync when connected.');
        }
      } else {
        toast.info('Saved offline. Will sync when connected.');
      }

      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diary-tasks', projectId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SiteDiaryTaskRow> }) => {
      const existing = tasks.find(t => t.id === id);
      if (!existing) throw new Error('Task not found');

      const updated: SiteDiaryTask = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await putRecord(STORES.SITE_DIARY_TASKS, updated);

      if (navigator.onLine) {
        const { synced, localUpdatedAt, ...serverData } = updated;
        const { error } = await supabase
          .from('site_diary_tasks')
          .update(serverData)
          .eq('id', id);
          
        if (error) {
          toast.info('Saved offline. Will sync when connected.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diary-tasks', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteOfflineRecord(STORES.SITE_DIARY_TASKS, id);

      if (navigator.onLine) {
        await supabase.from('site_diary_tasks').delete().eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-diary-tasks', projectId] });
    },
  });

  // Count pending changes
  useEffect(() => {
    const countPending = async () => {
      const allEntries = await getAllRecords<SiteDiaryEntry>(STORES.SITE_DIARY_ENTRIES);
      const allTasks = await getAllRecords<SiteDiaryTask>(STORES.SITE_DIARY_TASKS);
      
      const unsyncedEntries = allEntries.filter(e => e.synced === false).length;
      const unsyncedTasks = allTasks.filter(t => t.synced === false).length;
      
      setPendingChanges(unsyncedEntries + unsyncedTasks);
    };

    countPending();
  }, [entries, tasks]);

  // Refresh function
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['site-diary-entries', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['site-diary-tasks', projectId] });
  }, [queryClient, projectId]);

  return {
    entries,
    isLoadingEntries,
    createEntry: createEntryMutation.mutateAsync,
    updateEntry: (id, updates) => updateEntryMutation.mutateAsync({ id, updates }),
    deleteEntry: deleteEntryMutation.mutateAsync,
    
    tasks,
    isLoadingTasks,
    createTask: createTaskMutation.mutateAsync,
    updateTask: (id, updates) => updateTaskMutation.mutateAsync({ id, updates }),
    deleteTask: deleteTaskMutation.mutateAsync,
    
    isOnline,
    pendingChanges,
    refresh,
  };
}
