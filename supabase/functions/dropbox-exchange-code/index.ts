import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DROPBOX_APP_KEY = Deno.env.get('DROPBOX_APP_KEY')!;
    const DROPBOX_APP_SECRET = Deno.env.get('DROPBOX_APP_SECRET')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: 'Authorization code is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`)}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', JSON.stringify(tokenData));
      return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokenData }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Token exchange successful, refresh_token present:', !!tokenData.refresh_token);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    // Store credentials for the user
    if (userId && tokenData.refresh_token) {
      const credentials = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      };

      const { data: existing } = await supabase
        .from('user_storage_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'dropbox')
        .single();

      if (existing) {
        await supabase.from('user_storage_connections').update({
          credentials, status: 'connected',
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase.from('user_storage_connections').insert({
          user_id: userId, provider: 'dropbox', credentials,
          status: 'connected', connected_at: new Date().toISOString()
        });
      }

      // Also update the global secret-level refresh token
      console.log('User connection updated. Refresh token (first 10 chars):', tokenData.refresh_token.substring(0, 10));
    }

    return new Response(JSON.stringify({
      success: true,
      has_refresh_token: !!tokenData.refresh_token,
      refresh_token: tokenData.refresh_token, // Show it so user can update the secret
      message: userId ? 'Connection saved to your account' : 'Token exchanged (no user context to save)'
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
