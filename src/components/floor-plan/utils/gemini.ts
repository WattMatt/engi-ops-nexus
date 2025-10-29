import { getSupabase } from './supabase';
import { EquipmentItem, SupplyLine, Containment, SupplyZone } from '../types';

interface ProjectData {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    containment: Containment[];
    zones: SupplyZone[];
}

export const generateBoqFromData = async (projectData: ProjectData): Promise<string> => {
    const supabase = getSupabase();
    try {
        const { data, error } = await supabase.functions.invoke('generate-boq', {
            body: projectData,
        });

        if (error) {
            throw error;
        }

        return data.text;

    } catch (e: any) {
        console.error("Error calling BoQ generation function:", e);
        if (e instanceof Error) {
            return Promise.reject(`An error occurred while communicating with the AI service. Details: ${e.message}`);
        }
        return Promise.reject("An unknown error occurred while communicating with the AI service.");
    }
};
