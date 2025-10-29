import { createClient, SupabaseClient, User, AuthSession } from '@supabase/supabase-js';
import { DesignPurpose, EquipmentItem, SupplyLine, SupplyZone, ScaleInfo, Containment, PVPanelConfig, RoofMask, PVArrayItem, Task } from '../types';

let supabase: SupabaseClient | null = null;
export let isSupabaseInitialized = false;

const BUCKET_NAME = 'design-pdfs';

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

    // 1. Insert design metadata to get an ID
    const { data: design, error: designError } = await supabase
        .from('designs')
        .insert({
            name: designName,
            user_id: user.id,
            design_purpose: designData.designPurpose,
            scale_info: designData.scaleInfo,
            pv_panel_config: designData.pvPanelConfig
        })
        .select()
        .single();

    if (designError) throw designError;
    const designId = design.id;
    
    // 2. Upload PDF to Storage
    const pdfPath = `${user.id}/${designId}/${pdfFile.name}`;
    const { error: storageError } = await supabase.storage.from(BUCKET_NAME).upload(pdfPath, pdfFile);
    if (storageError) throw storageError;

    // 3. Update design with storage path
    const { error: updateError } = await supabase
        .from('designs')
        .update({ pdf_storage_path: pdfPath })
        .eq('id', designId);
    if (updateError) throw updateError;
    
    // 4. Insert all related items in parallel, ensuring no 'id' field is sent for auto-generation
    const { equipment, lines, zones, containment, roofMasks, pvArrays, tasks } = designData;
    const promises = [];
    if (equipment.length > 0) promises.push(supabase.from('equipment').insert(equipment.map(({id, ...d}) => ({ ...d, design_id: designId }))));
    if (lines.length > 0) promises.push(supabase.from('lines').insert(lines.map(({id, ...d}) => ({ ...d, design_id: designId, from_node: d.from, to_node: d.to, path_length: d.pathLength }))));
    if (zones.length > 0) promises.push(supabase.from('zones').insert(zones.map(({id, ...d}) => ({ ...d, design_id: designId }))));
    if (containment.length > 0) promises.push(supabase.from('containment').insert(containment.map(({id, ...d}) => ({ ...d, design_id: designId }))));
    if (roofMasks.length > 0) promises.push(supabase.from('roof_masks').insert(roofMasks.map(({id, ...d}) => ({ ...d, design_id: designId }))));
    if (pvArrays.length > 0) promises.push(supabase.from('pv_arrays').insert(pvArrays.map(({id, ...d}) => ({ ...d, design_id: designId }))));
    if (tasks.length > 0) promises.push(supabase.from('tasks').insert(tasks.map(({id, ...d}) => ({ ...d, design_id: designId, linked_item_id: d.linkedItemId, assigned_to: d.assignedTo }))));

    const results = await Promise.all(promises);
    const firstError = results.find(res => res.error);
    if (firstError) {
        console.error("Error saving design components:", firstError.error);
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
        .from('designs')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(d => ({ id: d.id, name: d.name, createdAt: d.created_at }));
};

export interface FullDesignData {
    id: string;
    name: string;
    pdf_storage_path: string;
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
    
    const { data: designData, error } = await supabase
        .from('designs')
        .select(`
            *,
            equipment(*),
            lines(*),
            zones(*),
            containment(*),
            roof_masks(*),
            pv_arrays(*),
            tasks(*)
        `)
        .eq('id', designId)
        .single();
        
    if (error) throw error;

    // Remap keys to match frontend state
    designData.lines = designData.lines.map((l: any) => ({ ...l, from: l.from_node, to: l.to_node, pathLength: l.path_length }));
    designData.tasks = designData.tasks.map((t: any) => ({ ...t, linkedItemId: t.linked_item_id, assignedTo: t.assigned_to }));

    const { data: pdfBlob, error: fileError } = await supabase.storage.from(BUCKET_NAME).download(designData.pdf_storage_path);
    if (fileError) throw fileError;
    
    return { designData, pdfBlob };
};
