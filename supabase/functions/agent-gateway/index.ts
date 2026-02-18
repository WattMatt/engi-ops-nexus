import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AGENT_API_KEY = Deno.env.get('AGENT_API_KEY')!;

// Tables the agent is allowed to access
const ALLOWED_TABLES = [
  'projects',
  'project_members',
  'project_drawings',
  'project_roadmap_items',
  'project_boqs',
  'boq_bills',
  'boq_items',
  'boq_project_sections',
  'budget_sections',
  'budget_line_items',
  'electrical_budgets',
  'cable_schedules',
  'cable_entries',
  'distribution_boards',
  'tenants',
  'tenant_documents',
  'cost_reports',
  'cost_line_items',
  'cost_variations',
  'rfis',
  'rfi_responses',
  'procurement_items',
  'site_diary_entries',
  'site_diary_tasks',
  'bulk_services_documents',
  'final_accounts',
  'final_account_bills',
  'final_account_sections',
  'final_account_items',
  'floor_plan_projects',
  'generator_zones',
  'generator_reports',
  'master_materials',
  'material_categories',
  'invoices',
  'invoice_line_items',
  'knowledge_documents',
];

// Tables explicitly blocked (sensitive data)
const BLOCKED_TABLES = [
  'profiles',
  'user_roles',
  'user_storage_connections',
  'client_portal_tokens',
  'contractor_portal_tokens',
  'backup_history',
  'backup_files',
  'backup_jobs',
  'backup_health_checks',
  'agent_access_log',
];

async function logAccess(
  supabase: any,
  method: string,
  tableName: string,
  queryParams: Record<string, any> | null,
  responseStatus: number
) {
  try {
    await supabase.from('agent_access_log').insert({
      method,
      table_name: tableName,
      query_params: queryParams,
      response_status: responseStatus,
    });
  } catch (e) {
    console.error('Failed to log access:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Authenticate via Bearer token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${AGENT_API_KEY}`) {
    await logAccess(supabase, req.method, 'unknown', null, 401);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Path: /agent-gateway/<table> or /agent-gateway/<table>/<id>
    // After edge function routing, we get the parts after the function name
    const tableName = pathParts[pathParts.length - 2] && pathParts[pathParts.length - 1] && pathParts.length >= 2
      ? pathParts[pathParts.length - 2] === 'agent-gateway' ? pathParts[pathParts.length - 1] : pathParts[pathParts.length - 1]
      : pathParts[pathParts.length - 1];

    // Parse table and optional ID from query params instead for simplicity
    const table = url.searchParams.get('table');
    const id = url.searchParams.get('id');
    const select = url.searchParams.get('select') || '*';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const orderBy = url.searchParams.get('order_by') || 'created_at';
    const orderDir = url.searchParams.get('order_dir') === 'asc' ? true : false;

    if (!table) {
      await logAccess(supabase, req.method, 'none', null, 400);
      return new Response(
        JSON.stringify({
          error: 'Missing "table" query parameter',
          allowed_tables: ALLOWED_TABLES,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (BLOCKED_TABLES.includes(table)) {
      await logAccess(supabase, req.method, table, { id }, 403);
      return new Response(JSON.stringify({ error: 'Access to this table is forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_TABLES.includes(table)) {
      await logAccess(supabase, req.method, table, { id }, 403);
      return new Response(
        JSON.stringify({
          error: `Table "${table}" is not in the allowlist`,
          allowed_tables: ALLOWED_TABLES,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect filter params (any query param not in reserved set)
    const reservedParams = new Set(['table', 'id', 'select', 'limit', 'offset', 'order_by', 'order_dir']);
    const filters: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (!reservedParams.has(key)) {
        filters[key] = value;
      }
    }

    const queryParams = { id, select, limit, offset, filters: Object.keys(filters).length > 0 ? filters : null };

    // GET - Read
    if (req.method === 'GET') {
      let query = supabase.from(table).select(select);

      // Apply ID filter
      if (id) {
        query = query.eq('id', id);
      }

      // Apply additional filters
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }

      query = query.order(orderBy, { ascending: orderDir }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        await logAccess(supabase, 'GET', table, queryParams, 500);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logAccess(supabase, 'GET', table, queryParams, 200);
      return new Response(JSON.stringify({ data, count: data?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create
    if (req.method === 'POST') {
      const body = await req.json();

      const { data, error } = await supabase.from(table).insert(body).select();

      if (error) {
        await logAccess(supabase, 'POST', table, { body }, 500);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logAccess(supabase, 'POST', table, { body }, 201);
      return new Response(JSON.stringify({ data }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update (requires id)
    if (req.method === 'PUT') {
      if (!id) {
        await logAccess(supabase, 'PUT', table, null, 400);
        return new Response(JSON.stringify({ error: 'Missing "id" query parameter for update' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { data, error } = await supabase.from(table).update(body).eq('id', id).select();

      if (error) {
        await logAccess(supabase, 'PUT', table, { id, body }, 500);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logAccess(supabase, 'PUT', table, { id, body }, 200);
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE (requires id)
    if (req.method === 'DELETE') {
      if (!id) {
        await logAccess(supabase, 'DELETE', table, null, 400);
        return new Response(JSON.stringify({ error: 'Missing "id" query parameter for delete' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) {
        await logAccess(supabase, 'DELETE', table, { id }, 500);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logAccess(supabase, 'DELETE', table, { id }, 200);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await logAccess(supabase, req.method, table, null, 405);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Agent gateway error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
