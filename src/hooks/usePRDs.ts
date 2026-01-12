import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PRD {
  id: string;
  title: string;
  description: string | null;
  branch_name: string | null;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PRDStory {
  id: string;
  prd_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string[] | null;
  priority: number;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  display_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PRDProgressLog {
  id: string;
  prd_id: string;
  story_id: string | null;
  entry: string;
  entry_type: 'note' | 'learning' | 'blocker' | 'decision';
  created_at: string;
}

export function usePRDs() {
  return useQuery({
    queryKey: ['prds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('development_prds')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PRD[];
    },
  });
}

export function usePRD(id: string | undefined) {
  return useQuery({
    queryKey: ['prd', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('development_prds')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as PRD;
    },
    enabled: !!id,
  });
}

export function usePRDStories(prdId: string | undefined) {
  return useQuery({
    queryKey: ['prd-stories', prdId],
    queryFn: async () => {
      if (!prdId) return [];
      const { data, error } = await supabase
        .from('prd_stories')
        .select('*')
        .eq('prd_id', prdId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as PRDStory[];
    },
    enabled: !!prdId,
  });
}

export function usePRDProgressLog(prdId: string | undefined) {
  return useQuery({
    queryKey: ['prd-progress', prdId],
    queryFn: async () => {
      if (!prdId) return [];
      const { data, error } = await supabase
        .from('prd_progress_log')
        .select('*')
        .eq('prd_id', prdId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PRDProgressLog[];
    },
    enabled: !!prdId,
  });
}

export function useCreatePRD() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; branch_name?: string }) => {
      const { data: prd, error } = await supabase
        .from('development_prds')
        .insert({
          title: data.title,
          description: data.description || null,
          branch_name: data.branch_name || null,
          created_by: 'user',
        })
        .select()
        .single();
      
      if (error) throw error;
      return prd;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prds'] });
      toast.success('PRD created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create PRD: ' + error.message);
    },
  });
}

export function useUpdatePRD() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PRD> & { id: string }) => {
      const { error } = await supabase
        .from('development_prds')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prds'] });
      queryClient.invalidateQueries({ queryKey: ['prd', variables.id] });
    },
  });
}

export function useDeletePRD() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('development_prds')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prds'] });
      toast.success('PRD deleted');
    },
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { prd_id: string; title: string; description?: string; acceptance_criteria?: string[]; priority?: number }) => {
      const { data: story, error } = await supabase
        .from('prd_stories')
        .insert({
          prd_id: data.prd_id,
          title: data.title,
          description: data.description || null,
          acceptance_criteria: data.acceptance_criteria || [],
          priority: data.priority || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return story;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prd-stories', variables.prd_id] });
      toast.success('Story added');
    },
  });
}

export function useUpdateStory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, prd_id, ...data }: Partial<PRDStory> & { id: string; prd_id: string }) => {
      const { error } = await supabase
        .from('prd_stories')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      return prd_id;
    },
    onSuccess: (prdId) => {
      queryClient.invalidateQueries({ queryKey: ['prd-stories', prdId] });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, prd_id }: { id: string; prd_id: string }) => {
      const { error } = await supabase
        .from('prd_stories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return prd_id;
    },
    onSuccess: (prdId) => {
      queryClient.invalidateQueries({ queryKey: ['prd-stories', prdId] });
      toast.success('Story deleted');
    },
  });
}

export function useAddProgressEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { prd_id: string; story_id?: string; entry: string; entry_type: PRDProgressLog['entry_type'] }) => {
      const { error } = await supabase
        .from('prd_progress_log')
        .insert({
          prd_id: data.prd_id,
          story_id: data.story_id || null,
          entry: data.entry,
          entry_type: data.entry_type,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prd-progress', variables.prd_id] });
      toast.success('Progress entry added');
    },
  });
}
