import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CircuitTemplate {
  id: string;
  name: string;
  circuit_type: string;
  is_default: boolean;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CircuitTemplateItem {
  id: string;
  template_id: string;
  description: string;
  material_type: string;
  quantity_formula: string;
  unit: string | null;
  display_order: number | null;
  master_material_id: string | null;
  created_at: string;
}

export interface TemplateWithItems extends CircuitTemplate {
  items: CircuitTemplateItem[];
}

// Fetch all available templates (default + project-specific)
export function useCircuitTemplates(projectId?: string) {
  return useQuery({
    queryKey: ['circuit-templates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('circuit_material_templates')
        .select(`
          *,
          items:circuit_material_template_items(*)
        `)
        .or(`is_default.eq.true,project_id.eq.${projectId || 'null'}`)
        .order('name');
      
      if (error) throw error;
      return data as TemplateWithItems[];
    },
  });
}

// Create a new template from existing circuit materials
export function useCreateTemplateFromCircuit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      name,
      circuitType,
      projectId,
      materials,
    }: {
      name: string;
      circuitType: string;
      projectId?: string;
      materials: Array<{ description: string; quantity: number; unit: string }>;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create the template
      const { data: template, error: templateError } = await supabase
        .from('circuit_material_templates')
        .insert({
          name,
          circuit_type: circuitType,
          project_id: projectId || null,
          is_default: false,
          created_by: user?.id || null,
        })
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      // Create template items from materials
      const templateItems = materials.map((mat, index) => ({
        template_id: template.id,
        description: mat.description,
        material_type: 'custom',
        quantity_formula: String(mat.quantity), // Store the quantity as a static value
        unit: mat.unit,
        display_order: index + 1,
      }));
      
      if (templateItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('circuit_material_template_items')
          .insert(templateItems);
        
        if (itemsError) throw itemsError;
      }
      
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-templates'] });
    },
  });
}

// Apply a template to a circuit (create materials from template items)
export function useApplyTemplateToCircuit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      circuitId,
      projectId,
      floorPlanId,
    }: {
      templateId: string;
      circuitId: string;
      projectId?: string;
      floorPlanId?: string;
    }) => {
      // Fetch template items
      const { data: templateItems, error: fetchError } = await supabase
        .from('circuit_material_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order');
      
      if (fetchError) throw fetchError;
      
      if (!templateItems || templateItems.length === 0) {
        throw new Error('Template has no items');
      }
      
      // Create circuit materials from template items
      const materials = templateItems.map(item => ({
        circuit_id: circuitId === 'unassigned' ? null : circuitId,
        description: item.description,
        unit: item.unit || 'No',
        quantity: parseFloat(item.quantity_formula) || 1, // Parse quantity from formula
        material_type: item.material_type,
        master_material_id: item.master_material_id,
        project_id: circuitId === 'unassigned' ? projectId : undefined,
        floor_plan_id: circuitId === 'unassigned' ? floorPlanId : undefined,
      }));
      
      const { data, error } = await supabase
        .from('db_circuit_materials')
        .insert(materials)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['circuit-materials', variables.circuitId] });
      queryClient.invalidateQueries({ queryKey: ['floor-plan-circuit-materials'] });
    },
  });
}

// Delete a template (only non-default ones)
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      // First delete template items
      const { error: itemsError } = await supabase
        .from('circuit_material_template_items')
        .delete()
        .eq('template_id', templateId);
      
      if (itemsError) throw itemsError;
      
      // Then delete the template
      const { error } = await supabase
        .from('circuit_material_templates')
        .delete()
        .eq('id', templateId)
        .eq('is_default', false); // Safety: only delete non-default
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-templates'] });
    },
  });
}
