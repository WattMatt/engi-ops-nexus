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
    const greencalcUrl = Deno.env.get('GREENCALC_SUPABASE_URL');
    const greencalcKey = Deno.env.get('GREENCALC_SUPABASE_ANON_KEY');

    if (!greencalcUrl || !greencalcKey) {
      console.error('Missing greencalc credentials');
      return new Response(
        JSON.stringify({ error: 'Greencalc credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Connecting to greencalc-sa Supabase project...');

    // Create Supabase client for greencalc-sa project
    const greencalcClient = createClient(greencalcUrl, greencalcKey);

    // Fetch municipalities with their provinces
    const { data: municipalities, error: municipalitiesError } = await greencalcClient
      .from('municipalities')
      .select(`
        id,
        name,
        province_id,
        provinces (
          id,
          name
        )
      `)
      .order('name');

    if (municipalitiesError) {
      console.error('Error fetching municipalities:', municipalitiesError);
      throw municipalitiesError;
    }

    console.log(`Fetched ${municipalities?.length || 0} municipalities`);

    // Fetch tariffs - minimal columns
    const { data: tariffs, error: tariffsError } = await greencalcClient
      .from('tariffs')
      .select('id, name, municipality_id')
      .order('name');

    if (tariffsError) {
      console.error('Error fetching tariffs:', tariffsError);
      throw tariffsError;
    }

    console.log(`Fetched ${tariffs?.length || 0} active tariffs`);

    // Organize tariffs by municipality
    const tariffsByMunicipality: Record<string, any[]> = {};
    
    tariffs?.forEach((tariff: any) => {
      if (!tariffsByMunicipality[tariff.municipality_id]) {
        tariffsByMunicipality[tariff.municipality_id] = [];
      }
      tariffsByMunicipality[tariff.municipality_id].push(tariff);
    });

    // Organize municipalities by province
    const municipalitiesByProvince: Record<string, any[]> = {};
    
    municipalities?.forEach((municipality: any) => {
      const provinceName = municipality.provinces?.name || 'Unknown';
      if (!municipalitiesByProvince[provinceName]) {
        municipalitiesByProvince[provinceName] = [];
      }
      municipalitiesByProvince[provinceName].push({
        id: municipality.id,
        name: municipality.name,
        tariffs: tariffsByMunicipality[municipality.id] || []
      });
    });

    return new Response(
      JSON.stringify({
        municipalitiesByProvince,
        tariffs: tariffs || [],
        municipalities: municipalities || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in fetch-greencalc-tariffs:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
