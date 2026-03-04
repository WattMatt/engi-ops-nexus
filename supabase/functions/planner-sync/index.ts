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
const GROUP_ID = Deno.env.get('MS_PLANNER_GROUP_ID')!;

// Configurable limits
const TASK_DETAIL_DELAY_MS = 150;        // delay between task detail API calls
const PROJECT_BATCH_DELAY_MS = 500;      // delay between project batches
const MAX_TASK_DETAILS_PER_RUN = 300;    // cap task detail fetches to avoid timeout
const TASK_DETAIL_BATCH_SIZE = 5;        // fetch details in micro-batches

const logs: string[] = [];
function log(msg: string) {
  console.log(msg);
  logs.push(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Planner label category names ────────────────────────────────────────────
const PLANNER_LABEL_NAMES: Record<string, string> = {
  category1: 'Pink', category2: 'Red', category3: 'Yellow',
  category4: 'Green', category5: 'Blue', category6: 'Purple',
  category7: 'Bronze', category8: 'Lime', category9: 'Aqua',
  category10: 'Grey', category11: 'Silver', category12: 'Brown',
  category13: 'Cranberry', category14: 'Orange', category15: 'Peach',
  category16: 'Marigold', category17: 'LightGreen', category18: 'DarkGreen',
  category19: 'Teal', category20: 'LightBlue', category21: 'DarkBlue',
  category22: 'Lavender', category23: 'Plum', category24: 'LightGrey',
  category25: 'DarkGrey',
};

// ─── Microsoft Graph Auth ────────────────────────────────────────────────────

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
  if (!resp.ok) throw new Error(`Token request failed (${resp.status}): ${await resp.text()}`);
  return (await resp.json()).access_token;
}

// ─── Microsoft Graph Helpers ─────────────────────────────────────────────────

async function graphGet(token: string, url: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`Graph API error (${resp.status}) for ${url}: ${await resp.text()}`);
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

// ─── Assignee Resolution ─────────────────────────────────────────────────────

async function buildAssigneeMap(
  supabase: any, accessToken: string, aadUserIds: string[]
): Promise<Record<string, string>> {
  if (aadUserIds.length === 0) return {};

  const { data: existingMappings } = await supabase
    .from('azure_ad_user_mapping')
    .select('azure_ad_object_id, profile_id')
    .in('azure_ad_object_id', aadUserIds);

  const map: Record<string, string> = {};
  const mapped = new Set<string>();
  for (const m of existingMappings || []) {
    map[m.azure_ad_object_id] = m.profile_id;
    mapped.add(m.azure_ad_object_id);
  }

  const unmapped = aadUserIds.filter(id => !mapped.has(id));
  if (unmapped.length === 0) return map;

  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');

  const profileByUsername: Record<string, any> = {};
  for (const p of profiles || []) {
    if (p.email) profileByUsername[p.email.split('@')[0].toLowerCase()] = p;
  }

  for (const aadId of unmapped) {
    try {
      const userInfo = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/users/${aadId}?$select=displayName,mail,userPrincipalName`);
      const email = (userInfo.mail || userInfo.userPrincipalName || '').toLowerCase();
      const displayName = userInfo.displayName || '';
      const aadUsername = email.split('@')[0];

      let matchedProfile = aadUsername ? profileByUsername[aadUsername] : null;
      if (!matchedProfile && displayName) {
        matchedProfile = (profiles || []).find((p: any) =>
          p.full_name && p.full_name.toLowerCase() === displayName.toLowerCase()
        );
      }

      if (matchedProfile) {
        await supabase.from('azure_ad_user_mapping').upsert({
          azure_ad_object_id: aadId,
          profile_id: matchedProfile.id,
          display_name: displayName,
          email: email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'azure_ad_object_id' });
        map[aadId] = matchedProfile.id;
        log(`    Mapped AAD user "${displayName}" → profile ${matchedProfile.id}`);
      } else {
        log(`    ⚠ No profile found for AAD user "${displayName}" (${email})`);
      }
    } catch (e) {
      log(`    ⚠ Could not resolve AAD user ${aadId}: ${(e as Error).message}`);
    }
  }

  return map;
}

// ─── Task Detail Fetching ────────────────────────────────────────────────────

async function fetchTaskDetails(accessToken: string, taskId: string): Promise<{
  description: string | null;
  checklist: Array<{ title: string; isChecked: boolean }>;
}> {
  try {
    const details = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${taskId}/details`);
    const checklist: Array<{ title: string; isChecked: boolean }> = [];
    if (details.checklist) {
      for (const [, item] of Object.entries(details.checklist as Record<string, any>)) {
        checklist.push({ title: item.title || '', isChecked: item.isChecked || false });
      }
      checklist.sort((a, b) => a.title.localeCompare(b.title));
    }
    return { description: details.description || null, checklist };
  } catch (e) {
    log(`    ⚠ Could not fetch details for task ${taskId}: ${(e as Error).message}`);
    return { description: null, checklist: [] };
  }
}

function extractLabels(appliedCategories: Record<string, boolean> | null): string[] {
  if (!appliedCategories) return [];
  return Object.entries(appliedCategories)
    .filter(([, val]) => val)
    .map(([key]) => PLANNER_LABEL_NAMES[key] || key);
}

function extractProjectNumber(planTitle: string): string | null {
  // Match project numbers like (643), (584.3.1), (P93.1), (P91.10) — with optional P prefix and trailing whitespace
  const match = planTitle.match(/\(\s*(P?\d+(?:\.\d+)*)\s*\)/i);
  return match ? match[1].toUpperCase() : null;
}

function mapPlannerPriority(priority: number): string {
  switch (priority) {
    case 0: case 1: return 'critical';
    case 2: case 3: return 'high';
    case 5: case 6: return 'medium';
    default: return 'low';
  }
}

// ─── Per-Project Sync (isolated error handling) ──────────────────────────────

async function syncProjectTasks(
  supabase: any,
  accessToken: string,
  projectId: string,
  projectName: string,
  entries: Array<{ task: any; bucketMap: Record<string, string> }>,
  assigneeMap: Record<string, string>,
  taskDetailBudget: { remaining: number }
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  // Load existing roadmap items for this project ONCE
  const { data: existingItems } = await supabase
    .from('project_roadmap_items')
    .select('id, title, link_url')
    .eq('project_id', projectId);

  const existingByPlannerUrl: Record<string, any> = {};
  const existingByTitle: Record<string, any[]> = {};
  for (const item of existingItems || []) {
    if (item.link_url) existingByPlannerUrl[item.link_url] = item;
    const key = item.title.toLowerCase().trim();
    if (!existingByTitle[key]) existingByTitle[key] = [];
    existingByTitle[key].push(item);
  }

  const syncedTitles = new Set<string>();

  // Get max sort_order once for inserts
  const { data: maxSortData } = await supabase
    .from('project_roadmap_items')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextSortOrder = (maxSortData?.sort_order || 0) + 1;

  for (const { task, bucketMap } of entries) {
    try {
      const plannerUrl = `planner://task/${task.id}`;
      const bucketName = task.bucketId ? (bucketMap[task.bucketId] || null) : null;
      const titleKey = task.title.toLowerCase().trim();

      // Skip duplicate titles within same sync run
      if (syncedTitles.has(titleKey)) continue;
      syncedTitles.add(titleKey);

      // Resolve assignees
      const aadAssigneeIds: string[] = task.assignments ? Object.keys(task.assignments) : [];
      const resolvedAssigneeIds = aadAssigneeIds.map(id => assigneeMap[id]).filter(Boolean);

      // Fetch task details only if budget allows (prevents timeout)
      let taskDetails = { description: null as string | null, checklist: [] as any[] };
      if (taskDetailBudget.remaining > 0) {
        taskDetails = await fetchTaskDetails(accessToken, task.id);
        taskDetailBudget.remaining--;
        await new Promise(r => setTimeout(r, TASK_DETAIL_DELAY_MS));
      }

      const labels = extractLabels(task.appliedCategories);

      const payload: Record<string, any> = {
        project_id: projectId,
        title: task.title,
        phase: bucketName,
        priority: mapPlannerPriority(task.priority),
        is_completed: task.percentComplete === 100,
        completed_at: task.percentComplete === 100 ? (task.completedDateTime || new Date().toISOString()) : null,
        due_date: task.dueDateTime ? task.dueDateTime.substring(0, 10) : null,
        start_date: task.startDateTime ? task.startDateTime.substring(0, 10) : null,
        link_url: plannerUrl,
        link_label: 'View in Planner',
        assignee_ids: resolvedAssigneeIds,
        updated_at: new Date().toISOString(),
      };

      if (taskDetails.description) payload.description = taskDetails.description;
      if (taskDetails.checklist.length > 0) payload.checklist = taskDetails.checklist;
      if (labels.length > 0) payload.labels = labels;

      // Match by planner URL first, then by title (dedup logic)
      let existing = existingByPlannerUrl[plannerUrl];
      if (!existing) {
        const titleMatches = existingByTitle[titleKey];
        if (titleMatches && titleMatches.length > 0) existing = titleMatches[0];
      }

      if (existing) {
        await supabase
          .from('project_roadmap_items')
          .update(payload)
          .eq('id', existing.id);

        // Clean up duplicates
        const titleMatches = existingByTitle[titleKey] || [];
        if (titleMatches.length > 1) {
          const duplicateIds = titleMatches.filter(i => i.id !== existing.id).map(i => i.id);
          if (duplicateIds.length > 0) {
            await supabase.from('project_roadmap_items').delete().in('id', duplicateIds);
            log(`    Cleaned ${duplicateIds.length} duplicate(s) for "${task.title}"`);
          }
        }
      } else {
        payload.sort_order = nextSortOrder++;
        payload.created_at = new Date().toISOString();
        await supabase.from('project_roadmap_items').insert(payload);
      }

      synced++;
    } catch (e) {
      errors++;
      log(`    ✗ Error syncing task "${task.title}": ${(e as Error).message}`);
    }
  }

  return { synced, errors };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    log('=== Planner Sync Started ===');

    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !GROUP_ID) {
      throw new Error('Missing required MS_PLANNER_* environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Log sync start
    await supabase.from('planner_sync_log').insert({
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // Step 1: Authenticate
    log('Authenticating with Microsoft Graph...');
    const accessToken = await getAccessToken();
    log('Authentication successful');

    // Step 2: Fetch all plans
    log(`Fetching plans for Group: ${GROUP_ID}`);
    const plans = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}/planner/plans`);
    log(`Found ${plans.length} plans`);

    // Step 3: Load Nexus projects
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, project_number, status')
      .order('project_number');
    if (projErr) throw projErr;

    const projectByNumber: Record<string, any> = {};
    for (const p of projects || []) {
      if (p.project_number) projectByNumber[p.project_number.trim().toUpperCase()] = p;
    }

    // Step 4: Match plans to projects, fetch tasks per plan
    type TaskEntry = { task: any; bucketMap: Record<string, string> };
    const tasksByProject: Record<string, { project: any; planTitle: string; entries: TaskEntry[] }> = {};
    const allAadUserIds = new Set<string>();
    let plansSkipped = 0;

    const skippedPlans: string[] = [];

    for (const plan of plans) {
      const projectNumber = extractProjectNumber(plan.title);
      if (!projectNumber) {
        plansSkipped++;
        skippedPlans.push(`"${plan.title}" (no project number in title)`);
        continue;
      }

      const project = projectByNumber[projectNumber];
      if (!project) {
        plansSkipped++;
        skippedPlans.push(`"${plan.title}" (project #${projectNumber} not found in Nexus)`);
        continue;
      }

      log(`  Plan "${plan.title}" → Project "${project.name}"`);

      const tasks = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/tasks`);
      const buckets = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`);
      const bucketMap: Record<string, string> = {};
      for (const b of buckets) bucketMap[b.id] = b.name;

      if (!tasksByProject[project.id]) {
        tasksByProject[project.id] = { project, planTitle: plan.title, entries: [] };
      }

      for (const task of tasks) {
        const assigneeIds = task.assignments ? Object.keys(task.assignments) : [];
        assigneeIds.forEach(id => allAadUserIds.add(id));
        tasksByProject[project.id].entries.push({ task, bucketMap });
      }

      log(`    ${tasks.length} tasks loaded`);
    }

    // Step 5: Build assignee mapping (one batch for all users)
    log(`Resolving ${allAadUserIds.size} unique AAD users...`);
    const assigneeMap = await buildAssigneeMap(supabase, accessToken, Array.from(allAadUserIds));
    log(`Resolved ${Object.keys(assigneeMap).length} of ${allAadUserIds.size} AAD users`);

    // Step 6: Process projects one-by-one with error isolation
    const projectIds = Object.keys(tasksByProject);
    let totalSynced = 0;
    let totalErrors = 0;
    const taskDetailBudget = { remaining: MAX_TASK_DETAILS_PER_RUN };
    const syncResults: Array<{ project: string; plan: string; synced: number; errors: number }> = [];

    for (let i = 0; i < projectIds.length; i++) {
      const pid = projectIds[i];
      const { project, planTitle, entries } = tasksByProject[pid];

      log(`  [${i + 1}/${projectIds.length}] Syncing "${project.name}" (${entries.length} tasks)...`);

      try {
        const result = await syncProjectTasks(
          supabase, accessToken, pid, project.name,
          entries, assigneeMap, taskDetailBudget
        );
        totalSynced += result.synced;
        totalErrors += result.errors;
        syncResults.push({ project: project.name, plan: planTitle, synced: result.synced, errors: result.errors });
        log(`    ✓ ${result.synced} synced, ${result.errors} errors`);
      } catch (e) {
        log(`    ✗ Project "${project.name}" failed entirely: ${(e as Error).message}`);
        syncResults.push({ project: project.name, plan: planTitle, synced: 0, errors: entries.length });
        totalErrors += entries.length;
      }

      // Delay between projects to avoid API throttling
      if (i < projectIds.length - 1) {
        await new Promise(r => setTimeout(r, PROJECT_BATCH_DELAY_MS));
      }
    }

    const durationMs = Date.now() - startTime;
    log(`=== Planner Sync Complete (${(durationMs / 1000).toFixed(1)}s) ===`);
    log(`Projects: ${projectIds.length}, Tasks synced: ${totalSynced}, Errors: ${totalErrors}, Plans skipped: ${plansSkipped}`);
    if (skippedPlans.length > 0) {
      log(`Skipped plans:\n${skippedPlans.map(s => `  - ${s}`).join('\n')}`);
    }

    // Log sync completion
    await supabase.from('planner_sync_log').insert({
      status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      tasks_synced: totalSynced,
      tasks_errored: totalErrors,
      projects_processed: projectIds.length,
      plans_skipped: plansSkipped,
      details: { results: syncResults },
    });

    return new Response(JSON.stringify({
      success: true,
      summary: {
        plansFound: plans.length,
        plansSkipped,
        projectsProcessed: projectIds.length,
        totalTasksSynced: totalSynced,
        totalErrors,
        durationMs,
        taskDetailBudgetUsed: MAX_TASK_DETAILS_PER_RUN - taskDetailBudget.remaining,
        results: syncResults,
      },
      logs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = (error as Error).message;
    log(`FATAL ERROR: ${msg}`);

    // Try to log the failure
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('planner_sync_log').insert({
        status: 'failed',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error_message: msg,
      });
    } catch (_) { /* ignore logging failure */ }

    return new Response(JSON.stringify({ success: false, error: msg, logs }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
