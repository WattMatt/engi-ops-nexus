import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Template categories for organization
export const TEMPLATE_CATEGORIES = [
  { id: 'lighting', label: 'Lighting', color: 'bg-amber-500' },
  { id: 'power', label: 'Power', color: 'bg-blue-500' },
  { id: 'data', label: 'Data/Comms', color: 'bg-green-500' },
  { id: 'hvac', label: 'HVAC', color: 'bg-cyan-500' },
  { id: 'fire', label: 'Fire/Safety', color: 'bg-red-500' },
  { id: 'custom', label: 'Custom', color: 'bg-purple-500' },
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number]['id'];

export interface CircuitTemplate {
  id: string;
  name: string;
  circuit_type: string; // Used as category
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

// Exportable template format for import/export
export interface ExportableTemplate {
  name: string;
  category: string;
  items: Array<{
    description: string;
    quantity: string;
    unit: string;
    material_type: string;
  }>;
  exportedAt: string;
  version: string;
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
        quantity_formula: String(mat.quantity),
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

// Update template name and category
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      name,
      category,
    }: {
      templateId: string;
      name?: string;
      category?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (category !== undefined) updates.circuit_type = category;
      
      const { data, error } = await supabase
        .from('circuit_material_templates')
        .update(updates)
        .eq('id', templateId)
        .eq('is_default', false) // Safety: only update non-default
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-templates'] });
    },
  });
}

// Duplicate a template (optionally to another project)
export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      newName,
      targetProjectId,
    }: {
      templateId: string;
      newName: string;
      targetProjectId?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch original template with items
      const { data: original, error: fetchError } = await supabase
        .from('circuit_material_templates')
        .select(`
          *,
          items:circuit_material_template_items(*)
        `)
        .eq('id', templateId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('circuit_material_templates')
        .insert({
          name: newName,
          circuit_type: original.circuit_type,
          project_id: targetProjectId || original.project_id,
          is_default: false,
          created_by: user?.id || null,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Copy template items
      if (original.items && original.items.length > 0) {
        const newItems = original.items.map((item: CircuitTemplateItem) => ({
          template_id: newTemplate.id,
          description: item.description,
          material_type: item.material_type,
          quantity_formula: item.quantity_formula,
          unit: item.unit,
          display_order: item.display_order,
          master_material_id: item.master_material_id,
        }));
        
        const { error: itemsError } = await supabase
          .from('circuit_material_template_items')
          .insert(newItems);
        
        if (itemsError) throw itemsError;
      }
      
      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-templates'] });
    },
  });
}

// Import template from JSON
export function useImportTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      templateData,
      projectId,
    }: {
      templateData: ExportableTemplate;
      projectId?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create the template
      const { data: template, error: templateError } = await supabase
        .from('circuit_material_templates')
        .insert({
          name: templateData.name,
          circuit_type: templateData.category || 'custom',
          project_id: projectId || null,
          is_default: false,
          created_by: user?.id || null,
        })
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      // Create template items
      if (templateData.items && templateData.items.length > 0) {
        const templateItems = templateData.items.map((item, index) => ({
          template_id: template.id,
          description: item.description,
          material_type: item.material_type || 'custom',
          quantity_formula: item.quantity,
          unit: item.unit,
          display_order: index + 1,
        }));
        
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

// Export template to JSON format
export function exportTemplateToJson(template: TemplateWithItems): ExportableTemplate {
  return {
    name: template.name,
    category: template.circuit_type,
    items: (template.items || []).map(item => ({
      description: item.description,
      quantity: item.quantity_formula,
      unit: item.unit || 'No',
      material_type: item.material_type,
    })),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
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
        quantity: parseFloat(item.quantity_formula) || 1,
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
