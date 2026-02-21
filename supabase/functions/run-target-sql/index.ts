import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const targetUrl = Deno.env.get("TARGET_SUPABASE_URL")!;
    const targetDbPassword = Deno.env.get("TARGET_DB_PASSWORD")!;
    // Extract ref from URL like https://vbasfvywaricxxrmnybg.supabase.co
    const targetRef = targetUrl.replace("https://", "").split(".")[0];
    const encodedPassword = encodeURIComponent(targetDbPassword);
    const targetDbUrl = `postgresql://postgres:${encodedPassword}@db.${targetRef}.supabase.co:5432/postgres`;

    const { sql } = await req.json();
    if (!sql) throw new Error("No SQL provided");

    // Use pg driver via Deno
    const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    const client = new Client(targetDbUrl);
    await client.connect();

    const results: string[] = [];
    const statements = sql.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    
    for (const stmt of statements) {
      try {
        await client.queryArray(stmt);
        results.push(`✅ ${stmt.substring(0, 80)}`);
      } catch (e) {
        results.push(`❌ ${stmt.substring(0, 80)}: ${e.message}`);
      }
    }

    await client.end();

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
