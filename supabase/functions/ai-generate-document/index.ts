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
    const body = await req.json();
    const { documentType, projectData, specifications } = body;
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
      
      bulk_services_section: `Generate professional technical content for a bulk services electrical engineering document section. 

CRITICAL CONTEXT - Use these as the key driving points for the entire report:
1. Project Purpose: [PROJECT DESCRIPTION] - This defines what we're trying to achieve
2. Client Context: Prepared for [CLIENT NAME], represented by [CLIENT REPRESENTATIVE]
3. Supply Authority: Working with [SUPPLY AUTHORITY] - this shapes technical requirements and approval processes

The content should:
- Be technical and professional in tone
- Align with the project description and client's objectives
- Address requirements specific to the supply authority
- Reference the client representative as the key stakeholder
- Use proper South African electrical engineering standards (SANS 204, SANS 10142-1)
- Include relevant calculations and justifications
- Use markdown tables for technical data, specifications, and calculations (especially for supply requirements, load calculations, and equipment specifications)
- Use numbered lists for objectives, requirements, and procedural items
- Use bullet points only for brief supporting details
- Be approximately 200-400 words

IMPORTANT: When presenting technical data such as project area, load density, calculated demand, voltage levels, or equipment specifications, ALWAYS format as a markdown table:

| Parameter | Value | Unit |
|-----------|-------|------|
| Total Project Area | [AREA] | m² |
| Load Density | [VA/m²] | VA/m² |
| Estimated Maximum Demand | [SIZE] | kVA |

Use these placeholders that will be replaced:
- [PROJECT DESCRIPTION] for project description and objectives
- [CLIENT REPRESENTATIVE] for client representative name
- [AREA] for project area
- [VA/m²] for VA per square meter
- [SIZE] for calculated size in kVA
- [SUPPLY AUTHORITY] for the supply authority name
- [CLIENT NAME] for client name
- [DOCUMENT NUMBER] for document number
- [CLIMATIC ZONE] for the climatic zone description
- [CALCULATION TYPE] for the calculation standard used
- [PRIMARY VOLTAGE] for primary voltage
- [CONNECTION SIZE] for connection size
- [DIVERSITY FACTOR] for diversity factor
- [ELECTRICAL STANDARD] for electrical standard

Return ONLY the section content, no headers or titles.`,
    };

    const prompt = documentPrompts[documentType] || documentPrompts.specification;

    let userContent = `${prompt}

Project Data:
${JSON.stringify(projectData, null, 2)}

Additional Specifications:
${specifications || "Standard specifications apply"}

Generate the document in markdown format with proper headings and sections.`;

    // Special handling for bulk services sections
    if (documentType === 'bulk_services_section' && body.sectionTitle && body.sectionNumber) {
      userContent = `${prompt}

Section Number: ${body.sectionNumber}
Section Title: ${body.sectionTitle}

Project Information:
${JSON.stringify(projectData, null, 2)}

Generate professional content for this section following the guidelines above. Focus on technical accuracy and include relevant calculations where appropriate.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert technical writer specializing in electrical engineering documentation. Generate professional, well-structured documents following industry standards.",
          },
          {
            role: "user",
            content: userContent,
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
    const generatedContent = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ content: generatedContent }),
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
