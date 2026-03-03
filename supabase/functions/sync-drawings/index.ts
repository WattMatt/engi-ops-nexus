import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY')!;
const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET')!;
const DROPBOX_REFRESH_TOKEN = Deno.env.get('DROPBOX_REFRESH_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Dropbox Token ───────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`)}`
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: DROPBOX_REFRESH_TOKEN })
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}

// ─── Dropbox Helpers ─────────────────────────────────────────────
async function getRootNamespaceId(token: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const acct = await res.json();
    return acct?.root_info?.root_namespace_id || null;
  } catch { return null; }
}

function dropboxHeaders(token: string, nsId: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  if (nsId) h['Dropbox-API-Path-Root'] = JSON.stringify({ ".tag": "root", root: nsId });
  return h;
}

async function listFolder(token: string, path: string, nsId: string | null): Promise<any[]> {
  const hdrs = dropboxHeaders(token, nsId);
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ path: path || '', include_mounted_folders: true, include_non_downloadable_files: false })
  });
  if (!res.ok) { console.error(`list_folder ${path}: ${await res.text()}`); return []; }
  let data = await res.json();
  let entries = data.entries || [];
  while (data.has_more) {
    const c = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cursor: data.cursor })
    });
    if (!c.ok) break;
    data = await c.json();
    entries = entries.concat(data.entries || []);
  }
  return entries;
}

