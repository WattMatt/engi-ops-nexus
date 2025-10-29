import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, fullName, role } = await req.json();

    // Validate input
    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with admin API (doesn't affect current session)
    const tempPassword = crypto.randomUUID();
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // Keep pending until they set password
      user_metadata: {
        full_name: fullName,
      },
    });

    if (userError) throw userError;
    if (!userData.user) throw new Error("Failed to create user");

    // Create user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert([{
        user_id: userData.user.id,
        role: role,
      }]);

    if (roleError) throw roleError;

    // Generate password reset link for the invited user
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin
      .generateLink({
        type: 'recovery',
        email: email,
      });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw resetError;
    }

    console.log("User created successfully:", userData.user.id);
    console.log("Reset link generated for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData.user,
        resetLink: resetData.properties.action_link 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
