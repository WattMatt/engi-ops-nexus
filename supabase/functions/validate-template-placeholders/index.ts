import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as mammoth from "npm:mammoth@1.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateUrl, expectedPlaceholders } = await req.json();
    
    console.log('Validating template:', { templateUrl, expectedCount: expectedPlaceholders.length });

    // Download the template
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Extract text
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    console.log('Extracted text length:', text.length);

    // Find all placeholders in the template
    const foundPlaceholders: string[] = [];
    const placeholderPattern = /\{[^}]+\}/g;
    const matches = text.match(placeholderPattern);
    
    if (matches) {
      foundPlaceholders.push(...matches);
    }

    console.log('Found placeholders:', foundPlaceholders);

    // Compare with expected placeholders
    const expected = expectedPlaceholders.map((p: any) => p.placeholder);
    const missing = expected.filter((p: string) => !foundPlaceholders.includes(p));
    const extra = foundPlaceholders.filter((p: string) => !expected.includes(p));
    const matched = expected.filter((p: string) => foundPlaceholders.includes(p));

    const isValid = missing.length === 0;
    const completeness = (matched.length / expected.length) * 100;

    const validationResult = {
      isValid,
      completeness: Math.round(completeness),
      total: expected.length,
      matched: matched.length,
      missing,
      extra,
      foundPlaceholders,
      details: {
        summary: isValid 
          ? '✅ All required placeholders are present!' 
          : `⚠️ ${missing.length} placeholder(s) missing`,
        recommendations: [
          ...missing.map((p: string) => `Add missing placeholder: ${p}`),
          ...extra.map((p: string) => `Extra placeholder found (not in original analysis): ${p}`),
        ],
      },
    };

    console.log('Validation result:', validationResult);

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
