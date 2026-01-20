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

// Map shop_category to standard categories
function normalizeCategory(category: string | null): string {
  const categoryMap: Record<string, string> = {
    'national': 'Anchor',
    'anchor': 'Anchor',
    'major': 'Major',
    'standard': 'Line Shop',
    'line': 'Line Shop',
    'line shop': 'Line Shop',
    'food': 'Food Court',
    'food court': 'Food Court',
    'restaurant': 'Restaurant',
    'entertainment': 'Entertainment',
    'services': 'Services',
    'kiosk': 'Kiosk',
    'atm': 'ATM',
    'common': 'Common Areas',
    'common areas': 'Common Areas',
  };
  
  const normalized = category?.toLowerCase() || 'uncategorized';
  return categoryMap[normalized] || category || 'Uncategorized';
}

// Diversity factors by category (industry standard)
const DIVERSITY_FACTORS: Record<string, number> = {
  'Anchor': 0.7,
  'Major': 0.75,
  'Line Shop': 0.8,
  'Food Court': 0.85,
  'Restaurant': 0.85,
  'Entertainment': 0.7,
  'Services': 0.8,
  'Kiosk': 0.9,
  'ATM': 0.95,
  'Common Areas': 0.6,
  'Uncategorized': 0.8,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileId, projectId, direction, source } = await req.json();
    console.log(`Sync request: profileId=${profileId}, projectId=${projectId}, direction=${direction}, source=${source || 'local'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const externalUrl = Deno.env.get('GREENCALC_SUPABASE_URL');
    const externalKey = Deno.env.get('GREENCALC_SUPABASE_ANON_KEY');

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Update sync status to syncing
    await supabase.from('load_profiles').update({ sync_status: 'syncing' }).eq('id', profileId);

    let tenantData: any[] = [];
    let syncSource = source || 'local';

    // Determine data source
    if (syncSource === 'external' && externalUrl && externalKey) {
      // Pull from external wm-solar system (uses 'project_tenants' table)
      console.log('Fetching from external wm-solar system...');
      const externalSupabase = createClient(externalUrl, externalKey);
      
      // First try to get schema info by fetching a single row
      let externalTenants: any[] = [];
      
      // Try common table names that wm-solar might use
      const possibleTables = ['project_tenants', 'tenants', 'tenant_schedule', 'shops'];
      
      for (const tableName of possibleTables) {
        console.log(`Trying table: ${tableName}...`);
        const { data, error } = await externalSupabase
          .from(tableName)
          .select('*')
          .limit(5);
        
        if (!error && data && data.length > 0) {
          console.log(`Found data in table '${tableName}'. Columns:`, Object.keys(data[0]));
          
          // Fetch all records
          const { data: allData, error: fetchError } = await externalSupabase
            .from(tableName)
            .select('*');
          
          if (!fetchError) {
            externalTenants = allData || [];
            console.log(`Fetched ${externalTenants.length} records from ${tableName}`);
            break;
          }
        } else if (error) {
          console.log(`Table '${tableName}' error:`, error.message);
        }
      }
      
      if (externalTenants.length === 0) {
        throw new Error('No tenant data found in external wm-solar database');
      }
      
      // Log first record keys to understand schema
      console.log('Sample record:', JSON.stringify(externalTenants[0], null, 2));
      
      // wm-solar stores monthly_kwh_override - estimate connected load from energy consumption
      // Typical commercial building operates ~10-12 hours/day, ~25 days/month = ~250-300 hours
      // kW_avg = monthly_kwh / 300, peak_kW = kW_avg * 1.5, kVA = peak_kW / 0.9 (PF)
      const estimateKvaFromMonthlyKwh = (monthlyKwh: number | null): number => {
        if (!monthlyKwh || monthlyKwh <= 0) return 0;
        const avgKw = monthlyKwh / 280; // Assume 280 operating hours/month
        const peakKw = avgKw * 1.4; // Peak = 1.4x average
        return peakKw / 0.9; // Convert to kVA assuming 0.9 PF
      };
      
      // Map wm-solar column names to local structure dynamically
      tenantData = externalTenants.map((t: any) => {
        // Calculate kVA from monthly_kwh_override or area-based estimate
        let connectedKva = estimateKvaFromMonthlyKwh(t.monthly_kwh_override);
        
        // If no kwh data, estimate from area (typical 50-100 VA/m² for retail)
        if (connectedKva <= 0 && t.area_sqm > 0) {
          connectedKva = (t.area_sqm * 75) / 1000; // 75 VA/m² average, convert to kVA
        }
        
        return {
          id: t.id,
          shop_number: t.unit_number || t.shop_number || t.unit || t.number || `Unit-${t.id?.toString().slice(0,4)}`,
          shop_name: t.tenant_name || t.name || t.shop_name || t.tenant || 'Unknown',
          shop_category: t.category || t.tenant_category || t.type || t.shop_type || 'standard',
          area: t.area_sqm || t.area || t.size || t.floor_area || 0,
          db_size_allowance: t.db_size || t.circuit_size || t.breaker_size || t.supply_size,
          manual_kw_override: connectedKva, // Use calculated value
          own_generator_provided: t.has_generator || t.generator || t.own_generator || false,
          exclude_from_totals: t.excluded || t.exclude || t.exclude_from_totals || false,
        };
      });
      console.log(`Mapped ${tenantData.length} tenants from external wm-solar system`);
    } else {
      // Pull from local tenant schedule (same project)
      console.log('Fetching from local tenant schedule...');
      const { data: localTenants, error: localError } = await supabase
        .from('tenants')
        .select('*')
        .eq('project_id', projectId)
        .order('shop_number');
      
      if (localError) {
        console.error('Local fetch error:', localError);
      } else {
        tenantData = localTenants || [];
        console.log(`Fetched ${tenantData.length} tenants from local project`);
      }
    }

    if (tenantData.length > 0) {
      // Create meter-shop linkages from tenant data
      const linkages = tenantData
        .filter(t => !t.exclude_from_totals)
        .map((t: any, index: number) => {
          const connectedKva = t.manual_kw_override || parseDbSizeToKva(t.db_size_allowance);
          const category = normalizeCategory(t.shop_category);
          const diversityFactor = DIVERSITY_FACTORS[category] || 0.8;
          
          return {
            profile_id: profileId,
            project_id: projectId,
            meter_id: `M-${t.shop_number?.replace(/\s+/g, '') || index + 1}`,
            meter_name: `${t.shop_name} Meter`,
            meter_type: t.own_generator_provided ? 'tenant' : 'sub',
            shop_number: t.shop_number,
            shop_name: t.shop_name,
            shop_category: category,
            connected_load_kva: connectedKva,
            max_demand_kva: connectedKva * diversityFactor,
            power_factor: 0.9,
            diversity_factor: diversityFactor,
            notes: t.db_size_allowance ? `DB Size: ${t.db_size_allowance}` : null,
            is_active: true,
            external_linkage_id: t.id,
          };
        });

      // Clear existing linkages for this profile and insert new ones
      await supabase.from('meter_shop_linkages').delete().eq('profile_id', profileId);
      
      if (linkages.length > 0) {
        const { error: insertError } = await supabase.from('meter_shop_linkages').insert(linkages);
        if (insertError) {
          console.error('Insert linkages error:', insertError);
        } else {
          console.log(`Created ${linkages.length} meter-shop linkages`);
        }
      }

      // Group by category and create summaries
      const categoryMap = new Map<string, { load: number; count: number; area: number; maxDemand: number }>();
      
      tenantData.filter(t => !t.exclude_from_totals).forEach((t: any) => {
        const cat = normalizeCategory(t.shop_category);
        const connectedKva = t.manual_kw_override || parseDbSizeToKva(t.db_size_allowance);
        const diversityFactor = DIVERSITY_FACTORS[cat] || 0.8;
        
        const existing = categoryMap.get(cat) || { load: 0, count: 0, area: 0, maxDemand: 0 };
        categoryMap.set(cat, {
          load: existing.load + connectedKva,
          count: existing.count + 1,
          area: existing.area + (t.area || 0),
          maxDemand: existing.maxDemand + (connectedKva * diversityFactor),
        });
      });

      // Generate category color codes
      const CATEGORY_COLORS: Record<string, string> = {
        'Anchor': '#ef4444',
        'Major': '#f97316',
        'Line Shop': '#eab308',
        'Food Court': '#22c55e',
        'Restaurant': '#14b8a6',
        'Entertainment': '#3b82f6',
        'Services': '#8b5cf6',
        'Kiosk': '#ec4899',
        'ATM': '#6b7280',
        'Common Areas': '#78716c',
        'Uncategorized': '#a3a3a3',
      };

      // Upsert category summaries
      const summaries = Array.from(categoryMap.entries()).map(([name, data], i) => ({
        profile_id: profileId,
        category_name: name,
        category_code: name.substring(0, 3).toUpperCase(),
        total_connected_load_kva: Math.round(data.load * 100) / 100,
        max_demand_kva: Math.round(data.maxDemand * 100) / 100,
        total_area_sqm: Math.round(data.area * 100) / 100,
        va_per_sqm: data.area > 0 ? Math.round((data.load * 1000 / data.area) * 100) / 100 : 0,
        shop_count: data.count,
        diversity_factor: DIVERSITY_FACTORS[name] || 0.8,
        color_code: CATEGORY_COLORS[name] || '#a3a3a3',
        display_order: i,
      }));

      await supabase.from('load_category_summary').delete().eq('profile_id', profileId);
      
      if (summaries.length > 0) {
        const { error: summaryError } = await supabase.from('load_category_summary').insert(summaries);
        if (summaryError) {
          console.error('Insert summaries error:', summaryError);
        } else {
          console.log(`Created ${summaries.length} category summaries`);
        }
      }

      // Generate sample 24-hour demand readings based on category profiles
      const today = new Date().toISOString().split('T')[0];
      const readings: any[] = [];
      
      // Commercial building demand profile (percentage of max demand by hour)
      const HOURLY_PROFILE = [
        0.3, 0.25, 0.2, 0.2, 0.25, 0.35, // 00:00-05:00
        0.5, 0.65, 0.8, 0.9, 0.95, 1.0,  // 06:00-11:00
        0.95, 0.9, 0.85, 0.8, 0.75, 0.85, // 12:00-17:00
        0.9, 0.85, 0.7, 0.55, 0.45, 0.35  // 18:00-23:00
      ];
      
      // Sum of individual category max demands
      const sumCategoryMaxDemand = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.maxDemand, 0);
      const tenantCount = tenantData.filter(t => !t.exclude_from_totals).length;
      
      // Apply aggregate diversity factor based on number of tenants
      // SANS 10142-1 / NRS 034-1 guidelines for commercial buildings:
      // - 1-5 tenants: 0.9
      // - 6-20 tenants: 0.7
      // - 21-50 tenants: 0.55
      // - 50+ tenants: 0.45-0.5
      let aggregateDiversityFactor = 0.9;
      if (tenantCount > 50) {
        aggregateDiversityFactor = 0.45;
      } else if (tenantCount > 20) {
        aggregateDiversityFactor = 0.55;
      } else if (tenantCount > 5) {
        aggregateDiversityFactor = 0.7;
      }
      
      // After Diversity Maximum Demand (ADMD)
      const buildingMaxDemand = sumCategoryMaxDemand * aggregateDiversityFactor;
      console.log(`Tenant count: ${tenantCount}, Aggregate DF: ${aggregateDiversityFactor}, Building Max Demand: ${buildingMaxDemand.toFixed(2)} kVA`);
      
      for (let hour = 0; hour < 24; hour++) {
        readings.push({
          profile_id: profileId,
          linkage_id: null,
          reading_date: today,
          reading_hour: hour,
          demand_kva: Math.round(buildingMaxDemand * HOURLY_PROFILE[hour] * 100) / 100,
          power_factor: 0.9,
          energy_kwh: Math.round(buildingMaxDemand * HOURLY_PROFILE[hour] * 0.9 * 100) / 100,
          peak_demand_kva: hour >= 9 && hour <= 11 ? buildingMaxDemand : null,
          reading_source: 'calculated',
        });
      }
      
      // Clear old readings for today and insert new
      await supabase.from('load_profile_readings')
        .delete()
        .eq('profile_id', profileId)
        .eq('reading_date', today);
      
      if (readings.length > 0) {
        const { error: readingsError } = await supabase.from('load_profile_readings').insert(readings);
        if (readingsError) {
          console.error('Insert readings error:', readingsError);
        } else {
          console.log(`Created ${readings.length} hourly demand readings`);
        }
      }
    }

    // Mark as synced
    await supabase.from('load_profiles').update({
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      is_synced_to_external: syncSource === 'external',
    }).eq('id', profileId);

    const stats = {
      success: true,
      direction,
      source: syncSource,
      tenantsProcessed: tenantData.length,
    };
    
    console.log('Sync completed:', stats);

    return new Response(JSON.stringify(stats), {
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
