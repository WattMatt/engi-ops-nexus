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

// Get the app URL - fallback to common patterns
const APP_URL = Deno.env.get('APP_URL') || 'https://engi-ops-nexus.lovable.app';

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

    // Get user from JWT for authenticated actions
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (action === 'initiate') {
      // Require authentication for initiating OAuth
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get custom return URL from query params, default to /settings?tab=storage
      const returnUrl = url.searchParams.get('returnUrl') || '/settings?tab=storage';

      // Generate OAuth authorization URL with user ID encoded in state
      const redirectUri = `${SUPABASE_URL}/functions/v1/dropbox-oauth-callback`;
      
      // Encode user ID and nonce in state for security
      const stateData = {
        userId: userId,
        nonce: crypto.randomUUID(),
        returnUrl: returnUrl
      };
      const state = btoa(JSON.stringify(stateData));
      
      const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
      authUrl.searchParams.set('client_id', DROPBOX_APP_KEY);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('token_access_type', 'offline'); // Get refresh token

      console.log('Generated Dropbox auth URL for user:', userId);

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString(), state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh') {
      // Refresh access token using refresh token for specific user
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's stored credentials
      const { data: connection, error: fetchError } = await supabase
        .from('user_storage_connections')
        .select('id, credentials')
        .eq('user_id', userId)
        .eq('provider', 'dropbox')
        .eq('status', 'connected')
        .single();

      if (fetchError || !connection) {
        return new Response(
          JSON.stringify({ error: 'No Dropbox connection found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const credentials = connection.credentials as { refresh_token?: string };
      
      if (!credentials?.refresh_token) {
        return new Response(
          JSON.stringify({ error: 'No refresh token available' }),
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
          refresh_token: credentials.refresh_token
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token refresh failed:', error);
        
        // Mark connection as expired
        await supabase
          .from('user_storage_connections')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', connection.id);
        
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      console.log('Token refreshed successfully for user:', userId);

      // Update stored credentials
      const updatedCredentials = {
        ...credentials,
        access_token: tokens.access_token,
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      };

      await supabase
        .from('user_storage_connections')
        .update({ 
          credentials: updatedCredentials, 
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      return new Response(
        JSON.stringify({
          accessToken: tokens.access_token,
          expiresIn: tokens.expires_in
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      // Require authentication
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's stored credentials
      const { data: connection, error: fetchError } = await supabase
        .from('user_storage_connections')
        .select('id, credentials')
        .eq('user_id', userId)
        .eq('provider', 'dropbox')
        .single();

      if (fetchError || !connection) {
        console.log('No active Dropbox connection found for user:', userId);
        return new Response(
          JSON.stringify({ success: true, message: 'No connection to disconnect' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const credentials = connection.credentials as { access_token?: string };
      
      if (credentials?.access_token) {
        // Revoke the token at Dropbox
        try {
          await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.access_token}`
            }
          });
          console.log('Dropbox token revoked for user:', userId);
        } catch (e) {
          console.warn('Failed to revoke Dropbox token:', e);
        }
      }

      // Delete the user's connection record
      const { error: deleteError } = await supabase
        .from('user_storage_connections')
        .delete()
        .eq('id', connection.id);

      if (deleteError) {
        console.error('Failed to delete storage connection:', deleteError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      // Check current user's connection status
      if (!userId) {
        return new Response(
          JSON.stringify({
            connected: false,
            status: 'not_authenticated',
            config: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: connection } = await supabase
        .from('user_storage_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'dropbox')
        .single();

      if (!connection) {
        return new Response(
          JSON.stringify({
            connected: false,
            status: 'not_connected',
            config: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accountInfo = connection.account_info as { account_email?: string; account_name?: string } | null;

      return new Response(
        JSON.stringify({
          connected: connection.status === 'connected',
          status: connection.status || 'not_connected',
          config: {
            account_email: accountInfo?.account_email,
            account_name: accountInfo?.account_name,
            root_folder: '/EngiOps'
          }
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
