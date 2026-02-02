/**
 * Send Cable Verification Notification Edge Function
 * Notifies project team when an electrician completes verification
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  verification_id: string;
  project_name: string;
  schedule_name: string;
  electrician_name: string;
  stats: {
    total: number;
    verified: number;
    issues: number;
    not_installed: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      verification_id,
      project_name,
      schedule_name,
      electrician_name,
      stats,
    }: NotificationRequest = await req.json();

    console.log("Sending verification notification:", { verification_id, project_name });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get verification token to find project owner
    const { data: verification, error: verificationError } = await supabase
      .from("cable_schedule_verifications")
      .select(`
        cable_schedule_verification_tokens!inner (
          created_by,
          project_id
        )
      `)
      .eq("id", verification_id)
      .single();

    if (verificationError || !verification) {
      throw new Error("Verification not found");
    }

    const tokenData = verification.cable_schedule_verification_tokens;
    const token = Array.isArray(tokenData) ? tokenData[0] : tokenData;

    // Get creator's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", token?.created_by)
      .single();

    if (!profile?.email) {
      console.warn("No email found for verification creator");
      return new Response(
        JSON.stringify({ success: true, message: "No recipient email found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const hasIssues = stats.issues > 0 || stats.not_installed > 0;
    const statusText = hasIssues ? "with Issues" : "Complete";
    const statusColor = hasIssues ? "#d97706" : "#16a34a";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 25px; }
    .header h1 { color: ${statusColor}; margin: 0; font-size: 24px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 25px 0; text-align: center; }
    .stat { padding: 15px 10px; background: #f5f5f5; border-radius: 6px; }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #6b7280; }
    .info { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 6px; }
    .info-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .info-label { color: #6b7280; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .footer { text-align: center; margin-top: 25px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Cable Verification ${statusText}</h1>
        <p style="color: #6b7280; margin-top: 5px;">A site electrician has completed verification</p>
      </div>

      <div class="info">
        <div class="info-row">
          <span class="info-label">Project:</span>
          <span style="font-weight: 500;">${project_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cable Schedule:</span>
          <span style="font-weight: 500;">${schedule_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Verified By:</span>
          <span style="font-weight: 500;">${electrician_name}</span>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat" style="background: #dcfce7;">
          <div class="stat-value" style="color: #16a34a;">${stats.verified}</div>
          <div class="stat-label">Verified</div>
        </div>
        <div class="stat" style="background: #fef3c7;">
          <div class="stat-value" style="color: #d97706;">${stats.issues}</div>
          <div class="stat-label">Issues</div>
        </div>
        <div class="stat" style="background: #fee2e2;">
          <div class="stat-value" style="color: #dc2626;">${stats.not_installed}</div>
          <div class="stat-label">Not Installed</div>
        </div>
      </div>

      ${hasIssues ? `
      <div style="padding: 15px; background: #fef3c7; border-radius: 6px; margin-bottom: 20px;">
        <strong style="color: #92400e;">⚠️ Action Required:</strong>
        <span style="color: #92400e;">Some cables have been flagged with issues. Please review the verification report.</span>
      </div>
      ` : ""}

      <div style="text-align: center;">
        <a href="${Deno.env.get("SITE_URL") || "https://engi-ops-nexus.lovable.app"}/cable-schedules?verification=${verification_id}" class="btn">
          View Verification Details
        </a>
      </div>

      <div class="footer">
        <p>This is an automated notification from the Cable Schedule Verification System.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "Cable Verification <noreply@resend.dev>",
      to: profile.email,
      subject: `Cable Verification ${statusText}: ${schedule_name}`,
      html: html,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      throw emailError;
    }

    console.log("Notification email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Notification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
