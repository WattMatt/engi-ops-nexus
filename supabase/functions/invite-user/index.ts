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

    const { email, fullName, role, resend } = await req.json();

    // Validate input
    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string;

    // If this is a resend, find the existing user
    if (resend) {
      const { data: existingUser, error: findError } = await supabaseAdmin.auth.admin.listUsers();
      if (findError) throw findError;
      
      const user = existingUser.users.find(u => u.email === email);
      if (!user) {
        throw new Error("User not found");
      }
      userId = user.id;
      console.log("Resending invite for existing user:", userId);
    } else {
      // Create new user with admin API (doesn't affect current session)
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
      
      userId = userData.user.id;
      console.log("User created successfully:", userId);

      // Create user role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert([{
          user_id: userId,
          role: role,
        }]);

      if (roleError) throw roleError;
    }

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

    console.log("Reset link generated for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
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
