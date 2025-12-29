import { supabase } from '@/integrations/supabase/client';
import { DesignPurpose, EquipmentItem, SupplyLine, SupplyZone, ScaleInfo, Containment, Walkway, PVPanelConfig, RoofMask, PVArrayItem, Task } from '../types';
import { generatePdf } from './pdfGenerator';

const BUCKET_NAME = 'floor-plans';

export interface DesignDataForSave {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    zones: SupplyZone[];
    containment: Containment[];
    walkways: Walkway[];
    roofMasks: RoofMask[];
    pvArrays: PVArrayItem[];
    tasks: Task[];
    designPurpose: DesignPurpose | null;
    scaleInfo: ScaleInfo;
    pvPanelConfig: PVPanelConfig | null;
    modulesPerString?: number;
    scaleLine: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
}

export const saveDesign = async (designName: string, designData: DesignDataForSave, pdfFile: File, projectId?: string | null): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Require project_id for new floor plans
    if (!projectId) {
        throw new Error("Project assignment is required for new floor plans");
    }

    // 1. Upload PDF to Storage with project-based path: floor-plans/[project_id]/[timestamp]_[name].pdf
    const timestamp = Date.now();
    const sanitizedName = pdfFile.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const pdfPath = `${projectId}/${timestamp}_${sanitizedName}`;
    const { error: storageError } = await supabase.storage.from(BUCKET_NAME).upload(pdfPath, pdfFile);
    if (storageError) throw storageError;

    // 2. Insert floor plan project to get an ID
    const { data: project, error: projectError } = await supabase
        .from('floor_plan_projects')
        .insert({
            name: designName,
            user_id: user.id,
            design_purpose: designData.designPurpose,
            pdf_url: pdfPath,
            scale_meters_per_pixel: designData.scaleInfo.ratio,
            project_id: projectId || null,
            state_json: {
                scaleInfo: designData.scaleInfo,
                pvPanelConfig: designData.pvPanelConfig,
                modulesPerString: designData.modulesPerString,
                scaleLine: designData.scaleLine
            } as any
        })
        .select()
        .single();

    if (projectError) throw projectError;
    const floorPlanId = project.id;
    
    // 3. Insert all related items
    await insertDesignComponents(floorPlanId, designData);

    return floorPlanId;
};

/**
 * Updates an existing design with new data
 */
export const updateDesign = async (designId: string, designData: DesignDataForSave): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 1. Update the main project record
    const { error: projectError } = await supabase
        .from('floor_plan_projects')
        .update({
            design_purpose: designData.designPurpose,
            scale_meters_per_pixel: designData.scaleInfo.ratio,
            state_json: {
                scaleInfo: designData.scaleInfo,
                pvPanelConfig: designData.pvPanelConfig,
                modulesPerString: designData.modulesPerString,
            scaleLine: designData.scaleLine
        } as any,
        updated_at: new Date().toISOString()
    })
    .eq('id', designId);

    if (projectError) throw projectError;

    // 2. Delete existing components (cascade will handle this)
    await Promise.all([
        supabase.from('floor_plan_equipment').delete().eq('floor_plan_id', designId),
        supabase.from('floor_plan_cables').delete().eq('floor_plan_id', designId),
        supabase.from('floor_plan_zones').delete().eq('floor_plan_id', designId),
        supabase.from('floor_plan_containment').delete().eq('floor_plan_id', designId),
        supabase.from('floor_plan_pv_config').delete().eq('floor_plan_id', designId),
        supabase.from('floor_plan_pv_roofs').delete().eq('floor_plan_id', designId),
        supabase.from('floor_plan_tasks').delete().eq('floor_plan_id', designId),
        // Delete cable entries created from this floor plan
        supabase.from('cable_entries').delete().eq('floor_plan_id', designId).eq('created_from', 'floor_plan')
    ]);

    // 3. Insert new components
    await insertDesignComponents(designId, designData);
};

/**
 * Updates only the name of a floor plan design
 */
export const updateDesignName = async (designId: string, name: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { error } = await supabase
        .from('floor_plan_projects')
        .update({ 
            name,
            updated_at: new Date().toISOString()
        })
        .eq('id', designId);

    if (error) throw error;
};

/**
 * Helper function to insert all design components
 */
