/**
 * Hook for managing load profiles and syncing with external wm-solar app
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LoadProfile {
  id: string;
  project_id: string;
  document_id: string | null;
  name: string;
  description: string | null;
  profile_type: string;
  is_synced_to_external: boolean;
  external_profile_id: string | null;
  last_sync_at: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export interface MeterShopLinkage {
  id: string;
  profile_id: string;
  project_id: string;
  meter_id: string;
  meter_name: string | null;
  meter_type: string | null;
  shop_number: string | null;
  shop_name: string | null;
  shop_category: string | null;
  connected_load_kva: number;
  max_demand_kva: number;
  power_factor: number;
  diversity_factor: number;
  notes: string | null;
  is_active: boolean;
  external_linkage_id: string | null;
}

export interface LoadCategorySummary {
  id: string;
  profile_id: string;
  category_name: string;
  category_code: string | null;
  total_area_sqm: number;
  total_connected_load_kva: number;
  max_demand_kva: number;
  va_per_sqm: number;
  shop_count: number;
  diversity_factor: number;
  color_code: string | null;
  display_order: number;
}

export interface LoadProfileReading {
  id: string;
  profile_id: string;
  linkage_id: string | null;
  reading_date: string;
  reading_hour: number;
  demand_kva: number;
  power_factor: number | null;
  energy_kwh: number;
  peak_demand_kva: number | null;
  reading_source: string;
}

export function useLoadProfile(projectId: string, documentId?: string) {
  const queryClient = useQueryClient();
  const [syncingStatus, setSyncingStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Fetch or create load profile
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['load-profile', projectId, documentId],
    queryFn: async () => {
      // First try to find existing profile
      const { data: existingProfiles, error: fetchError } = await supabase
        .from('load_profiles')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (existingProfiles && existingProfiles.length > 0) {
        return existingProfiles[0] as LoadProfile;
      }

      // Create new profile if none exists
      const { data: userData } = await supabase.auth.getUser();
      const { data: newProfile, error: createError } = await supabase
        .from('load_profiles')
        .insert({
          project_id: projectId,
          document_id: documentId || null,
          name: 'Default Load Profile',
          description: 'Auto-created load profile for bulk services',
          profile_type: 'standard',
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;
      return newProfile as LoadProfile;
    },
    enabled: !!projectId,
  });

  // Fetch meter-shop linkages
  const { data: linkages = [], isLoading: linkagesLoading, refetch: refetchLinkages } = useQuery({
    queryKey: ['meter-shop-linkages', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('meter_shop_linkages')
        .select('*')
        .eq('profile_id', profile.id)
        .order('meter_id');

      if (error) throw error;
      return data as MeterShopLinkage[];
    },
    enabled: !!profile?.id,
  });

  // Fetch category summaries
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['load-category-summary', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('load_category_summary')
        .select('*')
        .eq('profile_id', profile.id)
        .order('display_order');

      if (error) throw error;
      return data as LoadCategorySummary[];
    },
    enabled: !!profile?.id,
  });

  // Fetch readings for charts
  const { data: readings = [], isLoading: readingsLoading } = useQuery({
    queryKey: ['load-profile-readings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('load_profile_readings')
        .select('*')
        .eq('profile_id', profile.id)
        .order('reading_date', { ascending: false })
        .order('reading_hour');

      if (error) throw error;
      return data as LoadProfileReading[];
    },
    enabled: !!profile?.id,
  });

  // Add meter-shop linkage mutation
  const addLinkageMutation = useMutation({
    mutationFn: async (linkage: Omit<MeterShopLinkage, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('meter_shop_linkages')
        .insert(linkage)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-shop-linkages', profile?.id] });
      toast.success('Meter-shop linkage added');
    },
    onError: (error) => {
      console.error('Error adding linkage:', error);
      toast.error('Failed to add meter-shop linkage');
    },
  });

  // Update linkage mutation
  const updateLinkageMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MeterShopLinkage> & { id: string }) => {
      const { data, error } = await supabase
        .from('meter_shop_linkages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-shop-linkages', profile?.id] });
    },
  });

  // Delete linkage mutation
  const deleteLinkageMutation = useMutation({
    mutationFn: async (linkageId: string) => {
      const { error } = await supabase
        .from('meter_shop_linkages')
        .delete()
        .eq('id', linkageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-shop-linkages', profile?.id] });
      toast.success('Linkage removed');
    },
  });

  // Sync with tenant schedule (local or external wm-solar app)
  const syncWithExternal = useCallback(async (direction: 'push' | 'pull' | 'both', source: 'local' | 'external' = 'local') => {
    if (!profile) return;

    setSyncingStatus('syncing');
    try {
      const { data, error } = await supabase.functions.invoke('sync-load-profiles', {
        body: {
          profileId: profile.id,
          projectId,
          direction,
          source,
        },
      });

      if (error) throw error;

      await refetchProfile();
      await refetchLinkages();
      await refetchCategories();

      const sourceLabel = source === 'external' ? 'external wm-solar' : 'local tenant schedule';
      toast.success(`Synced ${data?.tenantsProcessed || 0} tenants from ${sourceLabel}`);
      setSyncingStatus('idle');
      
      return data;
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync load profile');
      setSyncingStatus('error');
      throw error;
    }
  }, [profile, projectId, refetchProfile, refetchLinkages, refetchCategories]);

  // Calculate totals
  const totals = {
    totalConnectedLoad: linkages.reduce((sum, l) => sum + (l.connected_load_kva || 0), 0),
    totalMaxDemand: linkages.reduce((sum, l) => sum + (l.max_demand_kva || 0), 0),
    linkageCount: linkages.length,
    activeMeters: linkages.filter(l => l.is_active).length,
  };

  return {
    profile,
    linkages,
    categories,
    readings,
    totals,
    isLoading: profileLoading || linkagesLoading || categoriesLoading || readingsLoading,
    syncingStatus,
    addLinkage: addLinkageMutation.mutate,
    updateLinkage: updateLinkageMutation.mutate,
    deleteLinkage: deleteLinkageMutation.mutate,
    syncWithExternal,
    refetch: () => {
      refetchProfile();
      refetchLinkages();
      refetchCategories();
    },
  };
}
