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
const GROUP_ID = Deno.env.get('MS_PLANNER_GROUP_ID')!;

// We store the refresh token in env, but also persist updated tokens in DB
let REFRESH_TOKEN = Deno.env.get('MS_PLANNER_REFRESH_TOKEN')!;

const logs: string[] = [];
function log(msg: string) {
  console.log(msg);
  logs.push(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Microsoft Graph Auth (Refresh Token Flow) ───────────────────────────────

async function getAccessToken(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check if we have a stored (newer) refresh token in DB
  const { data: stored } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'ms_planner_refresh_token')
    .maybeSingle();

  const currentRefreshToken = stored?.value || REFRESH_TOKEN;

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: currentRefreshToken,
    scope: 'https://graph.microsoft.com/.default offline_access',
  });

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token refresh failed (${resp.status}): ${err}`);
  }

  const data = await resp.json();

  // Persist the new refresh token if one was returned
  if (data.refresh_token && data.refresh_token !== currentRefreshToken) {
    log('New refresh token received, persisting to DB');
    await supabase
      .from('system_settings')
      .upsert({ key: 'ms_planner_refresh_token', value: data.refresh_token, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }

  return data.access_token;
}

// ─── Microsoft Graph Helpers ──────────────────────────────────────────────────

async function graphGet(token: string, url: string): Promise<any> {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Graph API error (${resp.status}) for ${url}: ${err}`);
  }
  return resp.json();
}

async function getAllPages(token: string, url: string): Promise<any[]> {
  let results: any[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const data = await graphGet(token, nextUrl);
    results = results.concat(data.value || []);
    nextUrl = data['@odata.nextLink'] || null;
  }
  return results;
}

// ─── Sync Logic ───────────────────────────────────────────────────────────────

function extractProjectNumber(planTitle: string): string | null {
  // Match patterns like "(604)" or "(584.3.1)" at start or anywhere in title
  const match = planTitle.match(/\((\d+(?:\.\d+)*)\)/);
  return match ? match[1] : null;
}

function mapPlannerPriority(priority: number): string {
  // Planner: 0=Urgent, 1=Important, 5=Medium, 9=Low
  switch (priority) {
    case 0: case 1: return 'critical';
    case 2: case 3: return 'high';
    case 5: case 6: return 'medium';
    default: return 'low';
  }
}

function mapPlannerPercentComplete(pct: number): boolean {
  return pct === 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('=== Planner Sync Started ===');

    // Validate required env vars
    if (!TENANT_ID || !CLIENT_ID || !REFRESH_TOKEN || !GROUP_ID) {
      throw new Error('Missing required MS_PLANNER_* environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Get access token
    log('Authenticating with Microsoft Graph...');
    const accessToken = await getAccessToken();
    log('Authentication successful');

    // Step 2: Get all Plans in the Group
    log(`Fetching plans for Group: ${GROUP_ID}`);
    const plans = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}/planner/plans`);
    log(`Found ${plans.length} plans`);

    // Step 3: Get all Nexus projects for matching
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, project_number, status')
      .order('project_number');
    if (projErr) throw projErr;
    log(`Found ${projects?.length || 0} Nexus projects`);

    // Build project lookup by project_number
    const projectByNumber: Record<string, any> = {};
    for (const p of projects || []) {
      if (p.project_number) {
        projectByNumber[p.project_number.trim()] = p;
      }
    }

    let totalSynced = 0;
    let totalSkipped = 0;
    const syncResults: Array<{ plan: string; project: string; tasksProcessed: number }> = [];

    // Step 4: Process each Plan
    for (const plan of plans) {
      const projectNumber = extractProjectNumber(plan.title);
      if (!projectNumber) {
        log(`  Skipping plan "${plan.title}" — no (ProjectNumber) found`);
        totalSkipped++;
        continue;
      }

      const project = projectByNumber[projectNumber];
      if (!project) {
        log(`  Skipping plan "${plan.title}" — no matching Nexus project for number "${projectNumber}"`);
        totalSkipped++;
        continue;
      }

      log(`  Syncing plan "${plan.title}" → Project "${project.name}" (${project.project_number})`);

      // Get all tasks in this plan
      const tasks = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/tasks`);
      log(`    ${tasks.length} tasks in plan`);

      // Get buckets for phase mapping
      const buckets = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`);
      const bucketMap: Record<string, string> = {};
      for (const b of buckets) {
        bucketMap[b.id] = b.name;
      }

      // Get existing roadmap items for this project (for upsert matching)
      const { data: existingItems } = await supabase
        .from('project_roadmap_items')
        .select('id, title, link_url')
        .eq('project_id', project.id);

      // Build lookup by planner task URL (stored in link_url)
      const existingByPlannerUrl: Record<string, any> = {};
      const existingByTitle: Record<string, any> = {};
      for (const item of existingItems || []) {
        if (item.link_url) existingByPlannerUrl[item.link_url] = item;
        existingByTitle[item.title.toLowerCase()] = item;
      }

      let planSyncCount = 0;

      for (const task of tasks) {
        const plannerUrl = `planner://task/${task.id}`;
        const bucketName = task.bucketId ? (bucketMap[task.bucketId] || null) : null;

        // Extract assignee IDs from assignments object
        const assigneeIds: string[] = task.assignments
          ? Object.keys(task.assignments)
          : [];

        const payload: Record<string, any> = {
          project_id: project.id,
          title: task.title,
          description: task.conversationThreadId ? null : null, // Planner details need separate call
          phase: bucketName,
          priority: mapPlannerPriority(task.priority),
          is_completed: mapPlannerPercentComplete(task.percentComplete),
          completed_at: task.percentComplete === 100 ? (task.completedDateTime || new Date().toISOString()) : null,
          due_date: task.dueDateTime ? task.dueDateTime.substring(0, 10) : null,
          start_date: task.startDateTime ? task.startDateTime.substring(0, 10) : null,
          link_url: plannerUrl,
          link_label: 'View in Planner',
          assignee_ids: assigneeIds,
          updated_at: new Date().toISOString(),
        };

        // Check if exists (by planner URL first, then title fallback)
        const existing = existingByPlannerUrl[plannerUrl] || existingByTitle[task.title.toLowerCase()];

        if (existing) {
          // Update
          await supabase
            .from('project_roadmap_items')
            .update(payload)
            .eq('id', existing.id);
        } else {
          // Insert new item
          const { data: maxSort } = await supabase
            .from('project_roadmap_items')
            .select('sort_order')
            .eq('project_id', project.id)
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle();

          payload.sort_order = (maxSort?.sort_order || 0) + 1;
          payload.created_at = new Date().toISOString();

          await supabase
            .from('project_roadmap_items')
            .insert(payload);
        }

        planSyncCount++;
      }

      totalSynced += planSyncCount;
      syncResults.push({ plan: plan.title, project: project.name, tasksProcessed: planSyncCount });
      log(`    Synced ${planSyncCount} tasks`);
    }

    log(`=== Planner Sync Complete ===`);
    log(`Plans processed: ${plans.length}, Tasks synced: ${totalSynced}, Plans skipped: ${totalSkipped}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        plansFound: plans.length,
        plansSkipped: totalSkipped,
        totalTasksSynced: totalSynced,
        results: syncResults,
      },
      logs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = (error as Error).message;
    log(`ERROR: ${msg}`);
    return new Response(JSON.stringify({ success: false, error: msg, logs }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
