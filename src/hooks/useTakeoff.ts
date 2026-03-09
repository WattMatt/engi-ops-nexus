import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TakeoffCatalogItem, TakeoffAssembly, Takeoff, TakeoffZone, TakeoffMeasurement } from '@/components/takeoff/types';

export function useTakeoffCatalog() {
  return useQuery({
    queryKey: ['takeoff-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('takeoff_catalog')
        .select('*')
        .order('category, name');
      if (error) throw error;
      return data as TakeoffCatalogItem[];
    },
  });
}

export function useTakeoffAssemblies() {
  return useQuery({
    queryKey: ['takeoff-assemblies'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('takeoff_assemblies')
        .select('*, takeoff_assembly_items(*, takeoff_catalog(*))');
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        items: (a.takeoff_assembly_items || []).map((ai: any) => ({
          ...ai,
          catalog: ai.takeoff_catalog,
        })),
      })) as TakeoffAssembly[];
    },
  });
}

export function useTakeoffs(projectId: string) {
  return useQuery({
    queryKey: ['takeoffs', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('takeoffs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Takeoff[];
    },
    enabled: !!projectId,
  });
}

export function useTakeoffMeasurements(takeoffId: string | null) {
  return useQuery({
    queryKey: ['takeoff-measurements', takeoffId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('takeoff_measurements')
        .select('*')
        .eq('takeoff_id', takeoffId)
        .order('created_at');
      if (error) throw error;
      return data as TakeoffMeasurement[];
    },
    enabled: !!takeoffId,
  });
}

export function useTakeoffZones(takeoffId: string | null) {
  return useQuery({
    queryKey: ['takeoff-zones', takeoffId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('takeoff_zones')
        .select('*')
        .eq('takeoff_id', takeoffId);
      if (error) throw error;
      return data as TakeoffZone[];
    },
    enabled: !!takeoffId,
  });
}

export function useCreateTakeoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { project_id: string; drawing_id?: string; name: string; created_by?: string; created_by_email?: string }) => {
      const { data, error } = await (supabase as any)
        .from('takeoffs')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as Takeoff;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['takeoffs', vars.project_id] });
    },
  });
}

export function useUpdateTakeoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Takeoff> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('takeoffs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Takeoff;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['takeoffs', data.project_id] });
    },
  });
}

export function useAddMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: Partial<TakeoffMeasurement> & { takeoff_id: string }) => {
      const { data, error } = await (supabase as any)
        .from('takeoff_measurements')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as TakeoffMeasurement;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['takeoff-measurements', data.takeoff_id] });
    },
  });
}

export function useDeleteMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, takeoffId }: { id: string; takeoffId: string }) => {
      const { error } = await (supabase as any)
        .from('takeoff_measurements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return takeoffId;
    },
    onSuccess: (takeoffId) => {
      qc.invalidateQueries({ queryKey: ['takeoff-measurements', takeoffId] });
    },
  });
}

export function useAddZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { takeoff_id: string; name: string; polygon: any; color?: string }) => {
      const { data, error } = await (supabase as any)
        .from('takeoff_zones')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as TakeoffZone;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['takeoff-zones', data.takeoff_id] });
    },
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, takeoffId }: { id: string; takeoffId: string }) => {
      const { error } = await (supabase as any)
        .from('takeoff_zones')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return takeoffId;
    },
    onSuccess: (takeoffId) => {
      qc.invalidateQueries({ queryKey: ['takeoff-zones', takeoffId] });
    },
  });
}
