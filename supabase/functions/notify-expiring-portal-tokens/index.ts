/**
 * Notify Expiring Portal Tokens + Auto-Renew
 * Runs daily via pg_cron at 8AM UTC.
 * 1. Auto-extends tokens with auto_renew=true that expire within 7 days (+30 days)
 * 2. Emails admins a summary of renewed + still-expiring tokens
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

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // 1. Find all active tokens expiring within 7 days
    const { data: expiringTokens, error: tokensError } = await supabase
      .from("contractor_portal_tokens")
      .select("id, contractor_name, contractor_email, company_name, short_code, expires_at, project_id, auto_renew, renewal_count")
      .eq("is_active", true)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", sevenDaysFromNow.toISOString());

    if (tokensError) throw tokensError;

    if (!expiringTokens || expiringTokens.length === 0) {
      console.log("No expiring tokens found within 7 days");
      return new Response(
        JSON.stringify({ message: "No expiring tokens", renewed: 0, expiring: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Split into auto-renew vs manual-review
    const toAutoRenew = expiringTokens.filter((t) => t.auto_renew);
    const manualReview = expiringTokens.filter((t) => !t.auto_renew);

    console.log(`Found ${expiringTokens.length} expiring tokens: ${toAutoRenew.length} auto-renew, ${manualReview.length} manual`);

    // 3. Auto-renew tokens (+30 days from current expiry)
    const renewed: typeof toAutoRenew = [];
    for (const token of toAutoRenew) {
      const newExpiry = new Date(token.expires_at);
      newExpiry.setDate(newExpiry.getDate() + 30);

      const { error: updateError } = await supabase
        .from("contractor_portal_tokens")
        .update({
          expires_at: newExpiry.toISOString(),
          renewal_count: (token.renewal_count || 0) + 1,
          last_renewed_at: now.toISOString(),
        })
        .eq("id", token.id);

      if (updateError) {
        console.error(`Failed to renew token ${token.short_code}:`, updateError);
      } else {
        renewed.push({ ...token, expires_at: newExpiry.toISOString() });
        console.log(`Auto-renewed token ${token.short_code} → ${newExpiry.toISOString()}`);
      }
    }

    // 4. Get project names
    const projectIds = [...new Set(expiringTokens.map((t) => t.project_id))];
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, project_number")
      .in("id", projectIds);
    const projectMap = new Map((projects || []).map((p) => [p.id, p]));

    // 5. Get admin emails
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ renewed: renewed.length, expiring: manualReview.length, admins: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", adminRoles.map((r) => r.user_id))
      .not("email", "is", null);

    if (!adminProfiles || adminProfiles.length === 0) {
      return new Response(
        JSON.stringify({ renewed: renewed.length, expiring: manualReview.length, admins: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Build email
    const buildRow = (t: any, status: "renewed" | "expiring") => {
      const project = projectMap.get(t.project_id);
      const projectLabel = project ? `${project.project_number}: ${project.name}` : "Unknown";
      const expiresDate = new Date(t.expires_at);
      const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (status === "renewed") {
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">✅ ${t.contractor_name}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${t.company_name || "—"}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 13px;">${t.short_code}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${projectLabel}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: 500;">
              Auto-renewed → ${daysLeft} days
            </td>
          </tr>`;
      }

      const urgency = daysLeft <= 2 ? "🔴" : daysLeft <= 4 ? "🟡" : "🟠";
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${urgency} ${t.contractor_name}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${t.company_name || "—"}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 13px;">${t.short_code}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${projectLabel}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: ${daysLeft <= 2 ? "bold" : "normal"};">
            ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left
          </td>
        </tr>`;
    };

    const renewedRows = renewed.map((t) => buildRow(t, "renewed")).join("");
    const manualRows = manualReview.map((t) => buildRow(t, "expiring")).join("");

    const hasReviewItems = manualReview.length > 0;
    const subjectPrefix = hasReviewItems ? "⚠️" : "✅";
    const subjectText = renewed.length > 0 && hasReviewItems
      ? `${renewed.length} token${renewed.length !== 1 ? "s" : ""} auto-renewed, ${manualReview.length} need${manualReview.length === 1 ? "s" : ""} attention`
      : renewed.length > 0
      ? `${renewed.length} contractor token${renewed.length !== 1 ? "s" : ""} auto-renewed`
      : `${manualReview.length} contractor token${manualReview.length !== 1 ? "s" : ""} expiring soon`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 32px;">
  <div style="max-width: 680px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px 32px; color: white;">
      <h1 style="margin: 0; font-size: 20px;">${subjectPrefix} Contractor Portal Token Summary</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
    <div style="padding: 24px 32px;">
      ${renewed.length > 0 ? `
      <div style="margin-bottom: 24px; padding: 12px 16px; background: #ecfdf5; border-left: 4px solid #059669; border-radius: 4px;">
        <strong style="color: #059669;">✅ ${renewed.length} token${renewed.length !== 1 ? "s" : ""} auto-renewed</strong>
        <span style="color: #065f46; font-size: 13px;"> — extended by 30 days</span>
      </div>
      ` : ""}
      ${hasReviewItems ? `
      <div style="margin-bottom: 24px; padding: 12px 16px; background: #fef3c7; border-left: 4px solid #d97706; border-radius: 4px;">
        <strong style="color: #92400e;">⚠️ ${manualReview.length} token${manualReview.length !== 1 ? "s" : ""} need manual review</strong>
        <span style="color: #78350f; font-size: 13px;"> — auto-renew is disabled</span>
      </div>
      ` : ""}
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Contractor</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Company</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Code</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Project</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${renewedRows}${manualRows}
        </tbody>
      </table>
      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        To manage auto-renewal or manually extend tokens, go to <strong>Admin Dashboard → Contractor Portal Activity</strong>.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">Watson Mattheus · Automated notification · ${new Date().toLocaleDateString("en-ZA")}</p>
    </div>
  </div>
</body>
</html>`;

    // 7. Send emails with stagger
    let sentCount = 0;
    for (const admin of adminProfiles) {
      try {
        await sendEmail({
          to: admin.email,
          subject: `${subjectPrefix} ${subjectText}`,
          html,
          from: DEFAULT_FROM_ADDRESSES.notifications,
          tags: [{ name: "type", value: "token-expiry-summary" }],
        });
        sentCount++;
        console.log(`Email sent to admin: ${admin.email}`);
        if (sentCount < adminProfiles.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (emailErr) {
        console.error(`Failed to send to ${admin.email}:`, emailErr);
      }
    }

    // 8. In-app notifications
    const notifTitle = renewed.length > 0
      ? `${renewed.length} Token${renewed.length !== 1 ? "s" : ""} Auto-Renewed`
      : `${manualReview.length} Token${manualReview.length !== 1 ? "s" : ""} Expiring Soon`;

    const notifDesc = renewed.length > 0 && hasReviewItems
      ? `${renewed.length} auto-renewed, ${manualReview.length} need manual review.`
      : renewed.length > 0
      ? `${renewed.length} contractor portal token${renewed.length !== 1 ? "s were" : " was"} automatically extended by 30 days.`
      : `${manualReview.length} token${manualReview.length !== 1 ? "s" : ""} expiring within 7 days. Auto-renew is disabled.`;

    await supabase.from("status_notifications").insert(
      adminProfiles.map((admin) => ({
        user_id: admin.id,
        notification_type: "token_expiry_warning",
        title: notifTitle,
        description: notifDesc,
        link: "/admin",
        metadata: {
          renewed_count: renewed.length,
          expiring_count: manualReview.length,
          tokens: expiringTokens.map((t) => ({
            short_code: t.short_code,
            contractor_name: t.contractor_name,
            auto_renew: t.auto_renew,
          })),
        },
      }))
    );

    return new Response(
      JSON.stringify({
        success: true,
        renewed: renewed.length,
        expiring: manualReview.length,
        emails_sent: sentCount,
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
