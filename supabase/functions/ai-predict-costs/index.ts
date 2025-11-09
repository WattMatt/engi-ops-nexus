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
    const { projectId, projectParameters } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch historical cost data from completed projects
    const { data: historicalCosts } = await supabase
      .from("cost_reports")
      .select(`
        *,
        cost_categories(*)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch historical budgets
    const { data: historicalBudgets } = await supabase
      .from("electrical_budgets")
      .select(`
        *,
        budget_sections(
          *,
          budget_line_items(*)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch current project data
    const { data: currentProject } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    // Fetch cable schedules for the project
    const { data: cableSchedules } = await supabase
      .from("cable_schedules")
      .select(`
        *,
        cable_entries(*)
      `)
      .eq("project_id", projectId);

    const prompt = `You are an expert cost estimator for electrical engineering projects. 
Analyze the historical project data and provide a detailed cost prediction for the current project.

HISTORICAL DATA:
Cost Reports: ${JSON.stringify(historicalCosts, null, 2)}
Budgets: ${JSON.stringify(historicalBudgets, null, 2)}

CURRENT PROJECT:
Project Details: ${JSON.stringify(currentProject, null, 2)}
Cable Schedules: ${JSON.stringify(cableSchedules, null, 2)}
Additional Parameters: ${JSON.stringify(projectParameters, null, 2)}

Provide a comprehensive cost prediction including:

1. **Total Estimated Cost** (with confidence level)
2. **Cost Breakdown by Category**:
   - Materials & Equipment
   - Labor
   - Cable & Wiring
   - Installation
   - Testing & Commissioning
   - Contingency

3. **Cost Drivers Analysis**: Key factors affecting the cost

4. **Comparison with Historical Projects**: How this compares to similar projects

5. **Risk Factors**: Potential cost overruns and their likelihood

6. **Recommendations**: Ways to optimize costs

7. **Timeline Impact**: How timeline affects costs

Format your response in clear sections with specific numbers and percentages. Be realistic and data-driven.`;

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
            content: "You are an expert electrical engineering cost estimator with deep knowledge of construction costs, labor rates, material pricing, and project management.",
          },
          {
            role: "user",
            content: prompt,
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
    const prediction = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ prediction, historicalDataPoints: historicalCosts?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-predict-costs function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
