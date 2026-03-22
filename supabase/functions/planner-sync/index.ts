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

const TASK_DETAIL_DELAY_MS = 50;
const PROJECT_BATCH_DELAY_MS = 500;
const MAX_TASK_DETAILS_PER_RUN = 40;

const logs: string[] = [];
function log(msg: string) { console.log(msg); logs.push(`[${new Date().toISOString()}] ${msg}`); }

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

// ─── Graph helpers ───────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const resp = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default',
    }),
  });
  if (!resp.ok) throw new Error(`Token failed (${resp.status}): ${await resp.text()}`);
  return (await resp.json()).access_token;
}

async function graphGet(token: string, url: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`GET ${resp.status} ${url}: ${await resp.text()}`);
  return resp.json();
}

async function getAllPages(token: string, url: string): Promise<any[]> {
  let results: any[] = [];
  let next: string | null = url;
  while (next) {
    const data = await graphGet(token, next);
    results = results.concat(data.value || []);
    next = data['@odata.nextLink'] || null;
  }
  return results;
}

// ─── Assignee resolution ─────────────────────────────────────────────────────

async function buildAssigneeMap(supabase: any, accessToken: string, aadUserIds: string[]): Promise<Record<string, string>> {
  if (aadUserIds.length === 0) return {};
  const { data: existing } = await supabase.from('azure_ad_user_mapping').select('azure_ad_object_id, profile_id').in('azure_ad_object_id', aadUserIds);
  const map: Record<string, string> = {};
  const mapped = new Set<string>();
  for (const m of existing || []) { map[m.azure_ad_object_id] = m.profile_id; mapped.add(m.azure_ad_object_id); }

  const unmapped = aadUserIds.filter(id => !mapped.has(id));
  if (unmapped.length === 0) return map;

  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
  const byUsername: Record<string, any> = {};
  for (const p of profiles || []) { if (p.email) byUsername[p.email.split('@')[0].toLowerCase()] = p; }

  for (const aadId of unmapped) {
    try {
      const u = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/users/${aadId}?$select=displayName,mail,userPrincipalName`);
      const email = (u.mail || u.userPrincipalName || '').toLowerCase();
      const name = u.displayName || '';
      const username = email.split('@')[0];
      let match = username ? byUsername[username] : null;
      if (!match && name) match = (profiles || []).find((p: any) => p.full_name?.toLowerCase() === name.toLowerCase());
      if (match) {
        await supabase.from('azure_ad_user_mapping').upsert({ azure_ad_object_id: aadId, profile_id: match.id, display_name: name, email, updated_at: new Date().toISOString() }, { onConflict: 'azure_ad_object_id' });
        map[aadId] = match.id;
      }
    } catch (e) { log(`  ⚠ Resolve AAD ${aadId}: ${(e as Error).message}`); }
  }
  return map;
}

// ─── Task detail fetching ────────────────────────────────────────────────────

async function fetchTaskDetails(accessToken: string, taskId: string): Promise<{ description: string | null; checklist: Array<{ title: string; isChecked: boolean }> }> {
  try {
    const d = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${taskId}/details`);
    const cl: Array<{ title: string; isChecked: boolean }> = [];
    if (d.checklist) for (const [, item] of Object.entries(d.checklist as Record<string, any>)) cl.push({ title: item.title || '', isChecked: item.isChecked || false });
    cl.sort((a, b) => a.title.localeCompare(b.title));
    return { description: d.description || null, checklist: cl };
  } catch { return { description: null, checklist: [] }; }
}

function extractLabels(cats: Record<string, boolean> | null): string[] {
  if (!cats) return [];
  return Object.entries(cats).filter(([, v]) => v).map(([k]) => PLANNER_LABEL_NAMES[k] || k);
}

function extractProjectNumber(title: string): string | null {
  const m = title.match(/\(\s*(P?\d+(?:\.\d+)*)\s*\)/i);
  return m ? m[1].toUpperCase() : null;
}

function mapPlannerPriority(p: number): string {
  if (p <= 1) return 'critical';
  if (p <= 3) return 'high';
  if (p <= 6) return 'medium';
  return 'low';
}

// ─── Per-project sync ────────────────────────────────────────────────────────

