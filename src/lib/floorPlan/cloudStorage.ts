import { supabase } from '@/integrations/supabase/client';
import { FloorPlanState } from './types';

export async function saveFloorPlanToCloud(
  state: FloorPlanState,
  projectName: string,
  projectId?: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Upload PDF if exists
  let pdfUrl = null;
  if (state.pdfFile) {
    const fileName = `${Date.now()}_${state.pdfFile.name}`;
    const { data, error } = await supabase.storage
      .from('floor-plans')
      .upload(fileName, state.pdfFile);
    
    if (error) throw error;
    pdfUrl = data.path;
  }

  // Create or update floor plan project
  const { data: floorPlan, error } = await supabase
    .from('floor_plan_projects')
    .insert({
      user_id: user.id,
      project_id: projectId || null,
      name: projectName,
      design_purpose: state.designPurpose!,
      pdf_url: pdfUrl,
      scale_meters_per_pixel: state.scaleMetersPerPixel || null,
      state_json: {
        equipment: state.equipment,
        cables: state.cables,
        containment: state.containment,
        zones: state.zones,
        pvConfig: state.pvConfig,
        pvRoofs: state.pvRoofs,
        pvArrays: state.pvArrays,
        tasks: state.tasks,
      } as any,
    })
    .select()
    .single();

  if (error) throw error;
  return floorPlan.id;
}

export async function loadFloorPlanFromCloud(id: string): Promise<FloorPlanState> {
  const { data: floorPlan, error } = await supabase
    .from('floor_plan_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  // Download PDF if exists
  let pdfFile = null;
  let pdfDataUrl = null;
  if (floorPlan.pdf_url) {
    const { data } = await supabase.storage
      .from('floor-plans')
      .download(floorPlan.pdf_url);
    
    if (data) {
      pdfFile = new File([data], 'floor-plan.pdf', { type: 'application/pdf' });
      pdfDataUrl = URL.createObjectURL(data);
    }
  }

  const stateJson = (floorPlan.state_json as any) || {};

  return {
    pdfFile,
    pdfDataUrl,
    scaleMetersPerPixel: floorPlan.scale_meters_per_pixel || null,
    designPurpose: floorPlan.design_purpose as any,
    equipment: stateJson.equipment || [],
    cables: stateJson.cables || [],
    containment: stateJson.containment || [],
    zones: stateJson.zones || [],
    pvConfig: stateJson.pvConfig || null,
    pvRoofs: stateJson.pvRoofs || [],
    pvArrays: stateJson.pvArrays || [],
    tasks: stateJson.tasks || [],
    activeTool: null,
    selectedItem: null,
    canvasTransform: { x: 0, y: 0, scale: 1 },
  };
}

export async function listFloorPlans() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('floor_plan_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}
