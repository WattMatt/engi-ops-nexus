import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";
import { userInviteTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Env-overridable app origin; the set-password link always lands on the SPA's
// dedicated set-password route (Onboarding Standard B4/B5 link pattern).
const APP_URL = (
  Deno.env.get("APP_URL") ??
  Deno.env.get("PUBLIC_SITE_URL") ??
  "https://engi-ops-nexus.lovable.app"
).replace(/\/+$/, "");
const SET_PASSWORD_URL = `${APP_URL}/auth/set-password`;

const ALLOWED_ROLES = ["admin", "moderator", "user"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// CSPRNG temp password: 16 chars, one of each class guaranteed, unbiased
// rejection sampling, Fisher-Yates shuffled (Onboarding Standard B4).
function generatePassword(length = 16): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%^&*-_=+";
  const all = lower + upper + digits + special;

  const randomIndex = (max: number): number => {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    let x: number;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  };

  const chars = [
    lower[randomIndex(lower.length)],
    upper[randomIndex(upper.length)],
    digits[randomIndex(digits.length)],
    special[randomIndex(special.length)],
  ];
  while (chars.length < length) {
    chars.push(all[randomIndex(all.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } =
      await supabaseAdmin.auth.getUser(jwt);

    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return json({ error: "Invalid or expired token" }, 401);
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
      return json({ error: "Unauthorized: Admin access required" }, 403);
    }

    console.log("Admin user verified:", requestingUser.id);

    const body = await req.json().catch(() => ({}));
    const action = body.action === "resend" ? "resend" : "invite";
    const normalizedEmail = String(body.email ?? "").trim().toLowerCase();

    if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      return json({ error: "A valid email is required" }, 400);
    }

    // Server-side audit into the existing user_activity_logs trail
    // (log_user_activity is SECURITY DEFINER; actor = the admin caller).
    const audit = async (
      actionType: string,
      description: string,
      metadata: Record<string, unknown>
    ) => {
      const { error } = await supabaseAdmin.rpc("log_user_activity", {
        p_user_id: requestingUser.id,
        p_action_type: actionType,
        p_action_description: description,
        p_metadata: metadata,
        p_project_id: null,
      });
      if (error) console.error("Audit log failed:", error.message);
    };

    // Mint a single-use recovery-grade action link that lands on the SPA's
    // set-password page. Used by both the invite email and resend.
    const generateSetupLink = async (email: string): Promise<string> => {
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: SET_PASSWORD_URL },
        });
      const actionLink = linkData?.properties?.action_link;
      if (linkError || !actionLink) {
        throw new Error(
          `Setup link generation failed: ${linkError?.message ?? "unknown"}`
        );
      }
      return actionLink;
    };

    const inviterName =
      requestingUser.user_metadata?.full_name || "An administrator";

    // ── action: "resend" — fresh setup link for an existing, never-signed-in
    // user (Onboarding Standard B6). Refuses if no profiles row exists.
    if (action === "resend") {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, status")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (!profile) {
        return json(
          { error: "No user with that email — use Invite instead" },
          404
        );
      }
      if (profile.status === "inactive") {
        return json(
          { error: "User is deactivated — reactivate them first" },
          409
        );
      }

      // The admin created this account and vouches for the address: confirm
      // it so a recovery-grade link is always issuable, whatever state the
      // original invite died in.
      await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        email_confirm: true,
      });

      const actionLink = await generateSetupLink(normalizedEmail);

      const delivery = body.delivery === "link" ? "link" : "email";
      let emailSent = false;
      if (delivery === "email") {
        try {
          await sendEmail({
            to: normalizedEmail,
            subject: "Your Watson Mattheus setup link",
            html: userInviteTemplate(
              profile.full_name || normalizedEmail,
              normalizedEmail,
              body.role ? String(body.role) : "user",
              inviterName,
              actionLink
            ),
            from: DEFAULT_FROM_ADDRESSES.noreply,
            tags: [{ name: "type", value: "user-invite-resend" }],
          });
          emailSent = true;
        } catch (emailError) {
          console.error(
            "Resend email failed:",
            (emailError as Error).message
          );
        }
      }

      await audit(
        emailSent ? "resend_invite_email" : "resend_invite_link",
        `Resent invite to ${normalizedEmail}`,
        {
          target_user_id: profile.id,
          target_email: normalizedEmail,
          delivery: emailSent ? "email" : "link",
        }
      );

      // Never block on email (B5): if the email could not be sent, hand the
      // link back so the admin can deliver it out-of-band.
      return json({
        success: true,
        status: emailSent ? "resent" : "link",
        emailSent,
        actionLink: emailSent ? null : actionLink,
      });
    }

    // ── action: "invite" (default) — create a user, dual delivery mode ──
    const fullName = String(body.fullName ?? "").trim();
    const role = String(body.role ?? "");
    // "email" (default): branded email with a set-password link.
    // "relay": CSPRNG temp password returned ONCE to the admin (no email).
    const delivery = body.delivery === "relay" ? "relay" : "email";

    if (!fullName || !role) {
      return json(
        { error: "Missing required fields: email, fullName and role are required" },
        400
      );
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: "Invalid role. Must be admin, moderator, or user" }, 400);
    }

    // Create new user with admin API. Email is pre-confirmed in both modes:
    // the admin is vouching for the address, and a confirmed address is
    // required for recovery-grade links.
    let tempPassword: string | null = null;
    if (delivery === "relay") {
      tempPassword = generatePassword(16);
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        ...(tempPassword ? { password: tempPassword } : {}),
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (userError) {
      console.error("Error creating user:", userError);
      return json({ error: userError.message, success: false }, 400);
    }

    if (!userData.user) {
      return json({ error: "Failed to create user", success: false }, 500);
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
      // Clean up the user if role creation fails (no orphan auth users)
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json(
        { error: "Failed to assign role: " + roleInsertError.message, success: false },
        500
      );
    }

    // Set must_change_password flag in profiles table if it exists
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        must_change_password: true,
        status: "active",
      }, { onConflict: "id" });

    if (profileError) {
      console.warn("Could not update profile (table may not exist):", profileError.message);
      // Don't fail the whole operation if profile update fails
    }

    await audit(
      delivery === "relay" ? "invite_user_temp_password" : "invite_user_email",
      `Invited new user: ${fullName}`,
      { target_user_id: userId, target_email: normalizedEmail, role, delivery }
    );

    // ── delivery: "relay" — the CSPRNG temp password goes back to the admin
    // exactly once; it is never emailed (B4).
    if (delivery === "relay") {
      return json({
        success: true,
        userId,
        delivery: "relay",
        tempPassword,
        message:
          "User created. Share the temporary password with them securely — it will not be shown again.",
      });
    }

    // ── delivery: "email" — branded email carrying a set-password link.
    // If the email cannot be sent, return the link so the admin can copy it:
    // onboarding must never block on email (B5).
    const actionLink = await generateSetupLink(normalizedEmail);

    let emailSent = false;
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Welcome to Watson Mattheus - Set Your Password",
        html: userInviteTemplate(
          fullName,
          normalizedEmail,
          role,
          inviterName,
          actionLink
        ),
        from: DEFAULT_FROM_ADDRESSES.noreply,
        tags: [
          { name: "type", value: "user-invite" },
          { name: "role", value: role },
        ],
      });
      emailSent = true;
      console.log("Invite email sent to:", normalizedEmail);
    } catch (emailError) {
      console.error("Failed to send invite email:", (emailError as Error).message);
      // Don't fail the whole operation — the copyable link below covers delivery
    }

    return json({
      success: true,
      userId,
      delivery: "email",
      emailSent,
      actionLink: emailSent ? null : actionLink,
      message: emailSent
        ? "User created and invite email sent"
        : "User created — email failed, copy the setup link and deliver it manually",
    });
  } catch (error) {
    console.error("Error in invite-user function:", error);
    const errorMessage = (error as Error).message || "An unknown error occurred";
    return json({ error: errorMessage, success: false }, 500);
  }
});
