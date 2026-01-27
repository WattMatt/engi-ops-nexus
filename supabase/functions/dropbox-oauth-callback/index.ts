import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY');
const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Get the app URL - fallback to common patterns
const APP_URL = Deno.env.get('APP_URL') || 'https://engi-ops-nexus.lovable.app';

serve(async (req) => {
  const requestStartTime = Date.now();
  let correlationId = `callback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('[Dropbox Callback] OAuth callback received', {
      correlationId,
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('[Dropbox Callback] OAuth error from Dropbox', {
        correlationId,
        error,
        errorDescription
      });
      return Response.redirect(`${APP_URL}/settings?tab=storage&error=${encodeURIComponent(errorDescription || error)}`);
    }

    if (!code) {
      console.error('[Dropbox Callback] No authorization code received', { correlationId });
      return Response.redirect(`${APP_URL}/settings?tab=storage&error=no_code`);
    }

    // Decode state to get user ID and correlation ID
    let userId: string | null = null;
    let returnUrl = '/settings?tab=storage';
    
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        userId = stateData.userId;
        returnUrl = stateData.returnUrl || '/settings?tab=storage';
        // Use correlation ID from state if available for end-to-end tracking
        if (stateData.correlationId) {
          correlationId = stateData.correlationId;
        }
        console.log('[Dropbox Callback] State decoded', {
          correlationId,
          userId: userId?.substring(0, 8) + '...',
          returnUrl
        });
      } catch (e) {
        console.error('[Dropbox Callback] Failed to decode state', { correlationId, error: e });
        return Response.redirect(`${APP_URL}/settings?tab=storage&error=invalid_state`);
      }
    }

    if (!userId) {
      console.error('[Dropbox Callback] No user ID in state', { correlationId });
      return Response.redirect(`${APP_URL}/settings?tab=storage&error=no_user_id`);
    }

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/dropbox-oauth-callback`;
    
    console.log('[Dropbox Callback] Exchanging code for tokens', { correlationId });
    
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`)}`
      },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Dropbox Callback] Token exchange failed', {
        correlationId,
        status: tokenResponse.status,
        error: errorText
      });
      return Response.redirect(`${APP_URL}${returnUrl}&error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    console.log('[Dropbox Callback] Token exchange successful', { correlationId });

    // Get account info
    console.log('[Dropbox Callback] Fetching account info', { correlationId });
    const accountResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    let accountInfo = null;
    if (accountResponse.ok) {
      accountInfo = await accountResponse.json();
      console.log('[Dropbox Callback] Account info retrieved', {
        correlationId,
        email: accountInfo.email
      });
    } else {
      console.warn('[Dropbox Callback] Failed to get account info', {
        correlationId,
        status: accountResponse.status
      });
    }

    // Get space usage
    let spaceUsage = null;
    try {
      const spaceResponse = await fetch('https://api.dropboxapi.com/2/users/get_space_usage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (spaceResponse.ok) {
        spaceUsage = await spaceResponse.json();
        console.log('[Dropbox Callback] Space usage retrieved', { correlationId });
      }
    } catch (e) {
      console.warn('[Dropbox Callback] Failed to get space usage', { correlationId, error: e });
    }

    // Store in database - per-user storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      account_id: tokens.account_id,
      uid: tokens.uid
    };

    const accountInfoData = {
      account_email: accountInfo?.email,
      account_name: accountInfo?.name?.display_name,
      space_used: spaceUsage?.used,
      space_allocated: spaceUsage?.allocation?.allocated
    };

    // Check if user already has a connection
    const { data: existing } = await supabase
      .from('user_storage_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'dropbox')
      .single();

    if (existing) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('user_storage_connections')
        .update({
          credentials: credentials,
          account_info: accountInfoData,
          status: 'connected',
          connected_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[Dropbox Callback] Failed to update storage connection', {
          correlationId,
          error: updateError.message
        });
        return Response.redirect(`${APP_URL}${returnUrl}&error=database_error`);
      }
      console.log('[Dropbox Callback] Updated existing connection', {
        correlationId,
        userId: userId.substring(0, 8) + '...'
      });
    } else {
      // Insert new connection
      const { error: insertError } = await supabase
        .from('user_storage_connections')
        .insert({
          user_id: userId,
          provider: 'dropbox',
          credentials: credentials,
          account_info: accountInfoData,
          status: 'connected',
          connected_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('[Dropbox Callback] Failed to insert storage connection', {
          correlationId,
          error: insertError.message
        });
        return Response.redirect(`${APP_URL}${returnUrl}&error=database_error`);
      }
      console.log('[Dropbox Callback] Created new connection', {
        correlationId,
        userId: userId.substring(0, 8) + '...'
      });
    }

    // Create root folder in Dropbox if it doesn't exist
    try {
      await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: '/EngiOps', autorename: false })
      });
      console.log('[Dropbox Callback] Created EngiOps folder', { correlationId });
    } catch (e) {
      // Folder might already exist, that's ok
      console.log('[Dropbox Callback] EngiOps folder may already exist', { correlationId });
    }

    console.log('[Dropbox Callback] OAuth flow completed successfully', {
      correlationId,
      userId: userId.substring(0, 8) + '...',
      duration: `${Date.now() - requestStartTime}ms`
    });

    // Build return URL with success parameter
    const finalReturnUrl = returnUrl.includes('?') 
      ? `${returnUrl}&success=dropbox_connected`
      : `${returnUrl}?success=dropbox_connected`;
    
    return Response.redirect(`${APP_URL}${finalReturnUrl}`);

  } catch (error: unknown) {
    console.error('[Dropbox Callback] Unexpected error', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${Date.now() - requestStartTime}ms`
    });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(`${APP_URL}/settings?tab=storage&error=${encodeURIComponent(message)}`);
  }
});
