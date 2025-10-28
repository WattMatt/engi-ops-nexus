import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type FloorPlanProject = Database["public"]["Tables"]["floor_plan_projects"]["Row"];
type FloorPlanProjectInsert = Database["public"]["Tables"]["floor_plan_projects"]["Insert"];
type FloorPlanProjectUpdate = Database["public"]["Tables"]["floor_plan_projects"]["Update"];

type Equipment = Database["public"]["Tables"]["floor_plan_equipment"]["Row"];
type EquipmentInsert = Database["public"]["Tables"]["floor_plan_equipment"]["Insert"];

type Cable = Database["public"]["Tables"]["floor_plan_cables"]["Row"];
type CableInsert = Database["public"]["Tables"]["floor_plan_cables"]["Insert"];

type Zone = Database["public"]["Tables"]["floor_plan_zones"]["Row"];
type ZoneInsert = Database["public"]["Tables"]["floor_plan_zones"]["Insert"];

type Containment = Database["public"]["Tables"]["floor_plan_containment"]["Row"];
type ContainmentInsert = Database["public"]["Tables"]["floor_plan_containment"]["Insert"];

type PVRoof = Database["public"]["Tables"]["floor_plan_pv_roofs"]["Row"];
type PVRoofInsert = Database["public"]["Tables"]["floor_plan_pv_roofs"]["Insert"];

type PVArray = Database["public"]["Tables"]["floor_plan_pv_arrays"]["Row"];
type PVArrayInsert = Database["public"]["Tables"]["floor_plan_pv_arrays"]["Insert"];

type PVConfig = Database["public"]["Tables"]["floor_plan_pv_config"]["Row"];
type PVConfigInsert = Database["public"]["Tables"]["floor_plan_pv_config"]["Insert"];

type Task = Database["public"]["Tables"]["floor_plan_tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["floor_plan_tasks"]["Insert"];

/**
 * Save or update a floor plan project
 */
export async function saveFloorPlanProject(
  data: FloorPlanProjectInsert
): Promise<string> {
  const { data: project, error } = await supabase
    .from("floor_plan_projects")
    .upsert(data)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save floor plan project: ${error.message}`);
  }

  return project.id;
}

/**
 * Load a floor plan project by ID
 */
export async function loadFloorPlanProject(
  id: string
): Promise<FloorPlanProject | null> {
  const { data, error } = await supabase
    .from("floor_plan_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to load floor plan project: ${error.message}`);
  }

  return data;
}

/**
 * List all floor plan projects for a user
 */
