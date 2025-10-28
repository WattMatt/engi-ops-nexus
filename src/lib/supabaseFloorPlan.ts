import { supabase } from "@/integrations/supabase/client";
import { DesignState, Task, Point } from "@/components/floorplan/types";

/**
 * Save complete floor plan state to Supabase
 */
export async function saveFloorPlanState(
  floorPlanId: string,
  state: DesignState
): Promise<{ success: boolean; error?: string }> {
  try {
    // Save equipment
    const { error: eqError } = await supabase
      .from('equipment_placements')
      .delete()
      .eq('floor_plan_id', floorPlanId);
    
    if (eqError) throw eqError;

    if (state.equipment.length > 0) {
      const { error: insertEqError } = await supabase
        .from('equipment_placements')
        .insert(
          state.equipment.map(eq => ({
            floor_plan_id: floorPlanId,
            equipment_type: eq.type,
            x_position: eq.x,
            y_position: eq.y,
            rotation: eq.rotation || 0,
            properties: eq.properties || {},
          }))
        );
      
      if (insertEqError) throw insertEqError;
    }

    // Save cables
    const { error: cableError } = await supabase
      .from('cable_routes')
      .delete()
      .eq('floor_plan_id', floorPlanId);
    
    if (cableError) throw cableError;

    if (state.lines.length > 0) {
      const { error: insertCableError } = await supabase
        .from('cable_routes')
        .insert(
          state.lines.map(line => ({
            floor_plan_id: floorPlanId,
            route_type: (line.type === 'lv' ? 'lv_ac' : line.type) as "basket" | "dc" | "lv_ac" | "mv" | "sleeve" | "tray" | "trunking",
            points: line.points as any,
            size: line.cableSize,
            cable_spec: line.cableSpec,
            supply_from: line.supplyFrom,
            supply_to: line.supplyTo,
            length_meters: line.lengthMeters,
            color: line.color,
          }))
        );
      
      if (insertCableError) throw insertCableError;
    }

    // Save zones
    const { error: zoneError } = await supabase
      .from('zones')
      .delete()
      .eq('floor_plan_id', floorPlanId);
    
    if (zoneError) throw zoneError;

    if (state.zones.length > 0) {
      const { error: insertZoneError } = await supabase
        .from('zones')
        .insert(
          state.zones.map(zone => ({
            floor_plan_id: floorPlanId,
            zone_type: zone.type,
            points: zone.points as any,
            name: zone.name,
            area_sqm: zone.areaSqm,
          }))
        );
      
      if (insertZoneError) throw insertZoneError;
    }

    // Save containment
    const { error: contError } = await supabase
      .from('containment_routes')
      .delete()
      .eq('floor_plan_id', floorPlanId);
    
    if (contError) throw contError;

    if (state.containment.length > 0) {
      const { error: insertContError } = await supabase
        .from('containment_routes')
        .insert(
          state.containment.map(cont => ({
            floor_plan_id: floorPlanId,
            route_type: cont.type,
            points: cont.points as any,
            size: cont.size,
            length_meters: cont.lengthMeters,
          }))
        );
      
      if (insertContError) throw insertContError;
    }

    // Save roof masks (skip for now - types not regenerated yet)
    // Will be enabled after types refresh

    // Save PV arrays
    const { error: pvError } = await supabase
      .from('pv_arrays')
      .delete()
      .eq('floor_plan_id', floorPlanId);
    
    if (pvError) throw pvError;

    if (state.pvArrays.length > 0) {
      const { error: insertPvError } = await supabase
        .from('pv_arrays')
        .insert(
          state.pvArrays.map(arr => ({
            floor_plan_id: floorPlanId,
            x_position: arr.x,
            y_position: arr.y,
            rows: arr.rows,
            columns: arr.columns,
            rotation: arr.rotation || 0,
            orientation: arr.orientation,
          }))
        );
      
      if (insertPvError) throw insertPvError;
    }

    // Save tasks
    const { error: taskError } = await supabase
      .from('floor_plan_tasks')
      .delete()
      .eq('floor_plan_id', floorPlanId);
    
    if (taskError) throw taskError;

    if (state.tasks && state.tasks.length > 0) {
      const { error: insertTaskError } = await supabase
        .from('floor_plan_tasks')
        .insert(
          state.tasks.map(task => ({
            floor_plan_id: floorPlanId,
            title: task.title,
            description: task.description,
            assigned_to: task.assigned_to,
            status: task.status,
            linked_item_id: task.linked_item_id,
            linked_item_type: task.linked_item_type,
          }))
        );
      
      if (insertTaskError) throw insertTaskError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving floor plan state:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load complete floor plan state from Supabase
 */
export async function loadFloorPlanState(
  floorPlanId: string
): Promise<{ state: DesignState | null; error?: string }> {
  try {
    const [
      { data: equipment },
      { data: cables },
      { data: zones },
      { data: containment },
      // Skip roofMasks until types refresh
      { data: pvArrays },
      { data: tasks }
    ] = await Promise.all([
      supabase.from('equipment_placements').select('*').eq('floor_plan_id', floorPlanId),
      supabase.from('cable_routes').select('*').eq('floor_plan_id', floorPlanId),
      supabase.from('zones').select('*').eq('floor_plan_id', floorPlanId),
      supabase.from('containment_routes').select('*').eq('floor_plan_id', floorPlanId),
      // Skip until types refresh
      Promise.resolve({ data: [] }),
      supabase.from('pv_arrays').select('*').eq('floor_plan_id', floorPlanId),
      supabase.from('floor_plan_tasks').select('*').eq('floor_plan_id', floorPlanId),
    ]);

    const state: DesignState = {
      equipment: (equipment || []).map(eq => ({
        id: eq.id,
        type: eq.equipment_type as any,
        x: Number(eq.x_position),
        y: Number(eq.y_position),
        rotation: eq.rotation || 0,
        properties: (eq.properties as any) || {},
      })),
      lines: (cables || []).map(cable => ({
        id: cable.id,
        type: (cable.route_type === 'lv_ac' ? 'lv' : cable.route_type) as any,
        points: JSON.parse(JSON.stringify(cable.points)) as Point[],
        cableSize: cable.size || undefined,
        cableSpec: cable.cable_spec || undefined,
        supplyFrom: cable.supply_from || undefined,
        supplyTo: cable.supply_to || undefined,
        lengthMeters: cable.length_meters ? Number(cable.length_meters) : undefined,
        color: cable.color || undefined,
      })),
      zones: (zones || []).map(zone => ({
        id: zone.id,
        type: zone.zone_type as any,
        points: JSON.parse(JSON.stringify(zone.points)) as Point[],
        name: zone.name || '',
        areaSqm: zone.area_sqm ? Number(zone.area_sqm) : undefined,
      })),
      containment: (containment || []).map(cont => ({
        id: cont.id,
        type: cont.route_type as any,
        points: JSON.parse(JSON.stringify(cont.points)) as Point[],
        size: cont.size as any,
        lengthMeters: cont.length_meters ? Number(cont.length_meters) : undefined,
      })),
      roofMasks: [], // Will populate after types refresh
      pvArrays: (pvArrays || []).map(arr => ({
        id: arr.id,
        x: Number(arr.x_position),
        y: Number(arr.y_position),
        rows: arr.rows,
        columns: arr.columns,
        rotation: arr.rotation || 0,
        orientation: arr.orientation as any,
        totalPanels: arr.rows * arr.columns,
        totalWattage: 0, // Will be calculated with panel config
      })),
      tasks: (tasks || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        status: task.status,
        linked_item_id: task.linked_item_id || undefined,
        linked_item_type: task.linked_item_type || undefined,
      })),
    };

    return { state };
  } catch (error: any) {
    console.error('Error loading floor plan state:', error);
    return { state: null, error: error.message };
  }
}
