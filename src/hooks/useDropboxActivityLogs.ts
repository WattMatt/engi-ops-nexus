import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface DropboxActivityLog {
  id: string;
  user_id: string;
  action: string;
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  status: string;
  error_message: string | null;
  metadata: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ActivityLogFilters {
  action?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export function useDropboxActivityLogs() {
  const [logs, setLogs] = useState<DropboxActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchLogs = useCallback(async (
    filters: ActivityLogFilters = {},
    page: number = 1,
    pageSize: number = 50
  ) => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('dropbox_activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.searchTerm) {
        query = query.or(`file_path.ilike.%${filters.searchTerm}%,file_name.ilike.%${filters.searchTerm}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getActivityStats = useCallback(async (days: number = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('dropbox_activity_logs')
        .select('action, status')
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw error;
      }

      // Calculate stats
      const stats = {
        total: data?.length || 0,
        uploads: data?.filter(l => l.action === 'upload').length || 0,
        downloads: data?.filter(l => l.action === 'download').length || 0,
        deletes: data?.filter(l => l.action === 'delete').length || 0,
        folders_created: data?.filter(l => l.action === 'create_folder').length || 0,
        successful: data?.filter(l => l.status === 'success').length || 0,
        failed: data?.filter(l => l.status === 'failed').length || 0
      };

      return stats;
    } catch (error) {
      console.error('Failed to get activity stats:', error);
      return null;
    }
  }, []);

  return {
    logs,
    isLoading,
    totalCount,
    fetchLogs,
    getActivityStats
  };
}
