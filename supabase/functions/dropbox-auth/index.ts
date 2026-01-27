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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'initiate';

    console.log(`Dropbox auth action: ${action}`);

    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      console.error('Missing Dropbox credentials');
      return new Response(
        JSON.stringify({ error: 'Dropbox credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'initiate') {
      // Generate OAuth authorization URL
      const redirectUri = `${SUPABASE_URL}/functions/v1/dropbox-oauth-callback`;
      const state = crypto.randomUUID();
      
      const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
      authUrl.searchParams.set('client_id', DROPBOX_APP_KEY);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('token_access_type', 'offline'); // Get refresh token

      console.log('Generated Dropbox auth URL');

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString(), state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh') {
      // Refresh access token using refresh token
      const { refreshToken } = await req.json();
      
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: 'Refresh token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token refresh failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      console.log('Token refreshed successfully');

      return new Response(
        JSON.stringify({
          accessToken: tokens.access_token,
          expiresIn: tokens.expires_in
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      // Revoke Dropbox token and clean up
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get stored credentials
      const { data: provider, error: fetchError } = await supabase
        .from('storage_providers')
        .select('credentials')
        .eq('provider_name', 'dropbox')
        .eq('enabled', true)
        .single();

      if (fetchError || !provider) {
        console.log('No active Dropbox connection found');
        return new Response(
          JSON.stringify({ success: true, message: 'No connection to disconnect' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const credentials = provider.credentials as { access_token?: string };
      
      if (credentials?.access_token) {
        // Revoke the token at Dropbox
        try {
          await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.access_token}`
            }
          });
          console.log('Dropbox token revoked');
        } catch (e) {
          console.warn('Failed to revoke Dropbox token:', e);
        }
      }

      // Update database to mark as disconnected
      const { error: updateError } = await supabase
        .from('storage_providers')
        .update({
          enabled: false,
          credentials: null,
          test_status: 'disconnected',
          last_tested: new Date().toISOString()
        })
        .eq('provider_name', 'dropbox');

      if (updateError) {
        console.error('Failed to update storage provider:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      // Check current connection status
      const { data: provider } = await supabase
        .from('storage_providers')
        .select('*')
        .eq('provider_name', 'dropbox')
        .single();

      return new Response(
        JSON.stringify({
          connected: provider?.enabled || false,
          status: provider?.test_status || 'not_connected',
          config: provider?.config || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Dropbox auth error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
