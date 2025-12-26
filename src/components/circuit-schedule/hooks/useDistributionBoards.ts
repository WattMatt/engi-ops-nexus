import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DistributionBoard {
  id: string;
  project_id: string;
  floor_plan_id: string | null;
  name: string;
  location: string | null;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbCircuit {
  id: string;
  distribution_board_id: string;
  circuit_ref: string;
  circuit_type: string | null;
  description: string | null;
  breaker_size: string | null;
  cable_size: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbCircuitMaterial {
  id: string;
  circuit_id: string;
  master_material_id: string | null;
  boq_item_code: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  supply_rate: number;
  install_rate: number;
  total_cost: number;
  final_account_item_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Natural sort for DB names like "DB-1", "DB-1A", "DB-11"
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function useDistributionBoards(projectId: string | null) {
  return useQuery({
    queryKey: ["distribution-boards", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("distribution_boards")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      
      // Sort by name naturally (DB-1, DB-2, DB-11 etc.)
      return (data as DistributionBoard[] || []).sort((a, b) => 
        naturalSort(a.name, b.name)
      );
    },
    enabled: !!projectId,
  });
}

export function useDbCircuits(boardId: string | null) {
  return useQuery({
    queryKey: ["db-circuits", boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from("db_circuits")
        .select("*")
        .eq("distribution_board_id", boardId)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      
      // Sort by circuit_ref naturally (L1, L2, P1, AC1 etc.)
      return (data as DbCircuit[] || []).sort((a, b) => 
        naturalSort(a.circuit_ref, b.circuit_ref)
      );
    },
    enabled: !!boardId,
  });
}

export function useCircuitMaterials(circuitId: string | null) {
  return useQuery({
    queryKey: ["circuit-materials", circuitId],
    queryFn: async () => {
      if (!circuitId) return [];
      const { data, error } = await supabase
        .from("db_circuit_materials")
        .select("*")
        .eq("circuit_id", circuitId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as DbCircuitMaterial[] || [];
    },
    enabled: !!circuitId,
  });
}

export function useCreateDistributionBoard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { project_id: string; name: string; location?: string; description?: string; floor_plan_id?: string }) => {
      const { data: result, error } = await supabase
        .from("distribution_boards")
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["distribution-boards", variables.project_id] });
      toast.success("Distribution board created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create distribution board");
    },
  });
}

export function useUpdateDistributionBoard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId, ...data }: { id: string; projectId: string; name?: string; location?: string; description?: string }) => {
      const { error } = await supabase
        .from("distribution_boards")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["distribution-boards", result.projectId] });
      toast.success("Distribution board updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update distribution board");
    },
  });
}

export function useDeleteDistributionBoard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("distribution_boards")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["distribution-boards", result.projectId] });
      toast.success("Distribution board deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete distribution board");
    },
  });
}

export function useCreateCircuit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { distribution_board_id: string; circuit_ref: string; circuit_type?: string; description?: string; breaker_size?: string; cable_size?: string }) => {
      const { data: result, error } = await supabase
        .from("db_circuits")
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["db-circuits", variables.distribution_board_id] });
      toast.success("Circuit created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create circuit");
    },
  });
}

export function useUpdateCircuit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, boardId, ...data }: { id: string; boardId: string; circuit_ref?: string; circuit_type?: string; description?: string; breaker_size?: string; cable_size?: string }) => {
      const { error } = await supabase
        .from("db_circuits")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
      return { id, boardId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["db-circuits", result.boardId] });
      toast.success("Circuit updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update circuit");
    },
  });
}

export function useDeleteCircuit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      const { error } = await supabase
        .from("db_circuits")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["db-circuits", result.boardId] });
      toast.success("Circuit deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete circuit");
    },
  });
}

export function useCreateCircuitMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { circuit_id: string; description: string; unit?: string; quantity?: number; supply_rate?: number; install_rate?: number; boq_item_code?: string; master_material_id?: string }) => {
      const { data: result, error } = await supabase
        .from("db_circuit_materials")
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-materials", variables.circuit_id] });
      toast.success("Material added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add material");
    },
  });
}

export function useUpdateCircuitMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, circuitId, ...data }: { id: string; circuitId: string; description?: string; unit?: string; quantity?: number; supply_rate?: number; install_rate?: number; boq_item_code?: string; final_account_item_id?: string | null }) => {
      const { error } = await supabase
        .from("db_circuit_materials")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
      return { id, circuitId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-materials", result.circuitId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update material");
    },
  });
}

export function useDeleteCircuitMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, circuitId }: { id: string; circuitId: string }) => {
      const { error } = await supabase
        .from("db_circuit_materials")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { circuitId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-materials", result.circuitId] });
      toast.success("Material deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete material");
    },
  });
}

export function useBulkCreateCircuitMaterials() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (materials: Array<{ circuit_id: string; description: string; unit?: string; quantity?: number; supply_rate?: number; install_rate?: number; boq_item_code?: string }>) => {
      const { data, error } = await supabase
        .from("db_circuit_materials")
        .insert(materials)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const circuitIds = [...new Set(variables.map(m => m.circuit_id))];
      circuitIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["circuit-materials", id] });
      });
      toast.success(`Added ${variables.length} materials`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add materials");
    },
  });
}

export function useReassignCircuitMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ materialId, fromCircuitId, toCircuitId }: { materialId: string; fromCircuitId: string; toCircuitId: string }) => {
      const { error } = await supabase
        .from("db_circuit_materials")
        .update({ circuit_id: toCircuitId })
        .eq("id", materialId);
      
      if (error) throw error;
      return { fromCircuitId, toCircuitId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-materials", result.fromCircuitId] });
      queryClient.invalidateQueries({ queryKey: ["circuit-materials", result.toCircuitId] });
      toast.success("Material reassigned");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reassign material");
    },
  });
}