async function downloadFile(token: string, dropboxPath: string, nsId: string | null): Promise<Uint8Array | null> {
  const hdrs: Record<string, string> = { 'Authorization': `Bearer ${token}` };
  if (nsId) hdrs['Dropbox-API-Path-Root'] = JSON.stringify({ ".tag": "root", root: nsId });
  hdrs['Dropbox-API-Arg'] = JSON.stringify({ path: dropboxPath });
  const res = await fetch('https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: hdrs });
  if (!res.ok) { console.error(`download ${dropboxPath}: ${res.status}`); return null; }
  return new Uint8Array(await res.arrayBuffer());
}

// ─── Path Resolution ─────────────────────────────────────────────
async function findDrawingsPath(token: string, projectFolderPath: string, nsId: string | null): Promise<string | null> {
  // Walk: .../{ELECTRICAL}/{DRAWINGS}/{PDF}/{LATEST*}
  const entries1 = await listFolder(token, projectFolderPath, nsId);
  const elec = entries1.find((e: any) => e['.tag'] === 'folder' && /electrical/i.test(e.name));
  if (!elec) return null;

  const entries2 = await listFolder(token, elec.path_display, nsId);
  const drw = entries2.find((e: any) => e['.tag'] === 'folder' && /drawings/i.test(e.name));
  if (!drw) return null;

  const entries3 = await listFolder(token, drw.path_display, nsId);
  const pdf = entries3.find((e: any) => e['.tag'] === 'folder' && /^pdf$/i.test(e.name));
  if (!pdf) return null;

  const entries4 = await listFolder(token, pdf.path_display, nsId);
  const latest = entries4.find((e: any) => e['.tag'] === 'folder' && /latest/i.test(e.name));
  return latest?.path_display || null;
}

// ─── Drawing Number Parser ───────────────────────────────────────
function parseDrawingInfo(fileName: string) {
  const title = fileName.replace(/\.pdf$/i, '');
  const firstPart = title.split(' - ')[0].trim();
  const drawingNumber = firstPart.replace(/\./g, '/').replace(/-/g, '/');
  const afterNumber = title.indexOf(' - ') >= 0 ? title.substring(title.indexOf(' - ') + 3) : title;
  const titleClean = afterNumber
    .replace(/[\s-]*REV\.?\s*\w*\s*$/i, '')
    .replace(/\.\s*REV\.?\s*\w*\s*$/i, '')
    .trim();
  const revMatch = title.match(/REV\.?\s*(\w+)\s*$/i);
  const revision = revMatch ? revMatch[1] : '0';
  return { drawingNumber, drawingTitle: titleClean || title, revision };
}

// ─── Main ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const correlationId = crypto.randomUUID().slice(0, 8);
  const log = (msg: string) => console.log(`[${correlationId}] ${msg}`);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get Dropbox access token
    log('Refreshing Dropbox access token...');
    const accessToken = await getAccessToken();
    const nsId = await getRootNamespaceId(accessToken);
    log(`Root namespace: ${nsId ?? 'none'}`);

    // 2. Fetch active projects from DB
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('id, name, project_number, status, dropbox_folder_path')
      .not('status', 'eq', 'archived')
      .order('project_number');
    if (pErr) throw pErr;
    log(`Found ${projects?.length ?? 0} active projects`);

    // 3. Find base project folders in Dropbox
    const basePaths = ['/OFFICE/PROJECTS', '/Office/Projects', '/PROJECTS', '/Projects'];
    let projectFolders: any[] = [];
    let basePath = '';
    for (const bp of basePaths) {
      const entries = await listFolder(accessToken, bp, nsId);
      const folders = entries.filter((e: any) => e['.tag'] === 'folder');
      if (folders.length > 0) { projectFolders = folders; basePath = bp; break; }
    }
    log(`Base path: ${basePath}, ${projectFolders.length} folders`);

    const projectNumRegex = /\((\d+)\)/;
    const results: any[] = [];

    for (const project of (projects || [])) {
      // Match project to a Dropbox folder by project_number in parentheses
      const matchedFolder = projectFolders.find((f: any) => {
        const m = f.name.match(projectNumRegex);
        return m && m[1] === project.project_number;
      });

      if (!matchedFolder) continue;
      log(`Project ${project.project_number} "${project.name}" → ${matchedFolder.name}`);

      const drawingsPath = await findDrawingsPath(accessToken, matchedFolder.path_display, nsId);
      if (!drawingsPath) {
        log(`  No LATEST PDF path found, skipping`);
        continue;
      }

      const allEntries = await listFolder(accessToken, drawingsPath, nsId);
      const pdfFiles = allEntries.filter((e: any) => e['.tag'] === 'file' && e.name.toLowerCase().endsWith('.pdf'));
      log(`  ${pdfFiles.length} PDFs in ${drawingsPath}`);

      // Get existing drawings for this project
      const { data: existingDrawings } = await supabase
        .from('project_drawings')
        .select('id, drawing_number, file_name, dropbox_path, file_url')
        .eq('project_id', project.id);

      const existingByNorm = new Map<string, any>();
      const existingByFile = new Map<string, any>();
      for (const d of (existingDrawings || [])) {
        const norm = d.drawing_number?.replace(/\./g, '/').replace(/-/g, '/');
        if (norm) existingByNorm.set(norm, d);
        if (d.file_name) existingByFile.set(d.file_name, d);
      }

      // Track which DB records are still present in Dropbox
      const seenDbIds = new Set<string>();
      let upserted = 0, uploaded = 0, skipped = 0;

      for (const pdfFile of pdfFiles) {
        const fileName = pdfFile.name;
        const { drawingNumber, drawingTitle, revision } = parseDrawingInfo(fileName);

        // Find existing record (by filename first, then by normalized drawing number)
        const existing = existingByFile.get(fileName) || existingByNorm.get(drawingNumber);
        if (existing) seenDbIds.add(existing.id);

        // Storage path: projects/{project_id}/drawings/{filename}
        const storagePath = `projects/${project.id}/drawings/${fileName}`;
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/project-assets/${storagePath}`;

        // Decide if we need to upload/re-upload the file
        const needsUpload = !existing?.file_url || existing.file_url !== publicUrl;

        if (needsUpload) {
          const fileData = await downloadFile(accessToken, pdfFile.path_display, nsId);
          if (fileData) {
            const { error: upErr } = await supabase.storage
              .from('project-assets')
              .upload(storagePath, fileData, { contentType: 'application/pdf', upsert: true });
            if (upErr) {
              console.error(`  Upload failed ${fileName}:`, upErr.message);
            } else {
              uploaded++;
            }
          }
        }

        if (existing) {
          // Update existing record
          await supabase.from('project_drawings').update({
            dropbox_path: pdfFile.path_display,
            file_name: fileName,
            file_url: publicUrl,
            file_path: storagePath,
            current_revision: revision,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
          skipped++; // updated, not new
        } else {
          // Insert new record
          const { error: insErr } = await supabase.from('project_drawings').insert({
            project_id: project.id,
            drawing_title: drawingTitle,
            drawing_number: drawingNumber,
            category: 'electrical',
            status: 'draft',
            current_revision: revision,
            file_name: fileName,
            file_url: publicUrl,
            file_path: storagePath,
            dropbox_path: pdfFile.path_display,
          });
          if (insErr) {
            console.error(`  Insert failed ${fileName}:`, insErr.message);
          } else {
            seenDbIds.add('new'); // placeholder
            upserted++;
          }
        }
      }

      // ─── Cleanup: remove drawings no longer in Dropbox ───
      let removed = 0;
      for (const d of (existingDrawings || [])) {
        if (!seenDbIds.has(d.id)) {
          // Delete from storage
          if (d.file_path) {
            await supabase.storage.from('project-assets').remove([d.file_path]);
          }
          // Delete DB record
          await supabase.from('project_drawings').delete().eq('id', d.id);
          removed++;
          log(`  Removed stale drawing: ${d.file_name}`);
        }
      }

      results.push({
        project: project.name,
        projectNumber: project.project_number,
        pdfsInDropbox: pdfFiles.length,
        newImported: upserted,
        updated: skipped,
        uploaded,
        removed,
      });
    }

    const summary = {
      correlationId,
      timestamp: new Date().toISOString(),
      projectsSynced: results.length,
      results,
    };
    log(`Sync complete: ${results.length} projects processed`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${correlationId}] Fatal:`, error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
