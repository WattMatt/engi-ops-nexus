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
    const { fileContent, fileName, fileType } = await req.json();
    
    if (!fileContent) {
      throw new Error('No file content provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing document for payment schedule extraction:', fileName, 'Type:', fileType);

    // Build the message content based on file type
    let messageContent: any[];
    
    if (fileType === 'image') {
      // For images, send as vision input
      messageContent = [
        {
          type: "text",
          text: `Extract all payment schedule and project information from this appointment letter or payment schedule document. Look for:
- Project name/reference
- Client company name
- Client address
- Client VAT number
- Total agreed fee/contract value
- Payment schedule (dates, amounts, milestone descriptions)
- Any notes or special conditions

Be thorough and extract ALL financial data visible in the document.`
        },
        {
          type: "image_url",
          image_url: {
            url: fileContent
          }
        }
      ];
    } else {
      // For text-based documents (PDF/Word extracted text)
      messageContent = [
        {
          type: "text",
          text: `Extract all payment schedule and project information from this appointment letter or payment schedule document:

${fileContent}

Look for:
- Project name/reference
- Client company name
- Client address
- Client VAT number
- Total agreed fee/contract value
- Payment schedule (dates, amounts, milestone descriptions)
- Any notes or special conditions`
        }
      ];
    }

    // Call Lovable AI to extract payment schedule data
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
            content: `You are a document analysis assistant specialized in extracting payment schedules and financial data from appointment letters, contracts, and fee proposals.

Be precise with numbers, dates, and text. If a field is unclear or missing, return null for that field.
Currency amounts should be returned as numbers without currency symbols, commas, or formatting.
Dates should be in ISO format (YYYY-MM-DD).
For payment schedules, identify each milestone/draw with its date, amount, and description.

Common payment schedule patterns to recognize:
- Monthly draws (e.g., "10 equal monthly payments of R104,500")
- Milestone-based payments (e.g., "30% on design approval, 50% on completion")
- Phase payments (e.g., "Phase 1: R500,000, Phase 2: R300,000")
- Retention payments (e.g., "5% retention payable on practical completion")`
          },
          {
            role: 'user',
            content: messageContent
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_payment_schedule",
              description: "Extract structured payment schedule and project data from a document",
              parameters: {
                type: "object",
                properties: {
                  project_name: { 
                    type: ["string", "null"], 
                    description: "Project name or reference" 
                  },
                  client_name: { 
                    type: ["string", "null"], 
                    description: "Client company name" 
                  },
                  client_address: { 
                    type: ["string", "null"], 
                    description: "Full client address" 
                  },
                  client_vat_number: { 
                    type: ["string", "null"], 
                    description: "Client VAT registration number" 
                  },
                  agreed_fee: { 
                    type: ["number", "null"], 
                    description: "Total agreed fee/contract value excluding VAT" 
                  },
                  vat_percentage: {
                    type: ["number", "null"],
                    description: "VAT percentage (e.g., 15)"
                  },
                  payment_terms: {
                    type: ["string", "null"],
                    description: "Payment terms description (e.g., '30 days from invoice')"
                  },
                  start_date: {
                    type: ["string", "null"],
                    description: "Project or payment schedule start date in YYYY-MM-DD format"
                  },
                  end_date: {
                    type: ["string", "null"],
                    description: "Project or payment schedule end date in YYYY-MM-DD format"
                  },
                  payment_schedule: {
                    type: "array",
                    description: "Array of payment milestones",
                    items: {
                      type: "object",
                      properties: {
                        date: {
                          type: ["string", "null"],
                          description: "Payment date in YYYY-MM-DD format, or month in YYYY-MM format"
                        },
                        amount: {
                          type: "number",
                          description: "Payment amount excluding VAT"
                        },
                        description: {
                          type: ["string", "null"],
                          description: "Description of this payment (e.g., 'Draw 1', 'Design Phase', 'Final Payment')"
                        },
                        percentage: {
                          type: ["number", "null"],
                          description: "If payment is expressed as percentage of total"
                        }
                      },
                      required: ["amount"]
                    }
                  },
                  notes: {
                    type: ["string", "null"],
                    description: "Any additional notes, conditions, or special terms"
                  },
                  document_date: {
                    type: ["string", "null"],
                    description: "Date of the document in YYYY-MM-DD format"
                  },
                  document_reference: {
                    type: ["string", "null"],
                    description: "Document reference number or ID"
                  }
                },
                required: ["payment_schedule"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_payment_schedule" } }
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
    if (!toolCall || toolCall.function.name !== 'extract_payment_schedule') {
      throw new Error('Invalid AI response format');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted payment schedule:', extractedData);

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
    console.error('Error in extract-payment-schedule function:', error);
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
