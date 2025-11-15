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
    const { reportId, projectId } = await req.json();
    console.log("[generate-template-pdf] Request:", { reportId, projectId });

    if (!reportId || !projectId) {
      throw new Error("Missing reportId or projectId");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the cost report with all its data
    const { data: report, error: reportError } = await supabase
      .from("cost_reports")
      .select(`
        *,
        projects (*)
      `)
      .eq("id", reportId)
      .single();

    if (reportError) throw reportError;
    console.log("[generate-template-pdf] Fetched report:", report.project_name);

    // Fetch categories with line items
    const { data: categories, error: categoriesError } = await supabase
      .from("cost_categories")
      .select("*")
      .eq("cost_report_id", reportId)
      .order("display_order");

    if (categoriesError) throw categoriesError;

    const { data: allLineItems, error: lineItemsError } = await supabase
      .from("cost_line_items")
      .select("*")
      .in("category_id", categories.map((c) => c.id))
      .order("display_order");

    if (lineItemsError) throw lineItemsError;

    // Fetch variations
    const { data: variations, error: variationsError } = await supabase
      .from("cost_variations")
      .select("*")
      .eq("cost_report_id", reportId)
      .order("display_order");

    if (variationsError) throw variationsError;

    // Fetch details
    const { data: details, error: detailsError } = await supabase
      .from("cost_report_details")
      .select("*")
      .eq("cost_report_id", reportId)
      .order("display_order");

    if (detailsError) throw detailsError;

    // Now generate the template PDF
    // Instead of actual values, we'll use placeholder syntax
    const templateData = {
      report: {
        ...report,
        client_name: "{Client_Name}",
        project_name: "{Project_Name}",
        project_number: "{Project_Number}",
        report_date: "{Report_Date}",
        report_number: "{Report_Number}",
        practical_completion_date: "{Practical_Completion_Date}",
        site_handover_date: "{Site_Handover_Date}",
        electrical_contractor: "{Electrical_Contractor}",
        cctv_contractor: "{CCTV_Contractor}",
        standby_plants_contractor: "{Standby_Plants_Contractor}",
        earthing_contractor: "{Earthing_Contractor}",
      },
      categories: categories.map((cat, idx) => ({
        ...cat,
        code: `{Category_${idx + 1}_Code}`,
        description: `{Category_${idx + 1}_Description}`,
        original_budget: "{Original_Budget}",
        previous_report: "{Previous_Report}",
        anticipated_final: "{Anticipated_Final}",
      })),
      lineItems: allLineItems.map((item, idx) => ({
        ...item,
        code: `{LineItem_${idx + 1}_Code}`,
        description: `{LineItem_${idx + 1}_Description}`,
        original_budget: "{Original_Budget}",
        previous_report: "{Previous_Report}",
        anticipated_final: "{Anticipated_Final}",
      })),
      variations: variations.map((v, idx) => ({
        ...v,
        code: `{Variation_${idx + 1}_Code}`,
        description: `{Variation_${idx + 1}_Description}`,
        amount: "{Amount}",
      })),
      details: details.map((d, idx) => ({
        ...d,
        section_title: `{Section_${idx + 1}_Title}`,
        section_content: `{Section_${idx + 1}_Content}`,
      })),
    };

    // Return the template data for client-side PDF generation
    // The client will use the same PDF generation logic but with template values
    return new Response(
      JSON.stringify({
        success: true,
        templateData,
        message: "Template data prepared - client will generate PDF",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[generate-template-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
