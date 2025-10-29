import { createClient, SupabaseClient, User, AuthSession } from '@supabase/supabase-js';
import { DesignPurpose, EquipmentItem, SupplyLine, SupplyZone, ScaleInfo, Containment, PVPanelConfig, RoofMask, PVArrayItem, Task } from '../types';
import { generatePdf } from './pdfGenerator';

let supabase: SupabaseClient | null = null;
export let isSupabaseInitialized = false;

const BUCKET_NAME = 'floor-plans';

export const initializeSupabase = (supabaseUrl: string, supabaseAnonKey: string) => {
    if (isSupabaseInitialized || !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("YOUR_SUPABASE_URL")) {
        if (!isSupabaseInitialized) console.warn("Supabase credentials not provided. Cloud features will be disabled.");
        return;
    }
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        isSupabaseInitialized = true;
        console.log("Supabase has been initialized successfully.");
    } catch (error) {
        console.error("Supabase initialization failed:", error);
        isSupabaseInitialized = false;
    }
};

export const getSupabase = () => {
    if (!supabase || !isSupabaseInitialized) throw new Error("Supabase has not been initialized or is not configured.");
    return supabase;
}

export const onAuthChange = (callback: (event: string, session: AuthSession | null) => void) => {
    const supabase = getSupabase();
    return supabase.auth.onAuthStateChange(callback);
};

export const signInWithGoogle = async () => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    });
    if (error) {
        console.error("Authentication Error:", error);
        throw error;
    }
};

export const signOut = async () => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Sign out error:", error);
        throw error;
    }
};

export interface DesignDataForSave {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    zones: SupplyZone[];
    containment: Containment[];
    roofMasks: RoofMask[];
    pvArrays: PVArrayItem[];
    tasks: Task[];
    designPurpose: DesignPurpose | null;
    scaleInfo: ScaleInfo;
    pvPanelConfig: PVPanelConfig | null;
}

export const saveDesign = async (designName: string, designData: DesignDataForSave, pdfFile: File): Promise<void> => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // 1. Upload PDF to Storage first
    const timestamp = Date.now();
    const pdfPath = `${user.id}/${timestamp}_${pdfFile.name}`;
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
            state_json: {
                scaleInfo: designData.scaleInfo,
                pvPanelConfig: designData.pvPanelConfig
            }
        })
        .select()
        .single();

    if (projectError) throw projectError;
    const floorPlanId = project.id;
    
    // 3. Insert all related items in parallel
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
    
    // Cables (previously "lines")
    if (lines.length > 0) {
        promises.push(supabase.from('floor_plan_cables').insert(
            lines.map(({id, from, to, pathLength, ...d}) => ({ 
                floor_plan_id: floorPlanId,
                cable_type: d.cableType || d.type,
                points: d.points,
                length_meters: d.length,
                from_label: from,
                to_label: to,
                label: d.label,
                termination_count: d.terminationCount,
                start_height: d.startHeight,
                end_height: d.endHeight
            }))
        ));
    }
    
    // Zones
    if (zones.length > 0) {
        promises.push(supabase.from('floor_plan_zones').insert(
            zones.map(({id, name, area, ...d}) => ({ 
                floor_plan_id: floorPlanId,
                points: d.points,
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
                points: d.points,
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
            mask_points: points,
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
}

export const listDesigns = async (): Promise<DesignListing[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('floor_plan_projects')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(d => ({ id: d.id, name: d.name, createdAt: d.created_at }));
};

export interface FullDesignData {
    id: string;
    name: string;
    pdf_url: string;
    design_purpose: DesignPurpose | null;
    scale_info: ScaleInfo;
    pv_panel_config: PVPanelConfig | null;
    equipment: EquipmentItem[];
    lines: any[];
    zones: SupplyZone[];
    containment: Containment[];
    roof_masks: RoofMask[];
    pv_arrays: PVArrayItem[];
    tasks: any[];
}

export const loadDesign = async (designId: string): Promise<{ designData: FullDesignData; pdfBlob: Blob }> => {
    const supabase = getSupabase();
    
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
        pathLength: c.length_meters
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

    const stateJson = project.state_json || {};
    const designData: FullDesignData = {
        id: project.id,
        name: project.name,
        pdf_url: project.pdf_url,
        design_purpose: project.design_purpose,
        scale_info: stateJson.scaleInfo || { pixelDistance: null, realDistance: null, ratio: project.scale_meters_per_pixel },
        pv_panel_config: pvConfig ? {
            length: pvConfig.panel_length_m,
            width: pvConfig.panel_width_m,
            wattage: pvConfig.panel_wattage
        } : (stateJson.pvPanelConfig || null),
        equipment: transformedEquipment,
        lines: transformedLines,
        zones: transformedZones,
        containment: transformedContainment,
        roof_masks: transformedRoofs,
        pv_arrays: transformedArrays,
        tasks: transformedTasks
    };

    const { data: pdfBlob, error: fileError } = await supabase.storage.from(BUCKET_NAME).download(project.pdf_url);
    if (fileError) throw fileError;
    
    return { designData, pdfBlob };
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
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Generate PDF with markups using the existing pdfGenerator
    const pdfBlob = await generatePdf({
        canvases,
        projectName,
        equipment: designData.equipment,
        lines: designData.lines,
        zones: designData.zones,
        containment: designData.containment,
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

    // Upload the marked-up PDF
    const timestamp = Date.now();
    const markedUpPath = `${user.id}/${designId}/marked_up_${timestamp}.pdf`;
    
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
            }
        })
        .eq('id', designId);

    return markedUpPath;
};
