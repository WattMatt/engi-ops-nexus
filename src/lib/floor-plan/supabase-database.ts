import { supabase } from "@/integrations/supabase/client";
import { 
  EquipmentItem, 
  SupplyLine, 
  Zone, 
  PVArrayItem, 
  TaskItem, 
  BoQEntry,
  RoofMask,
  ScaleInfo,
  DesignPurpose 
} from './types';
import type { Database } from '@/integrations/supabase/types';

type FloorPlanProjectRow = Database['public']['Tables']['floor_plan_projects']['Row'];

export interface FloorPlanProject extends FloorPlanProjectRow {
  // Add computed properties if needed
  purpose?: DesignPurpose;
  canvas_json?: any;
  scale_drawing_ratio?: number;
  equipment?: EquipmentItem[];
  supply_lines?: SupplyLine[];
  zones?: Zone[];
  pv_arrays?: PVArrayItem[];
  roof_masks?: RoofMask[];
  tasks?: TaskItem[];
  boq_entries?: BoQEntry[];
}

export async function saveFloorPlanProject(data: {
  userId: string;
  name: string;
  purpose: DesignPurpose;
  pdfUrl: string;
  canvasJson?: any;
  scaleInfo?: ScaleInfo;
  equipment?: EquipmentItem[];
  supplyLines?: SupplyLine[];
  zones?: Zone[];
  pvArrays?: PVArrayItem[];
  roofMasks?: RoofMask[];
  tasks?: TaskItem[];
  boqEntries?: BoQEntry[];
}): Promise<string> {
  const { data: result, error } = await supabase
    .from('floor_plan_projects')
    .insert({
      user_id: data.userId,
      name: data.name,
      design_purpose: data.purpose,
      pdf_url: data.pdfUrl,
      state_json: data.canvasJson || {},
      scale_meters_per_pixel: data.scaleInfo?.ratio || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return result.id;
}

export async function updateFloorPlanProject(
  id: string,
  data: {
    name?: string;
    purpose?: DesignPurpose;
    pdfUrl?: string;
    canvasJson?: any;
    scaleInfo?: ScaleInfo;
    equipment?: EquipmentItem[];
    supplyLines?: SupplyLine[];
    zones?: Zone[];
    pvArrays?: PVArrayItem[];
    roofMasks?: RoofMask[];
    tasks?: TaskItem[];
    boqEntries?: BoQEntry[];
  }
): Promise<void> {
  const updateData: Database['public']['Tables']['floor_plan_projects']['Update'] = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.purpose !== undefined) updateData.design_purpose = data.purpose;
  if (data.pdfUrl !== undefined) updateData.pdf_url = data.pdfUrl;
  if (data.canvasJson !== undefined) updateData.state_json = data.canvasJson;
  if (data.scaleInfo !== undefined) {
    updateData.scale_meters_per_pixel = data.scaleInfo.ratio;
  }

  const { error } = await supabase
    .from('floor_plan_projects')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;
}

export async function loadFloorPlanProject(id: string): Promise<FloorPlanProject> {
  const { data, error } = await supabase
    .from('floor_plan_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...data,
    purpose: data.design_purpose as DesignPurpose,
    canvas_json: data.state_json,
  };
}

export async function listUserFloorPlans(userId: string): Promise<FloorPlanProject[]> {
  const { data, error } = await supabase
    .from('floor_plan_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data.map(d => ({
    ...d,
    purpose: d.design_purpose as DesignPurpose,
    canvas_json: d.state_json,
  }));
}

export async function deleteFloorPlanProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('floor_plan_projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