export async function listUserFloorPlans(
  userId: string
): Promise<FloorPlanProject[]> {
  const { data, error } = await supabase
    .from("floor_plan_projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list floor plans: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete a floor plan project and all related data
 */
export async function deleteFloorPlanProject(id: string): Promise<void> {
  // Delete related entities first (cascading deletes should handle this, but being explicit)
  await Promise.all([
    supabase.from("floor_plan_equipment").delete().eq("floor_plan_id", id),
    supabase.from("floor_plan_cables").delete().eq("floor_plan_id", id),
    supabase.from("floor_plan_zones").delete().eq("floor_plan_id", id),
    supabase.from("floor_plan_containment").delete().eq("floor_plan_id", id),
    supabase.from("floor_plan_tasks").delete().eq("floor_plan_id", id),
  ]);

  // Delete PV-related data
  const { data: pvRoofs } = await supabase
    .from("floor_plan_pv_roofs")
    .select("id")
    .eq("floor_plan_id", id);

  if (pvRoofs && pvRoofs.length > 0) {
    const roofIds = pvRoofs.map((r) => r.id);
    await supabase.from("floor_plan_pv_arrays").delete().in("roof_id", roofIds);
    await supabase.from("floor_plan_pv_roofs").delete().eq("floor_plan_id", id);
  }

  await supabase.from("floor_plan_pv_config").delete().eq("floor_plan_id", id);

  // Finally delete the project
  const { error } = await supabase
    .from("floor_plan_projects")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete floor plan project: ${error.message}`);
  }
}

/**
 * Save equipment items for a floor plan
 */
export async function saveEquipment(
  floorPlanId: string,
  equipment: Omit<EquipmentInsert, "floor_plan_id">[]
): Promise<void> {
  // Delete existing equipment
  await supabase.from("floor_plan_equipment").delete().eq("floor_plan_id", floorPlanId);

  // Insert new equipment
  if (equipment.length > 0) {
    const equipmentWithFloorPlanId = equipment.map((e) => ({
      ...e,
      floor_plan_id: floorPlanId,
    }));

    const { error } = await supabase
      .from("floor_plan_equipment")
      .insert(equipmentWithFloorPlanId);

    if (error) {
      throw new Error(`Failed to save equipment: ${error.message}`);
    }
  }
}

/**
 * Load equipment for a floor plan
 */
export async function loadEquipment(floorPlanId: string): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from("floor_plan_equipment")
    .select("*")
    .eq("floor_plan_id", floorPlanId);

  if (error) {
    throw new Error(`Failed to load equipment: ${error.message}`);
  }

  return data || [];
}

/**
 * Save cables for a floor plan
 */
export async function saveCables(
  floorPlanId: string,
  cables: Omit<CableInsert, "floor_plan_id">[]
): Promise<void> {
  // Delete existing cables
  await supabase.from("floor_plan_cables").delete().eq("floor_plan_id", floorPlanId);

  // Insert new cables
  if (cables.length > 0) {
    const cablesWithFloorPlanId = cables.map((c) => ({
      ...c,
      floor_plan_id: floorPlanId,
    }));

    const { error } = await supabase
      .from("floor_plan_cables")
      .insert(cablesWithFloorPlanId);

    if (error) {
      throw new Error(`Failed to save cables: ${error.message}`);
    }
  }
}

/**
 * Load cables for a floor plan
 */
export async function loadCables(floorPlanId: string): Promise<Cable[]> {
  const { data, error } = await supabase
    .from("floor_plan_cables")
    .select("*")
    .eq("floor_plan_id", floorPlanId);

  if (error) {
    throw new Error(`Failed to load cables: ${error.message}`);
  }

  return data || [];
}

/**
 * Save zones for a floor plan
 */
export async function saveZones(
  floorPlanId: string,
  zones: Omit<ZoneInsert, "floor_plan_id">[]
): Promise<void> {
  // Delete existing zones
  await supabase.from("floor_plan_zones").delete().eq("floor_plan_id", floorPlanId);

  // Insert new zones
  if (zones.length > 0) {
    const zonesWithFloorPlanId = zones.map((z) => ({
      ...z,
      floor_plan_id: floorPlanId,
    }));

    const { error } = await supabase
      .from("floor_plan_zones")
      .insert(zonesWithFloorPlanId);

    if (error) {
      throw new Error(`Failed to save zones: ${error.message}`);
    }
  }
}

/**
 * Load zones for a floor plan
 */
export async function loadZones(floorPlanId: string): Promise<Zone[]> {
  const { data, error } = await supabase
    .from("floor_plan_zones")
    .select("*")
    .eq("floor_plan_id", floorPlanId);

  if (error) {
    throw new Error(`Failed to load zones: ${error.message}`);
  }

  return data || [];
}

/**
 * Save containment for a floor plan
 */
export async function saveContainment(
  floorPlanId: string,
  containment: Omit<ContainmentInsert, "floor_plan_id">[]
): Promise<void> {
  // Delete existing containment
  await supabase.from("floor_plan_containment").delete().eq("floor_plan_id", floorPlanId);

  // Insert new containment
  if (containment.length > 0) {
    const containmentWithFloorPlanId = containment.map((c) => ({
      ...c,
      floor_plan_id: floorPlanId,
    }));

    const { error } = await supabase
      .from("floor_plan_containment")
      .insert(containmentWithFloorPlanId);

    if (error) {
      throw new Error(`Failed to save containment: ${error.message}`);
    }
  }
}

/**
 * Load containment for a floor plan
 */
export async function loadContainment(floorPlanId: string): Promise<Containment[]> {
  const { data, error } = await supabase
    .from("floor_plan_containment")
    .select("*")
    .eq("floor_plan_id", floorPlanId);

  if (error) {
    throw new Error(`Failed to load containment: ${error.message}`);
  }

  return data || [];
}

/**
 * Save tasks for a floor plan
 */
export async function saveTasks(
  floorPlanId: string,
  tasks: Omit<TaskInsert, "floor_plan_id">[]
): Promise<void> {
  // Delete existing tasks
  await supabase.from("floor_plan_tasks").delete().eq("floor_plan_id", floorPlanId);

  // Insert new tasks
  if (tasks.length > 0) {
    const tasksWithFloorPlanId = tasks.map((t) => ({
      ...t,
      floor_plan_id: floorPlanId,
    }));

    const { error } = await supabase
      .from("floor_plan_tasks")
      .insert(tasksWithFloorPlanId);

    if (error) {
      throw new Error(`Failed to save tasks: ${error.message}`);
    }
  }
}

/**
 * Load tasks for a floor plan
 */
export async function loadTasks(floorPlanId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("floor_plan_tasks")
    .select("*")
    .eq("floor_plan_id", floorPlanId);

  if (error) {
    throw new Error(`Failed to load tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Save PV configuration
 */
export async function savePVConfig(
  floorPlanId: string,
  config: Omit<PVConfigInsert, "floor_plan_id">
): Promise<void> {
  // Delete existing config
  await supabase.from("floor_plan_pv_config").delete().eq("floor_plan_id", floorPlanId);

  // Insert new config
  const { error } = await supabase
    .from("floor_plan_pv_config")
    .insert({ ...config, floor_plan_id: floorPlanId });

  if (error) {
    throw new Error(`Failed to save PV config: ${error.message}`);
  }
}

/**
 * Load PV configuration
 */
export async function loadPVConfig(floorPlanId: string): Promise<PVConfig | null> {
  const { data, error } = await supabase
    .from("floor_plan_pv_config")
    .select("*")
    .eq("floor_plan_id", floorPlanId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load PV config: ${error.message}`);
  }

  return data;
}

/**
 * Save PV roofs
 */
export async function savePVRoofs(
  floorPlanId: string,
  roofs: Omit<PVRoofInsert, "floor_plan_id">[]
): Promise<void> {
  // Delete existing roofs and their arrays
  const { data: existingRoofs } = await supabase
    .from("floor_plan_pv_roofs")
    .select("id")
    .eq("floor_plan_id", floorPlanId);

  if (existingRoofs && existingRoofs.length > 0) {
    const roofIds = existingRoofs.map((r) => r.id);
    await supabase.from("floor_plan_pv_arrays").delete().in("roof_id", roofIds);
  }

  await supabase.from("floor_plan_pv_roofs").delete().eq("floor_plan_id", floorPlanId);

  // Insert new roofs
  if (roofs.length > 0) {
    const roofsWithFloorPlanId = roofs.map((r) => ({
      ...r,
      floor_plan_id: floorPlanId,
    }));

    const { error } = await supabase
      .from("floor_plan_pv_roofs")
      .insert(roofsWithFloorPlanId);

    if (error) {
      throw new Error(`Failed to save PV roofs: ${error.message}`);
    }
  }
}

/**
 * Load PV roofs
 */
export async function loadPVRoofs(floorPlanId: string): Promise<PVRoof[]> {
  const { data, error } = await supabase
    .from("floor_plan_pv_roofs")
    .select("*")
    .eq("floor_plan_id", floorPlanId);

  if (error) {
    throw new Error(`Failed to load PV roofs: ${error.message}`);
  }

  return data || [];
}

/**
 * Save PV arrays for a specific roof
 */
export async function savePVArrays(
  roofId: string,
  arrays: Omit<PVArrayInsert, "roof_id">[]
): Promise<void> {
  // Delete existing arrays
  await supabase.from("floor_plan_pv_arrays").delete().eq("roof_id", roofId);

  // Insert new arrays
  if (arrays.length > 0) {
    const arraysWithRoofId = arrays.map((a) => ({
      ...a,
      roof_id: roofId,
    }));

    const { error } = await supabase
      .from("floor_plan_pv_arrays")
      .insert(arraysWithRoofId);

    if (error) {
      throw new Error(`Failed to save PV arrays: ${error.message}`);
    }
  }
}

/**
 * Load PV arrays for a specific roof
 */
export async function loadPVArrays(roofId: string): Promise<PVArray[]> {
  const { data, error } = await supabase
    .from("floor_plan_pv_arrays")
    .select("*")
    .eq("roof_id", roofId);

  if (error) {
    throw new Error(`Failed to load PV arrays: ${error.message}`);
  }

  return data || [];
}
