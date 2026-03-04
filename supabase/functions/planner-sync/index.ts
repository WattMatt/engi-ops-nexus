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

// ─── Planner label category names (Planner uses category1-category25) ────────
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

// ─── Microsoft Graph Auth (Client Credentials Flow) ──────────────────────────

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

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token request failed (${resp.status}): ${err}`);
  }

  const data = await resp.json();
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

// ─── Assignee Resolution ─────────────────────────────────────────────────────

async function buildAssigneeMap(
  supabase: any,
  accessToken: string,
  aadUserIds: string[]
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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  const profileByUsername: Record<string, any> = {};
  const allProfileUsernames: string[] = [];
  for (const p of profiles || []) {
    if (p.email) {
      const username = p.email.split('@')[0].toLowerCase();
      profileByUsername[username] = p;
      allProfileUsernames.push(username);
    }
  }

  for (const aadId of unmapped) {
    try {
      const userInfo = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/users/${aadId}?$select=displayName,mail,userPrincipalName`);
      const email = (userInfo.mail || userInfo.userPrincipalName || '').toLowerCase();
      const displayName = userInfo.displayName || '';
      const aadUsername = email.split('@')[0];

      let matchedProfile = aadUsername ? profileByUsername[aadUsername] : null;
      if (!matchedProfile && aadUsername) {
        const fallback = allProfileUsernames.find(nu => aadUsername.startsWith(nu) && nu.length >= 3);
        if (fallback) matchedProfile = profileByUsername[fallback];
      }
      if (!matchedProfile && displayName) {
        const nameMatch = (profiles || []).find((p: any) =>
          p.full_name && p.full_name.toLowerCase() === displayName.toLowerCase()
        );
        if (nameMatch) matchedProfile = nameMatch;
      }
      if (!matchedProfile) {
        const adminProfile = profileByUsername['admin'];
        if (adminProfile) {
          matchedProfile = adminProfile;
          log(`    → Falling back to admin account for "${displayName}"`);
        }
      }

      if (matchedProfile) {
        await supabase
          .from('azure_ad_user_mapping')
          .upsert({
            azure_ad_object_id: aadId,
            profile_id: matchedProfile.id,
            display_name: displayName,
            email: email,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'azure_ad_object_id' });

        map[aadId] = matchedProfile.id;
        log(`    Mapped AAD user "${displayName}" (${email}) → profile ${matchedProfile.id}`);
      } else {
        log(`    ⚠ No Nexus profile found for AAD user "${displayName}" (${email})`);
      }
    } catch (e) {
      log(`    ⚠ Could not fetch Graph user info for ${aadId}: ${(e as Error).message}`);
    }
  }

  return map;
}

// ─── Task Detail Fetching (notes, checklist, labels) ─────────────────────────

