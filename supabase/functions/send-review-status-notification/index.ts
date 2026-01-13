import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";
import { emailWrapper } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusNotificationRequest {
  reviewId: string;
  status: "approved" | "disputed";
  reviewerName: string;
  sectionName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewId, status, reviewerName, sectionName }: StatusNotificationRequest = await req.json();

    console.log("Processing status notification for review:", reviewId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get review details with sender info
    const { data: review, error: reviewError } = await supabase
      .from("final_account_section_reviews")
      .select(`
        *,
        section:final_account_sections(
          *,
          bill:final_account_bills(
            *,
            final_account:final_accounts(
              *,
              project:projects(name)
            )
          )
        )
      `)
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      throw new Error("Review not found");
    }

    // Get sender's email
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", review.sent_by)
      .single();

    if (!senderProfile?.email) {
      console.log("No sender email found, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const projectName = review.section?.bill?.final_account?.project?.name || "Project";
    const statusText = status === "approved" ? "Approved" : "Disputed";
    const statusConfig = status === "approved" 
      ? { color: "#10b981", bgColor: "#ecfdf5", borderColor: "#10b981", badge: "badge-green" }
      : { color: "#ef4444", bgColor: "#fef2f2", borderColor: "#ef4444", badge: "badge-red" };

    // Generate email content using the branded template
    const emailContent = `
      <p style="margin: 0 0 16px 0; font-size: 15px;">Dear ${senderProfile.full_name || 'Team'},</p>
      
      <p style="margin: 0 0 20px 0; font-size: 15px;">
        The following section has been reviewed:
      </p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;">
          <span class="badge ${statusConfig.badge}">${status === "approved" ? "✅" : "❌"} ${statusText}</span>
        </p>
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${sectionName}</p>
        <p style="margin: 0; color: #64748b; font-size: 14px;">Project: ${projectName}</p>
        <p class="meta" style="margin: 12px 0 0 0;">Reviewed by ${reviewerName}</p>
      </div>
      
      ${status === "disputed" ? `
        <div class="highlight highlight-error">
          <p style="margin: 0 0 4px 0; font-weight: 600;">⚠️ Action Required</p>
          <p style="margin: 0; color: #475569;">A dispute has been raised. Please review the comments in the Final Accounts system and address any concerns.</p>
        </div>
      ` : `
        <div class="highlight highlight-success">
          <p style="margin: 0; color: #166534;">This section has been approved by the contractor. You may proceed with the next steps.</p>
        </div>
      `}
    `;

    const emailHtml = emailWrapper(
      emailContent, 
      '📋 Section Review Update',
      `${sectionName} has been ${statusText.toLowerCase()}`
    );

    // Send email notification via Resend
    const emailResult = await sendEmail({
      to: senderProfile.email,
      subject: `Section ${statusText}: ${sectionName}`,
      html: emailHtml,
      from: DEFAULT_FROM_ADDRESSES.noreply,
      tags: [
        { name: "type", value: "review_status" },
        { name: "status", value: status },
      ],
    });

    console.log("Status notification sent via Resend:", emailResult.id);

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending status notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
