import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SPUD_AGENT_KEY = Deno.env.get('SPUD_AGENT_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate via x-agent-key header
  const agentKey = req.headers.get('x-agent-key');
  if (!agentKey || agentKey !== SPUD_AGENT_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Service role client — bypasses RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { action } = body;

    // ── list_projects ──
    if (action === 'list_projects') {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_number')
        .order('name');

      if (error) throw error;
      return json({ data });
    }

    // ── get_roadmap ──
    if (action === 'get_roadmap') {
      const { project_id } = body;
      if (!project_id) return json({ error: 'project_id required' }, 400);

      const { data, error } = await supabase
        .from('project_roadmap_items')
        .select('*')
        .eq('project_id', project_id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return json({ data });
    }

    // ── sync_roadmap_item ──
    if (action === 'sync_roadmap_item') {
      const { project_id, title, description, assigned_to, phase, priority, due_date } = body;
      if (!project_id || !title) {
        return json({ error: 'project_id and title are required' }, 400);
      }

      // Check if item already exists by title within the project
      const { data: existing } = await supabase
        .from('project_roadmap_items')
        .select('id')
        .eq('project_id', project_id)
        .eq('title', title)
        .maybeSingle();

      if (existing) {
        // Update existing item
        const updates: Record<string, unknown> = {};
        if (description !== undefined) updates.description = description;
        if (assigned_to !== undefined) updates.assigned_to = assigned_to;
        if (phase !== undefined) updates.phase = phase;
        if (priority !== undefined) updates.priority = priority;
        if (due_date !== undefined) updates.due_date = due_date;

        const { data, error } = await supabase
          .from('project_roadmap_items')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return json({ action: 'updated', data });
      } else {
        // Get next sort_order
        const { data: maxOrder } = await supabase
          .from('project_roadmap_items')
          .select('sort_order')
          .eq('project_id', project_id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextOrder = (maxOrder?.sort_order ?? 0) + 1;

        const { data, error } = await supabase
          .from('project_roadmap_items')
          .insert({
            project_id,
            title,
            description: description || null,
            assigned_to: assigned_to || null,
            phase: phase || 'Planning',
            priority: priority || 'medium',
            due_date: due_date || null,
            sort_order: nextOrder,
            is_completed: false,
          })
          .select()
          .single();

        if (error) throw error;
        return json({ action: 'created', data });
      }
    }

    return json({ error: `Unknown action: ${action}`, available_actions: ['list_projects', 'get_roadmap', 'sync_roadmap_item'] }, 400);
  } catch (error) {
    console.error('Spud gateway error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
