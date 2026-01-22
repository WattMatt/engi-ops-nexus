import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate kVA from db_size_allowance string (e.g., "60A TP" -> 60 * 0.4 * 1.732 = 41.57 kVA for 3-phase)
function parseDbSizeToKva(dbSize: string | null): number {
  if (!dbSize) return 0;
  
  const match = dbSize.match(/(\d+)A\s*(TP|SP)?/i);
  if (!match) return 0;
  
  const amps = parseInt(match[1], 10);
  const phase = match[2]?.toUpperCase();
  
  // Assume 400V for TP (3-phase), 230V for SP (single-phase)
  if (phase === 'TP') {
    return (amps * 400 * 1.732) / 1000; // 3-phase kVA
  } else {
    return (amps * 230) / 1000; // Single-phase kVA
  }
}

// Fallback estimate from monthly kWh when no db_size available
function estimateKvaFromMonthlyKwh(monthlyKwh: number | null, areaSqm: number | null): number {
  if (monthlyKwh && monthlyKwh > 0) {
    const avgKw = monthlyKwh / 280; // Assume 280 operating hours/month
    const peakKw = avgKw * 1.4; // Peak = 1.4x average
    return peakKw / 0.9; // Convert to kVA assuming 0.9 PF
  }
  if (areaSqm && areaSqm > 0) {
    return (areaSqm * 75) / 1000; // 75 VA/m² average, convert to kVA
  }
  return 0;
}

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
    
    // Fetch ALL tenants using pagination - use * to get all available columns
    const pageSize = 1000;
    let allTenants: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: tenants, error } = await externalSupabase
        .from('project_tenants')
        .select('*')
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

    // Log available columns from first record
    if (allTenants.length > 0) {
      console.log('Available columns:', Object.keys(allTenants[0]));
    }

    // Map to a simpler structure for the dropdown
    // Dynamically check for db_size columns that might exist
    const meterProfiles = allTenants.map((t: any) => {
      // Try various possible column names for db_size
      const dbSize = t.db_size || t.circuit_size || t.breaker_size || t.supply_size || 
                     t.db_size_allowance || t.connection_size || null;
      
      // Calculate kVA - prioritize db_size parsing if available
      let kva = parseDbSizeToKva(dbSize);
      
      // Fallback to energy/area-based estimate if no db_size
      if (kva <= 0) {
        kva = estimateKvaFromMonthlyKwh(t.monthly_kwh_override, t.area_sqm);
      }
      
      return {
        id: t.id,
        name: t.name || 'Unknown',
        area_sqm: t.area_sqm || 0,
        kva: Math.round(kva * 100) / 100,
        monthly_kwh: t.monthly_kwh_override || 0,
        db_size: dbSize || null,
      };
    });

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
