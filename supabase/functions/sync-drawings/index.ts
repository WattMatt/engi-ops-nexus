import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY');
const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET');
const DROPBOX_REFRESH_TOKEN = Deno.env.get('DROPBOX_REFRESH_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DropboxCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
}

interface SyncResult {
  projectsScanned: { name: string; projectNumber: string; drawingsFound: number; newImported: number; skipped: number }[];
  totalNewDrawings: number;
  totalSkipped: number;
  errors: string[];
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  // Also try expired connections - we may be able to refresh them
  const { data: connection, error } = await supabase
    .from('user_storage_connections')
    .select('id, credentials, status')
    .eq('user_id', userId)
    .eq('provider', 'dropbox')
    .in('status', ['connected', 'expired'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !connection) {
    console.error('No active Dropbox connection found for user:', userId);
    return null;
  }

  const credentials = connection.credentials as DropboxCredentials;
  if (!credentials?.refresh_token) return null;

  // Check if token needs refresh (expired status, no access token, or token expiring soon)
  const needsRefresh = connection.status === 'expired' || !credentials.access_token || 
    (credentials.expires_at && new Date(credentials.expires_at).getTime() - Date.now() < 5 * 60 * 1000);
  
  if (needsRefresh) {
    console.log('Refreshing Dropbox token for user:', userId);
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Token refresh failed:', errText);
      await supabase
        .from('user_storage_connections')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', connection.id);
      return null;
    }

    const newTokens = await tokenResponse.json();
    await supabase
      .from('user_storage_connections')
      .update({
        credentials: {
          ...credentials,
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
        },
        status: 'connected',
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    return newTokens.access_token;
  }

  await supabase
    .from('user_storage_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', connection.id);

  return credentials.access_token;
}

async function getGlobalAccessToken(supabase: any, userId: string): Promise<string | null> {
  if (!DROPBOX_REFRESH_TOKEN || !DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    console.error('Global Dropbox credentials not configured');
    return null;
  }

  console.log('Using global DROPBOX_REFRESH_TOKEN fallback for user:', userId);
  const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: DROPBOX_REFRESH_TOKEN
    })
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    console.error('Global token refresh failed:', errText);
    return null;
  }

  const newTokens = await tokenResponse.json();
  console.log('Global token refresh successful');

  // Update or create the user connection so future calls use this token
  const credentials = {
    access_token: newTokens.access_token,
    refresh_token: DROPBOX_REFRESH_TOKEN,
    expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
  };

  const { data: existing } = await supabase
    .from('user_storage_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'dropbox')
    .single();

  if (existing) {
    await supabase
      .from('user_storage_connections')
      .update({
        credentials,
        status: 'connected',
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('user_storage_connections')
      .insert({
        user_id: userId,
        provider: 'dropbox',
        credentials,
        status: 'connected',
        connected_at: new Date().toISOString()
      });
  }

  return newTokens.access_token;
}

// Get root namespace ID for team/shared folder access
async function getRootNamespaceId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) return null;
    const account = await response.json();
    return account?.root_info?.root_namespace_id || null;
  } catch (e) {
    console.error('Failed to get root namespace:', e);
    return null;
  }
}

