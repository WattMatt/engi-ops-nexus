import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

const extractionPrompt = `You are an expert at extracting technical specifications from lighting product specification sheets.

Analyze this lighting specification sheet image and extract the following data. Be precise and extract exact values as shown in the document:

Required fields:
- manufacturer: Company/brand name
- model_name: Model name or number
- wattage: Power consumption in Watts (number only)
- lumen_output: Light output in lumens (number only)
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
      throw new Error('Either imageBase64 or imageUrl is required');
    }

    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }

    console.log('Starting spec sheet extraction...');
    console.log('Image type:', mimeType || 'unknown');

    // Build the image part for Gemini
    let imagePart;
    if (imageBase64) {
      imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64
        }
      };
    } else {
      // For URL-based images, we need to fetch and convert to base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      imagePart = {
        inlineData: {
          mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
          data: base64
        }
      };
    }

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: extractionPrompt },
                imagePart
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini response received');

    // Extract the text content from the response
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error('No text content in Gemini response');
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
