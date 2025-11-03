import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('Reset password function called, method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('Processing reset password request')

  try {
    // Create anon client to verify user authentication
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? ''
          }
        }
      }
    )

    // Verify user is authenticated
    const { data: { user: requestingUser }, error: authError } = await supabaseAnon.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    
    if (!requestingUser) {
      console.error('No user found from token')
      throw new Error('User not found')
    }

    console.log('Requesting user:', requestingUser.id)

    // Create service role client for admin operations
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

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Role check error:', roleError)
      throw new Error(`Role verification failed: ${roleError.message}`)
    }
    
    if (!roleData) {
      console.error('User is not admin:', requestingUser.id)
      throw new Error('Insufficient permissions - admin role required')
    }

    console.log('Admin verified:', requestingUser.id)

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('Missing required field: userId')
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User not found')
    }

    // Generate password reset link with redirect to set-password page
    const { data: resetData, error: resetError } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
      options: {
        redirectTo: `${req.headers.get('origin')}/auth/set-password`
      }
    })

    if (resetError || !resetData.properties?.action_link) {
      console.error('Error generating reset link:', resetError)
      throw new Error('Failed to generate password reset link')
    }

    const resetLink = resetData.properties.action_link

    console.log('Password reset link generated for:', profile.email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        resetLink: resetLink,
        userEmail: profile.email,
        message: 'Password reset link generated successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