async function syncProjectTasks(
  supabase: any, accessToken: string, projectId: string, projectName: string,
  entries: Array<{ task: any; bucketMap: Record<string, string> }>,
  assigneeMap: Record<string, string>, detailBudget: { remaining: number }
): Promise<{ synced: number; created: number; errors: number }> {
  let synced = 0, created = 0, errors = 0;

  // Load existing items
  const { data: existingItems } = await supabase.from('project_roadmap_items').select('id, title, link_url, phase, is_completed, description').eq('project_id', projectId);
  const byPlannerUrl: Record<string, any> = {};
  const byTitle: Record<string, any[]> = {};
  for (const it of existingItems || []) {
    if (it.link_url) byPlannerUrl[it.link_url] = it;
    const k = it.title.toLowerCase().trim();
    if (!byTitle[k]) byTitle[k] = [];
    byTitle[k].push(it);
  }

  // Track which planner task IDs we've seen (for detecting deletions)
  const seenPlannerUrls = new Set<string>();

  const { data: maxSort } = await supabase.from('project_roadmap_items').select('sort_order').eq('project_id', projectId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  let nextSort = (maxSort?.sort_order || 0) + 1;
  const processedTitles = new Set<string>();

  for (const { task, bucketMap } of entries) {
    try {
      const plannerUrl = `planner://task/${task.id}`;
      seenPlannerUrls.add(plannerUrl);
      const bucketName = task.bucketId ? (bucketMap[task.bucketId] || 'Inbox') : 'Inbox';
      const titleKey = task.title.toLowerCase().trim();
      if (processedTitles.has(titleKey)) continue;
      processedTitles.add(titleKey);

      const aadIds: string[] = task.assignments ? Object.keys(task.assignments) : [];
      const resolvedAssignees = aadIds.map(id => assigneeMap[id]).filter(Boolean);

      const labels = extractLabels(task.appliedCategories);

      // Match existing
      let existing = byPlannerUrl[plannerUrl];
      if (!existing) {
        const tm = byTitle[titleKey];
        if (tm && tm.length > 0) existing = tm[0];
      }

      let details = { description: null as string | null, checklist: [] as any[] };
      const shouldFetchDetails = !existing && detailBudget.remaining > 0;
      if (shouldFetchDetails) {
        details = await fetchTaskDetails(accessToken, task.id);
        detailBudget.remaining--;
        await new Promise(r => setTimeout(r, TASK_DETAIL_DELAY_MS));
      }

      if (existing) {
        // ── UPDATE: only sync Planner-owned fields ──
        // CRITICAL: Do NOT overwrite phase if already set to something other than Inbox
        const update: Record<string, any> = {
          priority: mapPlannerPriority(task.priority),
          is_completed: task.percentComplete === 100,
          completed_at: task.percentComplete === 100 ? (task.completedDateTime || new Date().toISOString()) : null,
          due_date: task.dueDateTime ? task.dueDateTime.substring(0, 10) : null,
          start_date: task.startDateTime ? task.startDateTime.substring(0, 10) : null,
          link_url: plannerUrl,
          link_label: 'View in Planner',
          assignee_ids: resolvedAssignees,
          updated_at: new Date().toISOString(),
        };

        // Only set phase if the existing item has no phase or is in Inbox
        if (!existing.phase || existing.phase === 'Inbox') {
          update.phase = bucketName;
        }

        if (details.description) update.description = details.description;
        if (details.checklist.length > 0) update.checklist = details.checklist;
        if (labels.length > 0) update.labels = labels;

        await supabase.from('project_roadmap_items').update(update).eq('id', existing.id);
        synced++;

        // 🎉 Detect completion transition: was NOT completed, now IS completed
        const nowComplete = task.percentComplete === 100;
        const wasComplete = existing.is_completed === true;
        if (nowComplete && !wasComplete) {
          log(`  🎉 Item completed in Planner: "${task.title}" — sending notification`);
          try {
            // Determine who completed it: use first assignee or fall back
            const completedByUserId = resolvedAssignees.length > 0 ? resolvedAssignees[0] : null;
            await supabase.functions.invoke("send-roadmap-completion-notification", {
              body: {
                itemId: existing.id,
                itemTitle: task.title,
                itemDescription: existing.description || details.description || null,
                projectId,
                completedByUserId: completedByUserId || 'planner-sync',
              },
            });
          } catch (notifErr) {
            log(`  ⚠ Completion notification failed: ${(notifErr as Error).message}`);
          }
        }
      } else {
        // ── INSERT: new task from Planner → Nexus Inbox (or bucket name) ──
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
          assignee_ids: resolvedAssignees,
          sort_order: nextSort++,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (details.description) payload.description = details.description;
        if (details.checklist.length > 0) payload.checklist = details.checklist;
        if (labels.length > 0) payload.labels = labels;

        const insertResult = await supabase.from('project_roadmap_items').insert(payload).select('id').single();
        created++;
        log(`  📥 New from Planner: "${task.title}" → ${bucketName}`);

        // 🎉 If new item arrives already completed, send notification
        if (task.percentComplete === 100 && insertResult.data?.id) {
          try {
            const completedByUserId = resolvedAssignees.length > 0 ? resolvedAssignees[0] : null;
            await supabase.functions.invoke("send-roadmap-completion-notification", {
              body: {
                itemId: insertResult.data.id,
                itemTitle: task.title,
                itemDescription: details.description || null,
                projectId,
                completedByUserId: completedByUserId || 'planner-sync',
              },
            });
            log(`  🎉 New completed item notification sent: "${task.title}"`);
          } catch (notifErr) {
            log(`  ⚠ Completion notification failed: ${(notifErr as Error).message}`);
          }
        }
      }
    } catch (e) {
      errors++;
      log(`  ✗ Error "${task.title}": ${(e as Error).message}`);
    }
  }

  // Detect items whose Planner task was deleted: clear their link_url
  const orphanedItems = (existingItems || []).filter(
    (it: any) => it.link_url?.startsWith('planner://task/') && !seenPlannerUrls.has(it.link_url)
  );
  if (orphanedItems.length > 0) {
    const orphanIds = orphanedItems.map((it: any) => it.id);
    await supabase.from('project_roadmap_items').update({ link_url: null, link_label: null }).in('id', orphanIds);
    log(`  🔗 Cleared ${orphanIds.length} stale planner links (tasks deleted from Planner)`);
  }

  return { synced, created, errors };
}

// ─── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    log('=== Planner Sync (Planner → Nexus) ===');
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !GROUP_ID) throw new Error('Missing MS_PLANNER_* env vars');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('planner_sync_log').insert({ status: 'running', started_at: new Date().toISOString() });

    const accessToken = await getAccessToken();
    log('Authenticated ✅');

    const plans = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}/planner/plans`);
    log(`Found ${plans.length} plans`);

    const { data: projects } = await supabase.from('projects').select('id, name, project_number').order('project_number');
    const projectByNumber: Record<string, any> = {};
    for (const p of projects || []) { if (p.project_number) projectByNumber[p.project_number.trim().toUpperCase()] = p; }

    type TaskEntry = { task: any; bucketMap: Record<string, string> };
    const tasksByProject: Record<string, { project: any; planTitle: string; entries: TaskEntry[] }> = {};
    const allAadIds = new Set<string>();
    let plansSkipped = 0;

    for (const plan of plans) {
      const pn = extractProjectNumber(plan.title);
      if (!pn) { plansSkipped++; continue; }
      const project = projectByNumber[pn];
      if (!project) { plansSkipped++; continue; }

      const tasks = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/tasks`);
      const buckets = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`);
      const bucketMap: Record<string, string> = {};
      for (const b of buckets) bucketMap[b.id] = b.name;

      if (!tasksByProject[project.id]) tasksByProject[project.id] = { project, planTitle: plan.title, entries: [] };
      for (const task of tasks) {
        (task.assignments ? Object.keys(task.assignments) : []).forEach((id: string) => allAadIds.add(id));
        tasksByProject[project.id].entries.push({ task, bucketMap });
      }
      log(`  "${plan.title}" → ${tasks.length} tasks`);
    }

    const assigneeMap = await buildAssigneeMap(supabase, accessToken, Array.from(allAadIds));
    log(`Resolved ${Object.keys(assigneeMap).length}/${allAadIds.size} AAD users`);

    let totalSynced = 0, totalCreated = 0, totalErrors = 0;
    const detailBudget = { remaining: MAX_TASK_DETAILS_PER_RUN };
    const results: any[] = [];
    const pids = Object.keys(tasksByProject);

    for (let i = 0; i < pids.length; i++) {
      const { project, planTitle, entries } = tasksByProject[pids[i]];
      log(`[${i + 1}/${pids.length}] "${project.name}" (${entries.length} tasks)...`);
      try {
        const r = await syncProjectTasks(supabase, accessToken, pids[i], project.name, entries, assigneeMap, detailBudget);
        totalSynced += r.synced; totalCreated += r.created; totalErrors += r.errors;
        results.push({ project: project.name, plan: planTitle, synced: r.synced, created: r.created, errors: r.errors });
        log(`  ✓ ${r.synced} updated, ${r.created} new, ${r.errors} errors`);
      } catch (e) {
        log(`  ✗ "${project.name}" failed: ${(e as Error).message}`);
        results.push({ project: project.name, plan: planTitle, synced: 0, created: 0, errors: entries.length });
        totalErrors += entries.length;
      }
      if (i < pids.length - 1) await new Promise(r => setTimeout(r, PROJECT_BATCH_DELAY_MS));
    }

    const duration = Date.now() - startTime;
    log(`=== Sync Complete (${(duration / 1000).toFixed(1)}s): ${totalSynced} updated, ${totalCreated} new, ${totalErrors} errors ===`);

    await supabase.from('planner_sync_log').insert({
      status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      tasks_synced: totalSynced + totalCreated,
      tasks_errored: totalErrors,
      projects_processed: pids.length,
      plans_skipped: plansSkipped,
      details: { results },
    });

    return new Response(JSON.stringify({
      success: true,
      summary: { plansFound: plans.length, plansSkipped, projectsProcessed: pids.length, totalSynced, totalCreated, totalErrors, durationMs: duration, results },
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = (error as Error).message;
    log(`FATAL: ${msg}`);
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('planner_sync_log').insert({ status: 'failed', started_at: new Date(startTime).toISOString(), completed_at: new Date().toISOString(), duration_ms: Date.now() - startTime, error_message: msg });
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ success: false, error: msg, logs }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
