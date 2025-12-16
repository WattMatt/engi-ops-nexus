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
    const { analytics } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a lighting analytics expert. Analyze the provided portfolio data and generate actionable insights.
    
Focus on:
1. Cost optimization opportunities
2. Energy efficiency improvements
3. Manufacturer/supplier recommendations
4. Standardization opportunities
5. Anomalies or outliers that need attention

Return insights in this exact JSON format:
{
  "insights": [
    {
      "type": "opportunity" | "recommendation" | "anomaly" | "trend",
      "title": "Brief title",
      "description": "Detailed explanation",
      "impact": "Potential benefit or risk"
    }
  ]
}

Limit to 5-7 most important insights. Be specific and actionable.`;

    const userPrompt = `Analyze this lighting portfolio data and provide insights:

Portfolio Summary:
- Total Fittings: ${analytics.totalFittings}
- Total Portfolio Value: R${analytics.totalCost?.toLocaleString() || 0}
- Average Efficacy: ${analytics.avgEfficacy} lm/W
- Average Wattage: ${analytics.avgWattage}W

Top Manufacturers:
${analytics.topManufacturers?.map((m: any) => `- ${m.name}: ${m.count} fittings (${m.share}% market share)`).join('\n') || 'No data'}

Fitting Types:
${analytics.fittingTypes?.map((t: any) => `- ${t.type}: ${t.count} fittings`).join('\n') || 'No data'}

Generate insights focused on cost savings, efficiency improvements, and strategic recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let insights;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      insights = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default insight if parsing fails
      insights = {
        insights: [{
          type: "recommendation",
          title: "Analysis Complete",
          description: "Portfolio analysis was completed. Review the analytics dashboard for detailed metrics.",
          impact: "Data-driven decision making"
        }]
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in lighting-insights:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      insights: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