const insertDesignComponents = async (floorPlanId: string, designData: DesignDataForSave): Promise<void> => {
    const { equipment, lines, zones, containment, roofMasks, pvArrays, tasks, pvPanelConfig } = designData;
    const promises = [];
    
    // Equipment
    if (equipment.length > 0) {
        promises.push(supabase.from('floor_plan_equipment').insert(
            equipment.map(({id, name, ...d}) => ({ 
                floor_plan_id: floorPlanId,
                type: d.type,
                x: d.position.x,
                y: d.position.y,
                rotation: d.rotation,
                label: name,
                properties: {}
            }))
        ));
    }
    
    // Cables - Create in cable_entries as the single source of truth
    // Also create lightweight reference in floor_plan_cables for backward compatibility
    if (lines.length > 0) {
        // Insert into cable_entries first
        const cableEntriesPromise = supabase.from('cable_entries').insert(
            lines.map(({id, from, to, pathLength, ...d}) => ({ 
                floor_plan_id: floorPlanId,
                created_from: 'floor_plan',
                cable_tag: d.label || `${from || "?"}-${to || "?"}`,
                from_location: from || "",
                to_location: to || "",
                cable_type: "Aluminium", // Default material
                measured_length: d.length || 0,
                extra_length: d.startHeight + d.endHeight || 0, // Use rise/drop as extra length
                total_length: (d.length || 0) + (d.startHeight + d.endHeight || 0),
                notes: `Terminations: ${d.terminationCount || 0}`
            }))
        ).select();
        
        promises.push(cableEntriesPromise.then(async ({ data: cableEntries, error }) => {
            if (error) throw error;
            
            // Create corresponding floor_plan_cables entries for reference
            if (cableEntries && cableEntries.length > 0) {
                const floorPlanCablesData = lines.map(({id, from, to, pathLength, ...d}, index) => ({ 
                    floor_plan_id: floorPlanId,
                    cable_type: d.cableType || d.type,
                    points: d.points as any,
                    length_meters: d.length,
                    from_label: from,
                    to_label: to,
                    label: d.label,
                    termination_count: d.terminationCount,
                    start_height: d.startHeight,
                    end_height: d.endHeight,
                    cable_entry_id: cableEntries[index]?.id,
                    db_circuit_id: d.dbCircuitId || null
                }));
                
                return supabase.from('floor_plan_cables').insert(floorPlanCablesData);
            }
        }));
    }
    
    // Zones
    if (zones.length > 0) {
        promises.push(supabase.from('floor_plan_zones').insert(
            zones.map(({id, name, area, ...d}) => ({ 
                floor_plan_id: floorPlanId,
                points: d.points as any,
                label: name,
                area_sqm: area
            }))
        ));
    }
    
    // Containment
    if (containment.length > 0) {
        promises.push(supabase.from('floor_plan_containment').insert(
            containment.map(({id, ...d}) => ({ 
                floor_plan_id: floorPlanId,
                type: d.type,
                size: d.size,
                points: d.points as any,
                length_meters: d.length
            }))
        ));
    }
    
    // PV Panel Config (single record)
    if (pvPanelConfig) {
        promises.push(supabase.from('floor_plan_pv_config').insert({
            floor_plan_id: floorPlanId,
            panel_length_m: pvPanelConfig.length,
            panel_width_m: pvPanelConfig.width,
            panel_wattage: pvPanelConfig.wattage
        }));
    }
    
    // Roof Masks (previously "roofMasks")
    if (roofMasks.length > 0) {
        const roofInserts = roofMasks.map(({id, points, pitch, direction}) => ({ 
            floor_plan_id: floorPlanId,
            mask_points: points as any,
            pitch_degrees: pitch,
            azimuth_degrees: direction
        }));
        
        promises.push(
            supabase.from('floor_plan_pv_roofs')
                .insert(roofInserts)
                .select()
                .then(async ({ data: roofs, error }) => {
                    if (error) throw error;
                    
                    // Now insert PV arrays linked to their roofs
                    if (pvArrays.length > 0 && roofs && roofs.length > 0) {
                        // Since PVArrayItem doesn't have roofId, link all arrays to the first roof
                        const arrayInserts = pvArrays.map(({id, position, ...d}) => ({
                            roof_id: roofs[0].id,
                            x: position.x,
                            y: position.y,
                            rotation: d.rotation,
                            rows: d.rows,
                            columns: d.columns,
                            orientation: d.orientation
                        }));
                        
                        return supabase.from('floor_plan_pv_arrays').insert(arrayInserts);
                    }
                })
        );
    } else if (pvArrays.length > 0) {
        // If there are arrays but no roofs (shouldn't happen, but handle it)
        console.warn('PV Arrays exist without roof masks - skipping array save');
    }
    
    // Tasks
    if (tasks.length > 0) {
        promises.push(supabase.from('floor_plan_tasks').insert(
            tasks.map(({id, linkedItemId, assignedTo, ...d}) => ({ 
                floor_plan_id: floorPlanId,
                title: d.title,
                description: d.description,
                status: d.status,
                item_id: linkedItemId,
                assignee: assignedTo
            }))
        ));
    }

    const results = await Promise.all(promises);
    const firstError = results.find(res => res && 'error' in res && res.error);
    if (firstError && 'error' in firstError) {
        console.error("Error saving floor plan components:", firstError.error);
        throw firstError.error;
    }
};

