import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, reportType, projectData, size = "1536x1024", quality = "high" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context-aware prompt based on report type
    let enhancedPrompt = prompt;
    
    if (reportType === 'generator_report') {
      enhancedPrompt = `Create a professional engineering infographic for a Generator Report. 
Style: Technical, professional, electrical engineering aesthetic with South African standards (SANS).
Include: Generator icon, power symbols, electrical diagrams style.
Context: ${projectData ? JSON.stringify(projectData) : ''}
User request: ${prompt}`;
    } else if (reportType === 'tenant_report') {
      enhancedPrompt = `Create a professional engineering infographic for a Tenant Electrical Report.
Style: Clean, modern, professional with electrical engineering elements.
Include: Building/tenant icons, electrical distribution symbols, load distribution visuals.
Context: ${projectData ? JSON.stringify(projectData) : ''}
User request: ${prompt}`;
    } else if (reportType === 'cost_report') {
      enhancedPrompt = `Create a professional financial/engineering infographic for a Cost Report.
Style: Corporate, professional, data-driven aesthetic.
Include: Charts, graphs, financial symbols, electrical project elements.
Context: ${projectData ? JSON.stringify(projectData) : ''}
User request: ${prompt}`;
    } else if (reportType === 'cable_schedule') {
      enhancedPrompt = `Create a professional engineering infographic for a Cable Schedule.
Style: Technical drawing aesthetic, electrical engineering style.
Include: Cable symbols, conduit systems, electrical distribution diagrams.
Context: ${projectData ? JSON.stringify(projectData) : ''}
User request: ${prompt}`;
    } else if (reportType === 'bulk_services') {
      enhancedPrompt = `Create a professional engineering infographic for a Bulk Services Report.
Style: Infrastructure, utility-scale, professional engineering aesthetic.
Include: Electrical infrastructure symbols, supply authority elements, grid connection visuals.
Context: ${projectData ? JSON.stringify(projectData) : ''}
User request: ${prompt}`;
    }

    // Call Lovable AI image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    // Optional: Store the infographic in Supabase storage
    // This would require converting base64 to blob and uploading
    // For now, we return the base64 image directly

    return new Response(
      JSON.stringify({ 
        imageUrl,
        message: "Infographic generated successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-infographic function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
