import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert electrical engineer analyzing floor plan layouts for circuit schedules.

Your task is to identify:
1. **Distribution Boards (DBs)**: Look for labels like DB-1, DB-1A, DB-2, MSB, MDB, SDB, DB1, DB2, etc.
2. **Circuits**: For each DB, identify circuits with references like:
   - Lighting: L1, L2, L3, Lt1, Lt2, LTG1, LTG2
   - Power: P1, P2, P3, PWR1, PWR2
   - Air Conditioning: AC1, AC2, AC3, HVAC1
   - Spare: SP1, SP2, SPR1
   - Emergency: EM1, EM2, E1, E2
   - Other: Any alphanumeric circuit references

Circuit Reference Patterns to look for:
- Single letters followed by numbers: L1, P2, AC3
- Abbreviations followed by numbers: LTG1, PWR2, SPR1
- Circuit numbers in schedules/tables
- Text near DB symbols indicating circuit allocations

Return ONLY valid JSON in this exact format:
{
  "distribution_boards": [
    {
      "name": "DB-1",
      "location": "Shop 1 or description of location if visible",
      "circuits": [
        { "ref": "L1", "type": "lighting", "description": "Lighting circuit" },
        { "ref": "P1", "type": "power", "description": "Power circuit" }
      ]
    }
  ],
  "confidence": "high|medium|low",
  "notes": "Any observations about the layout"
}

If no circuit information is found, return:
{
  "distribution_boards": [],
  "confidence": "low",
  "notes": "No circuit references detected in this layout"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType = 'image/png' } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Scanning layout for circuit references...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this electrical floor plan layout and extract all distribution boards and circuit references you can find. Return the structured JSON response.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Return a default response if parsing fails
      result = {
        distribution_boards: [],
        confidence: 'low',
        notes: 'Failed to parse circuit information from the layout'
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-circuit-layout:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      distribution_boards: [],
      confidence: 'low'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
