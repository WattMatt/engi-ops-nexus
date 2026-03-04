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

async function getAccessToken(): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`Token request failed: ${await resp.text()}`);
  return (await resp.json()).access_token;
}

async function graphGet(token: string, url: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`Graph GET error (${resp.status}) ${url}: ${await resp.text()}`);
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

async function graphDelete(token: string, url: string, etag?: string): Promise<boolean> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (etag) headers['If-Match'] = etag;
  const resp = await fetch(url, { method: 'DELETE', headers });
  if (resp.status === 204 || resp.status === 200) return true;
  // 404 means already deleted
  if (resp.status === 404) return true;
  log(`  ⚠ DELETE failed (${resp.status}): ${await resp.text()}`);
  return false;
}

async function graphPost(token: string, url: string, body: any): Promise<any> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Graph POST error (${resp.status}) ${url}: ${errText}`);
  }
  return resp.json();
}

async function graphPatch(token: string, url: string, body: any, etag?: string): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (etag) headers['If-Match'] = etag;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    log(`  ⚠ PATCH failed (${resp.status}): ${errText}`);
  }
}

// Map Nexus labels back to Planner appliedCategories
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

function extractProjectNumber(planTitle: string): string | null {
  const match = planTitle.match(/\(\s*(P?\d+(?:\.\d+)*)\s*\)/i);
  return match ? match[1].toUpperCase() : null;
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
    log('=== Planner Reset & Push Started ===');
    log('Step 1: Authenticate with Microsoft Graph...');
    const accessToken = await getAccessToken();
    log('Authenticated ✅');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all plans
    log('Step 2: Fetching all plans...');
    const plans = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}/planner/plans`);
    log(`Found ${plans.length} plans`);

    // Get all Nexus projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .order('project_number');

    const projectByNumber: Record<string, any> = {};
    for (const p of projects || []) {
      if (p.project_number) projectByNumber[p.project_number.trim().toUpperCase()] = p;
    }

    // Build reverse assignee map: Nexus profile UUID → AAD object ID
    const { data: aadMappings } = await supabase
      .from('azure_ad_user_mapping')
      .select('azure_ad_object_id, profile_id');
    
    const profileToAad: Record<string, string> = {};
    for (const m of aadMappings || []) {
      profileToAad[m.profile_id] = m.azure_ad_object_id;
    }

    let totalDeleted = 0;
    let totalCreated = 0;

    for (const plan of plans) {
      const projectNumber = extractProjectNumber(plan.title);
      if (!projectNumber) {
        log(`Skipping plan "${plan.title}" — no project number`);
        continue;
      }
      const project = projectByNumber[projectNumber];
      if (!project) {
        log(`Skipping plan "${plan.title}" — no matching Nexus project`);
        continue;
      }

      log(`\n── Plan: "${plan.title}" → Project: "${project.name}" ──`);

      // ─── PHASE 1: Delete ALL existing Planner tasks ─────────────
      log('  Deleting existing Planner tasks...');
      const existingTasks = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/tasks`);
      log(`  Found ${existingTasks.length} tasks to delete`);

      for (const task of existingTasks) {
        // Need to get task details for the etag
        try {
          const taskDetail = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${task.id}`);
          const etag = taskDetail['@odata.etag'];
          const deleted = await graphDelete(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${task.id}`, etag);
          if (deleted) {
            totalDeleted++;
            log(`    Deleted: "${task.title}"`);
          }
        } catch (e) {
          log(`    ⚠ Failed to delete "${task.title}": ${(e as Error).message}`);
        }
        // Small delay to avoid throttling
        await new Promise(r => setTimeout(r, 200));
      }

      // ─── PHASE 2: Get buckets (or create default ones) ─────────
      const buckets = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`);
      const bucketByName: Record<string, string> = {};
      for (const b of buckets) {
        bucketByName[b.name.toLowerCase()] = b.id;
      }
      log(`  Existing buckets: ${Object.keys(bucketByName).join(', ') || 'none'}`);

      // ─── PHASE 3: Read Nexus roadmap items for this project ────
      const { data: roadmapItems } = await supabase
        .from('project_roadmap_items')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order', { ascending: true });

      log(`  ${roadmapItems?.length || 0} roadmap items to push`);

      // Build a lookup for resolving parent phases for child items
      const itemById: Record<string, any> = {};
      for (const item of roadmapItems || []) {
        itemById[item.id] = item;
      }

      // Resolve effective phase: use own phase, or inherit from parent
      function getEffectivePhase(item: any): string | null {
        if (item.phase) return item.phase;
        if (item.parent_id && itemById[item.parent_id]) {
          return getEffectivePhase(itemById[item.parent_id]);
        }
        return null;
      }

      // Collect unique phases that need buckets
      const phasesNeeded = new Set<string>();
      for (const item of roadmapItems || []) {
        const phase = getEffectivePhase(item);
        if (phase) phasesNeeded.add(phase);
      }

      // Create missing buckets
      for (const phase of phasesNeeded) {
        if (!bucketByName[phase.toLowerCase()]) {
          try {
            const newBucket = await graphPost(accessToken, 'https://graph.microsoft.com/v1.0/planner/buckets', {
              name: phase,
              planId: plan.id,
            });
            bucketByName[phase.toLowerCase()] = newBucket.id;
            log(`  Created bucket: "${phase}"`);
            await new Promise(r => setTimeout(r, 200));
          } catch (e) {
            log(`  ⚠ Failed to create bucket "${phase}": ${(e as Error).message}`);
          }
        }
      }

      // ─── PHASE 2b: Delete buckets that don't match roadmap phases or "Inbox" ───
      // All tasks were already deleted in Phase 1, so buckets should be empty
      const keepBuckets = new Set<string>(['inbox']);
      for (const phase of phasesNeeded) keepBuckets.add(phase.toLowerCase());

      const allBuckets = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`);
      for (const bucket of allBuckets) {
        const name = bucket.name.toLowerCase();
        if (!keepBuckets.has(name)) {
          try {
            const bucketDetail = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/buckets/${bucket.id}`);
            const deleted = await graphDelete(accessToken, `https://graph.microsoft.com/v1.0/planner/buckets/${bucket.id}`, bucketDetail['@odata.etag']);
            if (deleted) log(`  🗑 Removed bucket: "${bucket.name}"`);
            await new Promise(r => setTimeout(r, 200));
          } catch (e) {
            log(`  ⚠ Failed to remove bucket "${bucket.name}": ${(e as Error).message}`);
          }
        }
      }
      for (const item of roadmapItems || []) {
        const bucketId = item.phase ? bucketByName[item.phase.toLowerCase()] : null;

        // Build assignments object
        const assignments: Record<string, any> = {};
        const assigneeIds: string[] = item.assignee_ids || [];
        for (const profileId of assigneeIds) {
          const aadId = profileToAad[profileId];
          if (aadId) {
            assignments[aadId] = {
              '@odata.type': '#microsoft.graph.plannerAssignment',
              orderHint: ' !',
            };
          }
        }

        // Build appliedCategories from labels
        const appliedCategories: Record<string, boolean> = {};
        const itemLabels: string[] = item.labels || [];
        for (const label of itemLabels) {
          const catKey = PLANNER_LABEL_REVERSE[label.toLowerCase()];
          if (catKey) appliedCategories[catKey] = true;
        }

        const taskPayload: Record<string, any> = {
          planId: plan.id,
          title: item.title,
          priority: mapNexusPriorityToPlanner(item.priority),
          percentComplete: item.is_completed ? 100 : 0,
          assignments,
        };

        if (bucketId) taskPayload.bucketId = bucketId;
        if (item.due_date) taskPayload.dueDateTime = `${item.due_date}T00:00:00Z`;
        if (item.start_date) taskPayload.startDateTime = `${item.start_date}T00:00:00Z`;
        if (Object.keys(appliedCategories).length > 0) taskPayload.appliedCategories = appliedCategories;

        try {
          const createdTask = await graphPost(accessToken, 'https://graph.microsoft.com/v1.0/planner/tasks', taskPayload);
          totalCreated++;

          // Push description and checklist to task details (requires separate PATCH)
          const hasDescription = item.description && item.description.trim();
          const hasChecklist = item.checklist && Array.isArray(item.checklist) && item.checklist.length > 0;
          
          if (hasDescription || hasChecklist) {
            try {
              // Fetch task details to get etag
              const detailsResp = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${createdTask.id}/details`);
              const detailEtag = detailsResp['@odata.etag'];
              
              const detailPatch: Record<string, any> = {};
              if (hasDescription) detailPatch.description = item.description;
              if (hasChecklist) {
                const checklistObj: Record<string, any> = {};
                for (let i = 0; i < item.checklist.length; i++) {
                  const ci = item.checklist[i];
                  const key = crypto.randomUUID();
                  checklistObj[key] = {
                    '@odata.type': '#microsoft.graph.plannerChecklistItem',
                    title: ci.title,
                    isChecked: ci.isChecked || false,
                  };
                }
                detailPatch.checklist = checklistObj;
              }
              
              await graphPatch(
                accessToken,
                `https://graph.microsoft.com/v1.0/planner/tasks/${createdTask.id}/details`,
                detailPatch,
                detailEtag
              );
              await new Promise(r => setTimeout(r, 200));
            } catch (detailErr) {
              log(`    ⚠ Could not set details for "${item.title}": ${(detailErr as Error).message}`);
            }
          }

          // Update the roadmap item with the planner link
          await supabase
            .from('project_roadmap_items')
            .update({
              link_url: `planner://task/${createdTask.id}`,
              link_label: 'View in Planner',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          log(`    ✅ Created: "${item.title}"${Object.keys(assignments).length > 0 ? ` (${Object.keys(assignments).length} assignees)` : ''}`);
        } catch (e) {
          log(`    ❌ Failed to create "${item.title}": ${(e as Error).message}`);
        }

        // Throttle to avoid Graph API rate limits
        await new Promise(r => setTimeout(r, 300));
      }
    }

    log(`\n=== Planner Reset Complete ===`);
    log(`Deleted: ${totalDeleted} tasks | Created: ${totalCreated} tasks`);

    return new Response(JSON.stringify({
      success: true,
      summary: { totalDeleted, totalCreated },
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
