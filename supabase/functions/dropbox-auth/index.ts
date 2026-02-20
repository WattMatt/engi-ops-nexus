import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
};

const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY');
const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Get the app URL - fallback to common patterns
const APP_URL = Deno.env.get('APP_URL') || 'https://engi-ops-nexus.lovable.app';

serve(async (req) => {
  const requestStartTime = Date.now();
  const correlationId = req.headers.get('X-Correlation-ID') || `srv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'initiate';

    console.log(`[Dropbox Auth] Request received`, {
      correlationId,
      action,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      console.error('[Dropbox Auth] Missing credentials', { correlationId });
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
        console.warn('[Dropbox Auth] Initiate without auth', { correlationId });
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get custom return URL and app URL from query params
      const returnUrl = url.searchParams.get('returnUrl') || '/settings?tab=storage';
      const appUrl = url.searchParams.get('appUrl') || APP_URL;

      console.log('[Dropbox Auth] Initiating OAuth flow', {
        correlationId,
        userId: userId.substring(0, 8) + '...',
        returnUrl,
        appUrl,
        timestamp: new Date().toISOString()
      });

      // Generate OAuth authorization URL with user ID encoded in state
      const redirectUri = `${SUPABASE_URL}/functions/v1/dropbox-oauth-callback`;
      
      // Encode user ID, correlation ID, app URL, and nonce in state for security and tracking
      const stateData = {
        userId: userId,
        nonce: crypto.randomUUID(),
        returnUrl: returnUrl,
        appUrl: appUrl, // Include the origin URL so callback knows where to redirect
        correlationId: correlationId
      };
      const state = btoa(JSON.stringify(stateData));
      
      const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
      authUrl.searchParams.set('client_id', DROPBOX_APP_KEY);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('token_access_type', 'offline'); // Get refresh token

      console.log('[Dropbox Auth] Auth URL generated', {
        correlationId,
        userId: userId.substring(0, 8) + '...',
        authUrlLength: authUrl.toString().length,
        duration: `${Date.now() - requestStartTime}ms`
      });

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString(), state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh') {
      // Refresh access token using refresh token for specific user
      if (!userId) {
        console.warn('[Dropbox Auth] Refresh without auth', { correlationId });
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Dropbox Auth] Token refresh requested', {
        correlationId,
        userId: userId.substring(0, 8) + '...'
      });

      // Get user's stored credentials
      const { data: connection, error: fetchError } = await supabase
        .from('user_storage_connections')
        .select('id, credentials')
        .eq('user_id', userId)
        .eq('provider', 'dropbox')
        .eq('status', 'connected')
        .single();

      if (fetchError || !connection) {
        console.warn('[Dropbox Auth] No connection found for refresh', { correlationId, error: fetchError?.message });
        return new Response(
          JSON.stringify({ error: 'No Dropbox connection found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const credentials = connection.credentials as { refresh_token?: string };
      
      if (!credentials?.refresh_token) {
        console.warn('[Dropbox Auth] No refresh token available', { correlationId });
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
        console.error('[Dropbox Auth] Token refresh failed', {
          correlationId,
          status: tokenResponse.status,
          error
        });
        
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
      console.log('[Dropbox Auth] Token refreshed successfully', {
        correlationId,
        userId: userId.substring(0, 8) + '...',
        duration: `${Date.now() - requestStartTime}ms`
      });

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
        console.warn('[Dropbox Auth] Disconnect without auth', { correlationId });
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Dropbox Auth] Disconnect requested', {
        correlationId,
        userId: userId.substring(0, 8) + '...'
      });

      // Get user's stored credentials
      const { data: connection, error: fetchError } = await supabase
        .from('user_storage_connections')
        .select('id, credentials')
        .eq('user_id', userId)
        .eq('provider', 'dropbox')
        .single();

      if (fetchError || !connection) {
        console.log('[Dropbox Auth] No connection found for disconnect', { correlationId });
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
          console.log('[Dropbox Auth] Token revoked at Dropbox', { correlationId });
        } catch (e) {
          console.warn('[Dropbox Auth] Failed to revoke token at Dropbox', { correlationId, error: e });
        }
      }

      // Delete the user's connection record
      const { error: deleteError } = await supabase
        .from('user_storage_connections')
        .delete()
        .eq('id', connection.id);

      if (deleteError) {
        console.error('[Dropbox Auth] Failed to delete connection', { correlationId, error: deleteError.message });
      }

      console.log('[Dropbox Auth] Disconnect completed', {
        correlationId,
        userId: userId.substring(0, 8) + '...',
        duration: `${Date.now() - requestStartTime}ms`
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      console.log('[Dropbox Auth] Status check', {
        correlationId,
        hasUserId: !!userId
      });

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
        console.log('[Dropbox Auth] No connection found', {
          correlationId,
          userId: userId.substring(0, 8) + '...',
          duration: `${Date.now() - requestStartTime}ms`
        });
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

      console.log('[Dropbox Auth] Status returned', {
        correlationId,
        userId: userId.substring(0, 8) + '...',
        connected: connection.status === 'connected',
        duration: `${Date.now() - requestStartTime}ms`
      });

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

    console.warn('[Dropbox Auth] Invalid action', { correlationId, action });
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Dropbox Auth] Unexpected error', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${Date.now() - requestStartTime}ms`
    });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
