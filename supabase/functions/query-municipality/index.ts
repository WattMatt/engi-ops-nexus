import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MDB MapServer - Local Municipalities layer
const MDB_SERVICE_URL = "https://csggis.drdlr.gov.za/server/rest/services/MDB/MapServer/4";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lng, lat } = await req.json();

    if (!lng || !lat) {
      return new Response(
        JSON.stringify({ error: "Missing lng or lat coordinates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query the ArcGIS service with point geometry
    const queryParams = new URLSearchParams({
      geometry: JSON.stringify({
        x: lng,
        y: lat,
        spatialReference: { wkid: 4326 }
      }),
      geometryType: "esriGeometryPoint",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "false",
      f: "json"
    });

    const response = await fetch(`${MDB_SERVICE_URL}/query?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`ArcGIS query failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const attrs = feature.attributes;
      
      // Extract municipality info (field names may vary, common ones: MUNICNAME, MUN_NAME, LocalMun, etc.)
      const municipalityName = attrs.MUNICNAME || attrs.MUN_NAME || attrs.LocalMun || attrs.NAME || attrs.MUNIC_NAME || Object.values(attrs).find(v => typeof v === 'string' && v.length > 2);
      const municipalityCode = attrs.MUN_CODE || attrs.CAT_B || attrs.MUNIC_CODE || attrs.CODE;
      const districtName = attrs.DISTRICT || attrs.DistrictMun || attrs.DC_NAME;
      const provinceName = attrs.PROVINCE || attrs.PROV_NAME || attrs.Province;

      return new Response(
        JSON.stringify({
          found: true,
          municipality: {
            name: municipalityName,
            code: municipalityCode,
            district: districtName,
            province: provinceName,
            rawAttributes: attrs
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ found: false, message: "No municipality found at these coordinates" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error querying municipality:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
