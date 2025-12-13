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
    console.log('Fetching all projects with tenant schedules');

    // Use service role key to bypass RLS
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

    // Fetch all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, project_number, client_name, city, province')
      .order('project_number');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      throw projectsError;
    }

    // Fetch all tenants
    const { data: allTenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        project_id,
        shop_number,
        shop_name,
        shop_category,
        area,
        manual_kw_override,
        db_size_allowance,
        db_size_scope_of_work,
        layout_received,
        sow_received,
        lighting_ordered,
        db_ordered,
        generator_zone_id,
        opening_date,
        beneficial_occupation_days,
        own_generator_provided,
        generator_loading_sector_1,
        generator_loading_sector_2,
        created_at,
        updated_at
      `)
      .order('shop_number');

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    // Group tenants by project_id
    const tenantsByProject = (allTenants || []).reduce((acc, tenant) => {
      if (!acc[tenant.project_id]) {
        acc[tenant.project_id] = [];
      }
      acc[tenant.project_id].push(tenant);
      return acc;
    }, {} as Record<string, any[]>);

    // Combine projects with their tenants
    const projectsWithTenants = (projects || []).map(project => ({
      ...project,
      tenants: tenantsByProject[project.id] || [],
      tenant_count: (tenantsByProject[project.id] || []).length
    }));

    console.log(`Fetched ${projects?.length || 0} projects with ${allTenants?.length || 0} total tenants`);

    return new Response(
      JSON.stringify({
        projects: projectsWithTenants,
        total_projects: projects?.length || 0,
        total_tenants: allTenants?.length || 0,
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