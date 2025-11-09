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

You must respond with a JSON object containing both structured data for visualizations AND a detailed markdown analysis.

REQUIRED JSON FORMAT:
{
  "summary": {
    "totalEstimate": number,
    "confidenceLevel": number (0-100),
    "currency": "ZAR"
  },
  "costBreakdown": [
    { "category": "Materials & Equipment", "amount": number, "percentage": number },
    { "category": "Labor", "amount": number, "percentage": number },
    { "category": "Cable & Wiring", "amount": number, "percentage": number },
    { "category": "Installation", "amount": number, "percentage": number },
    { "category": "Testing & Commissioning", "amount": number, "percentage": number },
    { "category": "Contingency", "amount": number, "percentage": number }
  ],
  "historicalTrend": [
    { "project": "Project Name", "budgeted": number, "actual": number }
  ],
  "riskFactors": [
    { "risk": "Risk Name", "probability": number (0-100), "impact": number (in currency) }
  ],
  "analysis": "Detailed markdown analysis with all sections as requested"
}

Make sure all numbers are realistic and based on the historical data provided.`;

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
            content: "You are an expert electrical engineering cost estimator. You must respond with valid JSON containing both structured data for charts and a detailed markdown analysis.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
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
    const predictionText = data.choices[0].message.content;
    
    // Parse the JSON response
    let predictionData;
    try {
      predictionData = JSON.parse(predictionText);
    } catch (e) {
      console.error("Failed to parse JSON, returning raw text:", e);
      predictionData = {
        analysis: predictionText,
        summary: { totalEstimate: 0, confidenceLevel: 0, currency: "ZAR" },
        costBreakdown: [],
        historicalTrend: [],
        riskFactors: []
      };
    }

    return new Response(
      JSON.stringify({ 
        ...predictionData,
        historicalDataPoints: historicalCosts?.length || 0 
      }),
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