async function listDropboxFolder(accessToken: string, path: string, rootNamespaceId: string | null): Promise<any[]> {
  const dropboxPath = path === '' || path === '/' ? '' : path;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
  if (rootNamespaceId) {
    headers['Dropbox-API-Path-Root'] = JSON.stringify({ ".tag": "root", "root": rootNamespaceId });
  }

  const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      path: dropboxPath,
      include_mounted_folders: true,
      include_non_downloadable_files: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to list folder ${path}:`, errorText);
    return [];
  }

  const data = await response.json();
  let entries = data.entries || [];

  // Handle pagination
  let hasMore = data.has_more;
  let cursor = data.cursor;
  while (hasMore) {
    const contResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cursor })
    });
    if (!contResponse.ok) break;
    const contData = await contResponse.json();
    entries = entries.concat(contData.entries || []);
    hasMore = contData.has_more;
    cursor = contData.cursor;
  }

  return entries;
}

// downloadDropboxFile removed — we no longer download files to storage

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = user.id;

    // Get Dropbox access token - try per-user first, then global fallback
    let accessToken = await getValidAccessToken(supabase, userId);
    if (!accessToken) {
      console.log('Per-user token failed, trying global fallback...');
      accessToken = await getGlobalAccessToken(supabase, userId);
    }
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Dropbox not connected. Please connect your Dropbox account first.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get root namespace for team/shared folder access
    const rootNamespaceId = await getRootNamespaceId(accessToken);
    console.log('Root namespace ID:', rootNamespaceId);

    const result: SyncResult = {
      projectsScanned: [],
      totalNewDrawings: 0,
      totalSkipped: 0,
      errors: []
    };

    // Step 1: Try multiple possible base paths for the projects folder
    const possibleBasePaths = [
      '/OFFICE/PROJECTS',
      '/Office/Projects',
      '/office/projects',
      '/PROJECTS',
      '/Projects',
    ];

    let folders: any[] = [];
    let usedBasePath = '';

    for (const basePath of possibleBasePaths) {
      console.log(`Trying base path: ${basePath}`);
      const entries = await listDropboxFolder(accessToken, basePath, rootNamespaceId);
      const folderEntries = entries.filter((e: any) => e['.tag'] === 'folder');
      if (folderEntries.length > 0) {
        folders = folderEntries;
        usedBasePath = basePath;
        console.log(`Found ${folders.length} folders at ${basePath}`);
        break;
      }
    }

    // If none found, try listing root to discover structure
    if (folders.length === 0) {
      console.log('No project folders found in standard paths. Listing root...');
      const rootEntries = await listDropboxFolder(accessToken, '', rootNamespaceId);
      const rootFolders = rootEntries.filter((e: any) => e['.tag'] === 'folder').map((f: any) => f.name);
      console.log(`Root folders: ${rootFolders.join(', ')}`);
      
      // Try /root_folder/PROJECTS pattern
      for (const rootFolder of rootEntries.filter((e: any) => e['.tag'] === 'folder')) {
        const subEntries = await listDropboxFolder(accessToken, rootFolder.path_display + '/PROJECTS', rootNamespaceId);
        const subFolders = subEntries.filter((e: any) => e['.tag'] === 'folder');
        if (subFolders.length > 0) {
          folders = subFolders;
          usedBasePath = rootFolder.path_display + '/PROJECTS';
          console.log(`Found ${folders.length} folders at ${usedBasePath}`);
          break;
        }
      }
    }

    if (folders.length === 0) {
      result.errors.push('Could not find project folders in Dropbox. Tried paths: ' + possibleBasePaths.join(', ') + ' and root subfolders.');
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Using base path: ${usedBasePath}, scanning ${folders.length} folders`);
    
    // Log ALL folder names for debugging
    const allFolderNames = folders.map((f: any) => f.name);
    console.log(`All folder names: ${JSON.stringify(allFolderNames)}`);

    // Step 2: Parse folder names and match to projects
    // Support both (636) and plain number prefixes, plus alphanumeric like P91.1
    const projectNumberRegex = /\((\d+)\)/;

    for (const folder of folders) {
      const match = folder.name.match(projectNumberRegex);
      if (!match) {
        console.log(`Skipped (no number pattern): ${folder.name}`);
        continue;
      }

      const projectNumber = match[1];
      
      // Query projects table for matching project_number
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_number')
        .eq('project_number', projectNumber)
        .maybeSingle();

      if (projectError || !project) {
        console.log(`No project found for number ${projectNumber} (folder: ${folder.name})`);
        continue;
      }

      console.log(`Matched folder "${folder.name}" to project "${project.name}" (${projectNumber})`);

      const projectResult = {
        name: project.name,
        projectNumber,
        drawingsFound: 0,
        newImported: 0,
        skipped: 0
      };

      // Step 3: Navigate to drawings subfolder
      // Try both "LATEST" and "LATEST PDF'S"
      let drawingsPath = `${folder.path_display}/39. ELECTRICAL/000. DRAWINGS/PDF/LATEST PDF'S`;
      console.log(`Checking path: ${drawingsPath}`);
      let pdfEntries = await listDropboxFolder(accessToken, drawingsPath, rootNamespaceId);
      
      // Fallback to "LATEST" if the first one failed or returned empty
      if (pdfEntries.length === 0) {
         console.log(`Path empty or not found, trying fallback: ${folder.path_display}/39. ELECTRICAL/000. DRAWINGS/PDF/LATEST`);
         drawingsPath = `${folder.path_display}/39. ELECTRICAL/000. DRAWINGS/PDF/LATEST`;
         pdfEntries = await listDropboxFolder(accessToken, drawingsPath, rootNamespaceId);
      }

      console.log(`Scan result for ${project.name}: Found ${pdfEntries.length} entries.`);
      const pdfFiles = pdfEntries.filter((e: any) => 
        e['.tag'] === 'file' && e.name.toLowerCase().endsWith('.pdf')
      );

      projectResult.drawingsFound = pdfFiles.length;
      console.log(`Found ${pdfFiles.length} PDFs in ${drawingsPath}`);

      if (pdfFiles.length === 0) {
        result.projectsScanned.push(projectResult);
        continue;
      }

      // Step 4: Check existing drawings for this project (by normalized drawing number)
      const { data: existingDrawings } = await supabase
        .from('project_drawings')
        .select('drawing_number, file_name')
        .eq('project_id', project.id);

      // Build sets for dedup: normalized drawing numbers AND file names
      const existingNormalized = new Set(
        (existingDrawings || []).map((d: any) => d.drawing_number?.replace(/\./g, '/'))
      );
      const existingFileNames = new Set(
        (existingDrawings || []).map((d: any) => d.file_name).filter(Boolean)
      );

      // Step 5: Sync new drawings
      for (const pdfFile of pdfFiles) {
        const fileName = pdfFile.name;

        // Skip if exact filename already exists
        if (existingFileNames.has(fileName)) {
          projectResult.skipped++;
          result.totalSkipped++;
          continue;
        }

        try {
          const drawingTitle = fileName.replace(/\.pdf$/i, '');
          
          // Parse drawing number from filename: "636.E.800 - SIGNAGE LAYOUT - REV. 0" → "636/E/800"
          // Also handles suffix patterns like "636.E.407.L - ..." → "636/E/407/L"
          const firstPart = drawingTitle.split(' - ')[0].trim(); // e.g. "636.E.800" or "636.E.407.L"
          const drawingNumber = firstPart.replace(/\./g, '/');   // normalize to "/"
          
          // Parse title: everything after the first " - " up to " - REV." or ". REV."
          const afterNumber = drawingTitle.substring(drawingTitle.indexOf(' - ') + 3);
          const titleClean = afterNumber
            .replace(/[\s-]*REV\.?\s*\w*\s*$/i, '')  // strip trailing "- REV. 0" or ". REV.0"
            .replace(/\.\s*REV\.?\s*\w*\s*$/i, '')
            .trim();
          
          // Parse revision from filename
          const revMatch = drawingTitle.match(/REV\.?\s*(\w+)\s*$/i);
          const revision = revMatch ? revMatch[1] : '0';

          // Skip if normalized drawing number already exists
          if (existingNormalized.has(drawingNumber)) {
            // Update the existing record with dropbox_path if missing
            const existing = (existingDrawings || []).find(
              (d: any) => d.drawing_number?.replace(/\./g, '/') === drawingNumber
            );
            if (existing) {
              await supabase
                .from('project_drawings')
                .update({ 
                  dropbox_path: pdfFile.path_display, 
                  file_name: fileName,
                  current_revision: revision
                })
                .eq('project_id', project.id)
                .eq('drawing_number', existing.drawing_number);
            }
            projectResult.skipped++;
            result.totalSkipped++;
            continue;
          }

          // Store metadata with Dropbox path — no file download/upload
          const { error: insertError } = await supabase
            .from('project_drawings')
            .insert({
              project_id: project.id,
              drawing_title: titleClean || drawingTitle,
              drawing_number: drawingNumber,
              category: 'electrical',
              status: 'draft',
              current_revision: revision,
              file_name: fileName,
              dropbox_path: pdfFile.path_display,
              created_by: userId
            });

          if (insertError) {
            console.error(`DB insert failed for ${fileName}:`, insertError);
            result.errors.push(`DB insert failed: ${fileName} - ${insertError.message}`);
            continue;
          }

          projectResult.newImported++;
          result.totalNewDrawings++;
          console.log(`Registered: ${fileName} -> project ${project.name}`);
        } catch (fileError) {
          const msg = fileError instanceof Error ? fileError.message : String(fileError);
          result.errors.push(`Error processing ${fileName}: ${msg}`);
        }
      }

      result.projectsScanned.push(projectResult);
    }

    console.log(`Sync complete: ${result.totalNewDrawings} new, ${result.totalSkipped} skipped, ${result.errors.length} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync drawings error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
