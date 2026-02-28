import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Env vars
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// The secret key for Spud
const SPUD_AGENT_KEY = Deno.env.get('SPUD_AGENT_KEY');

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth Check
  const agentKey = req.headers.get('x-agent-key');
  if (!SPUD_AGENT_KEY || agentKey !== SPUD_AGENT_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid x-agent-key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action } = body;

    // --- 1. LIST PROJECTS ---
    if (action === 'list_projects') {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_number, status')
        .order('project_number', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 2. GET ROADMAP ---
    if (action === 'get_roadmap') {
      const { project_id } = body;
      if (!project_id) throw new Error('project_id is required');

      const { data, error } = await supabase
        .from('project_roadmap_items')
        .select('*')
        .eq('project_id', project_id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 3. SYNC ROADMAP ITEM (Create/Update by Title) ---
    if (action === 'sync_roadmap_item') {
      const { project_id, title, is_completed, due_date, status, priority, description, assigned_to } = body;
      if (!project_id || !title) throw new Error('project_id and title are required');

      // Check if exists (by title match within project)
      const { data: existing } = await supabase
        .from('project_roadmap_items')
        .select('id')
        .eq('project_id', project_id)
        .ilike('title', title)
        .maybeSingle();

      const payload: any = {
        project_id,
        title,
        updated_at: new Date().toISOString()
      };
      
      if (is_completed !== undefined) payload.is_completed = is_completed;
      if (due_date !== undefined) payload.due_date = due_date;
      if (status !== undefined) payload.status = status;
      if (priority !== undefined) payload.priority = priority;
      if (description !== undefined) payload.description = description;
      if (assigned_to !== undefined) payload.assigned_to = assigned_to;

      let result;
      if (existing) {
        // Update
        result = await supabase
          .from('project_roadmap_items')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Create (Append to end)
        const { data: maxSort } = await supabase
          .from('project_roadmap_items')
          .select('sort_order')
          .eq('project_id', project_id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        payload.sort_order = (maxSort?.sort_order || 0) + 1;
        payload.created_at = new Date().toISOString();
        
        result = await supabase
          .from('project_roadmap_items')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      return new Response(JSON.stringify({ data: result.data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 4. CREATE ROADMAP ITEM (Explicit) ---
    if (action === 'create_roadmap_item') {
        const { project_id, title, status, priority, due_date, description, assigned_to } = body;
        if (!project_id || !title) throw new Error('project_id and title are required');

        const { data: maxSort } = await supabase
          .from('project_roadmap_items')
          .select('sort_order')
          .eq('project_id', project_id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const payload = {
            project_id,
            title,
            status: status || 'todo',
            priority: priority || 'medium',
            due_date: due_date || null,
            description: description || null,
            assigned_to: assigned_to || null,
            sort_order: (maxSort?.sort_order || 0) + 1,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('project_roadmap_items')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 5. CREATE PROJECT ---
    if (action === 'create_project') {
        const { name, project_number, status } = body;
        if (!name) throw new Error('Project name is required');

        const payload = {
            name,
            project_number: project_number || null,
            status: status || 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 6. SYNC INBOX ITEM (Unified Inbox) ---
    if (action === 'sync_inbox_item') {
        const { title, source, project_ref, description, status, priority, due_date, external_ids, raw_payload } = body;
        if (!title || !source) throw new Error('title and source are required');

        // Upsert based on external_ids->source_id if possible
        let existing = null;
        if (external_ids && source) {
             // This is tricky with JSONB query via simple client, might need a specific function or logic
             // For now, let's just insert. A robust dedup logic is needed later.
             // OR: We assume the client handles dedup by knowing the ID? No, client is dumb.
             // Let's assume we rely on external_ids containment.
             
             // Simplification: We blindly insert for now or use a match on title + project + source?
             // Ideally we want to avoid duplicates.
             // Let's try to find an item with the same external_ids
             
             // supabase .contains('external_ids', fragment)
             // e.g. { "reminder_id": "x" }
        }

        const payload = {
            title,
            source,
            project_ref: project_ref || null,
            description: description || null,
            status: status || 'inbox',
            priority: priority || 'medium',
            due_date: due_date || null,
            external_ids: external_ids || {},
            raw_payload: raw_payload || {},
            updated_at: new Date().toISOString()
        };

        // We use upsert if we can identify it, otherwise insert
        // Since we don't have a unique constraint on external_ids yet, we'll just insert.
        // TODO: Add unique constraint/index on external_ids->>'id' per source.
        
        const { data, error } = await supabase
            .from('ops_unified_inbox')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
