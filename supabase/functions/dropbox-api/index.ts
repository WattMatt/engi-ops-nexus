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

interface ActivityLogEntry {
  user_id: string;
  action: string;
  file_path: string;
  file_name?: string;
  file_size?: number;
  file_type?: string | null;
  status: 'success' | 'failed';
  error_message?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

// Log activity to the database
async function logActivity(supabase: any, entry: ActivityLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('dropbox_activity_logs')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        file_path: entry.file_path,
        file_name: entry.file_name,
        file_size: entry.file_size,
        file_type: entry.file_type,
        status: entry.status,
        error_message: entry.error_message,
        metadata: entry.metadata || {},
        ip_address: entry.ip_address,
        user_agent: entry.user_agent
      });

    if (error) {
      console.error('Failed to log activity:', error);
    } else {
      console.log(`Activity logged: ${entry.action} on ${entry.file_path} by user ${entry.user_id}`);
    }
  } catch (e) {
    console.error('Error logging activity:', e);
  }
}
// Get root namespace ID for team/shared folder access
async function getRootNamespaceId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });
    if (!response.ok) return null;
    const account = await response.json();
    return account?.root_info?.root_namespace_id || null;
  } catch (e) {
    console.error('Failed to get root namespace:', e);
    return null;
  }
}

// Build headers including root namespace for team/shared folder access
function buildDropboxHeaders(accessToken: string, rootNamespaceId: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
  if (rootNamespaceId) {
    headers['Dropbox-API-Path-Root'] = JSON.stringify({ ".tag": "root", "root": rootNamespaceId });
  }
  return headers;
}

// Extract file info from path
function extractFileInfo(path: string): { name: string; extension: string | null } {
  const parts = path.split('/');
  const name = parts[parts.length - 1] || path;
  const extMatch = name.match(/\.([^.]+)$/);
  return {
    name,
    extension: extMatch ? extMatch[1].toLowerCase() : null
  };
}

