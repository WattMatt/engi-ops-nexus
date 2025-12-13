import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching tenant schedule for project: ${projectId}`);

    // Use service role key to bypass RLS for cross-application access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, address')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tenants for the project
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        shop_number,
        shop_name,
        category,
        area,
        kw_allocated,
        manual_kw_override,
        db_size,
        layout_received,
        sow_received,
        lighting_ordered,
        db_ordered,
        status,
        zone,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId)
      .order('shop_number');

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    console.log(`Fetched ${tenants?.length || 0} tenants for project ${projectId}`);

    return new Response(
      JSON.stringify({
        project: {
          id: project.id,
          name: project.name,
          address: project.address
        },
        tenants: tenants || [],
        count: tenants?.length || 0,
        fetchedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in fetch-tenant-schedule:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