async function fetchTaskDetails(accessToken: string, taskId: string): Promise<{
  description: string | null;
  checklist: Array<{ title: string; isChecked: boolean }>;
}> {
  try {
    const details = await graphGet(accessToken, `https://graph.microsoft.com/v1.0/planner/tasks/${taskId}/details`);
    
    // Extract description/notes
    const description = details.description || null;
    
    // Extract checklist items
    const checklist: Array<{ title: string; isChecked: boolean }> = [];
    if (details.checklist) {
      for (const [, item] of Object.entries(details.checklist as Record<string, any>)) {
        checklist.push({
          title: item.title || '',
          isChecked: item.isChecked || false,
        });
      }
      // Sort by orderHint if available
      checklist.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return { description, checklist };
  } catch (e) {
    log(`    ⚠ Could not fetch task details for ${taskId}: ${(e as Error).message}`);
    return { description: null, checklist: [] };
  }
}

function extractLabels(appliedCategories: Record<string, boolean> | null): string[] {
  if (!appliedCategories) return [];
  const labels: string[] = [];
  for (const [key, val] of Object.entries(appliedCategories)) {
    if (val) {
      labels.push(PLANNER_LABEL_NAMES[key] || key);
    }
  }
  return labels;
}

// ─── Sync Logic ───────────────────────────────────────────────────────────────

function extractProjectNumber(planTitle: string): string | null {
  const match = planTitle.match(/\((\d+(?:\.\d+)*)\)/);
  return match ? match[1] : null;
}

function mapPlannerPriority(priority: number): string {
  switch (priority) {
    case 0: case 1: return 'critical';
    case 2: case 3: return 'high';
    case 5: case 6: return 'medium';
    default: return 'low';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('=== Planner Sync Started ===');

    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !GROUP_ID) {
      throw new Error('Missing required MS_PLANNER_* environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Get access token via Client Credentials
    log('Authenticating with Microsoft Graph (Client Credentials)...');
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

    const projectByNumber: Record<string, any> = {};
    for (const p of projects || []) {
      if (p.project_number) {
        projectByNumber[p.project_number.trim()] = p;
      }
    }

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalAssigneesMapped = 0;
    const syncResults: Array<{ plan: string; project: string; tasksProcessed: number }> = [];

    // Step 4: Collect all unique AAD user IDs across all tasks first
    const allTasks: Array<{ task: any; plan: any; project: any; bucketMap: Record<string, string> }> = [];
    const allAadUserIds = new Set<string>();

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

      log(`  Processing plan "${plan.title}" → Project "${project.name}" (${project.project_number})`);

      const tasks = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/tasks`);
      log(`    ${tasks.length} tasks in plan`);

      const buckets = await getAllPages(accessToken, `https://graph.microsoft.com/v1.0/planner/plans/${plan.id}/buckets`);
      const bucketMap: Record<string, string> = {};
      for (const b of buckets) {
        bucketMap[b.id] = b.name;
      }

      for (const task of tasks) {
        const assigneeIds: string[] = task.assignments ? Object.keys(task.assignments) : [];
        assigneeIds.forEach(id => allAadUserIds.add(id));
        allTasks.push({ task, plan, project, bucketMap });
      }
    }

    // Step 5: Build assignee mapping (AAD → Nexus profile UUID)
    log(`Resolving ${allAadUserIds.size} unique AAD user IDs to Nexus profiles...`);
    const assigneeMap = await buildAssigneeMap(supabase, accessToken, Array.from(allAadUserIds));
    log(`Resolved ${Object.keys(assigneeMap).length} of ${allAadUserIds.size} AAD users`);

    // Step 6: Sync tasks with resolved assignees
    const tasksByProject: Record<string, typeof allTasks> = {};
    for (const entry of allTasks) {
      const pid = entry.project.id;
      if (!tasksByProject[pid]) tasksByProject[pid] = [];
      tasksByProject[pid].push(entry);
    }

    for (const [projectId, entries] of Object.entries(tasksByProject)) {
      const project = entries[0].project;
      const planTitle = entries[0].plan.title;

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
      let planSyncCount = 0;

      for (const { task, bucketMap } of entries) {
        const plannerUrl = `planner://task/${task.id}`;
        const bucketName = task.bucketId ? (bucketMap[task.bucketId] || null) : null;
        const titleKey = task.title.toLowerCase().trim();

        if (syncedTitles.has(titleKey)) {
          continue;
        }
        syncedTitles.add(titleKey);

        // Resolve AAD IDs to Nexus profile UUIDs
        const aadAssigneeIds: string[] = task.assignments ? Object.keys(task.assignments) : [];
        const resolvedAssigneeIds = aadAssigneeIds
          .map(aadId => assigneeMap[aadId])
          .filter(Boolean);

        if (resolvedAssigneeIds.length > 0) totalAssigneesMapped++;

        // Fetch task details (notes, checklist)
        const taskDetails = await fetchTaskDetails(accessToken, task.id);
        
        // Extract labels from appliedCategories
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

        // Sync description from Planner notes
        if (taskDetails.description) {
          payload.description = taskDetails.description;
        }

        // Sync checklist
        if (taskDetails.checklist.length > 0) {
          payload.checklist = taskDetails.checklist;
        }

        // Sync labels
        if (labels.length > 0) {
          payload.labels = labels;
        }

        // Match by planner URL first, then by title
        let existing = existingByPlannerUrl[plannerUrl];
        if (!existing) {
          const titleMatches = existingByTitle[titleKey];
          if (titleMatches && titleMatches.length > 0) {
            existing = titleMatches[0];
          }
        }

        if (existing) {
          await supabase
            .from('project_roadmap_items')
            .update(payload)
            .eq('id', existing.id);
          
          // Clean up any duplicate roadmap items with the same title
          const titleMatches = existingByTitle[titleKey] || [];
          if (titleMatches.length > 1) {
            const duplicateIds = titleMatches
              .filter(item => item.id !== existing.id)
              .map(item => item.id);
            if (duplicateIds.length > 0) {
              await supabase
                .from('project_roadmap_items')
                .delete()
                .in('id', duplicateIds);
              log(`    Cleaned up ${duplicateIds.length} duplicate(s) for "${task.title}"`);
            }
          }
        } else {
          const { data: maxSort } = await supabase
            .from('project_roadmap_items')
            .select('sort_order')
            .eq('project_id', projectId)
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
        
        // Small delay between task detail fetches to avoid throttling
        await new Promise(r => setTimeout(r, 100));
      }

      totalSynced += planSyncCount;
      syncResults.push({ plan: planTitle, project: project.name, tasksProcessed: planSyncCount });
      log(`  Synced ${planSyncCount} tasks for "${project.name}"`);
    }

    log(`=== Planner Sync Complete ===`);
    log(`Plans processed: ${plans.length}, Tasks synced: ${totalSynced}, Plans skipped: ${totalSkipped}, Assignees mapped: ${totalAssigneesMapped}`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        plansFound: plans.length,
        plansSkipped: totalSkipped,
        totalTasksSynced: totalSynced,
        assigneesMapped: totalAssigneesMapped,
        uniqueAadUsers: allAadUserIds.size,
        resolvedUsers: Object.keys(assigneeMap).length,
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