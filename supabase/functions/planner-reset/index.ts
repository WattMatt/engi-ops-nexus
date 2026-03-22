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

const logs: string[] = [];
function log(msg: string) {
  console.log(msg);
  logs.push(`[${new Date().toISOString()}] ${msg}`);
}

const TEMPLATE_PHASES = [
  'Planning & Preparation',
  'Budget & Assessment',
  'Tender & Procurement',
  'Drawings',
  'Documentation',
  'Construction',
  'Handover',
];

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
  if (!resp.ok) throw new Error(`Token failed: ${await resp.text()}`);
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

async function graphPost(token: string, url: string, body: any): Promise<any> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`POST ${resp.status} ${url}: ${await resp.text()}`);
  return resp.json();
}

async function graphPatch(token: string, url: string, body: any, etag?: string): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
  };
  if (etag) headers['If-Match'] = etag;
  const resp = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!resp.ok) log(`  ⚠ PATCH ${resp.status}: ${await resp.text()}`);
}

async function sendCompletionNotification(
  supabase: any,
  itemId: string,
  itemTitle: string,
  itemDescription: string | null,
  projectId: string,
  completedByUserId: string,
) {
  try {
    await supabase.functions.invoke('send-roadmap-completion-notification', {
      body: {
        itemId,
        itemTitle,
        itemDescription,
        projectId,
        completedByUserId,
      },
    });
  } catch (error) {
    log(`  ⚠ Completion notification failed: ${(error as Error).message}`);
  }
}

function extractProjectNumber(title: string): string | null {
  const m = title.match(/\(\s*(P?\d+(?:\.\d+)*)\s*\)/i);
  return m ? m[1].toUpperCase() : null;
}

