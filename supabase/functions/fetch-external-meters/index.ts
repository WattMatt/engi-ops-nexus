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
    
    // Fetch ALL tenants using pagination to bypass default 1000 row limit
    const pageSize = 1000;
    let allTenants: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: tenants, error } = await externalSupabase
        .from('project_tenants')
        .select('id, name, area_sqm, monthly_kwh_override, shop_type_id')
        .order('name')
        .range(from, to);

      if (error) {
        throw error;
      }

      if (tenants && tenants.length > 0) {
        allTenants = [...allTenants, ...tenants];
        hasMore = tenants.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    // Calculate kVA from monthly_kwh
    const estimateKvaFromMonthlyKwh = (monthlyKwh: number | null, areaSqm: number | null): number => {
      if (monthlyKwh && monthlyKwh > 0) {
        const avgKw = monthlyKwh / 280; // Assume 280 operating hours/month
        const peakKw = avgKw * 1.4; // Peak = 1.4x average
        return Math.round((peakKw / 0.9) * 100) / 100; // Convert to kVA
      }
      if (areaSqm && areaSqm > 0) {
        return Math.round(((areaSqm * 75) / 1000) * 100) / 100; // 75 VA/m²
      }
      return 0;
    };

    // Map to a simpler structure for the dropdown
    const meterProfiles = allTenants.map((t: any) => ({
      id: t.id,
      name: t.name || 'Unknown',
      area_sqm: t.area_sqm || 0,
      kva: estimateKvaFromMonthlyKwh(t.monthly_kwh_override, t.area_sqm),
      monthly_kwh: t.monthly_kwh_override || 0,
    }));

    console.log(`Fetched ${meterProfiles.length} meter profiles from wm-solar (${page} page(s))`);

    return new Response(JSON.stringify({
      success: true,
      count: meterProfiles.length,
      profiles: meterProfiles,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
