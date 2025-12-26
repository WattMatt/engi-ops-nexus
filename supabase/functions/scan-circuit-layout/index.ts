import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert electrical engineer analyzing floor plan layouts for circuit schedules.

Your task is to identify ALL circuit references and distribution board labels visible in the image.

**Distribution Boards (DBs)** - Look for ANY of these patterns:
- Standard: DB-1, DB-1A, DB-2, DB-04A, DB-04B, DB1, DB2
- Main boards: MSB, MDB, SDB, MDB-1, MSB-01
- Sub-distribution: SDB-1, SDB-2, SSDB
- Any text containing "DB" followed by numbers/letters

**Circuit References** - Look for ANY alphanumeric codes near electrical symbols:
- Socket/Power circuits: S1, S2, S3, P1, P2, P3, PWR1, PWR2, SO1, SO2
- Lighting circuits: L1, L2, L3, Lt1, Lt2, LTG1, LTG2
- Air Conditioning: AC1, AC2, AC3, HVAC1, A/C1
- Spare circuits: SP1, SP2, SPR1
- Emergency circuits: EM1, EM2, E1, E2
- ANY single or double letter followed by a number (e.g., C1, C2, F1, F2, K1, K2)
- ANY alphanumeric code that appears to label electrical equipment

**Important**: In electrical drawings, circuit references are typically:
- Small text labels near socket outlets, light fittings, or switches
- Text inside or near circular/rectangular symbols
- Alphanumeric codes that repeat in patterns (1, 2, 3...)

Return ONLY valid JSON in this exact format:
{
  "distribution_boards": [
    {
      "name": "DB-04A",
      "location": "Shop 4A or description if visible",
      "circuits": [
        { "ref": "S1", "type": "socket", "description": "Socket circuit 1" },
        { "ref": "L1", "type": "lighting", "description": "Lighting circuit 1" }
      ]
    }
  ],
  "confidence": "high|medium|low",
  "notes": "Any observations about the layout"
}

If you see text that COULD be circuit references but you're unsure, include them with type "unknown".
If no circuit information is found, return empty distribution_boards array with notes explaining what you DID see in the image.`;

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
