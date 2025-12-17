import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const extractionPrompt = `You are an expert at extracting technical specifications from lighting product specification sheets.

Analyze this lighting specification sheet and extract the following data. Be precise and extract exact values as shown in the document:

Required fields:
- manufacturer: Company/brand name
- model_name: Model name or number
- fitting_type: Classify the fixture type based on its form factor and application. Use ONLY one of these values:
  * "downlight" - Recessed ceiling fixtures that direct light downward (round or square recessed)
  * "linear" - Long, linear fixtures like battens, strips, trunking systems (continuous lighting systems)
  * "vapourproof" - Surface mounted weatherproof/damp proof fixtures (DP S, damp proof, vapor proof, IP65 surface fixtures)
  * "panel" - Flat panel fixtures, typically recessed or surface mounted (600x600, 300x1200, backlit panels)
  * "highbay" - High-ceiling industrial fixtures (warehouses, factories)
  * "floodlight" - Outdoor or area lighting, wide beam fixtures for illuminating large areas
  * "streetlight" - Road and street lighting fixtures, pole-mounted outdoor lights (GreenVision, Xceed, Iridium, Luma, road lighting)
  * "bulkhead" - Wall/ceiling mounted enclosed fixtures, often for corridors or outdoor use
  * "spotlight" - Directional accent lighting, track lights
  * "pendant" - Suspended/hanging fixtures
  * "wall" - Wall-mounted fixtures (wall washers, sconces)
  * "strip" - LED strip/tape lights
  * "emergency" - Emergency lighting fixtures
  * "other" - Only if none of the above fit
  
  IMPORTANT: Look for keywords in the model name and description:
  - "DP S", "DPS", "Damp Proof", "Vapor Proof", "Vapour Proof", "Weatherproof" = vapourproof (NOT linear!)
  - "Batten", "Trunking", "continuous" = linear
  - "Flood", "Tango" = floodlight
  - "GreenVision", "Xceed", "Iridium", "Luma", "road", "street" = streetlight
  - "Bulkhead", "Bulky" = bulkhead
  - "Panel", "Backlit", "BackLit" = panel
  - "Highbay", "High Bay" = highbay
  - IP65/IP66 surface mounted long fixtures are usually vapourproof, not linear

- wattage: Power consumption in Watts (number only). Look for "W", "Watt", "System Power", "Power consumption"
- lumen_output: Light output in lumens (number only). IMPORTANT: Look carefully for:
  * "lm" or "lumen" or "lumens" values
  * "Luminous flux" - this IS the lumen value
  * "Light output" or "Output"
  * Tables showing wattage vs lumen output - use the value matching the wattage
  * May appear as "3000lm", "3000 lm", "3,000 lumens", etc.
  * If multiple lumen values exist for different wattages, use the one matching the primary wattage
- color_temperature: Color temperature in Kelvin (number only, e.g., 3000, 4000, 6500)
- cri: Color Rendering Index (number only, typically 80-100)
- beam_angle: Beam angle in degrees (number only)
- ip_rating: Ingress Protection rating (e.g., "IP20", "IP44", "IP65")
- ik_rating: Impact Protection rating (e.g., "IK07", "IK10") - if not found, return null
- dimensions: Object with length, width, height in mm (numbers only)
- weight: Weight in kg or g (number with unit)
- lifespan_hours: Expected lifespan in hours (number only)
- dimmable: Whether the fixture is dimmable (boolean)
- driver_type: Type of driver (e.g., "built-in", "external", "DALI", "0-10V")

For each field, also provide a confidence score between 0 and 1:
- 1.0: Value clearly stated in the document
- 0.7-0.9: Value found but requires some interpretation
- 0.4-0.6: Value inferred or partially visible
- 0.1-0.3: Value guessed based on context
- 0: Value not found at all

Return ONLY a valid JSON object with this exact structure:
{
  "extracted_data": {
    "manufacturer": "string or null",
    "model_name": "string or null",
    "fitting_type": "string (one of: downlight, linear, vapourproof, panel, highbay, floodlight, streetlight, bulkhead, spotlight, pendant, wall, strip, emergency, other)",
    "wattage": number or null,
    "lumen_output": number or null,
    "color_temperature": number or null,
    "cri": number or null,
    "beam_angle": number or null,
    "ip_rating": "string or null",
    "ik_rating": "string or null",
    "dimensions": { "length": number, "width": number, "height": number } or null,
    "weight": "string or null",
    "lifespan_hours": number or null,
    "dimmable": boolean or null,
    "driver_type": "string or null"
  },
  "confidence_scores": {
    "manufacturer": number,
    "model_name": number,
    "fitting_type": number,
    "wattage": number,
    "lumen_output": number,
    "color_temperature": number,
    "cri": number,
    "beam_angle": number,
    "ip_rating": number,
    "ik_rating": number,
    "dimensions": number,
    "weight": number,
    "lifespan_hours": number,
    "dimmable": number,
    "driver_type": number
  }
}`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, mimeType } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Either imageBase64 or imageUrl is required',
          extracted_data: null,
          confidence_scores: null
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured. Please contact support.',
          extracted_data: null,
          confidence_scores: null
        }), 
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Starting spec sheet extraction via Lovable AI...');
    console.log('Mime type:', mimeType || 'unknown');

    let base64Data = imageBase64;
    let actualMimeType = mimeType;

    // If we have a URL (for PDFs or images), download and convert to base64
    if (imageUrl && !imageBase64) {
      console.log('Downloading file from URL...');
      try {
        const fileResponse = await fetch(imageUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.status}`);
        }
        
        const arrayBuffer = await fileResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        base64Data = btoa(binary);
        
        console.log('File downloaded and converted to base64, size:', base64Data.length);
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        return new Response(
          JSON.stringify({ 
            error: `Failed to download file: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`,
            extracted_data: null,
            confidence_scores: null
          }), 
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Build the content for the API
    const imageContent = {
      type: "image_url",
      image_url: {
        url: `data:${actualMimeType || 'application/pdf'};base64,${base64Data}`
      }
    };

    console.log('Calling Lovable AI Gateway...');

    // Call Lovable AI Gateway with google/gemini-2.5-flash
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
            role: 'user',
            content: [
              { type: 'text', text: extractionPrompt },
              imageContent
            ]
          }
        ],
        max_tokens: 2048,
      })
    });

    // Handle rate limit and payment errors
    if (response.status === 429) {
      console.error('Rate limit exceeded');
      return new Response(
        JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      console.error('Payment required');
      return new Response(
        JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Lovable AI response received');

    // Extract the text content from the response
    const textContent = result.choices?.[0]?.message?.content;
    
    if (!textContent) {
      throw new Error('No text content in AI response');
    }

    // Parse the JSON from the response
    // Remove markdown code blocks if present
    let jsonString = textContent.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7);
    }
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    const extractedResult = JSON.parse(jsonString);

    console.log('Extraction completed successfully');
    console.log('Fields extracted:', Object.keys(extractedResult.extracted_data || {}).length);

    return new Response(JSON.stringify(extractedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in extract-lighting-specs:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        extracted_data: null,
        confidence_scores: null
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
