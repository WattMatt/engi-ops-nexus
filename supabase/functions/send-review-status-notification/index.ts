import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Final Accounts <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.json();
}

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

const handler = async (req: Request): Promise<Response> => {
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
    const statusColor = status === "approved" ? "#22c55e" : "#ef4444";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 4px; font-weight: bold; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Section Review Update</h1>
          </div>
          <div class="content">
            <p>Dear ${senderProfile.full_name || 'Team'},</p>
            
            <p>The following section has been reviewed:</p>
            
            <div class="details">
              <p><strong>Project:</strong> ${projectName}</p>
              <p><strong>Section:</strong> ${sectionName}</p>
              <p><strong>Reviewer:</strong> ${reviewerName}</p>
              <p><strong>Status:</strong> <span class="status-badge">${statusText}</span></p>
            </div>
            
            ${status === "disputed" ? `
              <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0;">
                <p><strong>Action Required:</strong> A dispute has been raised. Please review the comments in the Final Accounts system and address any concerns.</p>
              </div>
            ` : `
              <div style="background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin: 15px 0;">
                <p>This section has been approved by the contractor. You may proceed with the next steps.</p>
              </div>
            `}
          </div>
          <div class="footer">
            <p>This is an automated message from the Final Accounts Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email notification
    const emailResponse = await sendEmail(
      senderProfile.email,
      `Section ${statusText}: ${sectionName}`,
      htmlContent
    );

    console.log("Status notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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
};

serve(handler);
