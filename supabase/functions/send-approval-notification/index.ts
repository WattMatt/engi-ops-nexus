import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const smtpClient = new SMTPClient({
  connection: {
    hostname: "smtp.gmail.com",
    port: 465,
    tls: true,
    auth: {
      username: Deno.env.get("GMAIL_USER")!,
      password: Deno.env.get("GMAIL_APP_PASSWORD")!,
    },
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  workflowId: string;
  approverId: string;
  submitterName: string;
  documentType: string;
  documentTitle: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { workflowId, approverId, submitterName, documentType, documentTitle }: ApprovalRequest = await req.json();

    console.log("Sending approval notification to:", approverId);

    // Get approver's email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", approverId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching approver profile:", profileError);
      throw new Error("Approver not found");
    }

    // Create status notification
    await supabase
      .from("status_notifications")
      .insert({
        user_id: approverId,
        notification_type: "approval_request",
        title: "New Approval Request",
        description: `${submitterName} submitted ${documentType} "${documentTitle}" for your approval`,
        link: `/approvals/${workflowId}`,
        metadata: { workflow_id: workflowId, document_type: documentType },
        is_read: false,
        email_sent: false,
      });

    // Always use the production URL for email links
    const appUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://engi-ops-nexus.lovable.app";
    const approvalLink = `${appUrl}/approvals/${workflowId}`;

    await smtpClient.send({
      from: Deno.env.get("GMAIL_USER")!,
      to: profile.email,
      subject: `Approval Required: ${documentType}`,
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
              .document-info { background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">✅ Approval Required</h1>
              </div>
              <div class="content">
                <p>Hi ${profile.full_name || "there"},</p>
                <p><strong>${submitterName}</strong> has submitted a document that requires your approval:</p>
                <div class="document-info">
                  <p><strong>Document Type:</strong> ${documentType.toUpperCase()}</p>
                  <p><strong>Title:</strong> ${documentTitle}</p>
                  <p><strong>Submitted By:</strong> ${submitterName}</p>
                </div>
                <p>Please review the document and provide your approval decision:</p>
                <p style="text-align: center;">
                  <a href="${approvalLink}" class="button">Review & Approve</a>
                </p>
              </div>
              <div class="footer">
                <p>Watson Mattheus Team</p>
                <p>You're receiving this because you are listed as an approver.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Approval email sent successfully via Gmail");

    // Update notification as email sent
    await supabase
      .from("status_notifications")
      .update({ email_sent: true })
      .eq("user_id", approverId)
      .eq("notification_type", "approval_request")
      .eq("metadata", { workflow_id: workflowId, document_type: documentType });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-approval-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
