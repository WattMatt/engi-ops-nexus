import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TENANT_ID = Deno.env.get('MS_PLANNER_TENANT_ID')!;
const CLIENT_ID = Deno.env.get('MS_PLANNER_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('MS_PLANNER_CLIENT_SECRET')!;

const PLANNER_LABEL_REVERSE: Record<string, string> = {
  'pink': 'category1', 'red': 'category2', 'yellow': 'category3',
  'green': 'category4', 'blue': 'category5', 'purple': 'category6',
  'bronze': 'category7', 'lime': 'category8', 'aqua': 'category9',
  'grey': 'category10', 'silver': 'category11', 'brown': 'category12',
  'cranberry': 'category13', 'orange': 'category14', 'peach': 'category15',
  'marigold': 'category16', 'lightgreen': 'category17', 'darkgreen': 'category18',
  'teal': 'category19', 'lightblue': 'category20', 'darkblue': 'category21',
  'lavender': 'category22', 'plum': 'category23', 'lightgrey': 'category24',
  'darkgrey': 'category25',
};

async function getAccessToken(): Promise<string> {
  const resp = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  if (!resp.ok) throw new Error(`Token failed: ${await resp.text()}`);
  return (await resp.json()).access_token;
}

async function graphGet(token: string, url: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`GET ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function graphPatch(token: string, url: string, body: any, etag: string): Promise<void> {
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'If-Match': etag,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`PATCH ${resp.status}: ${await resp.text()}`);
  }
}

function mapNexusPriorityToPlanner(priority: string | null): number {
  switch (priority) {
    case 'critical': return 1;
    case 'high': return 3;
    case 'medium': return 5;
    case 'low': return 9;
    default: return 5;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roadmapItemId } = await req.json();
    if (!roadmapItemId) throw new Error('roadmapItemId is required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the roadmap item
    const { data: item, error: itemErr } = await supabase
      .from('project_roadmap_items')
      .select('*')
      .eq('id', roadmapItemId)
      .single();
    if (itemErr || !item) throw new Error(`Item not found: ${itemErr?.message}`);

    // Must have a planner link
    if (!item.link_url || !item.link_url.startsWith('planner://task/')) {
      return new Response(JSON.stringify({ success: false, reason: 'no_planner_link' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plannerTaskId = item.link_url.replace('planner://task/', '');
    const accessToken = await getAccessToken();

    // ─── PATCH the main task object ──────────────────────────────
    const taskData = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${plannerTaskId}`);
    const taskEtag = taskData['@odata.etag'];

    // ─── CRITICAL: Planner is authoritative for completion ──────
    // If the task is already completed in Planner (100%), NEVER overwrite it
    // with 0% from Nexus. Instead, adopt the Planner completion status locally.
    const plannerIsComplete = taskData.percentComplete === 100;
    const nexusIsComplete = item.is_completed === true;

    if (plannerIsComplete && !nexusIsComplete) {
      // Adopt Planner's completion status into Nexus instead of overwriting
      console.log(`[planner-push] Task "${item.title}" is complete in Planner but not Nexus — adopting completion`);
      await supabase
        .from('project_roadmap_items')
        .update({
          is_completed: true,
          completed_at: taskData.completedDateTime || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', roadmapItemId);
    }

    // Build assignments from assignee_ids
    const assigneeIds: string[] = item.assignee_ids || [];
    const { data: aadMappings } = await supabase
      .from('azure_ad_user_mapping')
      .select('azure_ad_object_id, profile_id')
      .in('profile_id', assigneeIds.length > 0 ? assigneeIds : ['__none__']);

    const profileToAad: Record<string, string> = {};
    for (const m of aadMappings || []) {
      profileToAad[m.profile_id] = m.azure_ad_object_id;
    }

    // Build full assignments object (replace all)
    const assignments: Record<string, any> = {};
    for (const profileId of assigneeIds) {
      const aadId = profileToAad[profileId];
      if (aadId) {
        assignments[aadId] = {
          '@odata.type': '#microsoft.graph.plannerAssignment',
          orderHint: ' !',
        };
      }
    }
    // Mark removed assignees as null to unassign
    if (taskData.assignments) {
      for (const existingAadId of Object.keys(taskData.assignments)) {
        if (!assignments[existingAadId]) {
          assignments[existingAadId] = null; // Planner API: null = unassign
        }
      }
    }

    // Build appliedCategories from labels
    const appliedCategories: Record<string, boolean> = {};
    for (const label of (item.labels || [])) {
      const catKey = PLANNER_LABEL_REVERSE[label.toLowerCase()];
      if (catKey) appliedCategories[catKey] = true;
    }

    // Use Planner's completion status if it's already complete there
    const effectiveComplete = plannerIsComplete || nexusIsComplete;

    const taskPatch: Record<string, any> = {
      title: item.title,
      priority: mapNexusPriorityToPlanner(item.priority),
      percentComplete: effectiveComplete ? 100 : 0,
      assignments,
    };

    if (item.due_date) taskPatch.dueDateTime = `${item.due_date}T00:00:00Z`;
    else taskPatch.dueDateTime = null;

    if (item.start_date) taskPatch.startDateTime = `${item.start_date}T00:00:00Z`;
    else taskPatch.startDateTime = null;

    if (Object.keys(appliedCategories).length > 0) {
      taskPatch.appliedCategories = appliedCategories;
    }

    await graphPatch(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${plannerTaskId}`, taskPatch, taskEtag);

    // ─── PATCH task details (notes + checklist) ──────────────────
    const hasDescription = item.description && item.description.trim();
    const hasChecklist = item.checklist && Array.isArray(item.checklist) && item.checklist.length > 0;

    if (hasDescription || hasChecklist) {
      const detailsResp = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${plannerTaskId}/details`);
      const detailEtag = detailsResp['@odata.etag'];

      const detailPatch: Record<string, any> = {};
      if (hasDescription) detailPatch.description = item.description;

      if (hasChecklist) {
        // Clear existing checklist by setting all to null, then add new
        const existingChecklist = detailsResp.checklist || {};
        const newChecklist: Record<string, any> = {};
        for (const key of Object.keys(existingChecklist)) {
          newChecklist[key] = null; // remove old items
        }
        for (const ci of item.checklist) {
          newChecklist[crypto.randomUUID()] = {
            '@odata.type': '#microsoft.graph.plannerChecklistItem',
            title: ci.title,
            isChecked: ci.isChecked || false,
          };
        }
        detailPatch.checklist = newChecklist;
      }

      await graphPatch(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${plannerTaskId}/details`, detailPatch, detailEtag);
    }

    return new Response(JSON.stringify({ success: true, plannerTaskId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = (error as Error).message;
    console.error('planner-push error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
