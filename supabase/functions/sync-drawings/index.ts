import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY');
const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET');
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
  const { data: connection, error } = await supabase
    .from('user_storage_connections')
    .select('id, credentials')
    .eq('user_id', userId)
    .eq('provider', 'dropbox')
    .eq('status', 'connected')
    .single();

  if (error || !connection) {
    console.error('No active Dropbox connection found for user:', userId);
    return null;
  }

  const credentials = connection.credentials as DropboxCredentials;
  if (!credentials?.access_token) return null;

  // Check if token needs refresh
  if (credentials.expires_at) {
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
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
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      return newTokens.access_token;
    }
  }

  await supabase
    .from('user_storage_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', connection.id);

  return credentials.access_token;
}

async function listDropboxFolder(accessToken: string, path: string): Promise<any[]> {
  const dropboxPath = path === '' || path === '/' ? '' : path;
  const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
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

async function downloadDropboxFile(accessToken: string, path: string): Promise<Uint8Array | null> {
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path })
    }
  });

  if (!response.ok) {
    console.error(`Failed to download file ${path}:`, await response.text());
    return null;
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

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

    // Get Dropbox access token
    const accessToken = await getValidAccessToken(supabase, userId);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Dropbox not connected. Please connect your Dropbox account first.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
      const entries = await listDropboxFolder(accessToken, basePath);
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
      const rootEntries = await listDropboxFolder(accessToken, '');
      const rootFolders = rootEntries.filter((e: any) => e['.tag'] === 'folder').map((f: any) => f.name);
      console.log(`Root folders: ${rootFolders.join(', ')}`);
      
      // Try /root_folder/PROJECTS pattern
      for (const rootFolder of rootEntries.filter((e: any) => e['.tag'] === 'folder')) {
        const subEntries = await listDropboxFolder(accessToken, rootFolder.path_display + '/PROJECTS');
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

    // Step 2: Parse folder names and match to projects
    const projectNumberRegex = /\((\d+)\)/;

    for (const folder of folders) {
      const match = folder.name.match(projectNumberRegex);
      if (!match) continue;

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
      let pdfEntries = await listDropboxFolder(accessToken, drawingsPath);
      
      // Fallback to "LATEST" if the first one failed or returned empty
      if (pdfEntries.length === 0) {
         console.log(`Path empty or not found, trying fallback: ${folder.path_display}/39. ELECTRICAL/000. DRAWINGS/PDF/LATEST`);
         drawingsPath = `${folder.path_display}/39. ELECTRICAL/000. DRAWINGS/PDF/LATEST`;
         pdfEntries = await listDropboxFolder(accessToken, drawingsPath);
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

      // Step 4: Check existing drawings for this project
      const { data: existingDrawings } = await supabase
        .from('project_drawings')
        .select('file_name')
        .eq('project_id', project.id);

      const existingFileNames = new Set((existingDrawings || []).map((d: any) => d.file_name));

      // Step 5: Sync new drawings
      for (const pdfFile of pdfFiles) {
        const fileName = pdfFile.name;

        if (existingFileNames.has(fileName)) {
          projectResult.skipped++;
          result.totalSkipped++;
          continue;
        }

        try {
          // Download from Dropbox
          console.log(`Downloading: ${fileName}`);
          const fileData = await downloadDropboxFile(accessToken, pdfFile.path_display);
          if (!fileData) {
            result.errors.push(`Failed to download: ${fileName}`);
            continue;
          }

          // Upload to Supabase Storage
          const storagePath = `${project.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('project-drawings')
            .upload(storagePath, fileData, {
              contentType: 'application/pdf',
              upsert: false
            });

          if (uploadError) {
            console.error(`Storage upload failed for ${fileName}:`, uploadError);
            result.errors.push(`Upload failed: ${fileName} - ${uploadError.message}`);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('project-drawings')
            .getPublicUrl(storagePath);

          const drawingTitle = fileName.replace(/\.pdf$/i, '');
          const drawingNumber = drawingTitle; // Use filename without extension as drawing number

          // Insert into project_drawings
          const { error: insertError } = await supabase
            .from('project_drawings')
            .insert({
              project_id: project.id,
              drawing_title: drawingTitle,
              drawing_number: drawingNumber,
              category: 'electrical',
              status: 'draft',
              current_revision: '0',
              file_url: urlData.publicUrl,
              file_path: storagePath,
              file_name: fileName,
              created_by: userId
            });

          if (insertError) {
            console.error(`DB insert failed for ${fileName}:`, insertError);
            result.errors.push(`DB insert failed: ${fileName} - ${insertError.message}`);
            // Clean up uploaded file
            await supabase.storage.from('project-drawings').remove([storagePath]);
            continue;
          }

          projectResult.newImported++;
          result.totalNewDrawings++;
          console.log(`Synced: ${fileName} -> project ${project.name}`);
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