function mapPriority(p: string | null): number {
  switch (p) {
    case 'critical': return 1;
    case 'high': return 3;
    case 'medium': return 5;
    case 'low': return 9;
    default: return 5;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    let filterProjectIds: string[] | null = null;
    let maxPlansToCreate = 50;
    try {
      const body = await req.json();
      if (Array.isArray(body?.projectIds) && body.projectIds.length > 0) filterProjectIds = body.projectIds;
      if (body?.maxPlansToCreate) maxPlansToCreate = body.maxPlansToCreate;
    } catch { /* no body */ }

    log('=== Planner Reset (Nexus → Planner) ===');
    const accessToken = await getAccessToken();
    log('Authenticated ✅');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load projects
    const { data: projects } = await supabase.from('projects').select('id, name, project_number').order('project_number');
    const projectByNumber: Record<string, any> = {};
    for (const p of projects || []) {
      if (p.project_number) projectByNumber[p.project_number.trim().toUpperCase()] = p;
    }

    // Load existing plans
    const plans = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}/planner/plans`);
    const planByNumber: Record<string, any> = {};
    for (const plan of plans) {
      const pn = extractProjectNumber(plan.title);
      if (pn) planByNumber[pn] = plan;
    }

    // Auto-create missing plans
    let plansCreated = 0;
    for (const [num, project] of Object.entries(projectByNumber)) {
      if (planByNumber[num] || plansCreated >= maxPlansToCreate) continue;
      const { count } = await supabase.from('project_roadmap_items').select('id', { count: 'exact', head: true }).eq('project_id', project.id);
      if (!count) continue;
      try {
        const title = `(${project.project_number.trim()}) ${project.name}`;
        log(`  Creating plan: "${title}"...`);
        const newPlan = await graphPost(accessToken, 'https://graph.microsoft.com/v1.0/planner/plans', {
          container: { url: `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}` },
          title,
        });
        planByNumber[num] = newPlan;
        plansCreated++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) { log(`  ❌ ${(e as Error).message}`); }
    }

    // AAD mapping
    const { data: aadMappings } = await supabase.from('azure_ad_user_mapping').select('azure_ad_object_id, profile_id');
    const profileToAad: Record<string, string> = {};
    for (const m of aadMappings || []) profileToAad[m.profile_id] = m.azure_ad_object_id;

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    // Process each plan
    for (const [num, plan] of Object.entries(planByNumber)) {
      const project = projectByNumber[num];
      if (!project) continue;
      if (filterProjectIds && !filterProjectIds.includes(project.id)) continue;

      log(`\n── "${project.name}" ──`);

      // 1. Ensure buckets exist
      const existingBuckets = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`);
      const bucketByName: Record<string, string> = {};
      for (const b of existingBuckets) bucketByName[b.name.toLowerCase()] = b.id;

      // Load roadmap items
      const { data: items } = await supabase
        .from('project_roadmap_items')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order');

      if (!items || items.length === 0) {
        log('  No roadmap items, skipping');
        continue;
      }

      // Build item lookup for phase inheritance
      const itemById: Record<string, any> = {};
      for (const it of items) itemById[it.id] = it;
      function resolvePhase(it: any): string {
        if (it.phase && it.phase !== 'Inbox') return it.phase;
        if (it.parent_id && itemById[it.parent_id]) return resolvePhase(itemById[it.parent_id]);
        return it.phase || 'Inbox';
      }

      // Collect all needed phases
      const phasesNeeded = new Set<string>(TEMPLATE_PHASES);
      phasesNeeded.add('Inbox');
      for (const it of items) phasesNeeded.add(resolvePhase(it));

      // Create missing buckets
      for (const phase of phasesNeeded) {
        if (!bucketByName[phase.toLowerCase()]) {
          try {
            const nb = await graphPost(accessToken, 'https://graph.microsoft.com/v1.0/planner/buckets', { name: phase, planId: plan.id });
            bucketByName[phase.toLowerCase()] = nb.id;
            log(`  + Bucket: "${phase}"`);
            await new Promise(r => setTimeout(r, 200));
          } catch (e) { log(`  ⚠ Bucket "${phase}": ${(e as Error).message}`); }
        }
      }

      // 2. Batch-fetch existing Planner tasks for this plan
      const planTasks = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/tasks`);
      const planTaskById: Record<string, any> = {};
      for (const t of planTasks) planTaskById[t.id] = t;

      // 3. For each Nexus item: create or update Planner task
      for (const item of items) {
        const phase = resolvePhase(item);
        const targetBucketId = bucketByName[phase.toLowerCase()] || bucketByName['inbox'];

        // Build assignments
        const assignments: Record<string, any> = {};
        for (const pid of (item.assignee_ids || [])) {
          const aadId = profileToAad[pid];
          if (aadId) assignments[aadId] = { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' };
        }

        // Build appliedCategories
        const appliedCategories: Record<string, boolean> = {};
        for (const label of (item.labels || [])) {
          const cat = PLANNER_LABEL_REVERSE[label.toLowerCase()];
          if (cat) appliedCategories[cat] = true;
        }

        const hasLink = item.link_url?.startsWith('planner://task/');

        if (hasLink) {
          // ── UPDATE existing Planner task ──
          const plannerTaskId = item.link_url.replace('planner://task/', '');
          const taskData = planTaskById[plannerTaskId];
          if (!taskData) {
            // Task was deleted from Planner — clear link and recreate
            log(`  ⚠ Task "${item.title}" missing in Planner, will recreate`);
            await supabase.from('project_roadmap_items').update({ link_url: null, link_label: null }).eq('id', item.id);
            // Fall through to create below
          } else {
            // PATCH the task
            const plannerIsComplete = taskData.percentComplete === 100;
            const nexusIsComplete = item.is_completed === true;
            const effectiveIsCompleted = nexusIsComplete || plannerIsComplete;
            const patch: Record<string, any> = {
              title: item.title,
              priority: mapPriority(item.priority),
              percentComplete: effectiveIsCompleted ? 100 : 0,
              assignments,
            };
            if (targetBucketId && taskData.bucketId !== targetBucketId) patch.bucketId = targetBucketId;
            if (item.due_date) patch.dueDateTime = `${item.due_date}T00:00:00Z`;
            else patch.dueDateTime = null;
            if (item.start_date) patch.startDateTime = `${item.start_date}T00:00:00Z`;
            else patch.startDateTime = null;
            if (Object.keys(appliedCategories).length > 0) patch.appliedCategories = appliedCategories;

            // Handle unassignment
            if (taskData.assignments) {
              for (const existing of Object.keys(taskData.assignments)) {
                if (!assignments[existing]) assignments[existing] = null;
              }
              patch.assignments = assignments;
            }

            try {
              if (plannerIsComplete && !nexusIsComplete) {
                await supabase.from('project_roadmap_items').update({
                  is_completed: true,
                  completed_at: taskData.completedDateTime || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }).eq('id', item.id);

                await sendCompletionNotification(
                  supabase,
                  item.id,
                  item.title,
                  item.description || null,
                  project.id,
                  (item.assignee_ids?.[0] as string | undefined) || 'planner-sync',
                );
              }

              await graphPatch(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${plannerTaskId}`, patch, taskData['@odata.etag']);
              totalUpdated++;
              await new Promise(r => setTimeout(r, 300));
            } catch (e) {
              log(`  ⚠ Update "${item.title}": ${(e as Error).message}`);
            }

            // Update details if needed
            const hasDesc = item.description?.trim();
            const hasChecklist = Array.isArray(item.checklist) && item.checklist.length > 0;
            if (hasDesc || hasChecklist) {
              try {
                const det = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${plannerTaskId}/details`);
                const dp: Record<string, any> = {};
                if (hasDesc) dp.description = item.description;
                if (hasChecklist) {
                  const cl: Record<string, any> = {};
                  // Clear existing
                  if (det.checklist) for (const k of Object.keys(det.checklist)) cl[k] = null;
                  for (const ci of item.checklist) {
                    cl[crypto.randomUUID()] = { '@odata.type': '#microsoft.graph.plannerChecklistItem', title: ci.title, isChecked: ci.isChecked || false };
                  }
                  dp.checklist = cl;
                }
                await graphPatch(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${plannerTaskId}/details`, dp, det['@odata.etag']);
                await new Promise(r => setTimeout(r, 200));
              } catch { /* non-critical */ }
            }
            continue;
          }
        }

        // ── CREATE new Planner task ──
        const taskPayload: Record<string, any> = {
          planId: plan.id,
          title: item.title,
          priority: mapPriority(item.priority),
          percentComplete: item.is_completed ? 100 : 0,
          assignments,
        };
        if (targetBucketId) taskPayload.bucketId = targetBucketId;
        if (item.due_date) taskPayload.dueDateTime = `${item.due_date}T00:00:00Z`;
        if (item.start_date) taskPayload.startDateTime = `${item.start_date}T00:00:00Z`;
        if (Object.keys(appliedCategories).length > 0) taskPayload.appliedCategories = appliedCategories;

        try {
          const created = await graphPost(accessToken, 'https://graph.microsoft.com/v1.0/planner/tasks', taskPayload);
          totalCreated++;

          // Set details
          const hasDesc = item.description?.trim();
          const hasChecklist = Array.isArray(item.checklist) && item.checklist.length > 0;
          if (hasDesc || hasChecklist) {
            try {
              const det = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${created.id}/details`);
              const dp: Record<string, any> = {};
              if (hasDesc) dp.description = item.description;
              if (hasChecklist) {
                const cl: Record<string, any> = {};
                for (const ci of item.checklist) {
                  cl[crypto.randomUUID()] = { '@odata.type': '#microsoft.graph.plannerChecklistItem', title: ci.title, isChecked: ci.isChecked || false };
                }
                dp.checklist = cl;
              }
              await graphPatch(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${created.id}/details`, dp, det['@odata.etag']);
              await new Promise(r => setTimeout(r, 200));
            } catch { /* non-critical */ }
          }

          // Save link back to Nexus
          await supabase.from('project_roadmap_items').update({
            link_url: `planner://task/${created.id}`,
            link_label: 'View in Planner',
            updated_at: new Date().toISOString(),
          }).eq('id', item.id);

          log(`  ✅ Created: "${item.title}" → ${phase}`);
        } catch (e) {
          log(`  ❌ Create "${item.title}": ${(e as Error).message}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }

      log(`  Summary: ${totalCreated} created, ${totalUpdated} updated`);
    }

    log(`\n=== Reset Complete: ${totalCreated} created, ${totalUpdated} updated, ${plansCreated} plans created ===`);

    return new Response(JSON.stringify({
      success: true,
      summary: { totalCreated, totalUpdated, plansCreated },
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = (error as Error).message;
    log(`ERROR: ${msg}`);
    return new Response(JSON.stringify({ success: false, error: msg, logs }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
