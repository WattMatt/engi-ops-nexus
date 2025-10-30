import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName } = await req.json();
    
    if (!fileContent) {
      throw new Error('No file content provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing invoice:', fileName);

    // Call Lovable AI to extract invoice data
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
            content: `You are an invoice data extraction assistant. Extract structured information from electrical engineering invoices.
Be precise with numbers, dates, and text. If a field is unclear or missing, return null for that field.
Currency amounts should be returned as numbers without currency symbols, commas, or formatting.
Dates should be in ISO format (YYYY-MM-DD).
Look for these specific fields in the invoice:
- Invoice number (e.g., "3076")
- Invoice date (convert to YYYY-MM-DD format)
- Project name/reference
- Client company name
- Client address (full address block)
- Client VAT number
- Agreed fee (may be "To be confirmed", if so return null)
- Interim claim amount (current claim)
- Previously invoiced amount
- VAT percentage
- VAT amount
- Total amount due (including VAT)`
          },
          {
            role: 'user',
            content: fileContent
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract structured data from an invoice document",
              parameters: {
                type: "object",
                properties: {
                  invoice_number: { 
                    type: "string", 
                    description: "Invoice number (e.g., '3076')" 
                  },
                  invoice_date: { 
                    type: "string", 
                    description: "Invoice date in ISO format YYYY-MM-DD" 
                  },
                  project_name: { 
                    type: "string", 
                    description: "Project name or reference" 
                  },
                  client_name: { 
                    type: "string", 
                    description: "Client company name" 
                  },
                  client_address: { 
                    type: "string", 
                    description: "Full client address" 
                  },
                  client_vat_number: { 
                    type: ["string", "null"], 
                    description: "Client VAT registration number" 
                  },
                  agreed_fee: { 
                    type: ["number", "null"], 
                    description: "Total agreed project fee, null if 'To be confirmed'" 
                  },
                  interim_claim: { 
                    type: "number", 
                    description: "Current interim claim amount" 
                  },
                  previously_invoiced: { 
                    type: "number", 
                    description: "Previously invoiced amount" 
                  },
                  vat_percentage: { 
                    type: "number", 
                    description: "VAT percentage (e.g., 15)" 
                  },
                  vat_amount: { 
                    type: "number", 
                    description: "VAT amount" 
                  },
                  total_amount: { 
                    type: "number", 
                    description: "Total amount due including VAT" 
                  }
                },
                required: ["invoice_number", "invoice_date", "project_name", "client_name", "interim_claim", "total_amount"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_invoice_data') {
      throw new Error('Invalid AI response format');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in scan-invoice function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
