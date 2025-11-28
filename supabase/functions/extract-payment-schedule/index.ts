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

    const extractionPrompt = `Extract all payment schedule and project information from this document. This could be:
- An appointment letter
- A fee proposal or professional fee calculation
- A proposed cashflow schedule
- A payment schedule or draw schedule

Look for and extract:
1. PROJECT DETAILS:
   - Project name/reference
   - Client company name
   - Client address
   - Client VAT number
   - Consultant/company name providing services
   - Discipline (e.g., Electrical Engineer, Architect, QS)

2. FINANCIAL DETAILS:
   - Total agreed fee/contract value
   - Construction cost (if mentioned, for fee basis)
   - Rebate percentage (if applicable)
   - VAT percentage

3. PAYMENT SCHEDULE/CASHFLOW:
   Look for payment tables with columns like:
   - Claim/Invoice numbers
   - Month names (e.g., "December-25", "January-26") - convert to YYYY-MM format
   - Milestones (e.g., "Pre-contract concept", "Construction", "Practical completion")
   - Percentage of fee
   - Invoice amounts
   
4. DATES:
   - Document date
   - Start/end dates
   - Milestone completion dates

5. OTHER:
   - Payment terms
   - Notes or special conditions
   - Document reference/revision number

Be thorough and extract ALL financial data visible in the document.`;

    // Build the message content based on file type
    let messageContent: any[];
    
    if (fileType === 'image') {
      messageContent = [
        { type: "text", text: extractionPrompt },
        { type: "image_url", image_url: { url: fileContent } }
      ];
    } else {
      messageContent = [
        { type: "text", text: `${extractionPrompt}\n\nDOCUMENT CONTENT:\n${fileContent}` }
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
            content: `You are a document analysis assistant specialized in extracting payment schedules and financial data from:
- Appointment letters
- Fee proposals and professional fee calculations
- Proposed cashflow schedules
- Payment draw schedules

IMPORTANT RULES:
1. Be precise with numbers - return amounts as plain numbers without currency symbols or formatting
2. For dates:
   - Full dates: use YYYY-MM-DD format
   - Month-only dates like "December-25" or "Jan-26": convert to YYYY-MM format (e.g., "2025-12", "2026-01")
   - Relative dates like "TBC": return null for the date
3. For payment schedules:
   - Include ALL payment rows even if amount is R0.00
   - Preserve the milestone/description text
   - Include both percentage and amount when available
4. If a field is unclear or missing, return null for that field

Common document patterns:
- Professional fee calculations with statutory guidelines, rebates, and cashflow tables
- Appointment letters with monthly draw schedules
- Fee proposals with milestone-based payments
- Claim schedules with invoice numbers and payment dates`
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
                    description: "Client company name (the party paying)" 
                  },
                  client_address: { 
                    type: ["string", "null"], 
                    description: "Full client address" 
                  },
                  client_vat_number: { 
                    type: ["string", "null"], 
                    description: "Client VAT registration number" 
                  },
                  consultant_name: {
                    type: ["string", "null"],
                    description: "Consultant/company providing services"
                  },
                  discipline: {
                    type: ["string", "null"],
                    description: "Professional discipline (e.g., Electrical Engineer, Architect)"
                  },
                  agreed_fee: { 
                    type: ["number", "null"], 
                    description: "Total agreed fee/contract value excluding VAT" 
                  },
                  construction_cost: {
                    type: ["number", "null"],
                    description: "Total construction cost used for fee calculation purposes"
                  },
                  rebate_percentage: {
                    type: ["number", "null"],
                    description: "Rebate percentage offered (negative if discount)"
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
                    description: "Project or payment schedule start date in YYYY-MM-DD or YYYY-MM format"
                  },
                  end_date: {
                    type: ["string", "null"],
                    description: "Project or payment schedule end date in YYYY-MM-DD or YYYY-MM format"
                  },
                  payment_schedule: {
                    type: "array",
                    description: "Array of payment milestones/claims",
                    items: {
                      type: "object",
                      properties: {
                        claim_number: {
                          type: ["number", "null"],
                          description: "Claim or invoice number if specified"
                        },
                        date: {
                          type: ["string", "null"],
                          description: "Payment date in YYYY-MM-DD or YYYY-MM format"
                        },
                        amount: {
                          type: "number",
                          description: "Payment amount excluding VAT"
                        },
                        description: {
                          type: ["string", "null"],
                          description: "Description/milestone (e.g., 'Pre-contract concept', 'Construction', 'Practical completion')"
                        },
                        percentage: {
                          type: ["number", "null"],
                          description: "Percentage of total fee for this payment"
                        },
                        cumulative_percentage: {
                          type: ["number", "null"],
                          description: "Cumulative percentage if shown"
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
                    description: "Document reference number, revision, or ID"
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
    console.log('Extracted payment schedule:', JSON.stringify(extractedData, null, 2));

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
