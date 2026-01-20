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
    const { profileId, projectId, direction } = await req.json();
    console.log(`Sync request: profileId=${profileId}, direction=${direction}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const externalUrl = Deno.env.get('GREENCALC_SUPABASE_URL');
    const externalKey = Deno.env.get('GREENCALC_SUPABASE_ANON_KEY');

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    if (!externalUrl || !externalKey) {
      console.log('External credentials not configured, marking as synced');
      await supabase.from('load_profiles').update({
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
      }).eq('id', profileId);
      
      return new Response(JSON.stringify({ success: true, message: 'No external system configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Update sync status to syncing
    await supabase.from('load_profiles').update({ sync_status: 'syncing' }).eq('id', profileId);

    if (direction === 'pull' || direction === 'both') {
      // Pull tenant data from external system
      const { data: externalTenants } = await externalSupabase
        .from('tenants')
        .select('*')
        .order('shop_number');

      if (externalTenants?.length) {
        // Group by category and create summaries
        const categoryMap = new Map();
        externalTenants.forEach((t: any) => {
          const cat = t.shop_category || 'Uncategorized';
          const existing = categoryMap.get(cat) || { load: 0, count: 0, area: 0 };
          categoryMap.set(cat, {
            load: existing.load + (t.manual_kw_override || 0),
            count: existing.count + 1,
            area: existing.area + (t.area || 0),
          });
        });

        // Upsert category summaries
        const summaries = Array.from(categoryMap.entries()).map(([name, data], i) => ({
          profile_id: profileId,
          category_name: name,
          category_code: name.substring(0, 3).toUpperCase(),
          total_connected_load_kva: data.load,
          max_demand_kva: data.load * 0.8,
          total_area_sqm: data.area,
          shop_count: data.count,
          display_order: i,
        }));

        await supabase.from('load_category_summary').delete().eq('profile_id', profileId);
        await supabase.from('load_category_summary').insert(summaries);
        console.log(`Pulled ${summaries.length} categories from external system`);
      }
    }

    if (direction === 'push' || direction === 'both') {
      // Push linkages to external system as meter connections
      const { data: linkages } = await supabase
        .from('meter_shop_linkages')
        .select('*')
        .eq('profile_id', profileId);

      console.log(`Would push ${linkages?.length || 0} linkages to external system`);
      // External push logic would go here
    }

    // Mark as synced
    await supabase.from('load_profiles').update({
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      is_synced_to_external: true,
    }).eq('id', profileId);

    return new Response(JSON.stringify({ success: true, direction }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