async function getValidAccessToken(supabase: any, userId: string): Promise<{ token: string | null; connectionId: string | null }> {
  // Get user's specific connection
  const { data: connection, error } = await supabase
    .from('user_storage_connections')
    .select('id, credentials')
    .eq('user_id', userId)
    .eq('provider', 'dropbox')
    .eq('status', 'connected')
    .single();

  if (error || !connection) {
    console.error('No active Dropbox connection found for user:', userId);
    return { token: null, connectionId: null };
  }

  const credentials = connection.credentials as DropboxCredentials;
  
  if (!credentials?.access_token) {
    console.error('No access token in credentials for user:', userId);
    return { token: null, connectionId: null };
  }

  // Check if token is expired or about to expire (within 5 minutes)
  if (credentials.expires_at) {
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
      console.log('Token expired or expiring soon for user:', userId, '- refreshing...');
      
      // Refresh the token
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
        console.error('Failed to refresh token for user:', userId);
        
        // Mark connection as expired
        await supabase
          .from('user_storage_connections')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', connection.id);
        
        return { token: null, connectionId: connection.id };
      }

      const newTokens = await tokenResponse.json();
      
      // Update stored credentials
      const newCredentials = {
        ...credentials,
        access_token: newTokens.access_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      };

      await supabase
        .from('user_storage_connections')
        .update({ 
          credentials: newCredentials, 
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      return { token: newTokens.access_token, connectionId: connection.id };
    }
  }

  // Update last_used_at
  await supabase
    .from('user_storage_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', connection.id);

  return { token: credentials.access_token, connectionId: connection.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log(`Dropbox API action: ${action}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token: accessToken, connectionId } = await getValidAccessToken(supabase, userId);

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Not connected to Dropbox. Please connect your Dropbox account first.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request metadata for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Get root namespace for team/shared folder access
    const rootNamespaceId = await getRootNamespaceId(accessToken);
    if (rootNamespaceId) {
      console.log('Using root namespace:', rootNamespaceId);
    }

    // List folder contents
    if (action === 'list-folder') {
      const { path = '' } = await req.json();
      const dropboxPath = path === '' || path === '/' ? '' : path;

      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: buildDropboxHeaders(accessToken, rootNamespaceId),
        body: JSON.stringify({
          path: dropboxPath,
          include_mounted_folders: true,
          include_non_downloadable_files: false
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('List folder failed:', error);
        
        // Log failed activity
        await logActivity(supabase, {
          user_id: userId,
          action: 'list_folder',
          file_path: dropboxPath || '/',
          status: 'failed',
          error_message: 'Failed to list folder',
          ip_address: ipAddress,
          user_agent: userAgent
        });
        
        return new Response(
          JSON.stringify({ error: 'Failed to list folder' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      
      const entries = data.entries.map((entry: any) => ({
        id: entry.id,
        name: entry.name,
        path: entry.path_display,
        type: entry['.tag'], // 'file' or 'folder'
        size: entry.size,
        modified: entry.client_modified || entry.server_modified,
        isDownloadable: entry.is_downloadable !== false
      }));

      // Log successful activity (optional for list - can be noisy)
      // Uncomment if you want to track folder browsing
      // await logActivity(supabase, {
      //   user_id: userId,
      //   action: 'list_folder',
      //   file_path: dropboxPath || '/',
      //   status: 'success',
      //   metadata: { entries_count: entries.length },
      //   ip_address: ipAddress,
      //   user_agent: userAgent
      // });

      return new Response(
        JSON.stringify({ entries, hasMore: data.has_more, cursor: data.cursor }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create folder
    if (action === 'create-folder') {
      const { path } = await req.json();
      const fileInfo = extractFileInfo(path);

      const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: buildDropboxHeaders(accessToken, rootNamespaceId),
        body: JSON.stringify({ path, autorename: false })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Create folder failed:', error);
        
        await logActivity(supabase, {
          user_id: userId,
          action: 'create_folder',
          file_path: path,
          file_name: fileInfo.name,
          status: 'failed',
          error_message: 'Failed to create folder',
          ip_address: ipAddress,
          user_agent: userAgent
        });
        
        return new Response(
          JSON.stringify({ error: 'Failed to create folder' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      
      await logActivity(supabase, {
        user_id: userId,
        action: 'create_folder',
        file_path: path,
        file_name: fileInfo.name,
        status: 'success',
        metadata: { folder_id: data.metadata?.id },
        ip_address: ipAddress,
        user_agent: userAgent
      });
      
      return new Response(
        JSON.stringify({ success: true, metadata: data.metadata }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload file
    if (action === 'upload') {
      const { path, content, contentType } = await req.json();
      const fileInfo = extractFileInfo(path);

      // Decode base64 content if needed
      let fileData: Blob;
      let fileSize = 0;
      if (content.startsWith('data:')) {
        const base64 = content.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileData = new Blob([bytes]);
        fileSize = bytes.length;
      } else {
        fileData = new Blob([content]);
        fileSize = content.length;
      }

      const uploadHeaders: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: path,
          mode: 'overwrite',
          autorename: true,
          mute: false
        }),
        'Content-Type': 'application/octet-stream'
      };
      if (rootNamespaceId) {
        uploadHeaders['Dropbox-API-Path-Root'] = JSON.stringify({ ".tag": "root", "root": rootNamespaceId });
      }

      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: fileData
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Upload failed:', error);
        
        await logActivity(supabase, {
          user_id: userId,
          action: 'upload',
          file_path: path,
          file_name: fileInfo.name,
          file_size: fileSize,
          file_type: fileInfo.extension || contentType,
          status: 'failed',
          error_message: 'Failed to upload file',
          ip_address: ipAddress,
          user_agent: userAgent
        });
        
        return new Response(
          JSON.stringify({ error: 'Failed to upload file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('File uploaded for user:', userId, 'path:', data.path_display);

      await logActivity(supabase, {
        user_id: userId,
        action: 'upload',
        file_path: data.path_display || path,
        file_name: fileInfo.name,
        file_size: data.size || fileSize,
        file_type: fileInfo.extension || contentType,
        status: 'success',
        metadata: { 
          file_id: data.id,
          rev: data.rev,
          content_hash: data.content_hash
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ success: true, metadata: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download file (get temporary link)
    if (action === 'download') {
      const { path } = await req.json();
      const fileInfo = extractFileInfo(path);

      const response = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
        method: 'POST',
        headers: buildDropboxHeaders(accessToken, rootNamespaceId),
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Get download link failed:', error);
        
        await logActivity(supabase, {
          user_id: userId,
          action: 'download',
          file_path: path,
          file_name: fileInfo.name,
          file_type: fileInfo.extension,
          status: 'failed',
          error_message: 'Failed to get download link',
          ip_address: ipAddress,
          user_agent: userAgent
        });
        
        return new Response(
          JSON.stringify({ error: 'Failed to get download link' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      
      await logActivity(supabase, {
        user_id: userId,
        action: 'download',
        file_path: path,
        file_name: fileInfo.name,
        file_size: data.metadata?.size,
        file_type: fileInfo.extension,
        status: 'success',
        metadata: { 
          file_id: data.metadata?.id,
          link_expires: 'temporary'
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });
      
      return new Response(
        JSON.stringify({ link: data.link, metadata: data.metadata }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete file or folder
    if (action === 'delete') {
      const { path } = await req.json();
      const fileInfo = extractFileInfo(path);

      const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST',
        headers: buildDropboxHeaders(accessToken, rootNamespaceId),
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Delete failed:', error);
        
        await logActivity(supabase, {
          user_id: userId,
          action: 'delete',
          file_path: path,
          file_name: fileInfo.name,
          file_type: fileInfo.extension,
          status: 'failed',
          error_message: 'Failed to delete',
          ip_address: ipAddress,
          user_agent: userAgent
        });
        
        return new Response(
          JSON.stringify({ error: 'Failed to delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Item deleted for user:', userId, 'path:', path);

      await logActivity(supabase, {
        user_id: userId,
        action: 'delete',
        file_path: path,
        file_name: fileInfo.name,
        file_type: fileInfo.extension,
        status: 'success',
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get account info
    if (action === 'account-info') {
      const [accountResponse, spaceResponse] = await Promise.all([
        fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('https://api.dropboxapi.com/2/users/get_space_usage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const account = accountResponse.ok ? await accountResponse.json() : null;
      const space = spaceResponse.ok ? await spaceResponse.json() : null;

      return new Response(
        JSON.stringify({
          email: account?.email,
          name: account?.name?.display_name,
          profilePhotoUrl: account?.profile_photo_url,
          spaceUsed: space?.used,
          spaceAllocated: space?.allocation?.allocated
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Dropbox API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
