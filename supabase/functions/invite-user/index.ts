import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";
import { userInviteTemplate } from "../_shared/email-templates.ts";

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

    // Verify the requesting user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin user verified:", requestingUser.id);

    const { email, fullName, role, password, sendWelcomeEmail = true } = await req.json();

    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = email?.trim().toLowerCase();

    // Validate input
    if (!normalizedEmail || !fullName || !role || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, fullName, role, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Additional password validation for security
    if (password.length > 128) {
      return new Response(
        JSON.stringify({ error: "Password must be less than 128 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role is allowed
    const allowedRoles = ['admin', 'moderator', 'user'];
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be admin, moderator, or user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true, // Auto-confirm so they can log in immediately
      user_metadata: {
        full_name: fullName,
      },
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message, success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user", success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = userData.user.id;
    console.log("User created successfully:", userId);

    // Create user role in separate table (security best practice)
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert([{
        user_id: userId,
        role: role,
      }]);

    if (roleInsertError) {
      console.error("Error creating role:", roleInsertError);
      // Clean up the user if role creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to assign role: " + roleInsertError.message, success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set must_change_password flag in profiles table if it exists
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        must_change_password: true,
        status: 'active',
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn("Could not update profile (table may not exist):", profileError.message);
      // Don't fail the whole operation if profile update fails
    }

    // Get inviter name for the email
    const inviterName = requestingUser.user_metadata?.full_name || 'An administrator';

    // Send welcome email with credentials
    let emailSent = false;
    if (sendWelcomeEmail) {
      try {
        // Determine origin for login link
        const origin = req.headers.get('origin') || 'https://watsonmattheus.com';
        const loginLink = `${origin}/auth`;

        const emailHtml = userInviteTemplate(
          fullName,
          normalizedEmail,
          password,
          role,
          inviterName,
          loginLink
        );

        await sendEmail({
          to: normalizedEmail,
          subject: 'Welcome to Watson Mattheus - Your Account is Ready',
          html: emailHtml,
          from: DEFAULT_FROM_ADDRESSES.noreply,
          tags: [
            { name: 'type', value: 'user-invite' },
            { name: 'role', value: role },
          ],
        });

        emailSent = true;
        console.log("Welcome email sent to:", normalizedEmail);
      } catch (emailError: any) {
        console.error("Failed to send welcome email:", emailError.message);
        // Don't fail the whole operation if email fails - user is still created
      }
    }

    console.log("User and role created successfully for:", normalizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        emailSent: emailSent,
        message: emailSent 
          ? "User created and welcome email sent successfully"
          : "User created successfully (email not sent)"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    const errorMessage = error.message || "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
