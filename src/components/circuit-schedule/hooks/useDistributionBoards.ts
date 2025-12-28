import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  categorizeMaterial, 
  calculateGrossQuantity, 
  generateCableSupportingMaterials,
  type MaterialCategory,
  type BOQSection,
  type InstallationStatus
} from "../utils/electricalMaterialUtils";

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
  // New fields for electrical tracking
  material_category: MaterialCategory | null;
  boq_section: BOQSection | null;
  installation_status: InstallationStatus | null;
  wastage_factor: number | null;
  wastage_quantity: number | null;
  gross_quantity: number | null;
  is_auto_generated: boolean | null;
  parent_material_id: string | null;
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

// Fetch all circuit materials for a floor plan (via distribution boards and circuits)
export function useFloorPlanCircuitMaterials(floorPlanId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ["floor-plan-circuit-materials", floorPlanId, projectId],
    queryFn: async () => {
      if (!floorPlanId || !projectId) return [];
      
      // Get all distribution boards for this floor plan
      const { data: boards, error: boardsError } = await supabase
        .from("distribution_boards")
        .select("id")
        .eq("floor_plan_id", floorPlanId)
        .eq("project_id", projectId);
      
      if (boardsError) throw boardsError;
      if (!boards || boards.length === 0) return [];
      
      const boardIds = boards.map(b => b.id);
      
      // Get all circuits for these boards
      const { data: circuits, error: circuitsError } = await supabase
        .from("db_circuits")
        .select("id")
        .in("distribution_board_id", boardIds);
      
      if (circuitsError) throw circuitsError;
      if (!circuits || circuits.length === 0) return [];
      
      const circuitIds = circuits.map(c => c.id);
      
      // Get all materials for these circuits
      const { data: materials, error: materialsError } = await supabase
        .from("db_circuit_materials")
        .select("*")
        .in("circuit_id", circuitIds)
        .order("created_at", { ascending: true });
      
      if (materialsError) throw materialsError;
      return materials as DbCircuitMaterial[] || [];
    },
    enabled: !!floorPlanId && !!projectId,
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

export interface CreateCircuitMaterialInput {
  circuit_id: string;
  description: string;
  unit?: string;
  quantity?: number;
  supply_rate?: number;
  install_rate?: number;
  boq_item_code?: string;
  master_material_id?: string;
  final_account_item_id?: string;
  canvas_line_id?: string; // Link to canvas line for sync deletion
  // Optional overrides for auto-categorization
  material_category?: MaterialCategory;
  boq_section?: BOQSection;
  skip_supporting_materials?: boolean;
}

export function useCreateCircuitMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCircuitMaterialInput) => {
      // Auto-categorize the material
      const categoryInfo = categorizeMaterial(data.description);
      const category = data.material_category || categoryInfo.category;
      const boqSection = data.boq_section || categoryInfo.boqSection;
      
      // Calculate wastage
      const netQuantity = data.quantity || 0;
      const { wastageQuantity, grossQuantity } = calculateGrossQuantity(netQuantity, categoryInfo.wastagePercent);
      
      // Prepare the main material insert
      const materialData = {
        circuit_id: data.circuit_id,
        description: data.description,
        unit: data.unit,
        quantity: netQuantity,
        supply_rate: data.supply_rate,
        install_rate: data.install_rate,
        boq_item_code: data.boq_item_code,
        master_material_id: data.master_material_id,
        final_account_item_id: data.final_account_item_id,
        canvas_line_id: data.canvas_line_id, // Link for sync deletion
        material_category: category,
        boq_section: boqSection,
        installation_status: 'planned' as InstallationStatus,
        wastage_factor: categoryInfo.wastagePercent,
        wastage_quantity: wastageQuantity,
        gross_quantity: grossQuantity,
        is_auto_generated: false,
      };
      
      const { data: result, error } = await supabase
        .from("db_circuit_materials")
        .insert(materialData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Auto-generate supporting materials for cables (unless skipped)
      if (category === 'cable' && !data.skip_supporting_materials && netQuantity > 0) {
        const cableSize = extractCableSize(data.description);
        const supportingMaterials = generateCableSupportingMaterials(
          data.description,
          cableSize,
          netQuantity
        );
        
        // Insert supporting materials with reference to parent
        for (const support of supportingMaterials) {
          await supabase.from("db_circuit_materials").insert({
            circuit_id: data.circuit_id,
            description: support.description,
            unit: support.unit,
            quantity: support.quantity,
            material_category: support.category,
            boq_section: support.boqSection,
            installation_status: 'planned',
            is_auto_generated: true,
            parent_material_id: result.id,
            wastage_factor: 0,
            wastage_quantity: 0,
            gross_quantity: support.quantity,
          });
        }
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-materials", variables.circuit_id] });
      queryClient.invalidateQueries({ queryKey: ["floor-plan-circuit-materials"] });
      toast.success("Material added with auto-categorization");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add material");
    },
  });
}

// Helper to extract cable size from description
function extractCableSize(description: string): string {
  const match = description.match(/(\d+(?:\.\d+)?)\s*mm/i);
  return match ? `${match[1]}mm` : '4mm';
}

// Delete circuit materials by canvas line ID (for sync when canvas line is deleted)
export function useDeleteCircuitMaterialByCanvasLine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (canvasLineId: string) => {
      // First get the material to find its circuit_id for cache invalidation
      const { data: material } = await supabase
        .from("db_circuit_materials")
        .select("id, circuit_id, parent_material_id")
        .eq("canvas_line_id", canvasLineId)
        .maybeSingle();
      
      if (!material) return null;
      
      // Delete any child materials (auto-generated supporting materials)
      await supabase
        .from("db_circuit_materials")
        .delete()
        .eq("parent_material_id", material.id);
      
      // Delete the main material
      const { error } = await supabase
        .from("db_circuit_materials")
        .delete()
        .eq("canvas_line_id", canvasLineId);
      
      if (error) throw error;
      return material;
    },
    onSuccess: (material) => {
      if (material?.circuit_id) {
        queryClient.invalidateQueries({ queryKey: ["circuit-materials", material.circuit_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["floor-plan-circuit-materials"] });
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
