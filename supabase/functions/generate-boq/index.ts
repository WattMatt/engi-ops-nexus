import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  try {
    const { designPurpose, equipment, cables, containment, zones } = await req.json();

    const prompt = `You are a professional Quantity Surveyor specializing in electrical installations.

Based on the following data from a floor plan markup tool, generate a comprehensive Bill of Quantities (BoQ) in professional format.

PROJECT INFORMATION:
- Design Purpose: ${designPurpose}

EQUIPMENT (${equipment.length} items):
${equipment.map((eq: any) => `- ${eq.type}${eq.label ? ` (${eq.label})` : ''}`).join('\n')}

CABLES (${cables.length} routes):
${cables.map((c: any) => `- ${c.cableType}: ${c.fromLabel || 'Start'} → ${c.toLabel || 'End'}, Length: ${c.lengthMeters?.toFixed(2)}m, Terminations: ${c.terminationCount || 0}`).join('\n')}

CONTAINMENT (${containment.length} items):
${containment.map((c: any) => `- ${c.type}${c.size ? ` (${c.size})` : ''}: ${c.lengthMeters?.toFixed(2)}m`).join('\n')}

ZONES (${zones.length} areas):
${zones.map((z: any) => `- ${z.label || 'Zone'}: ${z.areaSqm?.toFixed(2)}m²`).join('\n')}

INSTRUCTIONS:
1. Organize items into standard trade sections
2. Include item descriptions following standard BoQ conventions
3. Add units of measurement
4. Group similar items
5. Add section totals
6. Include provisional sums where appropriate
7. Format in clean Markdown with tables
8. Add professional notes and assumptions

Generate the BoQ now:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const boqText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate BoQ';

    return new Response(JSON.stringify({ boq: boqText }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