export interface DesignListing {
    id: string;
    name: string;
    createdAt: string;
    design_purpose: string | null;
    project_id: string | null;
}

export const listDesigns = async (showAll: boolean = false, projectId?: string | null, excludeDesignPurposes?: string[]): Promise<DesignListing[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  let query = supabase
    .from('floor_plan_projects')
    .select('id, name, created_at, design_purpose, project_id')
    .order('created_at', { ascending: false });
  
  // When filtering by project: show designs for THIS project OR unassigned designs
  // This prevents showing designs from OTHER projects while still allowing assignment
  if (!showAll && projectId) {
    query = query.or(`project_id.eq.${projectId},project_id.is.null`);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Filter out excluded design purposes client-side
  let designs = data.map(d => ({ 
    id: d.id, 
    name: d.name, 
    createdAt: d.created_at, 
    design_purpose: d.design_purpose,
    project_id: d.project_id 
  }));
  
  if (excludeDesignPurposes && excludeDesignPurposes.length > 0) {
    designs = designs.filter(d => !d.design_purpose || !excludeDesignPurposes.includes(d.design_purpose));
  }
  
  return designs;
};

export const assignDesignToProject = async (designId: string, projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('floor_plan_projects')
    .update({ project_id: projectId })
    .eq('id', designId);
  
  if (error) throw error;
};

export interface FullDesignData {
    id: string;
    name: string;
    pdf_url: string;
    design_purpose: DesignPurpose | null;
    project_id: string | null;
    scale_info: ScaleInfo;
    pv_panel_config: PVPanelConfig | null;
    modules_per_string?: number;
    equipment: EquipmentItem[];
    lines: any[];
    zones: SupplyZone[];
    containment: Containment[];
    walkways: Walkway[];
    roof_masks: RoofMask[];
    pv_arrays: PVArrayItem[];
    tasks: any[];
    scale_line: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
}

export const loadDesign = async (designId: string): Promise<{ designData: FullDesignData; pdfBlob: Blob }> => {
    // Load main project
    const { data: project, error: projectError } = await supabase
        .from('floor_plan_projects')
        .select('*')
        .eq('id', designId)
        .single();
        
    if (projectError) throw projectError;

    // Load all related data in parallel
    const [
        { data: equipment },
        { data: cables },
        { data: zones },
        { data: containment },
        { data: pvConfig },
        { data: roofs },
        { data: tasks }
    ] = await Promise.all([
        supabase.from('floor_plan_equipment').select('*').eq('floor_plan_id', designId),
        supabase.from('floor_plan_cables').select('*').eq('floor_plan_id', designId),
        supabase.from('floor_plan_zones').select('*').eq('floor_plan_id', designId),
        supabase.from('floor_plan_containment').select('*').eq('floor_plan_id', designId),
        supabase.from('floor_plan_pv_config').select('*').eq('floor_plan_id', designId).maybeSingle(),
        supabase.from('floor_plan_pv_roofs').select('*, floor_plan_pv_arrays(*)').eq('floor_plan_id', designId),
        supabase.from('floor_plan_tasks').select('*').eq('floor_plan_id', designId)
    ]);

    // Transform data to match frontend format
    const transformedEquipment = (equipment || []).map((e: any) => ({
        id: e.id,
        type: e.type,
        position: { x: e.x, y: e.y },
        rotation: e.rotation,
        name: e.label
    }));

    const transformedLines = (cables || []).map((c: any) => ({
        id: c.id,
        type: c.cable_type,
        cableType: c.cable_type,
        points: c.points,
        length: c.length_meters,
        from: c.from_label,
        to: c.to_label,
        label: c.label,
        terminationCount: c.termination_count,
        startHeight: c.start_height,
        endHeight: c.end_height,
        pathLength: c.length_meters,
        dbCircuitId: c.db_circuit_id
    }));

    const transformedZones = (zones || []).map((z: any) => ({
        id: z.id,
        points: z.points,
        name: z.label,
        area: z.area_sqm,
        color: '#3b82f6' // Default blue color
    }));

    const transformedContainment = (containment || []).map((c: any) => ({
        id: c.id,
        type: c.type,
        size: c.size,
        points: c.points,
        length: c.length_meters
    }));

    // Walkways are stored in state_json for now (no dedicated DB table yet)
    const stateJson = project.state_json as any || {};
    const transformedWalkways = (stateJson.walkways || []).map((w: any) => ({
        id: w.id,
        points: w.points,
        length: w.length,
        width: w.width || 0.55
    }));

    const transformedRoofs = (roofs || []).map((r: any) => ({
        id: r.id,
        points: r.mask_points,
        pitch: r.pitch_degrees || 0,
        direction: r.azimuth_degrees || 0
    }));

    // Flatten all PV arrays from all roofs
    const transformedArrays = (roofs || []).flatMap((r: any) => 
        (r.floor_plan_pv_arrays || []).map((a: any) => ({
            id: a.id,
            position: { x: a.x, y: a.y },
            rotation: a.rotation,
            rows: a.rows,
            columns: a.columns,
            orientation: a.orientation
        }))
    );

    const transformedTasks = (tasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        linkedItemId: t.item_id,
        assignedTo: t.assignee
    }));

    const designData: FullDesignData = {
        id: project.id,
        name: project.name,
        pdf_url: project.pdf_url,
        design_purpose: project.design_purpose as DesignPurpose | null,
        project_id: project.project_id || null,
        scale_info: stateJson.scaleInfo || { pixelDistance: null, realDistance: null, ratio: project.scale_meters_per_pixel },
        scale_line: stateJson.scaleLine || null,
        pv_panel_config: pvConfig ? {
            length: pvConfig.panel_length_m,
            width: pvConfig.panel_width_m,
            wattage: pvConfig.panel_wattage
        } : (stateJson.pvPanelConfig || null),
        modules_per_string: stateJson.modulesPerString || 20,
        equipment: transformedEquipment,
        lines: transformedLines,
        zones: transformedZones,
        containment: transformedContainment,
        walkways: transformedWalkways,
        roof_masks: transformedRoofs,
        pv_arrays: transformedArrays,
        tasks: transformedTasks
    };

    const { data: pdfBlob, error: fileError } = await supabase.storage.from(BUCKET_NAME).download(project.pdf_url);
    if (fileError) throw fileError;
    
    return { designData, pdfBlob };
};

