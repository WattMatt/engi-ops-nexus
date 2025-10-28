// Edge Function for generating Bill of Quantities using Lovable AI

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectData, floorPlanName, designPurpose } = await req.json();

    console.log('Generating BoQ for:', floorPlanName);

    // Format project data for Gemini
    const equipmentSummary = projectData.equipment
      .reduce((acc: any, item: any) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {});

    const cableSummary = projectData.cables.map((cable: any) => ({
      type: cable.type,
      from: cable.supplyFrom || 'Unknown',
      to: cable.supplyTo || 'Unknown',
      length: cable.lengthMeters?.toFixed(2) || 'N/A',
      cableSize: cable.cableType || 'N/A'
    }));

    const zoneSummary = projectData.zones.map((zone: any) => ({
      type: zone.type,
      name: zone.name || 'Unnamed',
      area: zone.areaSqm?.toFixed(2) || 'N/A'
    }));

    const containmentSummary = projectData.containment.map((cont: any) => ({
      type: cont.type,
      size: cont.size || 'N/A',
      length: cont.lengthMeters?.toFixed(2) || 'N/A'
    }));

    // Create comprehensive prompt
    const prompt = `You are a professional quantity surveyor specializing in electrical engineering projects.

PROJECT DETAILS:
- Project Name: ${floorPlanName}
- Design Purpose: ${designPurpose}

EQUIPMENT SUMMARY:
${Object.entries(equipmentSummary).map(([type, count]) => `- ${type}: ${count} units`).join('\n')}

CABLE ROUTES:
${cableSummary.map((c: any, i: number) => `${i + 1}. ${c.type.toUpperCase()} Cable: ${c.from} → ${c.to}, Length: ${c.length}m, Size: ${c.cableSize}`).join('\n')}

CONTAINMENT SYSTEMS:
${containmentSummary.map((c: any, i: number) => `${i + 1}. ${c.type}: ${c.size}, Length: ${c.length}m`).join('\n')}

ZONES/AREAS:
${zoneSummary.map((z: any, i: number) => `${i + 1}. ${z.type} Zone "${z.name}": ${z.area} m²`).join('\n')}

TASK:
Generate a detailed Bill of Quantities (BoQ) in Markdown format with the following sections:
1. Executive Summary (total estimated cost range)
2. Equipment Schedule (item descriptions, quantities, estimated unit rates, totals)
3. Cable Schedule (cable types, lengths, estimated costs)
4. Containment Schedule (types, sizes, lengths, costs)
5. Labor Estimates (installation hours by category)
6. Contingency & Project Management (10-15% of subtotal)

Format as clean Markdown tables. Provide realistic cost estimates based on South African market rates (ZAR). Be detailed and professional.`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const boqContent = aiData.choices[0].message.content;

    console.log('BoQ generated successfully');

    return new Response(
      JSON.stringify({ boq: boqContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating BoQ:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
