
import { EquipmentItem, SupplyLine, Containment, SupplyZone } from '../types';

interface ProjectData {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    containment: Containment[];
    zones: SupplyZone[];
}

export const generateBoqFromData = async (projectData: ProjectData): Promise<string> => {
    // This URL path will be automatically forwarded to your Firebase Function by the
    // configuration in `firebase.json`. This path is namespaced to avoid collisions.
    const functionUrl = '/api/electrical/generateBoq'; 

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Request to AI service failed with status ${response.status}: ${errorBody.error || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.text;

    } catch (e) {
        console.error("Error calling BoQ generation service:", e);
        if (e instanceof Error) {
            // Provide a user-friendly error message
            if (e.message.includes('Failed to fetch')) {
                return Promise.reject('Could not connect to the AI service. Please check your network connection or Firebase Hosting setup.');
            }
            return Promise.reject(`An error occurred while communicating with the AI service. Details: ${e.message}`);
        }
        return Promise.reject("An unknown error occurred while communicating with the AI service.");
    }
};
