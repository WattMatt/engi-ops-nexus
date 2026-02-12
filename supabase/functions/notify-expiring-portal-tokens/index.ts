/**
 * Notify Expiring Portal Tokens
 * Checks for contractor portal tokens expiring within 7 days
 * and emails admin users with a summary.
 * Designed to run daily via pg_cron.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find tokens expiring within 7 days that are still active
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringTokens, error: tokensError } = await supabase
      .from("contractor_portal_tokens")
      .select("id, contractor_name, contractor_email, company_name, short_code, expires_at, project_id")
      .eq("is_active", true)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", sevenDaysFromNow.toISOString());

    if (tokensError) {
      console.error("Error fetching expiring tokens:", tokensError);
      throw tokensError;
    }

    if (!expiringTokens || expiringTokens.length === 0) {
      console.log("No expiring tokens found within 7 days");
      return new Response(
        JSON.stringify({ message: "No expiring tokens", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiringTokens.length} expiring token(s)`);

    // 2. Get project names for context
    const projectIds = [...new Set(expiringTokens.map((t) => t.project_id))];
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, project_number")
      .in("id", projectIds);

    const projectMap = new Map(
      (projects || []).map((p) => [p.id, p])
    );

    // 3. Get admin emails from user_roles + profiles
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ message: "No admins to notify", count: expiringTokens.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserIds = adminRoles.map((r) => r.user_id);
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", adminUserIds)
      .not("email", "is", null);

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles with emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails", count: expiringTokens.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Build email content
    const tokenRows = expiringTokens
      .map((t) => {
        const project = projectMap.get(t.project_id);
        const projectLabel = project
          ? `${project.project_number}: ${project.name}`
          : "Unknown Project";
        const expiresDate = new Date(t.expires_at);
        const daysLeft = Math.ceil(
          (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const urgency =
          daysLeft <= 2
            ? "🔴"
            : daysLeft <= 4
            ? "🟡"
            : "🟢";

        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${urgency} ${t.contractor_name}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${t.company_name || "—"}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 13px;">${t.short_code}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${projectLabel}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: ${daysLeft <= 2 ? "bold" : "normal"}; color: ${daysLeft <= 2 ? "#dc2626" : daysLeft <= 4 ? "#d97706" : "#059669"};">
              ${daysLeft} day${daysLeft !== 1 ? "s" : ""}
            </td>
          </tr>`;
      })
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 32px;">
  <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px 32px; color: white;">
      <h1 style="margin: 0; font-size: 20px;">⚠️ Contractor Portal Tokens Expiring</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${expiringTokens.length} token${expiringTokens.length !== 1 ? "s" : ""} expiring within 7 days</p>
    </div>
    <div style="padding: 24px 32px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Contractor</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Company</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Code</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Project</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Expires In</th>
          </tr>
        </thead>
        <tbody>
          ${tokenRows}
        </tbody>
      </table>
      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        To extend a token, go to <strong>Admin Dashboard → Contractor Portal Activity</strong> and click "+30 days" on the expiring link.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">Watson Mattheus · Automated notification · ${new Date().toLocaleDateString("en-ZA")}</p>
    </div>
  </div>
</body>
</html>`;

    // 5. Send email to each admin (with 500ms stagger to respect Resend rate limits)
    let sentCount = 0;
    for (const admin of adminProfiles) {
      try {
        await sendEmail({
          to: admin.email,
          subject: `⚠️ ${expiringTokens.length} Contractor Portal Token${expiringTokens.length !== 1 ? "s" : ""} Expiring Soon`,
          html,
          from: DEFAULT_FROM_ADDRESSES.notifications,
          tags: [
            { name: "type", value: "token-expiry-warning" },
          ],
        });
        sentCount++;
        console.log(`Email sent to admin: ${admin.email}`);

        // Stagger to avoid Resend rate limits
        if (sentCount < adminProfiles.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (emailErr) {
        console.error(`Failed to send email to ${admin.email}:`, emailErr);
      }
    }

    // 6. Log in-app notifications for admins too
    const notifications = adminProfiles.map((admin) => ({
      user_id: admin.id,
      notification_type: "token_expiry_warning",
      title: "Contractor Portal Tokens Expiring",
      description: `${expiringTokens.length} token${expiringTokens.length !== 1 ? "s" : ""} expiring within 7 days. Review in Admin Dashboard.`,
      link: "/admin",
      metadata: {
        expiring_count: expiringTokens.length,
        tokens: expiringTokens.map((t) => ({
          short_code: t.short_code,
          contractor_name: t.contractor_name,
          expires_at: t.expires_at,
        })),
      },
    }));

    await supabase.from("status_notifications").insert(notifications);

    console.log(`Notification complete: ${sentCount} emails sent, ${expiringTokens.length} expiring tokens`);

    return new Response(
      JSON.stringify({
        success: true,
        expiring_tokens: expiringTokens.length,
        emails_sent: sentCount,
        admins_notified: adminProfiles.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-expiring-portal-tokens:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
