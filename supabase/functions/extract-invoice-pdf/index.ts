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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      throw new Error("No PDF data provided");
    }

    console.log(`Processing invoice PDF: ${fileName}`);

    // Use AI to extract invoice data
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: `You are an expert at extracting invoice data from PDF documents. Extract the following information accurately:
- Invoice number (look for "TAX INVOICE NO", "INVOICE NO", "INV", etc.)
- Invoice date (look for "DATE", convert to YYYY-MM-DD format)
- Client/Customer name (the company being billed)
- Client VAT number
- Job name/Project description (look for "RE:", "PROJECT:", "REFERENCE:", or the main subject line)
- Amount excluding VAT (look for "Sub Total", "Amount Excl", "Nett")
- VAT amount
- Amount including VAT (look for "Amount Due", "Total", "Amount Incl")
- Any claim number or reference

Be precise with numbers - remove currency symbols and spaces. Return null for fields you cannot find.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all invoice data from this PDF document. Return ONLY a JSON object with the extracted data."
              },
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64
                }
              }
            ]
          }
        ],
        tools: [
          {
            name: "extract_invoice_data",
            description: "Extract structured invoice data from a PDF",
            input_schema: {
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
        ],
        tool_choice: { type: "tool", name: "extract_invoice_data" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);

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

    // Extract the tool use result
    const toolUseBlock = aiResponse.content?.find((block: any) => block.type === "tool_use");
    if (!toolUseBlock || toolUseBlock.name !== "extract_invoice_data") {
      throw new Error("AI did not return expected extraction data");
    }

    const extractedData = toolUseBlock.input;
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
