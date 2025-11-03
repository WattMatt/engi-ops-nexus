import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create service role client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')
    const parts = jwt.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    
    const payload = JSON.parse(atob(parts[1]))
    const requestingUserId = payload.sub
    
    if (!requestingUserId) {
      throw new Error('No user ID in token')
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      throw new Error('Insufficient permissions - admin role required')
    }

    const { userId, password } = await req.json()

    if (!userId || !password) {
      throw new Error('Missing required fields: userId and password')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Update user password
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw new Error('Failed to update password')
    }

    // Mark user as needing to change password on first login
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        must_change_password: true,
        status: 'active'
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    console.log('Password set successfully for user:', userId)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password set successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
