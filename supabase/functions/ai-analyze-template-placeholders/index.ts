import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { completedTemplateUrl, blankTemplateUrl } = await req.json();

    console.log('Analyzing templates:', { completedTemplateUrl, blankTemplateUrl });

    // Download both templates
    const [completedResponse, blankResponse] = await Promise.all([
      fetch(completedTemplateUrl),
      fetch(blankTemplateUrl)
    ]);

    const [completedBuffer, blankBuffer] = await Promise.all([
      completedResponse.arrayBuffer(),
      blankResponse.arrayBuffer()
    ]);

    // Extract text from both templates
    const [completedResult, blankResult] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer: completedBuffer }),
      mammoth.extractRawText({ arrayBuffer: blankBuffer })
    ]);

    const completedText = completedResult.value;
    const blankText = blankResult.value;

    console.log('Extracted text lengths:', { 
      completed: completedText.length, 
      blank: blankText.length 
    });

    // Use Lovable AI to analyze the templates
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const analysisPrompt = `You are analyzing two versions of a document template to identify where placeholders should be inserted.

COMPLETED TEMPLATE (with actual data):
${completedText}

BLANK TEMPLATE (structure only):
${blankText}

Compare these documents and identify:
1. All variable data in the completed template that should become placeholders
2. The exact text in the blank template where each placeholder should be inserted
3. A descriptive placeholder name in the format {field_name}

For each placeholder, provide:
- placeholder: The suggested placeholder name (e.g., "{client_name}")
- exampleValue: The actual value from the completed template
- position: The surrounding text context where it should be inserted in the blank template
- description: What this field represents
- confidence: Your confidence level (0-100)

Return ONLY a JSON array of placeholder objects, no additional text.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: 'You are a document analysis expert. Return only valid JSON arrays.' },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI response:', aiContent);

    // Parse the AI response
    let placeholders;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        placeholders = JSON.parse(jsonMatch[0]);
      } else {
        placeholders = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI analysis results');
    }

    console.log('Parsed placeholders:', placeholders);

    return new Response(
      JSON.stringify({ placeholders }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-analyze-template-placeholders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
