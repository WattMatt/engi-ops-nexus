import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Validate share token
    const { data: share, error: shareError } = await supabase
      .from("generator_report_shares")
      .select("*")
      .eq("token", token)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = share.project_id;
    const sharedSections = share.shared_sections || [];

    // 2. Update view count
    await supabase
      .from("generator_report_shares")
      .update({
        viewed_at: new Date().toISOString(),
        view_count: (share.view_count || 0) + 1,
      })
      .eq("id", share.id);

    // 3. Fetch all needed data in parallel
    const [projectRes, zonesRes, settingsRes] = await Promise.all([
      supabase.from("projects").select("id, name, address, client_name").eq("id", projectId).single(),
      supabase.from("generator_zones").select("*").eq("project_id", projectId).order("display_order"),
      supabase.from("generator_settings").select("*").eq("project_id", projectId).maybeSingle(),
    ]);

    const zones = zonesRes.data || [];
    const zoneIds = zones.map((z: any) => z.id);

    // Fetch zone generators and tenants in parallel
    const [generatorsRes, tenantsRes] = await Promise.all([
      zoneIds.length > 0
        ? supabase.from("zone_generators").select("*").in("zone_id", zoneIds)
        : Promise.resolve({ data: [], error: null }),
      sharedSections.includes("breakdown") || sharedSections.includes("overview")
        ? supabase.from("tenants").select("*").eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    return new Response(
      JSON.stringify({
        share: {
          id: share.id,
          expires_at: share.expires_at,
          created_at: share.created_at,
          shared_sections: sharedSections,
          recipient_name: share.recipient_name,
        },
        project: projectRes.data || { id: projectId, name: "Project" },
        zones,
        zoneGenerators: generatorsRes.data || [],
        tenants: tenantsRes.data || [],
        settings: settingsRes.data || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching shared report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
