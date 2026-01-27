import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY');
const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Get the app URL - fallback to common patterns
const APP_URL = Deno.env.get('APP_URL') || 'https://engi-ops-nexus.lovable.app';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Dropbox OAuth callback received');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return Response.redirect(`${APP_URL}/backup?error=${encodeURIComponent(errorDescription || error)}`);
    }

    if (!code) {
      console.error('No authorization code received');
      return Response.redirect(`${APP_URL}/backup?error=no_code`);
    }

    // Decode state to get user ID
    let userId: string | null = null;
    let returnUrl = '/backup';
    
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        userId = stateData.userId;
        returnUrl = stateData.returnUrl || '/backup';
        console.log('Decoded state - userId:', userId);
      } catch (e) {
        console.error('Failed to decode state:', e);
        return Response.redirect(`${APP_URL}/backup?error=invalid_state`);
      }
    }

    if (!userId) {
      console.error('No user ID in state');
      return Response.redirect(`${APP_URL}/backup?error=no_user_id`);
    }

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/dropbox-oauth-callback`;
    
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
      console.error('Token exchange failed:', errorText);
      return Response.redirect(`${APP_URL}${returnUrl}?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get account info
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
      console.log('Got account info for:', accountInfo.email);
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
      }
    } catch (e) {
      console.warn('Failed to get space usage:', e);
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
        console.error('Failed to update storage connection:', updateError);
        return Response.redirect(`${APP_URL}${returnUrl}?error=database_error`);
      }
      console.log('Updated existing Dropbox connection for user:', userId);
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
        console.error('Failed to insert storage connection:', insertError);
        return Response.redirect(`${APP_URL}${returnUrl}?error=database_error`);
      }
      console.log('Created new Dropbox connection for user:', userId);
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
      console.log('Created EngiOps folder in Dropbox');
    } catch (e) {
      // Folder might already exist, that's ok
      console.log('EngiOps folder may already exist');
    }

    console.log('Dropbox connection established successfully for user:', userId);
    return Response.redirect(`${APP_URL}${returnUrl}?success=dropbox_connected`);

  } catch (error: unknown) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(`${APP_URL}/backup?error=${encodeURIComponent(message)}`);
  }
});