/**
 * Deletes a design and all its associated data
 */
export const deleteDesign = async (designId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Get the project to find the PDF URL
    const { data: project, error: projectError } = await supabase
        .from('floor_plan_projects')
        .select('pdf_url, user_id')
        .eq('id', designId)
        .single();
        
    if (projectError) throw projectError;
    
    // Verify the user owns this design
    if (project.user_id !== user.id) {
        throw new Error("Unauthorized: You can only delete your own designs");
    }

    // Delete the PDF file from storage
    if (project.pdf_url) {
        await supabase.storage.from(BUCKET_NAME).remove([project.pdf_url]);
    }

    // Delete the project (cascading deletes will handle related tables)
    const { error: deleteError } = await supabase
        .from('floor_plan_projects')
        .delete()
        .eq('id', designId);
        
    if (deleteError) throw deleteError;
};

/**
 * Saves a PDF with markups rendered on it
 * This generates a new PDF with all the canvas overlays and saves it to storage
 */
export const saveMarkedUpPdf = async (
    designId: string,
    canvases: { pdf: HTMLCanvasElement | null; drawing: HTMLCanvasElement | null },
    designData: DesignDataForSave,
    projectName: string
): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Get project_id from the design
    const { data: designRecord } = await supabase
        .from('floor_plan_projects')
        .select('project_id')
        .eq('id', designId)
        .single();

    if (!designRecord?.project_id) {
        throw new Error("Design must be assigned to a project");
    }

    // Generate PDF with markups using the existing pdfGenerator
    const pdfBlob = await generatePdf({
        canvases,
        projectName,
        equipment: designData.equipment,
        lines: designData.lines,
        zones: designData.zones,
        containment: designData.containment,
        walkways: designData.walkways,
        scaleInfo: designData.scaleInfo,
        roofMasks: designData.roofMasks,
        pvPanelConfig: designData.pvPanelConfig,
        pvArrays: designData.pvArrays,
        tasks: designData.tasks,
        comments: 'Generated with markups'
    }, true); // Pass true to get blob instead of downloading

    if (!pdfBlob) {
        throw new Error('Failed to generate PDF with markups');
    }

    // Upload with standardized path: floor-plans/[project_id]/marked_[timestamp].pdf
    const timestamp = Date.now();
    const markedUpPath = `${designRecord.project_id}/marked_${timestamp}.pdf`;
    
    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(markedUpPath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: false
        });

    if (uploadError) throw uploadError;

    // Optionally update the project record to reference this marked-up version
    await supabase
        .from('floor_plan_projects')
        .update({ 
            state_json: {
                ...designData,
                marked_up_pdf_url: markedUpPath,
                marked_up_generated_at: new Date().toISOString()
            } as any
        })
        .eq('id', designId);

    return markedUpPath;
};
