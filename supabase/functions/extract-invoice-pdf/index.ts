import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { pdfBase64, fileName } = await req.json();
    
    if (!pdfBase64) {
      throw new Error("No PDF data provided");
    }

    console.log(`Processing invoice PDF: ${fileName}`);

    // Use Lovable AI to extract invoice data
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting invoice data from PDF documents. Extract the following information accurately:
- Invoice number (look for "TAX INVOICE NO", "INVOICE NO", "INV", etc.)
- Invoice date (look for "DATE", convert to YYYY-MM-DD format)
- Client/Customer name (the company being billed)
- Client VAT number
- Job name/Project description (look for "RE:", "PROJECT:", "REFERENCE:", or the main subject line)
- Amount excluding VAT (look for "Sub Total", "Amount Excl", "Nett")
- VAT amount
- Amount including VAT (look for "Amount Due", "Total", "Amount Incl")
- Any claim number or reference

Be precise with numbers - remove currency symbols and spaces. Return null for fields you cannot find.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all invoice data from this PDF document. Return ONLY a JSON object with the extracted data."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract structured invoice data from a PDF",
              parameters: {
                type: "object",
                properties: {
                  invoice_number: { 
                    type: "string", 
                    description: "The invoice number (e.g., 4491, INV-001)" 
                  },
                  invoice_date: { 
                    type: "string", 
                    description: "Invoice date in YYYY-MM-DD format" 
                  },
                  client_name: { 
                    type: "string", 
                    description: "The name of the client/customer being billed" 
                  },
                  client_vat_number: { 
                    type: "string", 
                    description: "Client's VAT registration number" 
                  },
                  job_name: { 
                    type: "string", 
                    description: "The project name or job description" 
                  },
                  amount_excl_vat: { 
                    type: "number", 
                    description: "Amount excluding VAT as a number" 
                  },
                  vat_amount: { 
                    type: "number", 
                    description: "VAT amount as a number" 
                  },
                  amount_incl_vat: { 
                    type: "number", 
                    description: "Total amount including VAT as a number" 
                  },
                  claim_number: { 
                    type: "string", 
                    description: "Claim or reference number if present" 
                  },
                  notes: {
                    type: "string",
                    description: "Any additional relevant information"
                  }
                },
                required: ["invoice_number", "job_name"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_invoice_data") {
      throw new Error("AI did not return expected extraction data");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted Data:", extractedData);

    // Calculate invoice_month from invoice_date
    let invoiceMonth = null;
    if (extractedData.invoice_date) {
      const dateParts = extractedData.invoice_date.split("-");
      if (dateParts.length >= 2) {
        invoiceMonth = `${dateParts[0]}-${dateParts[1]}`;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extractedData,
          invoice_month: invoiceMonth
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting invoice:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
