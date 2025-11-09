import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentType, projectData, specifications } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const documentPrompts: Record<string, string> = {
      specification: `Generate a comprehensive electrical specification document including:
- Scope of work
- Technical requirements
- Equipment specifications
- Installation standards
- Testing and commissioning requirements
- Quality assurance procedures`,
      
      report: `Generate a detailed technical report including:
- Executive summary
- Project overview
- Technical findings
- Analysis and recommendations
- Conclusions
- Supporting data and calculations`,
      
      variation: `Generate a variation order document including:
- Description of variation
- Reason for change
- Cost impact analysis
- Time impact assessment
- Updated scope of work
- Approval requirements`,
      
      handover: `Generate a project handover document including:
- Project completion summary
- Final test results
- As-built documentation checklist
- Operations and maintenance manuals
- Warranty information
- Contact information for ongoing support`,
    };

    const prompt = documentPrompts[documentType] || documentPrompts.specification;

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
            content: "You are an expert technical writer specializing in electrical engineering documentation. Generate professional, well-structured documents following industry standards.",
          },
          {
            role: "user",
            content: `${prompt}

Project Data:
${JSON.stringify(projectData, null, 2)}

Additional Specifications:
${specifications || "Standard specifications apply"}

Generate the document in markdown format with proper headings and sections.`,
          },
        ],
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const generatedDocument = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ document: generatedDocument }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-generate-document function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
