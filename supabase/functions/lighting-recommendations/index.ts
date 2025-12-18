import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zones, fittings, projectSettings } = await req.json();

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert lighting design consultant specializing in South African standards (SANS 10114). 
Analyze the provided lighting zones and available fittings to generate actionable recommendations.

Focus on:
1. Optimal fitting selection per zone based on lux requirements
2. Energy efficiency improvements
3. Cost optimization opportunities
4. Compliance with SANS standards
5. Uniformity and glare considerations

Provide specific, quantified recommendations where possible.`;

    const userPrompt = `Analyze this lighting project and provide recommendations:

**Lighting Zones:**
${JSON.stringify(zones, null, 2)}

**Available Fittings:**
${JSON.stringify(fittings, null, 2)}

**Project Settings:**
${JSON.stringify(projectSettings, null, 2)}

Please provide:
1. **Zone-Specific Recommendations**: For each zone, suggest the best fitting(s) from the library with quantities and rationale
2. **Energy Optimization**: Identify opportunities to reduce power consumption while maintaining compliance
3. **Cost Savings**: Suggest alternatives that could reduce costs without compromising quality
4. **Compliance Alerts**: Flag any zones that may not meet SANS 10114 requirements
5. **Quick Wins**: 3-5 immediate improvements that would have the biggest impact

Format your response as JSON with this structure:
{
  "zoneRecommendations": [
    {
      "zoneName": "string",
      "zoneType": "string",
      "currentStatus": "compliant|warning|non-compliant",
      "recommendedFittings": [
        {
          "fittingId": "string",
          "fittingName": "string",
          "quantity": number,
          "rationale": "string"
        }
      ],
      "estimatedLux": number,
      "notes": "string"
    }
  ],
  "energyOptimizations": [
    {
      "title": "string",
      "description": "string",
      "potentialSavings": "string",
      "priority": "high|medium|low"
    }
  ],
  "costSavings": [
    {
      "title": "string",
      "description": "string",
      "estimatedSaving": "string",
      "tradeoffs": "string"
    }
  ],
  "complianceAlerts": [
    {
      "zone": "string",
      "issue": "string",
      "recommendation": "string",
      "severity": "critical|warning|info"
    }
  ],
  "quickWins": [
    {
      "title": "string",
      "impact": "string",
      "effort": "low|medium|high"
    }
  ],
  "summary": "string"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse JSON from response
    let recommendations;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      recommendations = {
        zoneRecommendations: [],
        energyOptimizations: [],
        costSavings: [],
        complianceAlerts: [],
        quickWins: [],
        summary: content
      };
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
