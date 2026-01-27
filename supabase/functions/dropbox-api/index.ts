import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

async function getValidAccessToken(supabase: any): Promise<string | null> {
  const { data: provider, error } = await supabase
    .from('storage_providers')
    .select('id, credentials')
    .eq('provider_name', 'dropbox')
    .eq('enabled', true)
    .single();

  if (error || !provider) {
    console.error('No active Dropbox connection found');
    return null;
  }

  const credentials = provider.credentials as DropboxCredentials;
  
  if (!credentials?.access_token) {
    console.error('No access token in credentials');
    return null;
  }

  // Check if token is expired or about to expire (within 5 minutes)
  if (credentials.expires_at) {
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
      console.log('Token expired or expiring soon, refreshing...');
      
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
        console.error('Failed to refresh token');
        return null;
      }

      const newTokens = await tokenResponse.json();
      
      // Update stored credentials
      const newCredentials = {
        ...credentials,
        access_token: newTokens.access_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      };

      await supabase
        .from('storage_providers')
        .update({ credentials: newCredentials, last_tested: new Date().toISOString() })
        .eq('id', provider.id);

      return newTokens.access_token;
    }
  }

  return credentials.access_token;
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
    const accessToken = await getValidAccessToken(supabase);

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Not connected to Dropbox' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List folder contents
    if (action === 'list-folder') {
      const { path = '' } = await req.json();
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
        const error = await response.text();
        console.error('List folder failed:', error);
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

      return new Response(
        JSON.stringify({ entries, hasMore: data.has_more, cursor: data.cursor }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create folder
    if (action === 'create-folder') {
      const { path } = await req.json();

      const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, autorename: false })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Create folder failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create folder' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ success: true, metadata: data.metadata }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload file
    if (action === 'upload') {
      const { path, content, contentType } = await req.json();

      // Decode base64 content if needed
      let fileData: Blob;
      if (content.startsWith('data:')) {
        const base64 = content.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileData = new Blob([bytes]);
      } else {
        fileData = new Blob([content]);
      }

      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: path,
            mode: 'overwrite',
            autorename: true,
            mute: false
          }),
          'Content-Type': 'application/octet-stream'
        },
        body: fileData
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Upload failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to upload file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('File uploaded:', data.path_display);

      return new Response(
        JSON.stringify({ success: true, metadata: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download file (get temporary link)
    if (action === 'download') {
      const { path } = await req.json();

      const response = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Get download link failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to get download link' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ link: data.link, metadata: data.metadata }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete file or folder
    if (action === 'delete') {
      const { path } = await req.json();

      const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Delete failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
