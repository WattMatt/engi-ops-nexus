import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalUrl = Deno.env.get('GREENCALC_SUPABASE_URL');
    const externalKey = Deno.env.get('GREENCALC_SUPABASE_ANON_KEY');

    if (!externalUrl || !externalKey) {
      throw new Error('External wm-solar credentials not configured');
    }

    const externalSupabase = createClient(externalUrl, externalKey);
    
    // Tables to check for in wm-solar - comprehensive meter library search
    const tablesToCheck = [
      'project_tenants',
      'tenants', 
      'shops',
      'meters',
      'meter_library',
      'meter_profiles',
      'energy_meters',
      'meter_readings',
      'meter_data',
      'scada_meters',
      'scada_readings',
      'scada_data',
      'scada_profiles',
      'meter_tenant_links',
      'meter_shop_links',
      'load_profiles',
      'shop_types',
      'tenant_types',
      'electrical_data',
      'db_allocations',
      'breaker_allocations',
      'power_allocations',
      'projects',
      'buildings',
      'sites',
      'site_meters',
      'units',
      'unit_meters',
      'imported_meters',
      'meter_imports',
      'meter_sources',
      // Additional meter table variations
      'meter_catalog',
      'all_meters',
      'meter_master',
      'meter_index',
      'meter_register',
      'meter_inventory',
      'site_meter_links',
      'meter_site_links',
      'meter_list'
    ];

    const discoveredTables: any[] = [];

    for (const tableName of tablesToCheck) {
      try {
        const { data, error, count } = await externalSupabase
          .from(tableName)
          .select('*', { count: 'exact', head: false })
          .limit(3);
        
        if (!error && data) {
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          const sampleRow = data.length > 0 ? data[0] : null;
          
          discoveredTables.push({
            table: tableName,
            rowCount: count,
            columns,
            sampleRow,
          });
          console.log(`✓ Table '${tableName}': ${count} rows, columns: ${columns.join(', ')}`);
        }
      } catch (e) {
        // Table doesn't exist or no access
        console.log(`✗ Table '${tableName}': not found or no access`);
      }
    }

    console.log(`\nDiscovered ${discoveredTables.length} accessible tables`);

    return new Response(JSON.stringify({
      success: true,
      tablesFound: discoveredTables.length,
      tables: discoveredTables,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Discovery error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
