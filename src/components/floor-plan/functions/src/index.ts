import { onRequest } from "firebase-functions/v2/https";
import { GoogleGenAI } from "@google/genai";

import { EquipmentItem, SupplyLine, Containment, SupplyZone, EquipmentType } from './types';
import { calculateLvCableSummary } from './utils';

// It is recommended to set the API key as a secret in your Firebase project.
// Run `firebase functions:secrets:set API_KEY` and enter your key when prompted.
// Then deploy the function to access it via process.env.API_KEY.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error("API_KEY secret not set. See function logs for setup instructions.");
    throw new Error("Required environment variable API_KEY is not set. The function cannot initialize.");
}
const ai = new GoogleGenAI({apiKey: API_KEY});

interface ProjectData {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    containment: Containment[];
    zones: SupplyZone[];
}

function formatDataForPrompt(data: ProjectData): string {
    let promptData = '## Data from Design Markup\n\n';

    if (data.equipment.length > 0) {
        const equipmentCounts = data.equipment.reduce((acc, item) => {
            acc.set(item.type, (acc.get(item.type) || 0) + 1);
            return acc;
        }, new Map<EquipmentType, number>());
        promptData += '### Equipment Quantities\n';
        equipmentCounts.forEach((count, type) => { promptData += `- ${type}: ${count}\n`; });
        promptData += '\n';
    }

    const mvTotal = data.lines.filter(l => l.type === 'mv').reduce((s, l) => s + l.length, 0);
    const dcTotal = data.lines.filter(l => l.type === 'dc').reduce((s, l) => s + l.length, 0);
    const { summary: lvSummary, terminationSummary } = calculateLvCableSummary(data.lines);

    if (mvTotal > 0 || dcTotal > 0 || lvSummary.size > 0) {
        promptData += '### Cabling & Terminations\n';
        if (mvTotal > 0) promptData += `- MV Cable Total: ${mvTotal.toFixed(2)}m\n`;
        if (dcTotal > 0) promptData += `- DC Cable Total: ${dcTotal.toFixed(2)}m\n`;
        lvSummary.forEach((details, type) => {
            promptData += `- ${type}: ${details.totalLength.toFixed(2)}m\n`;
            const terminations = terminationSummary.get(type);
            if (terminations && terminations > 0) {
                promptData += `- ${type} Terminations: ${terminations}\n`;
            }
        });
        promptData += '\n';
    }

    if (data.containment.length > 0) {
        const containmentSummary = data.containment.reduce((acc, item) => {
            const key = item.size ? `${item.type} (${item.size})` : item.type;
            acc.set(key, (acc.get(key) || 0) + item.length);
            return acc;
        }, new Map<string, number>());
        promptData += '### Cable Management / Containment Lengths\n';
        containmentSummary.forEach((length, type) => { promptData += `- ${type}: ${length.toFixed(2)}m\n`; });
        promptData += '\n';
    }
    
    if (data.zones.length > 0) {
        promptData += '### Zoned Areas\n';
        data.zones.forEach(zone => { promptData += `- ${zone.name}: ${zone.area.toFixed(2)}m²\n`; });
        promptData += '\n';
    }

    return promptData;
}

const generateBoqPrompt = (formattedData: string) => `You are a professional Quantity Surveyor for electrical projects. Your task is to generate a comprehensive Bill of Quantities (BoQ) in Markdown format based on the data provided below.

**Instructions:**
1.  **Structure:** Organize the BoQ into logical sections: \`A. Switchgear & Distribution\`, \`B. Power & Socket Outlets\`, \`C. Lighting\`, \`D. Cable Management\`, \`E. LV, MV & DC Cabling\`, \`F. Special Systems (CCTV, etc.)\`.
2.  **Format:** Use Markdown tables for each section. Tables must have the columns: \`Description\`, \`Unit\`, \`Qty\`.
3.  **Units:** Use standard units: 'No.' for items, 'm' for lengths.
4.  **Terminations:** For each cable type listed, create a separate line item for its terminations immediately following the cable length item. Use a professional description like "Gland, terminate and connect...". For example, if there is "4Core x 25mm Alu" cable, there should be a line for the cable length (Unit: m) and another line for "Gland, terminate and connect 4Core x 25mm Alu Cable" (Unit: No.).
5.  **Descriptions:** Use clear, professional descriptions for each item. Abbreviate where appropriate (e.g., 'DB' for Distribution Board).
6.  **Summary:** Start the entire response with a concise one-paragraph summary of the project quantities.
7.  **Notes:** Conclude with a "Notes" section, stating that all quantities are provisional and subject to on-site verification.
8.  **Empty Sections:** If a section has no items, omit the section and its table entirely.
9.  **Rounding:** Round all lengths to two decimal places.

Here is the data extracted from the design markup:
${formattedData}`;

export const electricalGenerateBoq = onRequest({ cors: true }, async (request, response) => {
    if ((request as any).method !== "POST") {
        (response as any).status(405).json({ error: "Method Not Allowed" });
        return;
    }

    try {
        const projectData = (request as any).body as ProjectData;
        const formattedData = formatDataForPrompt(projectData);
        const prompt = generateBoqPrompt(formattedData);
        
        // FIX: The Gemini API call is correct, but ensuring it uses the best model and handles the response properly.
        const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        (response as any).status(200).json({ text: geminiResponse.text });

    } catch (error: any) {
        console.error("Error in generateBoq function:", error);
        if (error.code === 7 || (error.message && error.message.includes('API key not valid'))) {
            (response as any).status(500).json({ error: "The Gemini API key is invalid, expired, or not enabled for the project." });
        } else {
             (response as any).status(500).json({ error: "An internal error occurred while generating the BoQ. Check function logs for details." });
        }
    }
});
